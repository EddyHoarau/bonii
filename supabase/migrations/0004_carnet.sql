-- 0004 : lot 3. Carnet des prospects et donneurs d'ordre, suivi des relances.
-- Même règle d'or : chaque entreprise ne voit que son carnet (RLS), réservé au dirigeant.

create type public.statut_donneur as enum ('prospect', 'client', 'ancien');

create table public.donneurs_ordre (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises (id) on delete cascade,
  nom text not null check (length(trim(nom)) between 1 and 200),
  statut public.statut_donneur not null default 'prospect',
  interlocuteur text check (length(interlocuteur) <= 200),
  telephone text check (length(telephone) <= 40),
  email text check (length(email) <= 254),
  notes text check (length(notes) <= 4000),
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now(),
  -- Sert de cible aux liens ci-dessous : une relance ou une simulation ne peut viser
  -- qu'un donneur d'ordre de la même entreprise.
  unique (entreprise_id, id)
);
-- Un seul « Colis Express » par entreprise, majuscules ou non.
create unique index donneurs_ordre_nom_idx on public.donneurs_ordre (entreprise_id, lower(nom));

create table public.relances (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null,
  donneur_ordre_id uuid not null,
  prevue_le date not null,
  objet text not null check (length(trim(objet)) between 1 and 300),
  faite_le date,
  cree_le timestamptz not null default now(),
  foreign key (entreprise_id, donneur_ordre_id) references public.donneurs_ordre (entreprise_id, id) on delete cascade
);
create index relances_a_faire_idx on public.relances (entreprise_id, prevue_le) where faite_le is null;
create index relances_donneur_idx on public.relances (donneur_ordre_id);

-- Les simulations gardent le nom tapé (figé) et gagnent un lien vers le carnet.
-- Si le donneur d'ordre est supprimé, seul le lien s'efface.
alter table public.simulations add column donneur_ordre_id uuid;
alter table public.simulations add constraint simulations_donneur_ordre_fk
  foreign key (entreprise_id, donneur_ordre_id) references public.donneurs_ordre (entreprise_id, id)
  on delete set null (donneur_ordre_id);
create index simulations_donneur_idx on public.simulations (donneur_ordre_id) where donneur_ordre_id is not null;

-- Reprise du lot 1 : chaque nom déjà tapé dans une simulation entre au carnet
-- (client s'il a une simulation gagnée, prospect sinon), puis les simulations y sont reliées.
insert into public.donneurs_ordre (entreprise_id, nom, statut)
select entreprise_id, min(trim(donneur_ordre)),
       (case when bool_or(statut = 'gagne') then 'client' else 'prospect' end)::public.statut_donneur
from public.simulations
where trim(coalesce(donneur_ordre, '')) <> ''
group by entreprise_id, lower(trim(donneur_ordre));

update public.simulations s set donneur_ordre_id = d.id
from public.donneurs_ordre d
where d.entreprise_id = s.entreprise_id and lower(d.nom) = lower(trim(s.donneur_ordre));

create trigger donneurs_ordre_modifie_le before update on public.donneurs_ordre
  for each row execute function prive.maj_modifie_le();

alter table public.donneurs_ordre enable row level security;
alter table public.relances enable row level security;

revoke all on public.donneurs_ordre, public.relances from anon, authenticated;
grant select, insert, update, delete on public.donneurs_ordre, public.relances to authenticated;
grant select, insert, update, delete on public.donneurs_ordre, public.relances to service_role;

-- Le carnet est commercial : réservé au dirigeant (un chauffeur ne le voit pas).
create policy "Le dirigeant gère son carnet" on public.donneurs_ordre
  for all to authenticated using (prive.est_dirigeant(entreprise_id)) with check (prive.est_dirigeant(entreprise_id));
create policy "Le dirigeant gère ses relances" on public.relances
  for all to authenticated using (prive.est_dirigeant(entreprise_id)) with check (prive.est_dirigeant(entreprise_id));
