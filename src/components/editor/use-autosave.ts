"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { updateDocument } from "@/app/docs/actions";

export type SaveStatus = "saved" | "unsaved" | "saving" | "error";
type Patch = { title?: string; content?: unknown };

const DEBOUNCE_MS = 800;

/**
 * Debounced, serialized autosave. Patches made while a save is in flight are merged and sent
 * right after, so saves never overlap or arrive out of order (last write wins).
 */
export function useAutosave(docId: string) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<Patch>({});
  const running = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flush = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      while (Object.keys(pending.current).length > 0) {
        const patch = pending.current;
        pending.current = {};
        setStatus("saving");
        let res: Awaited<ReturnType<typeof updateDocument>>;
        try {
          res = await updateDocument(docId, patch);
        } catch {
          res = { ok: false, error: "Couldn't reach the server. Check your connection." };
        }
        if (!res.ok) {
          pending.current = { ...patch, ...pending.current }; // keep for retry
          setError(res.error);
          setStatus("error");
          return;
        }
      }
      setError(null);
      setStatus("saved");
    } finally {
      running.current = false;
    }
  }, [docId]);

  const queue = useCallback(
    (patch: Patch) => {
      pending.current = { ...pending.current, ...patch };
      setStatus("unsaved");
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, DEBOUNCE_MS);
    },
    [flush],
  );

  const saveNow = useCallback(() => {
    clearTimeout(timer.current);
    return flush();
  }, [flush]);

  // Flush on tab hide / unmount, and warn before closing with unsaved work.
  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && void saveNow();
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (Object.keys(pending.current).length > 0 || running.current) e.preventDefault();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      void saveNow();
    };
  }, [saveNow]);

  return { status, error, queue, saveNow };
}
