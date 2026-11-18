"use client";

import { useSyncExternalStore } from "react";
import { timeAgo } from "@/lib/format";

const subscribe = (cb: () => void) => {
  const id = setInterval(cb, 60_000);
  return () => clearInterval(id);
};

const absolute = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** Relative time on the client; deterministic absolute date for server render/hydration. */
export function TimeAgo({ iso }: { iso: string }) {
  const text = useSyncExternalStore(subscribe, () => timeAgo(iso), () => absolute(iso));
  return <time dateTime={iso}>{text}</time>;
}
