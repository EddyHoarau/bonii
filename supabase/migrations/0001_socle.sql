-- 0001 : socle de Bonii. Entreprises, membres, profil de coûts, simulations.
-- Règle d'or : chaque entreprise ne voit que ses propres données (RLS sur toutes les tables).
-- Les écritures sur entreprises et membres (création, invitation) se font côté serveur,
-- jamais depuis le navigateur.

-- Fonctions internes, dans un schéma que l'API publique n'expose pas.
create schema if not exists prive;
revoke all on schema prive from public, anon;
grant usage on schema prive to authenticated;

create type public.role_membre as enum ('dirigeant', 'chauffeur');
create type public.type_simulation as enum ('tournee', 'course');
create type public.statut_simulation as enum ('a_l_etude', 'repondu', 'gagne', 'perdu');

create table public.entreprises (
  id uuid primary key default gen_random_uuid(),
  nom text not null check (length(trim(nom)) between 1 and 200),
  cree_le timestamptz not null default now()
);

-- Le rôle « chauffeur » existe dès maintenant ; ses accès arrivent au lot 5.
create table public.membres (
  entreprise_id uuid not null references public.entreprises (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.role_membre not null,
  cree_le timestamptz not null default now(),
  primary key (entreprise_id, user_id)
);
create index membres_user_idx on public.membres (user_id);

-- Un profil de coûts par entreprise (le détail par véhicule viendra au lot 4).
create table public.profils_couts (
  entreprise_id uuid primary key references public.entreprises (id) on delete cascade,
  salaire numeric not null default 3000 check (salaire >= 0),
  conso numeric not null default 10 check (conso >= 0),
  gazole numeric not null default 1.45 check (gazole >= 0),
  vehicule numeric not null default 600 check (vehicule >= 0),
  assurance numeric not null default 200 check (assurance >= 0),
  entretien numeric not null default 0.05 check (entretien >= 0),
  generaux numeric not null default 300 check (generaux >= 0),
  jours numeric not null default 22 check (jours >= 0 and jours <= 31),
  modifie_le timestamptz not null default now()
);

-- Une simulation garde toutes ses valeurs, coûts compris, telles qu'au jour de l'enregistrement.
create table public.simulations (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises (id) on delete cascade,
  type public.type_simulation not null,
  nom text not null check (length(trim(nom)) between 1 and 200),
  donneur_ordre text check (length(donneur_ordre) <= 200),
  date_simulation date not null default current_date,
  statut public.statut_simulation not null default 'a_l_etude',
  saisie jsonb not null check (jsonb_typeof(saisie) = 'object'),
  cree_par uuid default auth.uid() references auth.users (id) on delete set null,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
create index simulations_entreprise_idx on public.simulations (entreprise_id, date_simulation desc);

-- Appartenance. « security definer » évite que les règles de membres se rappellent elles-mêmes.
create function prive.est_membre(e uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.membres m where m.entreprise_id = e and m.user_id = (select auth.uid()));
$$;

create function prive.est_dirigeant(e uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.membres m where m.entreprise_id = e and m.user_id = (select auth.uid()) and m.role = 'dirigeant');
$$;

revoke all on function prive.est_membre(uuid), prive.est_dirigeant(uuid) from public, anon;
grant execute on function prive.est_membre(uuid), prive.est_dirigeant(uuid) to authenticated;

create function prive.maj_modifie_le() returns trigger
language plpgsql set search_path = ''
as $$ begin new.modifie_le := now(); return new; end $$;

create trigger profils_couts_modifie_le before update on public.profils_couts
  for each row execute function prive.maj_modifie_le();
create trigger simulations_modifie_le before update on public.simulations
  for each row execute function prive.maj_modifie_le();

-- Sécurité ligne par ligne, sur toutes les tables.
alter table public.entreprises enable row level security;
alter table public.membres enable row level security;
alter table public.profils_couts enable row level security;
alter table public.simulations enable row level security;

-- Droits : rien pour un visiteur non connecté ; le strict nécessaire pour un connecté.
revoke all on public.entreprises, public.membres, public.profils_couts, public.simulations from anon, authenticated;
grant select on public.entreprises, public.membres to authenticated;
grant select, insert, update on public.profils_couts to authenticated;
grant select, insert, update, delete on public.simulations to authenticated;

create policy "Un membre voit son entreprise" on public.entreprises
  for select to authenticated using (prive.est_membre(id));

create policy "Un membre voit les membres de son entreprise" on public.membres
  for select to authenticated using (prive.est_membre(entreprise_id));

-- Coûts et simulations : réservés au dirigeant (un chauffeur ne les voit pas).
create policy "Le dirigeant lit le profil de coûts" on public.profils_couts
  for select to authenticated using (prive.est_dirigeant(entreprise_id));
create policy "Le dirigeant crée le profil de coûts" on public.profils_couts
  for insert to authenticated with check (prive.est_dirigeant(entreprise_id));
create policy "Le dirigeant modifie le profil de coûts" on public.profils_couts
  for update to authenticated using (prive.est_dirigeant(entreprise_id)) with check (prive.est_dirigeant(entreprise_id));

create policy "Le dirigeant lit les simulations" on public.simulations
  for select to authenticated using (prive.est_dirigeant(entreprise_id));
create policy "Le dirigeant crée une simulation" on public.simulations
  for insert to authenticated with check (prive.est_dirigeant(entreprise_id) and cree_par = (select auth.uid()));
create policy "Le dirigeant modifie une simulation" on public.simulations
  for update to authenticated using (prive.est_dirigeant(entreprise_id)) with check (prive.est_dirigeant(entreprise_id));
create policy "Le dirigeant supprime une simulation" on public.simulations
  for delete to authenticated using (prive.est_dirigeant(entreprise_id));
