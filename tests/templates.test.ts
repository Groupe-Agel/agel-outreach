import { describe, it, expect } from "vitest";
import {
  extractVariables,
  renderTemplate,
  renderText,
  compileMjml,
} from "@/lib/templates/compile";

describe("extractVariables", () => {
  it("pulls simple {{var}} references", () => {
    const vars = extractVariables("Hello {{full_name}} from {{organization}}");
    expect(vars.sort()).toEqual(["full_name", "organization"]);
  });

  it("handles #if conditionals and skips keywords", () => {
    const vars = extractVariables("{{#if job_title}}{{job_title}}{{/if}}");
    expect(vars).toEqual(["job_title"]);
  });

  it("skips closing tags", () => {
    const vars = extractVariables("{{#if x}}{{/if}}");
    expect(vars).toEqual(["x"]);
  });

  it("dedupes", () => {
    const vars = extractVariables("{{a}} {{a}} {{b}}");
    expect(vars).toEqual(["a", "b"]);
  });
});

describe("renderText", () => {
  it("interpolates handlebars", () => {
    expect(renderText("Hi {{name}}", { name: "Yassine" })).toBe("Hi Yassine");
  });

  it("supports #if conditionals", () => {
    const tpl = "{{#if title}}{{title}}{{else}}(no title){{/if}}";
    expect(renderText(tpl, { title: "CEO" })).toBe("CEO");
    expect(renderText(tpl, { title: null })).toBe("(no title)");
  });
});

describe("renderTemplate", () => {
  it("escapes HTML by default to prevent XSS in merge data", () => {
    const out = renderTemplate("<p>{{name}}</p>", {
      name: "<script>alert(1)</script>",
    });
    expect(out).not.toContain("<script>");
    expect(out).toContain("&lt;script&gt;");
  });
});

describe("compileMjml", () => {
  it("returns valid HTML for a basic MJML doc", async () => {
    const result = await compileMjml(
      `<mjml><mj-body><mj-section><mj-column><mj-text>Hi</mj-text></mj-column></mj-section></mj-body></mjml>`,
    );
    expect(result.errors).toEqual([]);
    expect(result.html).toContain("Hi");
    expect(result.html).toMatch(/<html/i);
  });
});
