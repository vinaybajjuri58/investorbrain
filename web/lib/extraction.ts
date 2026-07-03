/**
 * Domain-typed extraction constants for investing knowledge graphs.
 *
 * INVESTING_GRAPH_MODEL  – JSON-serialised Pydantic schema for the InvestingGraph
 *                          DataPoint model.  Passed as the `graph_model` field in
 *                          POST /api/v1/remember.
 *
 * EXTRACTION_PROMPT      – System prompt that replaces Cognee's default graph-
 *                          extraction prompt.  Guides the LLM to produce only
 *                          domain-typed nodes (Company / Thesis / Catalyst / …)
 *                          and typed edges (ABOUT / HINGES_ON / …).
 */

/**
 * JSON schema for InvestingGraph.
 * Generated via graph_model_to_graph_schema() so it is guaranteed to round-trip
 * through graph_schema_to_graph_model() on the Cognee side.
 *
 * Node types:   Company, Thesis, Catalyst, SectorTheme, Creator, Source
 * Edge fields:
 *   Thesis  → ABOUT      (Company list)
 *   Thesis  → HINGES_ON  (Catalyst list)
 *   Source  → AUTHORED_BY (Creator list)
 *   Source  → MENTIONS   (Company list)
 *   Source  → ARGUES     (Thesis list)
 */
export const INVESTING_GRAPH_MODEL: string = JSON.stringify({
  $defs: {
    Catalyst: {
      properties: {
        name: { type: "string" },
        event_date: { default: "", type: "string" },
        metadata: {
          additionalProperties: true,
          default: { index_fields: ["name"] },
          type: "object",
        },
      },
      required: ["name"],
      title: "Catalyst",
      type: "object",
    },
    Company: {
      properties: {
        name: { type: "string" },
        metadata: {
          additionalProperties: true,
          default: { index_fields: ["name"] },
          type: "object",
        },
      },
      required: ["name"],
      title: "Company",
      type: "object",
    },
    Creator: {
      properties: {
        name: { type: "string" },
        metadata: {
          additionalProperties: true,
          default: { index_fields: ["name"] },
          type: "object",
        },
      },
      required: ["name"],
      title: "Creator",
      type: "object",
    },
    SectorTheme: {
      properties: {
        name: { type: "string" },
        metadata: {
          additionalProperties: true,
          default: { index_fields: ["name"] },
          type: "object",
        },
      },
      required: ["name"],
      title: "SectorTheme",
      type: "object",
    },
    Source: {
      properties: {
        name: { type: "string" },
        source_type: { default: "", type: "string" },
        AUTHORED_BY: {
          default: [],
          items: { $ref: "#/$defs/Creator" },
          type: "array",
        },
        MENTIONS: {
          default: [],
          items: { $ref: "#/$defs/Company" },
          type: "array",
        },
        ARGUES: {
          default: [],
          items: { $ref: "#/$defs/Thesis" },
          type: "array",
        },
        metadata: {
          additionalProperties: true,
          default: { index_fields: ["name"] },
          type: "object",
        },
      },
      required: ["name"],
      title: "Source",
      type: "object",
    },
    Thesis: {
      properties: {
        name: { type: "string" },
        stance: { default: "neutral", type: "string" },
        reasoning: { default: "", type: "string" },
        ABOUT: {
          default: [],
          items: { $ref: "#/$defs/Company" },
          type: "array",
        },
        HINGES_ON: {
          default: [],
          items: { $ref: "#/$defs/Catalyst" },
          type: "array",
        },
        metadata: {
          additionalProperties: true,
          default: { index_fields: ["name"] },
          type: "object",
        },
      },
      required: ["name"],
      title: "Thesis",
      type: "object",
    },
  },
  properties: {
    name: { default: "Investing Analysis", type: "string" },
    companies: {
      default: [],
      items: { $ref: "#/$defs/Company" },
      type: "array",
    },
    theses: {
      default: [],
      items: { $ref: "#/$defs/Thesis" },
      type: "array",
    },
    catalysts: {
      default: [],
      items: { $ref: "#/$defs/Catalyst" },
      type: "array",
    },
    sector_themes: {
      default: [],
      items: { $ref: "#/$defs/SectorTheme" },
      type: "array",
    },
    creators: {
      default: [],
      items: { $ref: "#/$defs/Creator" },
      type: "array",
    },
    sources: {
      default: [],
      items: { $ref: "#/$defs/Source" },
      type: "array",
    },
    metadata: {
      additionalProperties: true,
      default: { index_fields: ["name"] },
      type: "object",
    },
  },
  title: "InvestingGraph",
  type: "object",
});

