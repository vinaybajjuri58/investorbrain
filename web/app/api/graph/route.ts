import { auth } from "@/auth";
import { datasetForUser } from "@/lib/dataset";
import { listDatasets, getGraph } from "@/lib/cognee";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Node types that are Cognee infrastructure / pipeline artefacts.
 * These should never surface in the investing knowledge graph.
 */
const SYSTEM_NODE_TYPES = new Set([
  "TextDocument",
  "DocumentChunk",
  "TextSummary",
  "IngestableFile",
  "DataPoint",
  "NodeSet",
  "PipelineRun",
  "DatasetMigration",
  "Entity",
  "EntityType",
  // Container root emitted once per ingested source; adds no domain meaning
  "InvestingGraph",
]);

function isSystemNode(type: string): boolean {
  if (!type) return false;
  const t = type.trim();
  if (SYSTEM_NODE_TYPES.has(t)) return true;
  // Also filter Cognee internal prefixes
  if (t.startsWith("Document") || t.startsWith("Text") || t.startsWith("Chunk")) return true;
  return false;
}

/**
 * Parse stance from a Thesis node's description or properties.
 * Returns the stance string if found, otherwise undefined.
 */
function extractStance(
  props: Record<string, unknown>,
  type: string,
): string | undefined {
  if (type !== "Thesis") return undefined;
  // stance may be a direct property (custom DataPoint model)
  if (typeof props.stance === "string") return props.stance;
  // or encoded in description: "Stance: bullish. …"
  const desc =
    typeof props.description === "string" ? props.description : "";
  const m = /Stance:\s*(bullish|bearish|neutral)/i.exec(desc);
  return m ? m[1].toLowerCase() : undefined;
}

export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const datasetName = datasetForUser(email);

  let datasets: Awaited<ReturnType<typeof listDatasets>>;
  try {
    datasets = await listDatasets(email);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `Could not list datasets: ${msg}` }, { status: 502 });
  }

  const dataset = datasets.find((d) => d.name === datasetName);
  if (!dataset) {
    // New user with no dataset yet — return empty graph, not an error
    return Response.json({ nodes: [], links: [] });
  }

  let graph: Awaited<ReturnType<typeof getGraph>>;
  try {
    graph = await getGraph(email, dataset.id);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `Could not fetch graph: ${msg}` }, { status: 502 });
  }

  // Filter out system / infrastructure nodes
  const domainNodes = (graph.nodes ?? []).filter(
    (n) => !isSystemNode(n.type ?? ""),
  );

  const domainNodeIds = new Set(domainNodes.map((n) => n.id));

  // Map to react-force-graph-2d shape: nodes + links (edges renamed)
  const nodes = domainNodes.map((n) => {
    const props = n.properties ?? {};
    const stance = extractStance(props, n.type ?? "");
    return {
      id: n.id,
      label: n.label,
      type: n.type,
      name: (props.name as string) ?? n.label ?? n.id,
      properties: stance ? { ...props, stance } : props,
    };
  });

  // Cognee extracts one node per source mention with no cross-source entity
  // resolution, so "HDFC Bank" can appear once per ingested source. Merge
  // nodes sharing (type, normalized name) into one canonical node so the
  // graph renders as a single connected brain instead of per-source islands.
  const canonicalByKey = new Map<string, (typeof nodes)[number]>();
  const canonicalId = new Map<string, string>();
  for (const n of nodes) {
    const norm = (n.name || n.label || n.id)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    const key = `${n.type}|${norm}`;
    const existing = canonicalByKey.get(key);
    if (existing) {
      canonicalId.set(n.id, existing.id);
      // Fill in properties the canonical node is missing (e.g. stance)
      existing.properties = { ...n.properties, ...existing.properties };
    } else {
      canonicalByKey.set(key, n);
      canonicalId.set(n.id, n.id);
    }
  }
  const mergedNodes = [...canonicalByKey.values()];

  // Remap edges to canonical ids; drop self-loops and duplicates
  const seenLinks = new Set<string>();
  const links: { source: string; target: string; label: string; type: string }[] = [];
  for (const e of graph.edges ?? []) {
    if (!domainNodeIds.has(e.source) || !domainNodeIds.has(e.target)) continue;
    const source = canonicalId.get(e.source) ?? e.source;
    const target = canonicalId.get(e.target) ?? e.target;
    if (source === target) continue;
    const dedupeKey = `${source}|${target}|${e.label}`;
    if (seenLinks.has(dedupeKey)) continue;
    seenLinks.add(dedupeKey);
    links.push({ source, target, label: e.label, type: e.label });
  }

  return Response.json({ nodes: mergedNodes, links });
}
