import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-xl font-semibold">Document not found</h1>
      <p className="max-w-sm text-muted-foreground">
        It may have been deleted, or you may not have access. Ask the owner to share it with you.
      </p>
      <Link href="/" className={buttonVariants()}>Back to my documents</Link>
    </main>
  );
}
