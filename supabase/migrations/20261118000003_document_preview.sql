-- Thumbnail previews: a small slice of the document (first blocks) kept next to it, so the
-- dashboard doesn't have to download entire documents just to draw cards.
create function public.compute_preview(c jsonb) returns jsonb
language plpgsql immutable set search_path = public as $$
declare
  p jsonb;
  excerpt text;
begin
  p := jsonb_build_object(
    'type', 'doc',
    'content', coalesce(jsonb_path_query_array(c, '$.content[0 to 5]'), '[]'::jsonb)
  );
  if octet_length(p::text) > 12000 then
    -- A few enormous blocks: fall back to a plain-text excerpt.
    select left(coalesce(string_agg(t #>> '{}', ' '), ''), 500)
      into excerpt from jsonb_path_query(c, '$.**.text') as t;
    p := jsonb_build_object('type', 'doc', 'content', jsonb_build_array(
      case when excerpt = '' then jsonb_build_object('type', 'paragraph')
           else jsonb_build_object('type', 'paragraph',
                  'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', excerpt)))
      end));
  end if;
  return p;
end $$;

alter table public.documents
  add column preview jsonb not null default '{"type":"doc","content":[]}'::jsonb;

-- Always derived from content (also on insert), so clients can never set it.
create function public.set_preview() returns trigger language plpgsql as $$
begin
  new.preview := public.compute_preview(new.content);
  return new;
end $$;

create trigger documents_preview before insert or update on public.documents
  for each row execute function public.set_preview();

-- Backfill without bumping updated_at (the "Edited … ago" label must not change).
alter table public.documents disable trigger documents_updated_at;
update public.documents set content = content;
alter table public.documents enable trigger documents_updated_at;
