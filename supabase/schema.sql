-- ============================================================
-- Schéma "Dénoue" — app bien-être quotidienne
-- À exécuter dans Supabase → SQL Editor (une seule fois)
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- PROFILES : une ligne par utilisateur, créée automatiquement
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  is_admin boolean not null default false,
  contributes_to_improvement boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- Création auto du profil à l'inscription. Le consentement ("mes mots
-- anonymisés peuvent améliorer les contenus") est passé à la création
-- du compte via options.data au signUp, lu ici depuis les métadonnées.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, contributes_to_improvement)
  values (
    new.id,
    split_part(new.email, '@', 1),
    coalesce((new.raw_user_meta_data->>'contributes_to_improvement')::boolean, false)
  );
  return new;
end;
$$;

-- Fonction utilitaire pour les policies "admin" ci-dessous. security
-- definer = elle contourne le RLS en interne, donc pas de récursion
-- ni de blocage quand une policy s'appuie dessus.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Te permet (une fois ton propre profil passé en is_admin = true depuis
-- le Table Editor) de lire les profils des utilisatrices qui ont donné
-- leur accord, pour la vue Insights.
create policy "profiles_select_admin" on public.profiles
  for select using (public.is_admin());

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- DAILY_ENTRIES : le check-in quotidien (sport / alimentation / humeur)
-- ------------------------------------------------------------
create table if not exists public.daily_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null default current_date,

  mood_score int check (mood_score between 1 and 10),
  mood_tags text[] default '{}',
  energy_level int check (energy_level between 1 and 10),
  stress_level int check (stress_level between 1 and 10),

  sleep_hours numeric(4,1),
  sleep_quality int check (sleep_quality between 1 and 5),

  moved boolean default false,
  sport_type text,
  sport_duration_min int,
  sport_intensity text check (sport_intensity in ('léger','modéré','intense')),

  nutrition_quality int check (nutrition_quality between 1 and 5),
  nutrition_notes text,
  water_liters numeric(3,1),

  journal_text text,
  tomorrow_intention text,

  tension_score numeric(4,1),
  primary_need text,
  hypnosis_category text,

  created_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

alter table public.daily_entries enable row level security;

create policy "entries_select_own" on public.daily_entries
  for select using (auth.uid() = user_id);
create policy "entries_insert_own" on public.daily_entries
  for insert with check (auth.uid() = user_id);
create policy "entries_update_own" on public.daily_entries
  for update using (auth.uid() = user_id);
create policy "entries_delete_own" on public.daily_entries
  for delete using (auth.uid() = user_id);

-- Lecture par toi (is_admin = true) des entrées des utilisatrices qui
-- ont explicitement accepté de contribuer à l'amélioration des contenus.
-- Nourrit la vue Insights (mots récurrents par besoin, pour écrire tes
-- prochains scripts et coups de boost).
create policy "entries_select_admin_optin" on public.daily_entries
  for select using (
    public.is_admin()
    and exists (
      select 1 from public.profiles p2
      where p2.id = daily_entries.user_id and p2.contributes_to_improvement = true
    )
  );

-- ------------------------------------------------------------
-- HYPNOSIS_SESSIONS : catalogue public des séances guidées
-- ------------------------------------------------------------
create table if not exists public.hypnosis_sessions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  need_category text not null check (need_category in ('stress','lacher_prise','confiance','sommeil','energie')),
  title text not null,
  duration_min int not null default 8,
  script_text text not null,
  source text not null default 'generated',
  created_at timestamptz not null default now()
);

alter table public.hypnosis_sessions enable row level security;

create policy "sessions_public_read" on public.hypnosis_sessions
  for select using (true);

-- ------------------------------------------------------------
-- SESSION_LOGS : historique des séances suivies
-- ------------------------------------------------------------
create table if not exists public.session_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  hypnosis_session_id uuid references public.hypnosis_sessions (id),
  entry_date date not null default current_date,
  mode text not null default 'script' check (mode in ('script','ressource_externe','rappel','boost','rdv')),
  feeling_before int check (feeling_before between 1 and 10),
  feeling_after int check (feeling_after between 1 and 10),
  completed_at timestamptz not null default now()
);

alter table public.session_logs enable row level security;

create policy "logs_select_own" on public.session_logs
  for select using (auth.uid() = user_id);
create policy "logs_insert_own" on public.session_logs
  for insert with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- NEWS_POSTS : actualités publiques (retraites, ateliers, lives...)
