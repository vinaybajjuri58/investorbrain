import { createHash } from "node:crypto";

/**
 * The email address whose sessions map to the pre-populated "investing" dataset.
 * Override via OWNER_EMAIL env var in production.
 */
const OWNER_EMAIL = (
  process.env.OWNER_EMAIL ?? "vinaybajjuri58@gmail.com"
).toLowerCase();

/**
 * Returns the Cognee dataset name for a given user email.
 *
 * - Owner email → "investing"  (the existing demo corpus — do NOT rename it)
 * - Any other email → "u_" + first 16 hex chars of sha256(lowercased email)
 *   e.g. user@example.com → "u_3d7b4c2a1f0e9d8c"
 *
 * The deterministic hash means the same user always gets the same dataset,
 * survives server restarts, and never leaks the raw email into Cognee.
 */
export function datasetForUser(email: string): string {
  if (email.toLowerCase() === OWNER_EMAIL) {
    return "investing";
  }
  const hash = createHash("sha256")
    .update(email.toLowerCase())
    .digest("hex");
  return "u_" + hash.slice(0, 16);
}
