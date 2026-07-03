import { listDatasets, getGraph } from "@/lib/cognee";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  // Map to react-force-graph-2d shape: nodes + links (edges renamed)
  const nodes = (graph.nodes ?? []).map((n) => ({
    id: n.id,
    label: n.label,
    type: n.type,
  }));

  const links = (graph.edges ?? []).map((e) => ({
    source: e.source,
    target: e.target,
    label: e.label,
  }));

  return Response.json({ nodes, links });
}
