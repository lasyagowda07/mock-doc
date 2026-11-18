import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeaderShell } from "@/components/header-shell";
import { Logo } from "@/components/logo";
import { Pressable } from "@/components/motion";
import { UploadDialog } from "@/components/upload-dialog";
import { UserMenu } from "@/components/user-menu";
import { createDocument } from "@/app/docs/actions";

export function AppHeader({ name, email }: { name: string; email: string }) {
  return (
    <HeaderShell>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Logo />
        <div className="flex items-center gap-2 sm:gap-3">
          <Pressable>
            <UploadDialog />
          </Pressable>
          <Pressable>
            <form action={createDocument}>
              <Button type="submit" className="h-9 rounded-full px-4 shadow-soft">
                <Plus className="transition-transform duration-300 group-hover/button:rotate-90" />
                <span className="max-sm:sr-only">New document</span>
              </Button>
            </form>
          </Pressable>
          <UserMenu name={name} email={email} />
        </div>
      </div>
    </HeaderShell>
  );
}
