import { NextRequest } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { listOntologies, uploadOntology } from "@/lib/cognee";

export const runtime = "nodejs";

export async function POST(_request: NextRequest) {
  // Read the OWL file from disk relative to the project root
  let owlContent: string;
  try {
    const owlPath = join(process.cwd(), "ontology", "investing.owl");
    owlContent = readFileSync(owlPath, "utf-8");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: `Could not read ontology file: ${msg}` },
      { status: 500 }
    );
  }

  // Check if "investing" ontology already exists
  let existing: Record<string, unknown>;
  try {
    existing = await listOntologies();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: `Could not list ontologies: ${msg}` },
      { status: 502 }
    );
  }

  // Cognee may return an object keyed by ontology_key, or an array
  const alreadyExisted = hasKey(existing, "investing");

  if (alreadyExisted) {
    return Response.json({ ok: true, alreadyExisted: true });
  }

  try {
    await uploadOntology(
      "investing",
      owlContent,
      "InvestorBrain investing domain ontology"
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: `Ontology upload failed: ${msg}` },
      { status: 502 }
    );
  }

  return Response.json({ ok: true, alreadyExisted: false });
}

/**
 * Check whether the ontologies response contains the given key.
 * Handles both object form { investing: {...} } and array form [{ key: "investing" }, ...].
 */
function hasKey(data: Record<string, unknown>, key: string): boolean {
  if (Array.isArray(data)) {
    return (data as Array<Record<string, unknown>>).some(
      (item) => item?.key === key || item?.ontology_key === key || item?.name === key
    );
  }
  return Object.prototype.hasOwnProperty.call(data, key);
}
