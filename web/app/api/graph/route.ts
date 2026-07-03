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
  let datasets: Awaited<ReturnType<typeof listDatasets>>;
  try {
    datasets = await listDatasets();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `Could not list datasets: ${msg}` }, { status: 502 });
  }

  const dataset = datasets.find((d) => d.name === "investing");
  if (!dataset) {
    return Response.json({ nodes: [], links: [] });
  }

  let graph: Awaited<ReturnType<typeof getGraph>>;
  try {
    graph = await getGraph(dataset.id);
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

  // Only include edges where both endpoints are domain nodes
  const links = (graph.edges ?? [])
    .filter(
      (e) => domainNodeIds.has(e.source) && domainNodeIds.has(e.target),
    )
    .map((e) => ({
      source: e.source,
      target: e.target,
      label: e.label,
      type: e.label, // alias so callers can use either field name
    }));

  return Response.json({ nodes, links });
}
