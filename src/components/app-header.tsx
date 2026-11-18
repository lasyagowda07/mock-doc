import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadDialog } from "@/components/upload-dialog";
import { UserMenu } from "@/components/user-menu";
import { createDocument } from "@/app/docs/actions";

export function AppHeader({ name, email }: { name: string; email: string }) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <FileText className="size-5" /> Ajaia Docs
        </Link>
        <div className="flex items-center gap-3">
          <UploadDialog />
          <form action={createDocument}>
            <Button type="submit">
              <Plus /> New document
            </Button>
          </form>
          <UserMenu name={name} email={email} />
        </div>
      </div>
    </header>
  );
}
