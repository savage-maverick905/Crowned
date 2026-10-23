import { describe, it, expect } from "vitest"; import { buildSrcDoc } from "../src/components/RichHtml"; import { hash } from "../src/lib/seen";
describe("rich html", () => {
  it("blocks scripts via CSP and keeps admin html + css", () => {
    const d = buildSrcDoc("<h1>Hi</h1>", ".x{color:red}");
    expect(d).toContain("script-src 'none'"); expect(d).toContain("<h1>Hi</h1>"); expect(d).toContain(".x{color:red}");
  });
  it("hash changes when content changes", () => { expect(hash("a")).not.toBe(hash("b")); expect(hash("a")).toBe(hash("a")); });
});
