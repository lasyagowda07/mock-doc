"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SaveStatus } from "@/components/editor/use-autosave";

const swap = {
  initial: { opacity: 0, y: 5, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -5, scale: 0.96 },
  transition: { duration: 0.16 },
};

function AnimatedCheck() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 text-sage-ink" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, ease: "easeOut" }} />
    </svg>
  );
}

/** Saved / Saving / Not saved, with a soft cross-fade between states. */
export function SaveStatusIndicator({ status, error, onRetry }: { status: SaveStatus; error: string | null; onRetry: () => void }) {
  const key = status === "error" ? "error" : status === "saved" ? "saved" : "saving";
  return (
    // data-save-status is the true state (the visible label cross-fades), handy for tests and tooling.
    <span data-save-status={status} className="contents">
    <AnimatePresence mode="wait" initial={false}>
      {key === "error" ? (
        <motion.span key="error" {...swap} role="alert" className="flex items-center gap-1.5 rounded-full bg-destructive/10 py-1 pl-2.5 pr-1.5 text-sm text-destructive" title={error ?? undefined}>
          <AlertCircle className="size-4 shrink-0" />
          <span className="max-w-56 truncate">Not saved{error ? ` — ${error}` : ""}</span>
          <Button size="xs" variant="outline" className="rounded-full" onClick={onRetry}>Retry</Button>
        </motion.span>
      ) : key === "saving" ? (
        <motion.span key="saving" {...swap} aria-live="polite" className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Saving…
        </motion.span>
      ) : (
        <motion.span key="saved" {...swap} aria-live="polite" className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <AnimatedCheck />Saved
        </motion.span>
      )}
    </AnimatePresence>
    </span>
  );
}
