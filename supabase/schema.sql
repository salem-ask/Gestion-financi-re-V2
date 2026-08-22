-- Schema de reference pour la synchronisation cloud (Supabase / Postgres).
--
-- Ce fichier n'est PAS execute automatiquement par l'application : c'est un
-- script a copier/coller dans l'editeur SQL du tableau de bord Supabase
-- (Project > SQL Editor) lors de la creation du projet cloud, PHASE 1 de la
-- mise en place de la synchronisation.
--
-- Correspond a l'audit valide : une table par store IndexedDB synchronise
-- (days, notes, depenseCategories, settings, weekClosures, objectifs --
-- ce dernier ajoute avec la page Parametres). Aucune table "totals" : les
-- montants calcules (gain/reste/affectations) ne sont jamais synchronises
-- tels quels, toujours recalcules localement par le moteur financier
-- existant (calculateFinancials) apres reception d'une ligne distante --
-- voir l'audit, section 2. Les stores "preferences" (devise, format de
-- rapport, apparence) restent volontairement locaux, non synchronises.
--
-- Securite : chaque table porte une colonne user_id et une politique RLS
-- stricte (un utilisateur ne peut jamais lire/ecrire les lignes d'un
-- autre). Rien ne fonctionne tant que ces policies ne sont pas actives.

-- ---------------------------------------------------------------------
-- Journees (miroir de days / DayEntry)
-- ---------------------------------------------------------------------
create table if not exists public.days (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  achats jsonb not null default '[]'::jsonb,
  ventes jsonb not null default '[]'::jsonb,
  depenses jsonb not null default '[]'::jsonb,
  affectations_realisees jsonb not null default '{"dime":0,"epargne":0,"generosite":0}'::jsonb,
  origine text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists days_user_id_idx on public.days (user_id);
create index if not exists days_user_id_date_idx on public.days (user_id, date);
create index if not exists days_user_id_updated_at_idx on public.days (user_id, updated_at);

alter table public.days enable row level security;

create policy "days_select_own" on public.days
  for select using (auth.uid() = user_id);
create policy "days_insert_own" on public.days
  for insert with check (auth.uid() = user_id);
create policy "days_update_own" on public.days
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "days_delete_own" on public.days
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Notes (miroir de notes / Note)
-- ---------------------------------------------------------------------
create table if not exists public.notes (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  texte text not null,
  statut text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_id_idx on public.notes (user_id);
create index if not exists notes_user_id_updated_at_idx on public.notes (user_id, updated_at);

alter table public.notes enable row level security;

create policy "notes_select_own" on public.notes
  for select using (auth.uid() = user_id);
create policy "notes_insert_own" on public.notes
  for insert with check (auth.uid() = user_id);
create policy "notes_update_own" on public.notes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notes_delete_own" on public.notes
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Categories de depense personnalisees (miroir de depenseCategories)
-- "value" (deja normalise cote app) reste la cle naturelle, unique par
-- utilisateur -- pas d'UUID ajoute, conforme a l'audit section 3.
-- ---------------------------------------------------------------------
create table if not exists public.custom_categories (
  user_id uuid not null references auth.users(id) on delete cascade,
  value text not null,
  label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, value)
);

alter table public.custom_categories enable row level security;

create policy "custom_categories_select_own" on public.custom_categories
  for select using (auth.uid() = user_id);
create policy "custom_categories_insert_own" on public.custom_categories
  for insert with check (auth.uid() = user_id);
create policy "custom_categories_update_own" on public.custom_categories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "custom_categories_delete_own" on public.custom_categories
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Reglages globaux (miroir de settings : objectifs de vente
-- hebdomadaire/mensuel/annuel -- 3 lignes possibles par utilisateur)
-- ---------------------------------------------------------------------
create table if not exists public.settings (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value numeric not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.settings enable row level security;

create policy "settings_select_own" on public.settings
  for select using (auth.uid() = user_id);
create policy "settings_insert_own" on public.settings
  for insert with check (auth.uid() = user_id);
create policy "settings_update_own" on public.settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "settings_delete_own" on public.settings
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Clotures (miroir de weekClosures : semaine/mois/annee, meme table cote
-- local, cle prefixee "month:"/"year:" -- on reprend exactement la meme
-- convention de cle cote cloud pour rester coherent avec le local).
-- ---------------------------------------------------------------------
create table if not exists public.period_closures (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  verrouille boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.period_closures enable row level security;

create policy "period_closures_select_own" on public.period_closures
  for select using (auth.uid() = user_id);
create policy "period_closures_insert_own" on public.period_closures
  for insert with check (auth.uid() = user_id);
create policy "period_closures_update_own" on public.period_closures
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "period_closures_delete_own" on public.period_closures
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Objectifs financiers (miroir du store IndexedDB "objectifs", ajoute
-- avec la page Parametres). Meme convention que "notes" : suppression
-- douce (deleted_at) pour que la suppression d'un objectif se propage
-- correctement aux autres appareils via le meme mecanisme PUSH/PULL.
-- ---------------------------------------------------------------------
create table if not exists public.objectifs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  nom text not null,
  montant_cible numeric not null,
  date_cible date,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists objectifs_user_id_idx on public.objectifs (user_id);
create index if not exists objectifs_user_id_updated_at_idx on public.objectifs (user_id, updated_at);

alter table public.objectifs enable row level security;

create policy "objectifs_select_own" on public.objectifs
  for select using (auth.uid() = user_id);
create policy "objectifs_insert_own" on public.objectifs
  for insert with check (auth.uid() = user_id);
create policy "objectifs_update_own" on public.objectifs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "objectifs_delete_own" on public.objectifs
  for delete using (auth.uid() = user_id);
