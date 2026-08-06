-- Phase 7, part one: the Asset Library — the thing the creative-tool bridge
-- delivers INTO.
--
-- Phase 7 is written as "push an asset from Illustrator into the Asset Library
-- with source_app recorded". Checked before building: there is no Asset
-- Library. `source_app` appears nowhere in the tree, there is no assets table,
-- and Brand Applications — the stage that is supposed to hold finished work —
-- stores `touchpointApps: { [id]: { note, done } }`. A note and a checkbox.
-- There is no column anywhere that a business card can land in.
--
-- So the bridge is not the first work in this phase; the destination is.
--
-- THREE SHAPE DECISIONS, each of which had a cheaper wrong answer:
--
-- 1. METADATA IS A ROW, THE FILE IS AN OBJECT — because browser storage is
--    EVICTABLE, not because it is too small.
--
--    That distinction is a correction, and the first version of this header
--    got it wrong in a way worth preserving as a warning. It argued: every
--    image in this app is a data URL in the localStorage blob, the store
--    already ships "Browser storage is full — changes are NOT being saved"
--    (useAppStore.js:552) against a 3.5 MB cap (moodPins.js), a print-ready
--    PDF exceeds that whole budget, therefore bytes must live remotely.
--
--    The first three clauses are true. The "therefore" does not follow, and a
--    devil's-advocate pass caught it: that is an argument against
--    LOCALSTORAGE, and localStorage is not the only local store. IndexedDB
--    holds Blobs natively with no base64 inflation, and its quota is a share
--    of free disk — Chrome up to 60% of it — against Web Storage's hard
--    10 MiB ceiling. A 50 MB PDF fits locally without difficulty. Nothing in
--    this repo had ever evaluated it; `indexedDB`, `OPFS` and `caches.`
--    appear nowhere in src/ or the phase docs.
--
--    The real reason to keep durable bytes server-side is eviction, not size.
--    Best-effort browser storage is cleared LRU under disk pressure,
--    all-or-nothing per origin, and Safari proactively deletes script-created
--    data for origins unvisited for 7 days. `navigator.storage.persist()`
--    helps and does not settle it — the user can still clear it at will. A
--    designer's only copy of a client's deliverable living there is a
--    data-loss headline waiting to be written.
--
--    So: durable copy remote, and — see the note on PHASES.md Phase 1b — a
--    local cache in front of it, because remote-only reads break the app's
--    own stated offline guarantee. Rows here, bytes in Storage, cache in
--    IndexedDB, and the row is what syncs.
--
--    Do NOT re-justify this with "To BLOB or Not To BLOB" (Sears/van Ingen/
--    Gray, MSR-TR-2006-45). It was checked. It compares SQL Server BLOBs to
--    NTFS in 2006, reports database-wins under ~256 KB, and nobody here
--    proposed putting bytes in a Postgres column. Citing it would be
--    cargo-culting an unrelated result into a browser/object-store setting.
--
-- 2. VERSIONS ACCUMULATE, THEY DO NOT OVERWRITE. A bridge makes re-pushing
--    cheap — that is its whole point — so the same artboard will arrive from
--    Illustrator ten times in an afternoon. The tempting shape is
--    `unique (source_app, source_ref)` with an upsert, which keeps the
--    library tidy by throwing away every earlier version. PRD §17 asks for
--    the opposite in as many words: "maintain version history rather than
--    simply replacing old files", because the argument a designer actually
--    has with a client is about WHICH version was approved. `replaces_id`
--    chains them instead, and `superseded` is derived (see the view below),
--    never stored, so it cannot disagree with the chain.
--
-- 3. THE BUCKET IS PRIVATE. Both existing buckets are `public: true`.
--    Deliberately not copied. workspace-images holds the owner's own mood
--    pins; this holds unreleased client identity work, frequently under NDA,
--    and a public bucket serves object URLs without consulting RLS at all
--    (see 20260731120000). An unannounced rebrand leaking via a guessable
--    object URL is a career-grade harm for the designer, not an inconvenience.
--    The cost is real and is paid in app code: reads need signed URLs, so
--    `getPublicUrl` does not work here.

-- No `if not exists` on the table: adopting an unknown shape someone else
-- created and attaching policies to it is the wrong failure mode on a
-- security-establishing migration. Indexes keep it; re-running those is free.