-- Gère ce contenu directement depuis le Table Editor Supabase,
-- aucun code à toucher pour publier une nouvelle actualité.
-- ------------------------------------------------------------
create table if not exists public.news_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  event_date date,
  link_url text,
  created_at timestamptz not null default now()
);

alter table public.news_posts enable row level security;

create policy "news_public_read" on public.news_posts
  for select using (true);

insert into public.news_posts (title, body, event_date, link_url) values
('Exemple — Retraite bien-être (à remplacer)',
 'Ceci est un exemple. Modifie ou supprime cette ligne dans le Table Editor Supabase, et ajoute tes vraies actualités (retraites, ateliers, lives) de la même façon — sans toucher au code.',
 null, null)
on conflict do nothing;

-- ------------------------------------------------------------
-- SEED : 5 scripts d'hypnose guidée (un par catégorie de besoin)
-- ------------------------------------------------------------
insert into public.hypnosis_sessions (slug, need_category, title, duration_min, script_text, source) values
('stress-respiration-ancrage', 'stress', 'Respirer, poser, revenir à toi', 8,
$$Installe-toi confortablement, où que tu sois. Ferme les yeux si tu le peux, ou baisse simplement le regard.

On commence par respirer, ensemble.

Inspire par le nez sur 4 temps... 1, 2, 3, 4.
Retiens l'air 7 temps... 1, 2, 3, 4, 5, 6, 7.
Souffle lentement par la bouche sur 8 temps... doucement, comme si tu éteignais une bougie au loin.

Encore une fois. Inspire... retiens... souffle.

À chaque expiration, imagine que tu déposes un peu de la tension du jour. Elle ne t'appartient pas, elle n'est que de passage.

Maintenant, sens tes pieds. Le contact avec le sol, ou avec la chaise. Tu es soutenue. Tu n'as rien à porter seule en ce moment.

Laisse ton attention descendre dans ton corps, du sommet du crâne jusqu'aux orteils. Là où tu sens une tension — la mâchoire, les épaules, le ventre — respire simplement vers cet endroit. Pas besoin de le forcer à se relâcher. Juste l'accueillir.

Répète intérieurement, si tu en as besoin : "Je suis en sécurité, ici, maintenant. Ce que je ressens a le droit d'être là, et je peux quand même revenir au calme."

Prends encore trois respirations à ton rythme.

Quand tu es prête, bouge doucement les doigts, les orteils, et rouvre les yeux. Le calme que tu viens de créer reste avec toi — tu peux y revenir à tout moment, en trois respirations.$$,
'generated'),

('lacher-prise-scan-corporel', 'lacher_prise', 'Déposer ce qui est trop lourd', 10,
$$Trouve une position où ton corps peut vraiment se reposer. Les épaules loin des oreilles. La mâchoire desserrée.

Ferme les yeux. Prends une grande inspiration, et à l'expiration, laisse tomber tes épaules d'un centimètre de plus que ce que tu penses possible.

On va parcourir ton corps, doucement, comme une main bienveillante qui se pose.

Le front. Laisse-le se lisser, comme une eau qui redevient calme.
Les yeux, sous les paupières, relâchés.
La mâchoire. Entrouvre légèrement les lèvres, laisse-la tomber.
Les épaules. Elles portent souvent plus qu'elles ne devraient — laisse-les descendre.
Les bras, jusqu'au bout des doigts. Lourds, posés.
La poitrine, le ventre. Laisse chaque respiration l'élargir un peu plus, sans effort.
Le bas du dos, le bassin. Posés, soutenus.
Les jambes, jusqu'aux pieds. Ancrés, lourds, tranquilles.

Maintenant, pense à ce que tu portes aujourd'hui — une pensée, une charge, une attente envers toi-même. Tu n'as pas besoin de la résoudre maintenant.

Imagine que tu la poses, juste à côté de toi. Pas loin, pas perdue — simplement posée, le temps de cette pause. Tu pourras la reprendre après, si tu en as encore besoin. Mais maintenant, tes mains sont libres.

Respire ce vide, cet espace que tu viens de créer.

Quand tu es prête, remue doucement les mains, les pieds, et reviens. Ce que tu as posé peut rester posé aussi longtemps que tu le choisis.$$,
'generated'),

