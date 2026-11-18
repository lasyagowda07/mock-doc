import "server-only";
import { marked } from "marked";
import mammoth from "mammoth";
import { generateJSON } from "@tiptap/html/server";
import { editorExtensions } from "@/lib/editor-extensions";
import { MAX_CONTENT_BYTES } from "@/lib/validation/documents";
import { getExtension, validateUpload } from "@/lib/import/constants";

export type TiptapDoc = { type: "doc"; content: unknown[] };
export class ImportError extends Error {}

const EMPTY_DOC: TiptapDoc = { type: "doc", content: [{ type: "paragraph" }] };

/** Plain text: blank lines separate paragraphs, single newlines become line breaks. */
export function textToDoc(text: string): TiptapDoc {
  const blocks = text.replace(/\r\n?/g, "\n").split(/\n{2,}/).map((b) => b.replace(/^\n+|\n+$/g, "")).filter(Boolean);
  if (blocks.length === 0) return EMPTY_DOC;
  return {
    type: "doc",
    content: blocks.map((block) => ({
      type: "paragraph",
      content: block.split("\n").flatMap((line, i) => [
        ...(i > 0 ? [{ type: "hardBreak" }] : []),
        ...(line ? [{ type: "text", text: line }] : []),
      ]),
    })),
  };
}

/** HTML -> Tiptap JSON through the editor schema, which drops anything it doesn't support (scripts, images, tables…). */
export function htmlToDoc(html: string): TiptapDoc {
  const doc = generateJSON(html, editorExtensions) as TiptapDoc;
  return doc.content?.length ? doc : EMPTY_DOC;
}

export function markdownToDoc(md: string): TiptapDoc {
  return htmlToDoc(marked.parse(md, { async: false, gfm: true }));
}

export async function docxToDoc(buffer: Buffer): Promise<TiptapDoc> {
  const { value } = await mammoth.convertToHtml(
    { buffer },
    { styleMap: ["u => u"], convertImage: mammoth.images.imgElement(async () => ({ src: "" })) },
  );
  return htmlToDoc(value);
}

export function titleFromFilename(filename: string): string {
  const base = filename.replace(/^.*[\\/]/, "").replace(/\.[^.]+$/, "").trim();
  return (base || "Untitled upload").slice(0, 200);
}

const isZip = (b: Buffer) => b.length > 3 && b[0] === 0x50 && b[1] === 0x4b;

export async function importFile(filename: string, bytes: Buffer): Promise<{ title: string; content: TiptapDoc }> {
  const problem = validateUpload({ name: filename, size: bytes.length });
  if (problem) throw new ImportError(problem);

  const ext = getExtension(filename);
  let content: TiptapDoc;
  if (ext === "docx") {
    if (!isZip(bytes)) throw new ImportError("This doesn't look like a valid .docx file.");
    try {
      content = await docxToDoc(bytes);
    } catch {
      throw new ImportError("Couldn't read this .docx file. It may be corrupt or password-protected.");
    }
  } else {
    if (bytes.includes(0)) throw new ImportError("This file looks binary, not text.");
    const text = bytes.toString("utf8").replace(/^﻿/, "");
    content = ext === "txt" ? textToDoc(text) : markdownToDoc(text);
  }

  if (JSON.stringify(content).length > MAX_CONTENT_BYTES)
    throw new ImportError("This file is too large to import as a document.");
  return { title: titleFromFilename(filename), content };
}
