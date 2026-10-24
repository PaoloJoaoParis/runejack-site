-- Site vitrine Runejack : structure de données, sécurité, stockage et temps réel.
-- À exécuter dans le SQL Editor de Supabase. Le script peut être rejoué.

-- 1. Rôle admin, lu dans le jeton (app_metadata ne peut pas être modifié par l'utilisateur)
create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
$$;

-- 2. Retours envoyés par les joueurs
create table if not exists public.feedback (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  declared_type   text not null check (declared_type in ('bug', 'balance', 'idea', 'other')),
  content         text not null check (char_length(content) between 30 and 3000),
  screenshot_path text,
  game_version    text check (char_length(game_version) <= 20),
  analysis_status text not null default 'pending' check (analysis_status in ('pending', 'ready', 'error')),
  error_message   text,
  triage_status   text not null default 'new'
                  check (triage_status in ('new', 'acknowledged', 'fixed', 'rejected')),
  created_at      timestamptz not null default now(),
  -- Une capture est toujours rangée dans le dossier de son auteur
  constraint feedback_screenshot_in_own_folder
    check (screenshot_path is null or screenshot_path like user_id::text || '/%')
);

create index if not exists feedback_user_id_idx on public.feedback (user_id);

-- 3. Analyses produites par l'IA (un retour peut être réanalysé)
create table if not exists public.analyses (
  id              uuid primary key default gen_random_uuid(),
  feedback_id     uuid not null references public.feedback (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  category        text not null check (category in ('bug', 'balance', 'idea', 'complaint', 'other')),
  severity        text not null check (severity in ('critical', 'major', 'minor')),
  summary         text not null,
  repro_steps     jsonb not null default '[]'::jsonb,
  target_type     text not null default 'none'
                  check (target_type in ('hero', 'contract', 'rune', 'item', 'blessing', 'none')),
  target_id       text,
  verdict         text not null
                  check (verdict in ('confirmed', 'contradicted', 'insufficient', 'unavailable', 'not_applicable')),
  evidence        jsonb,
  suggested_reply text not null,
  model           text,
  created_at      timestamptz not null default now()
);

create index if not exists analyses_feedback_id_idx on public.analyses (feedback_id);
create index if not exists analyses_user_id_idx on public.analyses (user_id);

-- 4. Demandes d'accès à la bêta (une par compte)
create table if not exists public.beta_requests (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  email            text not null,
  desired_username text not null check (char_length(desired_username) between 2 and 20),
  motivation       text not null default '' check (char_length(motivation) <= 500),
  consent          boolean not null check (consent),
  status           text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  error_message    text,
  processed_at     timestamptz,
  created_at       timestamptz not null default now()
);

-- 5. Row Level Security
alter table public.feedback enable row level security;
alter table public.analyses enable row level security;
alter table public.beta_requests enable row level security;

-- Les visiteurs non connectés n'ont accès à rien
revoke all on public.feedback, public.analyses, public.beta_requests from anon;

-- 5a. Retours
drop policy if exists "Lire ses retours, ou tous pour un admin" on public.feedback;
create policy "Lire ses retours, ou tous pour un admin"
  on public.feedback for select to authenticated
  using ((select auth.uid()) = user_id or (select public.is_admin()));

drop policy if exists "Créer ses retours" on public.feedback;
create policy "Créer ses retours"
  on public.feedback for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and analysis_status = 'pending'
    and triage_status = 'new'
    and error_message is null
  );

drop policy if exists "Les admins traitent les retours" on public.feedback;
create policy "Les admins traitent les retours"
  on public.feedback for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Un admin ne peut changer que le statut de traitement, jamais le texte d'un joueur
revoke update on public.feedback from authenticated;
grant update (triage_status) on public.feedback to authenticated;

-- 5b. Analyses : lecture seule côté client, seul le worker écrit
drop policy if exists "Lire les analyses de ses retours, ou toutes pour un admin" on public.analyses;
create policy "Lire les analyses de ses retours, ou toutes pour un admin"
  on public.analyses for select to authenticated
  using ((select auth.uid()) = user_id or (select public.is_admin()));

revoke insert, update, delete on public.analyses from authenticated;

-- 5c. Demandes bêta
drop policy if exists "Lire sa demande, ou toutes pour un admin" on public.beta_requests;
create policy "Lire sa demande, ou toutes pour un admin"
  on public.beta_requests for select to authenticated
  using ((select auth.uid()) = user_id or (select public.is_admin()));

drop policy if exists "Créer sa demande" on public.beta_requests;
create policy "Créer sa demande"
  on public.beta_requests for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and email = (select auth.jwt()) ->> 'email'
    and status = 'pending'
    and processed_at is null
    and error_message is null
  );

drop policy if exists "Les admins traitent les demandes" on public.beta_requests;
create policy "Les admins traitent les demandes"
  on public.beta_requests for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke update on public.beta_requests from authenticated;
grant update (status, processed_at, error_message) on public.beta_requests to authenticated;

-- 6. Bucket privé des captures d'écran (2 Mo, images seulement)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('screenshots', 'screenshots', false, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Chacun dépose ses captures dans son dossier" on storage.objects;
create policy "Chacun dépose ses captures dans son dossier"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Lire ses captures, ou toutes pour un admin" on storage.objects;
create policy "Lire ses captures, ou toutes pour un admin"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'screenshots'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
  );

-- 7. Temps réel sur les retours et les analyses (Realtime respecte la RLS)
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'feedback') then
    alter publication supabase_realtime add table public.feedback;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'analyses') then
    alter publication supabase_realtime add table public.analyses;
  end if;
end $$;

-- 8. Détection des doublons : chaque retour reçoit un embedding (vecteur de 768 nombres qui résume son sens),
-- calculé par le worker d'analyse. Deux retours qui décrivent le même problème ont des vecteurs proches.
create extension if not exists vector with schema extensions;

alter table public.feedback add column if not exists embedding extensions.vector(768);

-- Index HNSW : recherche rapide des plus proches voisins à la distance cosinus
create index if not exists feedback_embedding_idx on public.feedback
  using hnsw (embedding extensions.vector_cosine_ops);

-- Retours qui ressemblent à un retour donné, du plus proche au moins proche.
-- security invoker : la RLS s'applique, un joueur ne compare qu'avec ses retours, un admin avec tous.
create or replace function public.similar_feedback(
  target_id uuid,
  min_similarity float default 0.8,
  max_results int default 5
)
returns table (id uuid, content text, created_at timestamptz, triage_status text, similarity float)
language sql
stable
security invoker
set search_path = ''
as $$
  select f.id, f.content, f.created_at, f.triage_status,
         1 - (f.embedding operator(extensions.<=>) t.embedding) as similarity
  from public.feedback f
  join public.feedback t on t.id = target_id
  where f.id <> t.id
    and f.embedding is not null
    and t.embedding is not null
    and 1 - (f.embedding operator(extensions.<=>) t.embedding) >= min_similarity
  order by f.embedding operator(extensions.<=>) t.embedding
  limit max_results;
$$;

-- 9. Devenir admin : à exécuter une fois avec votre adresse, puis se reconnecter
-- update auth.users
--   set raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
--   where email = 'vous@exemple.com';