-- INSERT ... RETURNING evaluates the SELECT policy before the new row is visible to
-- can_view()'s own query, so owners need a direct column check.
drop policy "view own or shared documents" on public.documents;
create policy "view own or shared documents" on public.documents
  for select to authenticated using (owner_id = auth.uid() or public.can_view(id));