/**
 * Custom extraction system prompt for domain-typed investment knowledge graphs.
 *
 * This prompt replaces Cognee's default generate_graph_prompt_oneshot.txt.
 * It instructs the LLM to extract ONLY domain nodes and edges — no generic
 * Entity / EntityType nodes.
 *
 * When graph_model is InvestingGraph (DataPoint-based), the output MUST match
 * the InvestingGraph schema: a top-level object whose fields (companies, theses,
 * catalysts, sector_themes, creators, sources) each hold typed sub-objects.
 */
export const EXTRACTION_PROMPT = `
You are an expert financial knowledge graph extractor specialising in equity research and investment theses.

Your task: analyse the provided text and extract a structured InvestingGraph object.

## OUTPUT SCHEMA
Return a valid JSON object matching the InvestingGraph schema exactly:

{
  "name": "<brief title of the analysis>",
  "companies": [{ "name": "<company name>", "metadata": {"index_fields": ["name"]} }],
  "theses": [{
    "name": "<short label for this thesis>",
    "stance": "<bullish | bearish | neutral>",
    "reasoning": "<one sentence summary of the key argument>",
    "ABOUT": [{ "name": "<company name>", "metadata": {"index_fields": ["name"]} }],
    "HINGES_ON": [{ "name": "<catalyst name>", "event_date": "<ISO date or quarter string, e.g. 2026-10>", "metadata": {"index_fields": ["name"]} }],
    "metadata": {"index_fields": ["name"]}
  }],
  "catalysts": [{ "name": "<event name>", "event_date": "<date or quarter>", "metadata": {"index_fields": ["name"]} }],
  "sector_themes": [{ "name": "<sector or theme>", "metadata": {"index_fields": ["name"]} }],
  "creators": [{ "name": "<author or creator name>", "metadata": {"index_fields": ["name"]} }],
  "sources": [{
    "name": "<source title>",
    "source_type": "<note | article | youtube | url>",
    "AUTHORED_BY": [{ "name": "<creator name>", "metadata": {"index_fields": ["name"]} }],
    "MENTIONS": [{ "name": "<company name>", "metadata": {"index_fields": ["name"]} }],
    "ARGUES": [<thesis objects>],
    "metadata": {"index_fields": ["name"]}
  }],
  "metadata": {"index_fields": ["name"]}
}

## EXTRACTION RULES

### Companies
- Extract every publicly traded company or corporation explicitly named.
- Use the full canonical name (e.g. "HDFC Bank", not just "HDFC").

### Theses
- For EVERY investment argument found, create a Thesis entry.
- "stance" MUST be exactly one of: "bullish", "bearish", or "neutral".
- If the text contains both a bull and a bear case, create SEPARATE Thesis objects — one bullish, one bearish.
- "reasoning" should be a concise one-sentence summary of the core argument.
- "ABOUT": list ALL companies this thesis is about.
- "HINGES_ON": list the key catalysts/events this thesis depends on. Include "event_date" for any date mentioned (use "YYYY-MM" or descriptive quarter like "2026-Q2").

### Catalysts
- A catalyst is a specific forthcoming event (earnings, RBI decision, regulatory approval, etc.).
- Include "event_date" whenever a date or quarter is mentioned.
- Also appear as top-level "catalysts" list entries.

### SectorThemes
- Extract any broad market sector, theme, or industry mentioned (e.g. "Indian Banking Sector", "NBFC").

### Creators
- The analyst, author, or person who produced the content.
- Extract from metadata headers if present (e.g. "Creator: Me").

### Sources
- Create one Source entry for the document/note/video being analysed.
- "source_type": use "note", "article", "youtube", or "url" as appropriate.
- "AUTHORED_BY": link to the Creator.
- "MENTIONS": all companies mentioned in the source.
- "ARGUES": all theses the source makes.

## CRITICAL RULES
1. NEVER output nodes typed as Entity, EntityType, Person, Organization, Location, Concept, or Event.
2. Only use the schema fields defined above — do not add extra keys.
3. Re-use the exact same company/catalyst object (same name) when the same entity appears in multiple places (e.g. in Thesis.ABOUT and Source.MENTIONS).
4. If both a bull thesis and a bear thesis exist for the same company, extract BOTH with their correct stances.
5. The "metadata" field with {"index_fields": ["name"]} is required on every object.
6. Output ONLY the JSON object — no markdown fences, no commentary.
`.trim();
