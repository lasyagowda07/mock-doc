// Tiptap JSON -> Markdown. Pure and deterministic (runs on server and client).
// Markdown has no underline, so it is emitted as <u>…</u> (widely supported inline HTML).

type Mark = { type: string; attrs?: Record<string, unknown> };
type Node = { type?: string; attrs?: Record<string, unknown>; content?: Node[]; text?: string; marks?: Mark[] };

const escapeText = (t: string) => t.replace(/([\\`*_[\]<>])/g, "\\$1");

/** Escape characters that would start a block when they begin a line. */
const escapeLineStarts = (s: string) =>
  s
    .replace(/^(#{1,6})(?=\s)/gm, "\\$1")
    .replace(/^([-+])(?=\s)/gm, "\\$1")
    .replace(/^(\d+)\.(?=\s)/gm, "$1\\.");

function wrap(text: string, marks: Mark[] = []): string {
  // Emphasis markers can't hug whitespace, so keep surrounding spaces outside the markers.
  const [, lead, core, trail] = text.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
  if (!core) return text;
  let out = marks.some((m) => m.type === "code") ? `\`${core}\`` : escapeText(core);
  for (const m of marks) {
    if (m.type === "bold") out = `**${out}**`;
    else if (m.type === "italic") out = `*${out}*`;
    else if (m.type === "strike") out = `~~${out}~~`;
    else if (m.type === "underline") out = `<u>${out}</u>`;
    else if (m.type === "link" && typeof m.attrs?.href === "string") out = `[${out}](${m.attrs.href})`;
  }
  return lead + out + trail;
}

function inline(nodes: Node[] = [], escapeStarts = true): string {
  const s = nodes
    .map((n) => (n.type === "hardBreak" ? "\\\n" : n.type === "text" ? wrap(n.text ?? "", n.marks) : inline(n.content, false)))
    .join("");
  return escapeStarts ? escapeLineStarts(s) : s;
}

const indentLines = (s: string, pad: string) => s.split("\n").map((l) => (l ? pad + l : l)).join("\n");

function list(node: Node): string {
  const ordered = node.type === "orderedList";
  const start = typeof node.attrs?.start === "number" ? node.attrs.start : 1;
  return (node.content ?? [])
    .map((item, i) => {
      const marker = ordered ? `${start + i}. ` : "- ";
      const parts = blocks(item.content ?? []);
      const body = parts.map((p, j) => (j === 0 ? p : (/^(- |\d+\. )/.test(p) ? "\n" : "\n\n") + p)).join("");
      return marker + indentLines(body, " ".repeat(marker.length)).trimStart();
    })
    .join("\n");
}

function blocks(nodes: Node[]): string[] {
  const out: string[] = [];
  for (const n of nodes) {
    switch (n.type) {
      case "paragraph": {
        const text = inline(n.content);
        out.push(text);
        break;
      }
      case "heading":
        out.push(`${"#".repeat(Number(n.attrs?.level) || 1)} ${inline(n.content, false)}`);
        break;
      case "bulletList":
      case "orderedList":
        out.push(list(n));
        break;
      case "blockquote":
        out.push(indentLines(blocks(n.content ?? []).join("\n\n"), "> ").replace(/^(?!> )(?=.)/gm, "> "));
        break;
      case "codeBlock":
        out.push("```" + String(n.attrs?.language ?? "") + "\n" + (n.content ?? []).map((c) => c.text ?? "").join("") + "\n```");
        break;
      case "horizontalRule":
        out.push("---");
        break;
      default:
        if (n.content) out.push(...blocks(n.content));
    }
  }
  return out;
}

export function docToMarkdown(doc: { content?: unknown[] }): string {
  // Empty paragraphs are dropped: Markdown collapses blank lines anyway.
  const parts = blocks((doc.content ?? []) as Node[]).filter((b) => b.trim() !== "");
  return parts.join("\n\n") + "\n";
}

/** A safe, readable filename (keeps Unicode letters, strips path/reserved characters). */
export function exportFilename(title: string, ext: string): string {
  const base = title
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .slice(0, 100)
    .trim();
  return `${base || "document"}.${ext}`;
}
