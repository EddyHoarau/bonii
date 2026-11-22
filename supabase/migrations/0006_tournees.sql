-- 0006 : lot 2. Tournée du jour : les adresses à livrer, leur position et l'ordre de passage.
-- Les adresses des destinataires sont des données personnelles : on ne garde que l'adresse
-- (aucun nom, aucun téléphone) et tout est effacé 7 jours après la date de la tournée.
-- Réservé au dirigeant pour l'instant ; le chauffeur verra sa tournée au lot 5.

create table public.tournees (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises (id) on delete cascade,
  jour date not null default current_date,
  nom text not null check (length(trim(nom)) between 1 and 200),
  -- Point de départ et de retour (dépôt), avec sa position.
  depart text not null check (length(trim(depart)) between 1 and 300),
  depart_lat double precision not null,
  depart_lon double precision not null,
  heure_depart time not null default '08:00',
  minutes_par_arret numeric not null default 3 check (minutes_par_arret between 0 and 120),
  -- Résultat du dernier calcul de l'ordre de passage ; vide tant qu'il n'est pas fait ou plus à jour.
  optimisee_le timestamptz,
  km numeric,
  duree_minutes numeric,
  cree_le timestamptz not null default now(),
  unique (entreprise_id, id)
);
create index tournees_entreprise_idx on public.tournees (entreprise_id, jour desc);
create index tournees_jour_idx on public.tournees (jour);

create table public.arrets (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null,
  tournee_id uuid not null,
  adresse text not null check (length(trim(adresse)) between 1 and 300),
  -- Ce que le géocodage a reconnu. Vide : adresse introuvable. « fiable » faux : à vérifier.
  reconnue text,
  lat double precision,
  lon double precision,
  fiable boolean not null default false,
  ordre integer not null default 0,
  arrivee time,
  cree_le timestamptz not null default now(),
  -- Un arrêt ne peut appartenir qu'à une tournée de la même entreprise.
  foreign key (entreprise_id, tournee_id) references public.tournees (entreprise_id, id) on delete cascade
);
create index arrets_tournee_idx on public.arrets (tournee_id, ordre);

alter table public.tournees enable row level security;
alter table public.arrets enable row level security;

revoke all on public.tournees, public.arrets from anon, authenticated;
grant select, insert, update, delete on public.tournees, public.arrets to authenticated;
grant select, insert, update, delete on public.tournees, public.arrets to service_role;

create policy "Le dirigeant gère ses tournées" on public.tournees
  for all to authenticated using (prive.est_dirigeant(entreprise_id)) with check (prive.est_dirigeant(entreprise_id));
create policy "Le dirigeant gère ses arrêts" on public.arrets
  for all to authenticated using (prive.est_dirigeant(entreprise_id)) with check (prive.est_dirigeant(entreprise_id));

-- Purge : les tournées de plus de 7 jours disparaissent, leurs arrêts avec (toutes entreprises).
create function prive.purger_tournees() returns integer
language plpgsql security definer set search_path = ''
as $$
declare n integer;
begin
  delete from public.tournees where jour < current_date - 7;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function prive.purger_tournees() from public, anon, authenticated;

-- Chaque nuit, si l'extension pg_cron est disponible. Sinon l'application purge quand même
-- les tournées de l'entreprise à chaque nouvelle tournée (voir src/app/tournees/actions.ts).
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('bonii-purge-tournees', '15 3 * * *', 'select prive.purger_tournees()');
exception when others then
  raise notice 'pg_cron indisponible, purge nocturne non programmée : %', sqlerrm;
end $$;
