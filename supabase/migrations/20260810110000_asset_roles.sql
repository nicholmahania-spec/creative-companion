-- Asset Library Phase 1: source materials and produced work share one durable
-- file store, but must never be confused as delivery inputs.
alter table public.assets
  add column if not exists role text not null default 'source'
    check (role in ('source', 'produced')),
  add column if not exists origin text not null default 'imported'
    check (origin in ('client', 'designer', 'imported'));

-- Existing rows predate this distinction. Preserve them conservatively as
-- imported source material so no legacy upload can become deliverable merely
-- by receiving a schema default.
update public.assets
  set role = 'source', origin = 'imported'
  where role is null or origin is null;

update storage.buckets
  set allowed_mime_types = array[
    'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif',
    'image/svg+xml', 'application/pdf'
  ]
  where id = 'brand-assets';
