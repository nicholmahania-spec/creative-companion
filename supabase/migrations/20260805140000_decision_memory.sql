-- Phase 3: decision memory.
--
-- Strategy is set once, in the designer's words, and then reappears at every
-- later decision — "you said warm and playful; here is how this typeface
-- compares." That reappearance is the product's actual differentiator, and
-- it needs three things stored: what the strategy asks for, what each
-- candidate is, and what was chosen and why.
--
-- NO COMBINED SCORE. The Expansion Spec's "82% aligned" number is
-- deliberately absent, on evidence rather than taste (DEVELOPMENT.md,
-- "Contested claims"): Shaikh & Chaparro recover three CORRELATED factors
-- from font-personality ratings, not five independent ones, so Euclidean
-- distance over five hand-drawn axes silently double-weights whichever pairs
-- co-vary (Weight/Energy, Formality/Era). Worse, a scalar hides the axis that
-- carried the brief — a font wrong on Warmth alone still scores ~78%, read as
-- "worth a second look", when Warmth *was* the brief. Five bars, never one
-- number. There is no alignment_score column and adding one is a decision to
-- be argued, not a convenience.

-- The five axes, one table shape shared by strategy and tokens so they can be
-- compared axis by axis. 0.00-1.00, and the poles are named in the app, not
-- here: a number without its poles is unreadable, and the poles are copy.
create domain public.axis_value as numeric(3, 2)
  check (value is null or (value >= 0 and value <= 1));

-- ---------------------------------------------------- strategy_attributes ---
-- What the brand should feel like. `label` is the designer's own word
-- ("warm", "playful"); the axes are that word placed on the five rulers.
create table public.strategy_attributes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null,
  label text not null check (length(label) <= 60),
  formality public.axis_value,
  energy public.axis_value,
  warmth public.axis_value,
  weight public.axis_value,
  era public.axis_value,
  created_at timestamptz not null default now(),
  constraint strategy_attributes_project_owner_fkey
    foreign key (project_id, owner_id)
    references public.projects (id, owner_id) on delete cascade
);

create index if not exists strategy_attributes_project_idx
  on public.strategy_attributes (owner_id, project_id);

-- ----------------------------------------------------------- brand_tokens ---
-- A candidate or chosen thing — a typeface, a colour, a pattern — carrying
-- the same five axes so it can be compared to the strategy.
create table public.brand_tokens (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null,
  token_type text not null
    check (token_type in ('typeface', 'colour', 'pattern', 'imagery')),
  name text not null check (length(name) <= 200),
  formality public.axis_value,
  energy public.axis_value,
  warmth public.axis_value,
  weight public.axis_value,
  era public.axis_value,
  -- Where it came from: a font name, a hex, an upload path.
  source text check (source is null or length(source) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brand_tokens_id_owner_key unique (id, owner_id),
  constraint brand_tokens_project_owner_fkey
    foreign key (project_id, owner_id)
    references public.projects (id, owner_id) on delete cascade
);

create index if not exists brand_tokens_project_idx
  on public.brand_tokens (owner_id, project_id, token_type);

-- --------------------------------------------------------------- decisions ---
-- The join everything else hangs off. "Why did I choose this?" answered
-- without the designer having to remember.
create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null,
  -- Journey stage id (define/research/design/sketch/deliver). Deliberately
  -- NOT a foreign key: stages are app-side data that the modular project
  -- types can switch on and off, and a decision must outlive its stage being
  -- turned off. Slug-shaped so a typo cannot become a stage.
  stage text not null check (stage ~ '^[a-z0-9][a-z0-9_-]{0,39}$'),
  decision_label text not null check (length(decision_label) <= 200),
  -- SET NULL, not cascade: deleting a candidate must not delete the record
  -- that it was once chosen. A decision log that forgets is not a log.
  selected_token_id uuid,
  rationale text check (rationale is null or length(rationale) <= 4000),
  -- The strategy target AS IT WAS when the decision was made. Snapshotted
  -- rather than joined live, because strategy legitimately changes and the
  -- record must keep saying what was true at the time — otherwise revisiting
  -- an old decision silently re-scores it against a brief nobody was working
  -- to. This is also what lets the bars be redrawn historically.
  target_formality public.axis_value,
  target_energy public.axis_value,
  target_warmth public.axis_value,
  target_weight public.axis_value,
  target_era public.axis_value,
  status text not null default 'proposed'
    check (status in ('proposed', 'approved', 'revised', 'rejected')),
  approved_by text check (approved_by is null or length(approved_by) <= 200),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint decisions_project_owner_fkey
    foreign key (project_id, owner_id)
    references public.projects (id, owner_id) on delete cascade,
  constraint decisions_token_owner_fkey
    foreign key (selected_token_id, owner_id)
    references public.brand_tokens (id, owner_id) on delete set null (selected_token_id)
);

create index if not exists decisions_project_idx
  on public.decisions (owner_id, project_id, created_at desc);

-- --------------------------------------------------------------------- RLS ---
alter table public.strategy_attributes enable row level security;
alter table public.brand_tokens enable row level security;
alter table public.decisions enable row level security;

revoke all on public.strategy_attributes, public.brand_tokens, public.decisions
  from anon;
revoke truncate on public.strategy_attributes, public.brand_tokens, public.decisions
  from authenticated;

-- Owner-scoped, with the parent check on write. The composite FKs above make
-- cross-tenant linkage structurally impossible; these are belt and braces,
-- and they are what stops a row being created for someone else's project in
-- the first place rather than merely failing later.
create policy "strategy_attributes_select_own" on public.strategy_attributes
  for select to authenticated using (auth.uid() = owner_id);
create policy "strategy_attributes_write_own" on public.strategy_attributes
  for insert to authenticated with check (auth.uid() = owner_id);
create policy "strategy_attributes_update_own" on public.strategy_attributes
  for update to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "strategy_attributes_delete_own" on public.strategy_attributes
  for delete to authenticated using (auth.uid() = owner_id);

create policy "brand_tokens_select_own" on public.brand_tokens
  for select to authenticated using (auth.uid() = owner_id);
create policy "brand_tokens_write_own" on public.brand_tokens
  for insert to authenticated with check (auth.uid() = owner_id);
create policy "brand_tokens_update_own" on public.brand_tokens
  for update to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "brand_tokens_delete_own" on public.brand_tokens
  for delete to authenticated using (auth.uid() = owner_id);

create policy "decisions_select_own" on public.decisions
  for select to authenticated using (auth.uid() = owner_id);
create policy "decisions_write_own" on public.decisions
  for insert to authenticated with check (auth.uid() = owner_id);
create policy "decisions_update_own" on public.decisions
  for update to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
-- Decisions ARE the record. Deleting one is allowed (a mistake typed in is
-- not history), but the app never offers it in bulk.
create policy "decisions_delete_own" on public.decisions
  for delete to authenticated using (auth.uid() = owner_id);

-- Timestamps pinned server-side, same reasoning as every other table here.
create trigger brand_tokens_stamp_row_times
  before insert or update on public.brand_tokens
  for each row execute function public.stamp_row_times();

create trigger decisions_stamp_row_times
  before insert or update on public.decisions
  for each row execute function public.stamp_row_times();

create trigger strategy_attributes_pin_created_at
  before insert or update on public.strategy_attributes
  for each row execute function public.pin_row_times();
