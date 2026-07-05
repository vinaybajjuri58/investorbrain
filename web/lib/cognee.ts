/**
 * Server-side Cognee client.
 * All field names verified against GET http://localhost:8000/openapi.json.
 *
 * Every request runs as a per-app-user Cognee account (auto-provisioned on
 * first use). Cognee's ENABLE_BACKEND_ACCESS_CONTROL=True enforces isolation
 * between those accounts — without it, search and graph reads ignore dataset
 * boundaries and every user sees one shared store.
 */

import { createHmac } from "node:crypto";

const COGNEE_BASE = process.env.COGNEE_URL ?? "http://localhost:8000";

// ─── Per-user authentication ───────────────────────────────────────────────

const COGNEE_USER_SECRET =
  process.env.COGNEE_USER_SECRET ?? process.env.AUTH_SECRET;

/**
 * Deterministic per-user password: the user never sees it, and the same
 * email always yields the same credentials across server restarts.
 * Changing the secret orphans existing Cognee accounts — their data stays
 * but logins fail with REGISTER_USER_ALREADY_EXISTS on re-registration.
 */
function passwordForUser(email: string): string {
  if (!COGNEE_USER_SECRET) {
    throw new Error(
      "Set COGNEE_USER_SECRET (or AUTH_SECRET) to derive Cognee credentials"
    );
  }
  return createHmac("sha256", COGNEE_USER_SECRET)
    .update(email.toLowerCase())
    .digest("hex");
}

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

function jwtExpiryMs(token: string): number {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf-8")
    ) as { exp?: number };
    if (typeof payload.exp === "number") return payload.exp * 1000;
  } catch {
    // opaque token — fall through to a conservative TTL
  }
  return Date.now() + 30 * 60 * 1000;
}

/** Returns an access token, or null when the user doesn't exist yet. */
async function tryLogin(email: string): Promise<string | null> {
  const res = await fetch(`${COGNEE_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      username: email.toLowerCase(),
      password: passwordForUser(email),
    }),
  });
  if (res.status === 400) return null;
  if (!res.ok) {
    throw new Error(`Cognee login → ${res.status}: ${await res.text()}`);
  }
  const body = (await res.json()) as { access_token: string };
  return body.access_token;
}

async function registerUser(email: string): Promise<"created" | "exists"> {
  const res = await fetch(`${COGNEE_BASE}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email.toLowerCase(),
      password: passwordForUser(email),
    }),
  });
  if (res.ok) return "created";
  const detail = await res.text();
  // A concurrent request may have registered this user first — not an error,
  // the login retry below succeeds because both derive the same password.
  if (res.status === 400 && detail.includes("REGISTER_USER_ALREADY_EXISTS")) {
    return "exists";
  }
  throw new Error(`Cognee register → ${res.status}: ${detail}`);
}

