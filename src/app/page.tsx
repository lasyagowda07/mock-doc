import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./(auth)/actions";

// Placeholder until the Sprint 2 dashboard.
export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", data.user!.id)
    .single();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Hello, {profile?.display_name}</h1>
      <p className="text-muted-foreground">{profile?.email}</p>
      <form action={signOut}>
        <Button variant="outline">Sign out</Button>
      </form>
    </main>
  );
}
