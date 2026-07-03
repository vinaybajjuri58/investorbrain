/**
 * Server-side Cognee client.
 * All field names verified against GET http://localhost:8000/openapi.json.
 */

const COGNEE_BASE = process.env.COGNEE_URL ?? "http://localhost:8000";

// ─── Response types (from openapi.json schemas) ────────────────────────────

export interface DatasetDTO {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string | null;
  ownerId: string;
}

export interface GraphNodeDTO {
  id: string;
  label: string;
  type: string;
  properties: Record<string, unknown>;
}

export interface GraphEdgeDTO {
  source: string;
  target: string;
  label: string;
}

export interface GraphDTO {
  nodes: GraphNodeDTO[];
  edges: GraphEdgeDTO[];
}

export type SearchType =
  | "SUMMARIES"
  | "CHUNKS"
  | "RAG_COMPLETION"
  | "HYBRID_COMPLETION"
  | "TRIPLET_COMPLETION"
  | "GRAPH_COMPLETION"
  | "GRAPH_COMPLETION_DECOMPOSITION"
  | "GRAPH_SUMMARY_COMPLETION"
  | "CYPHER"
  | "NATURAL_LANGUAGE"
  | "GRAPH_COMPLETION_COT"
  | "GRAPH_COMPLETION_CONTEXT_EXTENSION"
  | "FEELING_LUCKY"
  | "TEMPORAL"
  | "CODING_RULES"
  | "CHUNKS_LEXICAL"
  | "AGENTIC_COMPLETION";

export type PipelineRunStatus =
  | "DATASET_PROCESSING_INITIATED"
  | "DATASET_PROCESSING_STARTED"
  | "DATASET_PROCESSING_COMPLETED"
  | "DATASET_PROCESSING_ERRORED";

export interface RecallResult {
  text?: string;
  answer?: string;
  source?: string;
  kind?: string;
  search_type?: string;
  score?: number | null;
  dataset_id?: string | null;
  dataset_name?: string | null;
  metadata?: Record<string, unknown>;
  raw?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface RememberOptions {
  /** Array of ontology keys previously uploaded via /api/v1/ontologies */
  ontologyKey?: string[];
  runInBackground?: boolean;
  chunkSize?: number;
  customPrompt?: string;
}

export interface RecallOptions {
  searchType?: SearchType;
  datasets?: string[];
  topK?: number;
}

export interface ForgetOptions {
  dataId?: string;
  dataset?: string;
  everything?: boolean;
  memoryOnly?: boolean;
}

// ─── Helper ────────────────────────────────────────────────────────────────

async function cogneeRequest<T>(
  path: string,
  init: RequestInit
): Promise<T> {
  const url = `${COGNEE_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    // Auth is disabled; no headers needed.
  });

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = JSON.stringify(body);
    } catch {
      detail = await res.text();
    }
    throw new Error(`Cognee ${init.method ?? "GET"} ${path} → ${res.status}: ${detail}`);
  }

  // Some endpoints return 200 with an empty body
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Ingest plain text into Cognee.
 * Sends the text as a file upload (multipart/form-data) to POST /api/v1/remember.
 * Field names: data (file array), datasetName, ontology_key, run_in_background.
 */
export async function rememberText(
  text: string,
  filename: string,
  datasetName: string,
  ontologyKey?: string[]
): Promise<Record<string, unknown>> {
  const form = new FormData();

  // data must be an array of file blobs
  const blob = new Blob([text], { type: "text/plain" });
  form.append("data", blob, filename);
  form.append("datasetName", datasetName);

  if (ontologyKey && ontologyKey.length > 0) {
    // ontology_key is List[str] — append each item separately
    for (const key of ontologyKey) {
      form.append("ontology_key", key);
    }
  }

  // Always run in background so the LLM step doesn't block the HTTP response
  form.append("run_in_background", "true");

  return cogneeRequest<Record<string, unknown>>("/api/v1/remember", {
    method: "POST",
    body: form,
  });
}

/**
 * Query the knowledge graph.
 * POST /api/v1/recall — body: { query, searchType, datasets, topK }
 */
export async function recall(
  query: string,
  opts: RecallOptions = {}
): Promise<RecallResult[]> {
  return cogneeRequest<RecallResult[]>("/api/v1/recall", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      searchType: opts.searchType ?? "GRAPH_COMPLETION",
      datasets: opts.datasets ?? null,
      topK: opts.topK ?? 15,
    }),
  });
}

/**
 * Trigger improve on a dataset.
 * POST /api/v1/improve — body: { datasetName, runInBackground }
 */
export async function improve(
  datasetName: string
): Promise<Record<string, unknown>> {
  return cogneeRequest<Record<string, unknown>>("/api/v1/improve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      datasetName,
      runInBackground: true,
    }),
  });
}

/**
 * Trigger memify on a dataset.
 * POST /api/v1/memify — body: { datasetName, runInBackground }
 */
export async function memify(
  datasetName: string
): Promise<Record<string, unknown>> {
  return cogneeRequest<Record<string, unknown>>("/api/v1/memify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      datasetName,
      runInBackground: true,
    }),
  });
}

/**
 * Forget data from Cognee.
 * POST /api/v1/forget — body: { dataId?, dataset?, everything?, memoryOnly? }
 */
export async function forget(
  opts: ForgetOptions = {}
): Promise<void> {
  await cogneeRequest<unknown>("/api/v1/forget", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
}

/**
 * List all datasets.
 * GET /api/v1/datasets — returns DatasetDTO[]
 */
export async function listDatasets(): Promise<DatasetDTO[]> {
  return cogneeRequest<DatasetDTO[]>("/api/v1/datasets", {
    method: "GET",
  });
}

/**
 * Fetch the knowledge graph for a dataset.
 * GET /api/v1/datasets/{dataset_id}/graph — returns { nodes, edges }
 */
export async function getGraph(datasetId: string): Promise<GraphDTO> {
  return cogneeRequest<GraphDTO>(`/api/v1/datasets/${datasetId}/graph`, {
    method: "GET",
  });
}

/**
 * Get processing status for all datasets.
 * GET /api/v1/datasets/status
 */
export async function getStatus(): Promise<
  Record<string, PipelineRunStatus | Record<string, PipelineRunStatus>>
> {
  return cogneeRequest<
    Record<string, PipelineRunStatus | Record<string, PipelineRunStatus>>
  >("/api/v1/datasets/status", { method: "GET" });
}

/**
 * List uploaded ontologies.
 * GET /api/v1/ontologies
 */
export async function listOntologies(): Promise<Record<string, unknown>> {
  return cogneeRequest<Record<string, unknown>>("/api/v1/ontologies", {
    method: "GET",
  });
}

/**
 * Upload an OWL ontology file.
 * POST /api/v1/ontologies — multipart: ontology_key (string), ontology_file (.owl), description?
 */
export async function uploadOntology(
  ontologyKey: string,
  owlContent: string,
  description?: string
): Promise<Record<string, unknown>> {
  const form = new FormData();
  form.append("ontology_key", ontologyKey);
  const blob = new Blob([owlContent], { type: "application/rdf+xml" });
  form.append("ontology_file", blob, `${ontologyKey}.owl`);
  if (description) {
    form.append("description", description);
  }

  return cogneeRequest<Record<string, unknown>>("/api/v1/ontologies", {
    method: "POST",
    body: form,
  });
}
