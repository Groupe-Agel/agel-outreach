// Browser-safe variable extractor (no Node/MJML deps).
// Mirror of extractVariables() in compile.ts, kept separate so client
// components don't pull the mjml package into the bundle.

export function extractVariables(source: string): string[] {
  const RE = /\{\{\s*([#/^!])?\s*(?:if\s+|unless\s+|else\s+|else\s*)?([a-zA-Z_][a-zA-Z0-9_.]*)/g;
  const KEYWORDS = new Set(["if", "else", "unless", "each", "with", "this"]);
  const vars = new Set<string>();
  for (const m of source.matchAll(RE)) {
    const op = m[1];
    if (op === "/" || op === "!") continue;
    const name = m[2]?.split(".")[0];
    if (!name || KEYWORDS.has(name)) continue;
    vars.add(name);
  }
  return [...vars].sort();
}
