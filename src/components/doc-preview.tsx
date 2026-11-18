import type { ReactNode } from "react";

type Mark = { type: string };
type PNode = { type?: string; attrs?: { level?: number }; content?: PNode[]; text?: string; marks?: Mark[] };

function inline(node: PNode, key: number): ReactNode {
  if (node.type === "hardBreak") return <br key={key} />;
  if (node.type !== "text" || !node.text) return null;
  const cls = (node.marks ?? [])
    .map((m) => ({ bold: "font-bold", italic: "italic", underline: "underline", strike: "line-through", code: "font-mono", link: "underline" })[m.type])
    .filter(Boolean)
    .join(" ");
  return <span key={key} className={cls || undefined}>{node.text}</span>;
}

function block(node: PNode, key: number): ReactNode {
  const kids = (node.content ?? []).map((c, i) => (c.type === "text" || c.type === "hardBreak" ? inline(c, i) : block(c, i)));
  switch (node.type) {
    case "heading": {
      const size = { 1: "text-[26px] leading-tight", 2: "text-[21px] leading-tight", 3: "text-[17px] leading-snug" }[node.attrs?.level ?? 1] ?? "text-[17px]";
      return <p key={key} className={`font-display font-semibold ${size} mt-3 first:mt-0`}>{kids}</p>;
    }
    case "bulletList":
      return <ul key={key} className="list-disc pl-6">{kids}</ul>;
    case "orderedList":
      return <ol key={key} className="list-decimal pl-6">{kids}</ol>;
    case "listItem":
      return <li key={key}>{kids}</li>;
    case "blockquote":
      return <blockquote key={key} className="border-l-2 pl-3 italic">{kids}</blockquote>;
    case "codeBlock":
      return <pre key={key} className="whitespace-pre-wrap font-mono text-[13px]">{kids}</pre>;
    case "horizontalRule":
      return <hr key={key} className="my-2" />;
    case "paragraph":
      return <p key={key} className="min-h-[1em]">{kids}</p>;
    default:
      return <div key={key}>{kids}</div>;
  }
}

/** A miniature page: renders the first blocks of a document at "real" size, then scales it down. */
export function DocPreview({ preview }: { preview: PNode }) {
  const blocks = preview.content ?? [];
  const isEmpty = blocks.every((b) => !b.content?.length);

  return (
    <div aria-hidden className="relative h-full w-full overflow-hidden rounded-lg bg-card shadow-soft ring-1 ring-black/[0.04]">
      {isEmpty ? (
        <div className="space-y-2 p-4">
          {[70, 95, 85, 55].map((w, i) => (
            <div key={i} className="h-1.5 rounded-full bg-muted-foreground/15" style={{ width: `${w}%` }} />
          ))}
        </div>
      ) : (
        <div className="origin-top-left select-none" style={{ width: "200%", transform: "scale(0.5)" }}>
          <div className="space-y-2 p-6 font-doc text-[15px] leading-relaxed text-foreground/90">{blocks.map(block)}</div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent" />
    </div>
  );
}
