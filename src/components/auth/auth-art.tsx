"use client";

import { motion } from "framer-motion";
import { FileDown, PenLine, Users } from "lucide-react";
import { DocPreview } from "@/components/doc-preview";
import { Logo } from "@/components/logo";

const t = (text: string, bold = false) => ({ type: "text", text, ...(bold ? { marks: [{ type: "bold" }] } : {}) });
const p = (...content: object[]) => ({ type: "paragraph", content });
const h = (level: number, text: string) => ({ type: "heading", attrs: { level }, content: [t(text)] });
const li = (text: string) => ({ type: "listItem", content: [p(t(text))] });

const SAMPLES = [
  { tint: "bg-peach", pos: "right-[8%] top-[7%] w-60 rotate-[5deg]", delay: 0, doc: { content: [h(1, "Launch plan"), p(t("Ship in "), t("three", true), t(" steps.")), { type: "orderedList", content: [li("Draft"), li("Review"), li("Publish")] }] } },
  { tint: "bg-sage", pos: "right-[30%] top-[30%] w-56 -rotate-[4deg]", delay: 0.8, doc: { content: [h(2, "Meeting notes"), p(t("Decision: ", true), t("go with Supabase.")), { type: "bulletList", content: [li("Auth"), li("Postgres"), li("Storage")] }] } },
  { tint: "bg-lavender", pos: "right-[4%] top-[48%] w-52 rotate-[3deg]", delay: 1.6, doc: { content: [h(2, "Ideas"), p(t("Blog post, demo video, newsletter."))] } },
];

const FEATURES = [
  { icon: PenLine, tone: "bg-peach text-peach-ink", text: "A calm editor with rich formatting and autosave" },
  { icon: Users, tone: "bg-sage text-sage-ink", text: "Share with editor and viewer roles you control" },
  { icon: FileDown, tone: "bg-lavender text-lavender-ink", text: "Import .docx and .md, export to Markdown or PDF" },
];

export function AuthArt() {
  return (
    <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12" style={{ background: "linear-gradient(150deg, oklch(0.94 0.06 60), oklch(0.96 0.06 90) 45%, oklch(0.94 0.045 295))" }}>
      {/* soft drifting color blobs */}
      <motion.div aria-hidden className="absolute -left-24 top-1/3 size-96 rounded-full bg-peach/70 blur-3xl" animate={{ x: [0, 40, 0], y: [0, -30, 0] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div aria-hidden className="absolute -bottom-20 right-10 size-96 rounded-full bg-lavender/80 blur-3xl" animate={{ x: [0, -30, 0], y: [0, 24, 0] }} transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }} />

      <div className="relative z-10"><Logo /></div>

      {SAMPLES.map((s, i) => (
        <motion.div
          key={i}
          aria-hidden
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + i * 0.15, type: "spring", stiffness: 120, damping: 18 }}
          className={`absolute ${s.pos}`}
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut", delay: s.delay }}
            className={`h-44 rounded-2xl p-3 pb-0 shadow-lift ${s.tint}`}
          >
            <DocPreview preview={s.doc} />
          </motion.div>
        </motion.div>
      ))}

      <div className="relative z-10 max-w-md">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="font-display text-5xl font-semibold leading-[1.08] tracking-tight"
        >
          Write together, <span className="italic text-primary">beautifully.</span>
        </motion.h2>
        <ul className="mt-8 space-y-3.5">
          {FEATURES.map(({ icon: Icon, tone, text }, i) => (
            <motion.li key={text} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.1 }} className="flex items-center gap-3 text-[15px] text-foreground/85">
              <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${tone}`}><Icon className="size-[18px]" /></span>
              {text}
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}
