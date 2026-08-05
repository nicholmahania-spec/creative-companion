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
-- co-vary. (WHICH pairs is unverified — the factor-loadings table was not
-- retrievable, so do not repeat any specific pairing as fact; the structural
-- argument does not depend on it.) Worse, a scalar hides the axis that
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
  -- Mutable (it has an UPDATE policy), so it needs a mutation timestamp:
  -- without one an edited attribute is invisible to any comparator, and
  -- decisions.target_* cannot tell that the brief it snapshotted moved.
  updated_at timestamptz not null default now(),
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
  -- Owner AND project, because a decision must only ever reference a token
  -- from its own project — see the FK on decisions for what goes wrong
  -- otherwise.
  constraint brand_tokens_id_project_owner_key unique (id, project_id, owner_id),
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
  -- Writer-supplied, unlike created_at/updated_at. Owner-only data, so a
  -- backdated approval is self-deception rather than an attack — but §17
  -- wants approvals to end confusion about what was approved when, and a
  -- freely-backdatable one cannot. Kept coherent with status at least.
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint decisions_approved_coherent
    check ((status = 'approved') = (approved_at is not null)),
  constraint decisions_project_owner_fkey
    foreign key (project_id, owner_id)
    references public.projects (id, owner_id) on delete cascade,
  /* Aligned on PROJECT as well as owner. Owner alignment alone let a
     decision in project TWO reference a token from project ONE — and then
     deleting project ONE cascade-deleted its tokens, whose SET NULL wiped
     the chosen-token record on a decision in the surviving project the
     designer never touched. Verified live during audit. That is precisely
     the "log that forgets" this SET NULL exists to prevent, so the
     alignment is now structural. The column list stays a valid subset, so
     SET NULL semantics are unchanged. */
  constraint decisions_token_project_owner_fkey
    foreign key (selected_token_id, project_id, owner_id)
    references public.brand_tokens (id, project_id, owner_id)
    on delete set null (selected_token_id)
);

create index if not exists decisions_project_idx
  on public.decisions (owner_id, project_id, created_at desc);
-- The referencing side of the token FK. Without it every brand_tokens
-- delete sequentially scans decisions and takes a row lock per match.
create index if not exists decisions_selected_token_idx
  on public.decisions (owner_id, project_id, selected_token_id);

-- --------------------------------------------------------------------- RLS ---
alter table public.strategy_attributes enable row level security;
alter table public.brand_tokens enable row level security;
alter table public.decisions enable row level security;

revoke all on public.strategy_attributes, public.brand_tokens, public.decisions
  from anon;
revoke truncate on public.strategy_attributes, public.brand_tokens, public.decisions
  from authenticated;

-- Owner-scoped. NOTE which mechanism does which job, because the previous
-- wording here had it backwards and that is the sentence a future editor
-- reads before deciding the FK is redundant: these policies check ONLY
-- auth.uid() = owner_id. The composite FKs above are the ONLY parent
-- enforcement on these three tables — they are what makes a row for
-- someone else's project impossible (verified: 23503, not merely a later
-- failure). Do not remove them on the assumption a policy covers it.
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
-- NO delete policy on decisions. The previous version had an unfiltered
-- one defended as "the app never offers it in bulk" — which puts the trust
-- boundary in the client, on the one table whose entire thesis is that it
-- must not forget. One DELETE with no filter would wipe the whole log.
-- 1a gated deletes behind archived_at and 1b refused a table-level grant
-- outright; this follows 1b, since a mistyped decision is a single row.
create or replace function public.discard_decision(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  removed int;
begin
  delete from public.decisions
  where id = p_id and owner_id = auth.uid();
  get diagnostics removed = row_count;
  return removed > 0;
end;
$$;

revoke all on function public.discard_decision(uuid) from public;
grant execute on function public.discard_decision(uuid) to authenticated;

-- Timestamps pinned server-side, same reasoning as every other table here.
create trigger brand_tokens_stamp_row_times
  before insert or update on public.brand_tokens
  for each row execute function public.stamp_row_times();

create trigger decisions_stamp_row_times
  before insert or update on public.decisions
  for each row execute function public.stamp_row_times();

create trigger strategy_attributes_stamp_row_times
  before insert or update on public.strategy_attributes
  for each row execute function public.stamp_row_times();

-- ------------------------------------------------- referential-only edits ---
-- When a brand_token is deleted, the FK's SET NULL performs a real UPDATE on
-- every decision that referenced it, which fires stamp_row_times and moves
-- updated_at. The sync engine treats ANY updated_at change as a remote edit
-- (syncEngine.js: remoteChanged), so cleaning up one candidate font would
-- manufacture a phantom conflict per affected decision — each one retaining a
-- version and putting a recovery card in front of the designer for an edit
-- they made themselves. Skip the stamp when the only thing that moved was the
-- reference being nulled.
create or replace function public.stamp_decision_times()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at = now();
    new.updated_at = now();
    return new;
  end if;
  new.created_at = old.created_at;
  if new.selected_token_id is null
     and old.selected_token_id is not null
     and (to_jsonb(new) - 'selected_token_id' - 'updated_at')
       = (to_jsonb(old) - 'selected_token_id' - 'updated_at')
  then
    -- referential cleanup only: keep the timestamp the designer earned
    new.updated_at = old.updated_at;
    return new;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.stamp_decision_times() from public;

drop trigger if exists decisions_stamp_row_times on public.decisions;
create trigger decisions_stamp_row_times
  before insert or update on public.decisions
  for each row execute function public.stamp_decision_times();

-- ---------------------------------------------------------- per-owner cap ---
-- project_conflicts got a prune for exactly this reason. These tables cannot
-- prune — a decision log that drops its oldest entries is not a log — so the
-- cap REJECTS instead, and sits far above any real project so it is a
-- backstop against an automated writer, never a limit a designer meets.
create or replace function public.cap_rows_per_project()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  n bigint;
  cap int := tg_argv[0]::int;
begin
  execute format(
    'select count(*) from public.%I where owner_id = $1 and project_id = $2',
    tg_table_name
  ) into n using new.owner_id, new.project_id;
  if n > cap then
    raise exception 'too many % rows for one project (limit %)', tg_table_name, cap
      using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

revoke all on function public.cap_rows_per_project() from public;

create trigger strategy_attributes_cap after insert on public.strategy_attributes
  for each row execute function public.cap_rows_per_project(200);
create trigger brand_tokens_cap after insert on public.brand_tokens
  for each row execute function public.cap_rows_per_project(2000);
create trigger decisions_cap after insert on public.decisions
  for each row execute function public.cap_rows_per_project(5000);

-- Carried over from the 1a audit: TRUNCATE ignores RLS entirely, and 1a
-- never revoked it (1b did for its own table). One line, closes it.
revoke truncate on public.clients, public.brands, public.projects
  from authenticated;
