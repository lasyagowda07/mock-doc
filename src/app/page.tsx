import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { Dashboard } from "@/components/dashboard";
import { getCurrentUser, listDocuments } from "@/lib/documents";

export const metadata = { title: "My documents · Ajaia Docs" };

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const docs = await listDocuments(user.id);

  return (
    <>
      <AppHeader name={user.display_name} email={user.email} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-10">
        <Dashboard docs={docs} firstName={user.display_name.split(" ")[0]} />
      </main>
    </>
  );
}
