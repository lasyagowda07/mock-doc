import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="grid size-16 place-items-center rounded-2xl bg-peach text-peach-ink"><FileQuestion className="size-8" /></span>
      <h1 className="font-display text-3xl font-semibold">Document not found</h1>
      <p className="max-w-sm text-muted-foreground">
        It may have been deleted, or you may not have access. Ask the owner to share it with you.
      </p>
      <Link href="/" className={`${buttonVariants()} h-10 rounded-full px-5`}>Back to my documents</Link>
    </main>
  );
}
