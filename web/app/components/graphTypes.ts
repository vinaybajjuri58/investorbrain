export interface GraphNode {
  id: string;
  label: string;
  type: string;
  x?: number;
  y?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  label: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export const TYPE_COLOURS: Record<string, string> = {
  company:     "#4f9cf9",
  thesis:      "#22c55e",
  creator:     "#a78bfa",
  catalyst:    "#fb923c",
  bias:        "#f87171",
  source:      "#64748b",
  sectortheme: "#2dd4bf",
  note:        "#f59e0b",
  other:       "#6b7280",
};

export const LEGEND_LABELS: Record<string, string> = {
  company:     "Company",
  thesis:      "Thesis",
  creator:     "Creator",
  catalyst:    "Catalyst",
  bias:        "Bias",
  source:      "Source",
  sectortheme: "Sector / Theme",
  note:        "Note",
  other:       "Other",
};

export function typeKey(raw: string): string {
  const k = (raw ?? "").toLowerCase().replace(/[^a-z]/g, "");
  return k in TYPE_COLOURS ? k : "other";
}

export function nodeColour(raw: string): string {
  return TYPE_COLOURS[typeKey(raw)] ?? TYPE_COLOURS.other;
}