('confiance-ressource-interieure', 'confiance', 'Retrouver ta ressource intérieure', 9,
$$Installe-toi. Ferme les yeux. Respire trois fois, profondément, sans forcer.

Je vais t'inviter à te souvenir d'un moment — un seul — où tu t'es sentie pleinement capable. Pas parfaite, capable. Un moment où tu as fait un pas, dit un mot, tenu bon, malgré le doute.

Laisse cette image ou cette sensation remonter, sans la juger, sans la chercher trop fort. Elle est déjà là, quelque part en toi.

Si une image vient, regarde-la. Si c'est juste une sensation, une chaleur, une fierté discrète — reste avec elle.

Remarque : où sens-tu cela dans ton corps ? La poitrine qui s'ouvre ? Le dos qui se redresse ? Un sourire qui vient sans y penser ?

Pose ta main, doucement, sur cet endroit. C'est ta ressource. Elle t'appartient, elle a toujours été là, même dans les jours où tu ne la sentais pas.

Répète intérieurement : "Cette force est déjà en moi. Je n'ai rien à emprunter à personne."

Laisse cette sensation grandir un peu, se diffuser dans tout ton corps, comme une chaleur qui remonte.

Sache que tu peux revenir à cet endroit précis — cette main sur ce point du corps — chaque fois que le doute reprend de la place. C'est ton ancre.

Quand tu es prête, respire une dernière fois profondément, et rouvre les yeux en emportant cette chaleur avec toi.$$,
'generated'),

('sommeil-relaxation-profonde', 'sommeil', 'Se laisser glisser vers le sommeil', 12,
$$Allonge-toi confortablement. Laisse le lit ou le canapé porter tout le poids de ton corps — tu n'as plus rien à tenir.

Ferme les yeux. Respire, sans effort, à ton propre rythme.

Je vais compter de 10 à 1. À chaque chiffre, laisse ton corps s'enfoncer un peu plus dans le repos.

10... les pieds se relâchent complètement.
9... les jambes deviennent lourdes, tranquilles.
8... le bassin, le bas du dos se posent.
7... le ventre se détend, la respiration ralentit naturellement.
6... la poitrine s'ouvre, sans effort.
5... les épaules tombent, loin des oreilles.
4... les bras, les mains, tout à fait relâchés.
3... la nuque s'allonge, la tête est lourde sur l'oreiller.
2... le visage se lisse, le front, les yeux, la mâchoire.
1... tout ton corps est maintenant profondément posé.

Imagine maintenant un lieu où tu te sens en paix — réel ou inventé. Peut-être un bord de mer, une forêt, une chambre d'enfance. Laisse les détails apparaître doucement : la lumière, les sons, la température de l'air.

Tu n'as rien à faire dans ce lieu. Juste être là, en sécurité, sans horaire, sans attente.

Si une pensée du jour revient, laisse-la passer comme un nuage, sans la retenir. Elle sera encore là demain si elle est importante. Cette nuit t'appartient au repos.

Continue de respirer doucement, en laissant ton corps et ton esprit s'enfoncer un peu plus à chaque expiration... et laisse-toi glisser, tranquillement, vers le sommeil.$$,
'generated'),

('energie-reveil-du-corps', 'energie', 'Réveiller ton énergie', 7,
$$Assieds-toi, dos droit mais pas rigide. Ferme les yeux ou fixe un point devant toi.

Prends une inspiration profonde par le nez, et souffle fort par la bouche, comme si tu soufflais sur des braises pour les raviver. Encore une fois — inspire, et souffle avec un peu de son, si tu en as envie.

Imagine maintenant une lumière chaude, dorée, qui prend naissance au centre de ta poitrine — comme un petit soleil.

À chaque inspiration, ce soleil grandit un peu. Il envoie de la chaleur et de la lumière dans tes bras, jusqu'au bout des doigts. Dans tes jambes, jusqu'à la plante des pieds. Dans ta tête, ton visage.

Sens cette énergie circuler, réveiller chaque partie de toi qui était encore engourdie.

Répète intérieurement, avec conviction : "Mon énergie est disponible, ici et maintenant. Je choisis d'avancer."

Bouge doucement les épaules, roule-les vers l'arrière, comme pour ouvrir la cage thoracique et laisser entrer plus d'air, plus de vie.

Sur ta prochaine inspiration, lève légèrement le menton, ouvre la poitrine, et laisse ce soleil intérieur rayonner jusque dans ton regard.

Quand tu es prête, rouvre les yeux, avec ce petit soleil toujours allumé en toi. Tu peux y retourner à tout moment, en trois respirations profondes.$$,
'generated')

on conflict (slug) do nothing;
