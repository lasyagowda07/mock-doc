"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FilePen, FileUp, Plus, Search, Users, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentCard } from "@/components/document-card";
import { itemVariants, listVariants } from "@/components/motion";
import { Input } from "@/components/ui/input";
import { createDocument } from "@/app/docs/actions";
import type { DocListItem } from "@/lib/types";

type SectionProps = {
  title: string;
  hint: string;
  icon: LucideIcon;
  tone: string; // pastel chip classes
  docs: DocListItem[];
  empty: React.ReactNode;
};

function Section({ title, hint, icon: Icon, tone, docs, empty }: SectionProps) {
  return (
    <motion.section variants={itemVariants} aria-labelledby={`h-${title}`} className="space-y-4">
      <div className="flex items-center gap-3">
        <span className={`grid size-10 place-items-center rounded-xl ${tone}`}>
          <Icon className="size-5" />
        </span>
        <div>
          <h2 id={`h-${title}`} className="font-display text-2xl font-semibold leading-none">
            {title} <span className="font-sans text-sm font-medium text-muted-foreground">({docs.length})</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
        </div>
      </div>

      {docs.length === 0 ? (
        <div className="flex items-center gap-4 rounded-2xl border border-dashed border-border bg-card/50 p-6 text-sm text-muted-foreground">
          <motion.span
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            className={`grid size-11 shrink-0 place-items-center rounded-full ${tone}`}
          >
            <Icon className="size-5" />
          </motion.span>
          <div>{empty}</div>
        </div>
      ) : (
        <motion.div layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {docs.map((d) => <DocumentCard key={d.id} doc={d} />)}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.section>
  );
}

export function Dashboard({ docs, firstName }: { docs: DocListItem[]; firstName: string }) {
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
  const noMatch = <>No matches for “{query}”.</>;

  return (
    <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-12">
      <motion.div variants={itemVariants} className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Welcome back</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            {firstName}&apos;s <span className="italic text-primary">workspace</span>
          </h1>
          <p className="mt-2 max-w-md text-muted-foreground">Write, import and share documents, all in one calm place.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title…"
            aria-label="Search documents"
            className="h-11 rounded-full border-border/80 bg-card/80 pl-10 shadow-soft transition-shadow focus-visible:shadow-lift"
          />
        </div>
      </motion.div>

      <Section
        title="My documents"
        hint="Documents you created."
        icon={FilePen}
        tone="bg-peach text-peach-ink"
        docs={mine}
        empty={
          query ? noMatch : (
            <div className="flex flex-wrap items-center gap-3">
              <span>Nothing here yet. Start your first document.</span>
              <form action={createDocument}>
                <Button type="submit" size="sm" className="rounded-full"><Plus /> Create one</Button>
              </form>
            </div>
          )
        }
      />
      <Section
        title="Uploaded documents"
        hint="Documents imported from files you uploaded."
        icon={FileUp}
        tone="bg-sage text-sage-ink"
        docs={uploaded}
        empty={query ? noMatch : "No uploads yet. Use “Upload” to import a .txt, .md or .docx file."}
      />
      <Section
        title="Shared with me"
        hint="Documents other people shared with you."
        icon={Users}
        tone="bg-lavender text-lavender-ink"
        docs={shared}
        empty={query ? noMatch : "Nothing has been shared with you yet."}
      />
    </motion.div>
  );
}
