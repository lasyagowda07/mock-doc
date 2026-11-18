import { describe, expect, it } from "vitest";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { ImportError, importFile, markdownToDoc, textToDoc, titleFromFilename } from "@/lib/import";
import { MAX_UPLOAD_BYTES, validateUpload } from "@/lib/import/constants";

type Node = { type: string; attrs?: Record<string, unknown>; content?: Node[]; text?: string; marks?: { type: string }[] };
const kinds = (doc: { content: unknown[] }) => (doc.content as Node[]).map((n) => n.type);
const flatten = (n: Node): Node[] => [n, ...(n.content ?? []).flatMap(flatten)];
const all = (doc: { content: unknown[] }) => (doc.content as Node[]).flatMap(flatten);
const buf = (s: string) => Buffer.from(s, "utf8");

describe("text import", () => {
  it("splits paragraphs on blank lines and keeps single newlines as line breaks", () => {
    const doc = textToDoc("First line\nsecond line\r\n\r\n\r\nNext paragraph");
    expect(kinds(doc)).toEqual(["paragraph", "paragraph"]);
    expect((doc.content[0] as Node).content!.map((n) => n.type)).toEqual(["text", "hardBreak", "text"]);
  });
  it("returns an empty paragraph for whitespace-only input", () => {
    expect(kinds(textToDoc("  \n\n "))).toContain("paragraph");
  });
});

describe("markdown import", () => {
  it("maps headings, emphasis and lists into the editor schema", () => {
    const doc = markdownToDoc("# Title\n\nSome **bold** and *italic*.\n\n- a\n- b\n\n1. one\n2. two\n");
    const nodes = all(doc);
    expect(nodes.find((n) => n.type === "heading")?.attrs?.level).toBe(1);
    expect(nodes.some((n) => n.marks?.some((m) => m.type === "bold"))).toBe(true);
    expect(nodes.some((n) => n.marks?.some((m) => m.type === "italic"))).toBe(true);
    expect(kinds(doc)).toEqual(expect.arrayContaining(["bulletList", "orderedList"]));
  });
  it("drops scripts and unsupported HTML instead of importing them", () => {
    const doc = markdownToDoc("Hello <script>alert(1)</script> <img src=x onerror=alert(1)>");
    expect(JSON.stringify(doc)).not.toMatch(/script|onerror|<img/i);
  });
});

describe("docx import", () => {
  it("keeps headings, bold, italic, underline and lists", async () => {
    const file = new Document({
      numbering: { config: [{ reference: "n", levels: [{ level: 0, format: "decimal", text: "%1.", alignment: "left" }] }] },
      sections: [{
        children: [
          new Paragraph({ text: "Report", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ children: [new TextRun({ text: "bold", bold: true }), new TextRun({ text: " it", italics: true }), new TextRun({ text: " ul", underline: {} })] }),
          new Paragraph({ text: "step one", numbering: { reference: "n", level: 0 } }),
          new Paragraph({ text: "step two", numbering: { reference: "n", level: 0 } }),
        ],
      }],
    });
    const bytes = await Packer.toBuffer(file);
    const { title, content } = await importFile("Q4 Report.docx", bytes);
    expect(title).toBe("Q4 Report");
    const nodes = all(content);
    expect(nodes.find((n) => n.type === "heading")?.attrs?.level).toBe(1);
    for (const mark of ["bold", "italic", "underline"])
      expect(nodes.some((n) => n.marks?.some((m) => m.type === mark)), mark).toBe(true);
    expect(kinds(content)).toContain("orderedList");
  });
});

describe("validation and errors", () => {
  it("accepts supported types and rejects others", () => {
    expect(validateUpload({ name: "a.TXT", size: 10 })).toBeNull();
    expect(validateUpload({ name: "a.pdf", size: 10 })).toMatch(/Unsupported/);
    expect(validateUpload({ name: "noext", size: 10 })).toMatch(/Unsupported/);
    expect(validateUpload({ name: "a.md", size: 0 })).toMatch(/empty/);
    expect(validateUpload({ name: "a.md", size: MAX_UPLOAD_BYTES + 1 })).toMatch(/too large/);
  });
  it("rejects a fake .docx and binary data posing as text", async () => {
    await expect(importFile("fake.docx", buf("not a zip"))).rejects.toBeInstanceOf(ImportError);
    await expect(importFile("bin.txt", Buffer.from([0x68, 0x00, 0x69]))).rejects.toThrow(/binary/);
  });
  it("rejects a corrupt zip with a friendly message", async () => {
    await expect(importFile("bad.docx", Buffer.from([0x50, 0x4b, 1, 2, 3, 4]))).rejects.toThrow(/Couldn't read/);
  });
  it("derives a clean title from the filename", () => {
    expect(titleFromFilename("C:\\docs\\notes.v2.md")).toBe("notes.v2");
    expect(titleFromFilename(".md")).toBe("Untitled upload");
  });
  it("strips a UTF-8 BOM", async () => {
    const { content } = await importFile("a.txt", Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), buf("hi")]));
    expect(JSON.stringify(content)).toContain('"hi"');
  });
});