async function tokenForUser(email: string): Promise<string> {
  const key = email.toLowerCase();
  const cached = tokenCache.get(key);
  if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.token;

  let token = await tryLogin(email);
  if (!token) {
    const reg = await registerUser(email);
    token = await tryLogin(email);
    if (!token) {
      throw new Error(
        reg === "exists"
          ? "Cognee account exists but the derived password doesn't match — " +
            "was COGNEE_USER_SECRET/AUTH_SECRET changed after this user was created?"
          : "Cognee login failed immediately after registration"
      );
    }
  }
  tokenCache.set(key, { token, expiresAt: jwtExpiryMs(token) });
  return token;
}

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
  /** Overrides the default completion prompt. Used to ground answers in graph context. */
  systemPrompt?: string;
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
  init: RequestInit,
  asUser: string
): Promise<T> {
  const url = `${COGNEE_BASE}${path}`;

  const doFetch = async (token: string) =>
    fetch(url, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${token}` },
    });

  let res = await doFetch(await tokenForUser(asUser));

  // A cached token can outlive server-side invalidation (e.g. Cognee restart
  // with a new JWT secret) — re-login once and retry.
  if (res.status === 401) {
    tokenCache.delete(asUser.toLowerCase());
    res = await doFetch(await tokenForUser(asUser));
  }

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
 * Field names: data (file array), datasetName, ontology_key, run_in_background,
 *              graph_model, custom_prompt.
 *
 * @param graphModel  JSON-serialised graph model schema (same format as cognify).
 *                    When provided, Cognee uses it to type-constrain extraction.
 *                    Pass undefined or empty string to use the default KnowledgeGraph model.
 * @param customPrompt  Replaces the default entity-extraction system prompt.
 *                      Use to steer which node/edge types are extracted.
 */
export async function rememberText(
  asUser: string,
  text: string,
  filename: string,
  datasetName: string,
  ontologyKey?: string[],
  graphModel?: string,
  customPrompt?: string
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

  // Domain-typed extraction overrides
  if (graphModel) {
    form.append("graph_model", graphModel);
  }
  if (customPrompt) {
    form.append("custom_prompt", customPrompt);
  }

  // Always run in background so the LLM step doesn't block the HTTP response
  form.append("run_in_background", "true");

  return cogneeRequest<Record<string, unknown>>("/api/v1/remember", {
    method: "POST",
    body: form,
  }, asUser);
}

/**
 * Query the knowledge graph.
 * POST /api/v1/recall — body: { query, searchType, datasets, topK }
 */
export async function recall(
  asUser: string,
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
      systemPrompt: opts.systemPrompt ?? null,
    }),
  }, asUser);
}

/**
 * Trigger improve on a dataset.
 * POST /api/v1/improve — body: { datasetName, runInBackground }
 */
export async function improve(
  asUser: string,
  datasetName: string
): Promise<Record<string, unknown>> {
  return cogneeRequest<Record<string, unknown>>("/api/v1/improve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      datasetName,
      runInBackground: true,
    }),
  }, asUser);
}

/**
 * Forget data from Cognee.
 * POST /api/v1/forget — body: { dataId?, dataset?, everything?, memoryOnly? }
 */
export async function forget(
  asUser: string,
  opts: ForgetOptions = {}
): Promise<void> {
  await cogneeRequest<unknown>("/api/v1/forget", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  }, asUser);
}

/**
 * List all datasets.
 * GET /api/v1/datasets — returns DatasetDTO[]
 */
export async function listDatasets(asUser: string): Promise<DatasetDTO[]> {
  return cogneeRequest<DatasetDTO[]>("/api/v1/datasets", {
    method: "GET",
  }, asUser);
}

export interface DataItemDTO {
  id: string;
  name: string;
  createdAt: string;
}

/**
 * List ingested data items in a dataset.
 * GET /api/v1/datasets/{dataset_id}/data — returns DataDTO[]
 */
export async function listData(
  asUser: string,
  datasetId: string
): Promise<DataItemDTO[]> {
  return cogneeRequest<DataItemDTO[]>(`/api/v1/datasets/${datasetId}/data`, {
    method: "GET",
  }, asUser);
}

/**
 * Fetch the knowledge graph for a dataset.
 * GET /api/v1/datasets/{dataset_id}/graph — returns { nodes, edges }
 */
export async function getGraph(asUser: string, datasetId: string): Promise<GraphDTO> {
  return cogneeRequest<GraphDTO>(`/api/v1/datasets/${datasetId}/graph`, {
    method: "GET",
  }, asUser);
}

/**
 * Get processing status for all datasets.
 * GET /api/v1/datasets/status
 */
export async function getStatus(asUser: string): Promise<
  Record<string, PipelineRunStatus | Record<string, PipelineRunStatus>>
> {
  return cogneeRequest<
    Record<string, PipelineRunStatus | Record<string, PipelineRunStatus>>
  >("/api/v1/datasets/status", { method: "GET" }, asUser);
}

/**
 * List uploaded ontologies.
 * GET /api/v1/ontologies
 */
export async function listOntologies(asUser: string): Promise<Record<string, unknown>> {
  return cogneeRequest<Record<string, unknown>>("/api/v1/ontologies", {
    method: "GET",
  }, asUser);
}

/**
 * Upload an OWL ontology file.
 * POST /api/v1/ontologies — multipart: ontology_key (string), ontology_file (.owl), description?
 */
export async function uploadOntology(
  asUser: string,
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
  }, asUser);
}
