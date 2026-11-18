import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-svh flex-col">
      <div className="flex h-16 items-center gap-3 border-b bg-background/60 px-4">
        <Skeleton className="size-8 rounded-lg" />
        <Skeleton className="h-9 w-64 rounded-xl" />
      </div>
      <div className="mx-auto mt-8 w-full max-w-3xl space-y-4 rounded-2xl border bg-card p-14 shadow-soft">
        <Skeleton className="h-9 w-1/2 rounded-lg" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
