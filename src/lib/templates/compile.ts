import mjml2html from "mjml";
import Handlebars from "handlebars";

export type MjmlResult = {
  html: string;
  errors: Array<{ formattedMessage: string; line?: number }>;
};

export async function compileMjml(mjmlSource: string): Promise<MjmlResult> {
  const result = await mjml2html(mjmlSource, {
    validationLevel: "soft",
    keepComments: false,
  });
  return {
    html: result.html,
    errors: (result.errors ?? []) as MjmlResult["errors"],
  };
}

export function renderTemplate(
  htmlTpl: string,
  data: Record<string, unknown>,
): string {
  const compiled = Handlebars.compile(htmlTpl, { noEscape: false, strict: false });
  return compiled(data);
}

export function renderText(tpl: string, data: Record<string, unknown>): string {
  return Handlebars.compile(tpl, { noEscape: true, strict: false })(data);
}

/**
 * Pull `{{var}}` and `{{#if var}}` references out of a Handlebars source.
 * Skips block closers (`{{/...}}`) and the `if` / `else` / `unless` keywords.
 */
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
