import { describe, expect, it } from "vitest";
import { docToMarkdown, exportFilename } from "@/lib/export/markdown";
import { markdownToDoc, textToDoc } from "@/lib/import";

const t = (text: string, ...marks: string[]) => ({ type: "text", text, ...(marks.length ? { marks: marks.map((type) => ({ type })) } : {}) });
const p = (...content: object[]) => ({ type: "paragraph", content });
const li = (...content: object[]) => ({ type: "listItem", content });
const doc = (...content: object[]) => ({ type: "doc", content });

describe("docToMarkdown", () => {
  it("serializes headings, marks and paragraphs", () => {
    const md = docToMarkdown(
      doc(
        { type: "heading", attrs: { level: 2 }, content: [t("Plan")] },
        p(t("Some "), t("bold", "bold"), t(" and "), t("italic", "italic"), t(" and "), t("under", "underline"), t(".")),
      ),
    );
    expect(md).toBe("## Plan\n\nSome **bold** and *italic* and <u>under</u>.\n");
  });

  it("serializes bulleted, numbered and nested lists", () => {
    const md = docToMarkdown(
      doc(
        { type: "bulletList", content: [li(p(t("a")), { type: "orderedList", attrs: { start: 1 }, content: [li(p(t("x"))), li(p(t("y")))] }), li(p(t("b")))] },
      ),
    );
    expect(md).toBe("- a\n  1. x\n  2. y\n- b\n");
  });

  it("keeps whitespace outside emphasis markers and escapes markdown syntax", () => {
    expect(docToMarkdown(doc(p(t("hello ", "bold"), t("world"))))).toBe("**hello** world\n");
    expect(docToMarkdown(doc(p(t("2 * 3 = 6 [x] <b>"))))).toBe("2 \\* 3 = 6 \\[x\\] \\<b\\>\n");
    expect(docToMarkdown(doc(p(t("# not a heading")), p(t("- not a list")), p(t("1. not numbered"))))).toBe(
      "\\# not a heading\n\n\\- not a list\n\n1\\. not numbered\n",
    );
  });

  it("handles line breaks and empty documents", () => {
    expect(docToMarkdown(doc(p(t("a"), { type: "hardBreak" }, t("b"))))).toBe("a\\\nb\n");
    expect(docToMarkdown(doc(p()))).toBe("\n");
  });

  it("round-trips through the markdown importer", () => {
    const original = doc(
      { type: "heading", attrs: { level: 1 }, content: [t("Title")] },
      p(t("Text with "), t("bold", "bold"), t(" and "), t("italic", "italic")),
      { type: "bulletList", content: [li(p(t("one"))), li(p(t("two")))] },
      { type: "orderedList", attrs: { start: 1 }, content: [li(p(t("first"))), li(p(t("second")))] },
    );
    const md = docToMarkdown(original);
    expect(docToMarkdown(markdownToDoc(md))).toBe(md);
  });

  it("round-trips plain text through export", () => {
    expect(docToMarkdown(textToDoc("one\n\ntwo"))).toBe("one\n\ntwo\n");
  });
});

describe("exportFilename", () => {
  it("sanitizes titles but keeps readable and Unicode names", () => {
    expect(exportFilename("Q1 Plan: v2/final?", "md")).toBe("Q1 Plan v2final.md");
    expect(exportFilename("日本語 ドキュメント", "md")).toBe("日本語 ドキュメント.md");
    expect(exportFilename("  ...  ", "md")).toBe("document.md");
    expect(exportFilename("x".repeat(300), "md").length).toBe(103);
  });
});
