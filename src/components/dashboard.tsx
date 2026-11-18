"use client";

import { useMemo, useState } from "react";
import { FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DocumentCard } from "@/components/document-card";
import type { DocListItem } from "@/lib/types";

function Section({ title, hint, docs, empty }: { title: string; hint: string; docs: DocListItem[]; empty: string }) {
  return (
    <section aria-labelledby={`h-${title}`} className="space-y-3">
      <div>
        <h2 id={`h-${title}`} className="text-lg font-semibold">
          {title} <span className="text-sm font-normal text-muted-foreground">({docs.length})</span>
        </h2>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      {docs.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          <FileText className="size-4" /> {empty}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {docs.map((d) => <DocumentCard key={d.id} doc={d} />)}
        </div>
      )}
    </section>
  );
}

export function Dashboard({ docs }: { docs: DocListItem[] }) {
  const [query, setQuery] = useState("");
  const { mine, uploaded, shared } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = q ? docs.filter((d) => d.title.toLowerCase().includes(q)) : docs;
    return {
      mine: visible.filter((d) => d.role === "owner" && d.source === "created"),
      uploaded: visible.filter((d) => d.role === "owner" && d.source === "uploaded"),
      shared: visible.filter((d) => d.role !== "owner"),
    };
  }, [docs, query]);

  return (
    <div className="space-y-8">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-2 size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title…"
          aria-label="Search documents"
          className="pl-8"
        />
      </div>
      <Section title="My documents" hint="Documents you created." docs={mine} empty={query ? "No matches." : "Nothing here yet. Click “New document” to start writing."} />
      <Section title="Uploaded documents" hint="Documents imported from files you uploaded." docs={uploaded} empty={query ? "No matches." : "No uploads yet. Use “Upload” to import a .txt, .md or .docx file."} />
      <Section title="Shared with me" hint="Documents other people shared with you." docs={shared} empty={query ? "No matches." : "Nothing has been shared with you yet."} />
    </div>
  );
}
