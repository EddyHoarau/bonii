-- 0005 : lot 4. Véhicules, leurs coûts propres et leurs échéances (contrôle technique, assurance, pneus).
-- Réservé au dirigeant pour l'instant ; le chauffeur verra son véhicule au lot 5.

create table public.vehicules (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises (id) on delete cascade,
  nom text not null check (length(trim(nom)) between 1 and 100),
  immatriculation text check (length(immatriculation) <= 20),
  -- Coûts propres au véhicule. Vide : le simulateur garde la valeur de « Mes coûts ».
  conso numeric check (conso >= 0),
  vehicule numeric check (vehicule >= 0),
  assurance numeric check (assurance >= 0),
  entretien numeric check (entretien >= 0),
  -- Prochaines échéances. Vide : pas de rappel.
  controle_technique_le date,
  assurance_le date,
  pneus_le date,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
create index vehicules_entreprise_idx on public.vehicules (entreprise_id, nom);

create trigger vehicules_modifie_le before update on public.vehicules
  for each row execute function prive.maj_modifie_le();

alter table public.vehicules enable row level security;

revoke all on public.vehicules from anon, authenticated;
grant select, insert, update, delete on public.vehicules to authenticated;
grant select, insert, update, delete on public.vehicules to service_role;

create policy "Le dirigeant gère ses véhicules" on public.vehicules
  for all to authenticated using (prive.est_dirigeant(entreprise_id)) with check (prive.est_dirigeant(entreprise_id));