-- ----------------------------------------------------------------- assets ---
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null,

  name text not null check (length(name) between 1 and 200),

  -- Slug-shaped rather than an enum, on purpose. PRD §12 lists fourteen
  -- categories and the trimmed MVP (Expansion Spec §5) ships four; a
  -- CHECK-list enum would make "designers can now file packaging" a
  -- migration, which is how a category list ossifies. The app owns the
  -- offered list; the column owns the shape only. Slug-shaped so a typo
  -- becomes an error rather than a fifteenth category.
  category text not null default 'other'
    check (category ~ '^[a-z0-9][a-z0-9_-]{0,39}$'),

  -- WHERE IT CAME FROM. The column Phase 7 is named after.
  --
  -- 'upload' is the honest default and is NOT a stand-in for unknown: a file
  -- the designer dragged in genuinely came from their own hands, and that is
  -- a different provenance from one a plugin pushed. Consistency checking
  -- (Phase 6) reads this — a mark that arrived from Illustrator can be
  -- trusted to carry real vector colour, while a photographic mockup cannot,
  -- and flagging the second as if it were the first is how a checker starts
  -- crying wolf.
  source_app text not null default 'upload'
    check (source_app ~ '^[a-z0-9][a-z0-9_-]{0,39}$'),

  -- The id the SOURCE tool knows this by — an Illustrator artboard id, a
  -- Figma node key. Not unique, by decision 2 above: it is the thread that
  -- ties versions together, not an identity that collapses them.
  source_ref text check (source_ref is null or length(source_ref) <= 500),

  -- Object key in the brand-assets bucket. Nullable because a record can
  -- legitimately exist before its bytes finish uploading, and a failed upload
  -- must leave a visible broken row rather than nothing — a file that
  -- vanishes without trace is the failure this audience least recovers from.
  storage_path text check (storage_path is null or length(storage_path) <= 1000),
  mime_type text check (mime_type is null or length(mime_type) <= 200),
  byte_size bigint check (byte_size is null or byte_size >= 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),

  -- PRD §12 "mark assets as approved". Same vocabulary as `decisions.status`
  -- so the two never need translating between.
  status text not null default 'draft'
    check (status in ('draft', 'proposed', 'approved', 'rejected')),
  approved_at timestamptz,
  constraint assets_approved_coherent
    check ((status = 'approved') = (approved_at is not null)),

  -- The previous version of THIS asset. Null for a first version.
  replaces_id uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Composite target so the self-FK below can carry project + owner alignment.
  constraint assets_id_project_owner_key unique (id, project_id, owner_id),

  -- Structural owner alignment, matching clients/brands/projects. The policies
  -- below check ONLY auth.uid() = owner_id; this FK is the entire parent
  -- enforcement, and it holds against service_role and SECURITY DEFINER
  -- writers that never consult a policy.
  constraint assets_project_owner_fkey
    foreign key (project_id, owner_id)
    references public.projects (id, owner_id) on delete cascade,

  -- A version chain may not cross projects OR owners. Learned from
  -- 20260805140000, where owner-alignment alone let a decision in one project
  -- reference a token in another, and the cascade then reached across.
  -- RESTRICT rather than SET NULL: breaking the chain is what loses the
  -- history this column exists to keep, so deleting a superseded version has
  -- to be a deliberate act on the chain, not a side effect.
  constraint assets_replaces_project_owner_fkey
    foreign key (replaces_id, project_id, owner_id)
    references public.assets (id, project_id, owner_id) on delete restrict,

  -- An asset cannot replace itself. Longer cycles are not reachable:
  -- replaces_id points at a row that already existed, so the chain is
  -- append-only and acyclic by construction.
  constraint assets_no_self_replace check (replaces_id is null or replaces_id <> id)
);

-- The library view: newest first, scoped the way every read scopes it.
create index if not exists assets_project_idx
  on public.assets (owner_id, project_id, created_at desc);

-- The referencing side of the self-FK. Without it, RESTRICT re-checks by
-- sequential scan on every delete.
create index if not exists assets_replaces_idx
  on public.assets (owner_id, project_id, replaces_id)
  where replaces_id is not null;

-- ONE SUCCESSOR PER VERSION. A chain, not a tree.
--
-- Added after a devil's-advocate pass found the hole: without this, two rows
-- may legally point at the same predecessor, so a fork is reachable at the
-- database level. That is the precise outcome `findVersionTarget`'s own
-- comment names as the bad one — the library shows the same asset twice and
-- neither entry is wrong.
--
-- The client-side mitigation does NOT close it, which is why the constraint
-- has to be here. `currentAssets()` returns filter order and
-- `findVersionTarget` takes `heads[0]`, so under a fork the "current" version
-- is decided by array order rather than by anything anyone chose. Two pushes
-- of the same artboard racing on a flaky connection is not exotic; it is the
-- normal behaviour of a bridge that makes re-pushing free.
--
-- As a constraint the race becomes a 23505 the bridge can catch and retry
-- against the new head, which is a recoverable event with a correct outcome.
-- As array order it is a silent duplicate the designer has to notice.
create unique index if not exists assets_one_successor_idx
  on public.assets (replaces_id)
  where replaces_id is not null;

