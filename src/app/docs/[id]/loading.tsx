import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <div className="flex h-14 items-center gap-3 border-b bg-background px-4">
        <Skeleton className="size-6" />
        <Skeleton className="h-9 w-64" />
      </div>
      <div className="mx-auto mt-8 w-full max-w-3xl space-y-3 rounded-lg border bg-background p-12">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
