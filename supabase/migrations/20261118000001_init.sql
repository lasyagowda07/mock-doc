-- Profiles ---------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, lower(new.email),
          coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Documents --------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Untitled document' check (char_length(title) between 1 and 200),
  content jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  source text not null default 'created' check (source in ('created', 'uploaded')),
  original_filename text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index documents_owner_idx on public.documents(owner_id);

create function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger documents_updated_at before update on public.documents
  for each row execute function public.set_updated_at();

-- Shares -----------------------------------------------------------------
create table public.document_shares (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('editor', 'viewer')),
  created_at timestamptz not null default now(),
  unique (document_id, user_id)
);
create index shares_user_idx on public.document_shares(user_id);
create index shares_doc_idx on public.document_shares(document_id);

-- Access helpers (security definer avoids RLS recursion between the two tables)
create function public.is_owner(doc uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from documents where id = doc and owner_id = auth.uid());
$$;

create function public.can_view(doc uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_owner(doc)
      or exists (select 1 from document_shares where document_id = doc and user_id = auth.uid());
$$;

create function public.can_edit(doc uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_owner(doc)
      or exists (select 1 from document_shares
                 where document_id = doc and user_id = auth.uid() and role = 'editor');
$$;

-- RLS --------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.document_shares enable row level security;

create policy "profiles readable by signed-in users" on public.profiles
  for select to authenticated using (true);

create policy "view own or shared documents" on public.documents
  for select to authenticated using (public.can_view(id));
create policy "create own documents" on public.documents
  for insert to authenticated with check (owner_id = auth.uid());
create policy "owners and editors update documents" on public.documents
  for update to authenticated using (public.can_edit(id)) with check (public.can_edit(id));
create policy "owners delete documents" on public.documents
  for delete to authenticated using (owner_id = auth.uid());

create policy "owner or recipient sees shares" on public.document_shares
  for select to authenticated using (public.is_owner(document_id) or user_id = auth.uid());
create policy "owner adds shares" on public.document_shares
  for insert to authenticated
  with check (public.is_owner(document_id) and user_id <> auth.uid());
create policy "owner changes shares" on public.document_shares
  for update to authenticated using (public.is_owner(document_id)) with check (public.is_owner(document_id));
create policy "owner removes shares" on public.document_shares
  for delete to authenticated using (public.is_owner(document_id));

-- Editors may change title/content only, never ownership or provenance.
create function public.guard_document_columns() returns trigger language plpgsql as $$
begin
  if new.owner_id <> old.owner_id or new.source <> old.source
     or new.original_filename is distinct from old.original_filename then
    raise exception 'owner_id, source and original_filename are immutable';
  end if;
  return new;
end $$;
create trigger documents_guard before update on public.documents
  for each row execute function public.guard_document_columns();
