"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="grid size-16 place-items-center rounded-2xl bg-butter text-butter-ink"><TriangleAlert className="size-8" /></span>
      <h1 className="font-display text-3xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground">We couldn&apos;t load this page. Please try again.</p>
      <Button onClick={reset} className="h-10 rounded-full px-5">Try again</Button>
    </main>
  );
}
