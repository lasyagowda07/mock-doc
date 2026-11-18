import { notFound, redirect } from "next/navigation";
import { DocEditor } from "@/components/editor/doc-editor";
import { getCurrentUser, getDocument } from "@/lib/documents";
import { docIdSchema } from "@/lib/validation/documents";

export default async function DocPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ print?: string }> }) {
  const { id } = await params;
  const { print } = await searchParams;
  if (!docIdSchema.safeParse(id).success) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const doc = await getDocument(id, user.id);
  if (!doc) notFound();

  return <DocEditor doc={doc} user={{ name: user.display_name, email: user.email }} autoPrint={print === "1"} />;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const doc = user && docIdSchema.safeParse(id).success ? await getDocument(id, user.id) : null;
  return { title: `${doc?.title ?? "Document"} · Ajaia Docs` };
}