-- "Has this artboard been pushed before?" — the bridge's hot path, run on
-- every push to find the version to chain onto.
create index if not exists assets_source_ref_idx
  on public.assets (owner_id, project_id, source_app, source_ref)
  where source_ref is not null;

-- --------------------------------------------------------------------- RLS ---
alter table public.assets enable row level security;

revoke all on public.assets from anon;
revoke truncate on public.assets from authenticated;

create policy "assets_select_own" on public.assets
  for select to authenticated using (auth.uid() = owner_id);
create policy "assets_insert_own" on public.assets
  for insert to authenticated with check (auth.uid() = owner_id);
create policy "assets_update_own" on public.assets
  for update to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
-- Assets DO get a delete policy, unlike `decisions`. The asymmetry is
-- intentional and worth stating so it is not "tidied" later: a decision is a
-- record OF something and deleting it destroys history that exists nowhere
-- else, whereas an asset is a copy of a file the designer still holds in
-- Illustrator. Deleting a wrongly-pushed asset is routine and must not need
-- a support request. The version chain is protected separately, by the
-- RESTRICT above — a superseded version cannot be deleted out from under the
-- version that replaced it.
create policy "assets_delete_own" on public.assets
  for delete to authenticated using (auth.uid() = owner_id);

-- ------------------------------------------------------------ current view ---
-- What the library shows by default: the head of each version chain.
--
-- Derived, never stored. A stored `is_current` flag needs two writes to stay
-- true and is wrong the moment one of them fails — and the failure is
-- invisible, because a library showing a stale version looks exactly like a
-- library showing a current one. Cheap to compute: the head of a chain is
-- simply a row nothing else replaces.
--
-- security_invoker so the caller's RLS applies. Without it the view runs as
-- its owner and becomes a hole straight through every policy above.
create view public.assets_current
  with (security_invoker = true)
as
  select a.*
  from public.assets a
  where not exists (
    select 1 from public.assets newer
    where newer.replaces_id = a.id
  );

revoke all on public.assets_current from anon;

-- ------------------------------------------------------------------ bucket ---
-- Private, unlike both existing buckets. See decision 3 in the header.
--
-- 50 MB: a print-ready PDF with embedded images clears 25 MB routinely, and
-- the failure mode of a too-low ceiling here is the designer's real
-- deliverable being rejected at the moment they try to file it. Storage is
-- cheap; that moment is not.
--
-- SVG and PDF are allowed, which needs saying because 20260731130000 stripped
-- exactly those from client-uploads. The reasoning there was that the bucket
-- takes ANONYMOUS writes, so a stored SVG is a stranger's script on the
-- supabase.co origin. This bucket takes owner writes only — an SVG here is
-- the designer's own logo, which is both the single most likely thing to
-- arrive from Illustrator and not a cross-user risk. Same conclusion the
-- workspace-images note reached, for the same reason.
--
-- Vector source formats (.ai, .eps) are NOT listed. Browsers cannot render
-- them, so accepting them would mean a library full of cards that show
-- nothing — the bridge should push a rendered PDF/PNG alongside, and that is
-- a constraint on the bridge, recorded here so it is not discovered late.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'brand-assets',
  'brand-assets',
  false,
  52428800,
  array[
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/avif',
    'image/svg+xml',
    'application/pdf'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Object keys are `${owner_id}/${project_id}/${asset_id}.${ext}`, so folder[1]
-- is the owner — the same prefix convention workspace-images uses, and the
-- reason these policies are a single indexed comparison rather than a join
-- back to public.assets.
--
-- SELECT is required even though the bucket is private: signed-URL creation
-- runs as the caller and consults RLS. Without it every read 404s.
create policy "brand-assets owner read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

create policy "brand-assets owner write"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

-- Upserts need UPDATE as well as INSERT; a re-push of a failed upload to the
-- same key would otherwise fail in a way cloudSync's catch swallows.
create policy "brand-assets owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = (auth.uid())::text
  )
  with check (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

create policy "brand-assets owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );
