-- 0007 : lot 5. Accès chauffeur : sa tournée, ses notes de frais, ses messages avec le dirigeant.
-- Un chauffeur ne voit jamais les coûts, les simulations, le carnet ni les véhicules.
-- Les comptes de chauffeurs sont créés côté serveur (clé secrète), à la demande du dirigeant.

-- Nom affiché du membre (les adresses e-mail restent dans auth.users, que personne ne lit).
alter table public.membres add column nom text check (length(nom) <= 100);

-- Une tournée peut être confiée à un chauffeur de la même entreprise. S'il quitte l'entreprise, elle redevient libre.
alter table public.tournees add column chauffeur_id uuid;
alter table public.tournees add constraint tournees_chauffeur_fk
  foreign key (entreprise_id, chauffeur_id) references public.membres (entreprise_id, user_id)
  on delete set null (chauffeur_id);
create index tournees_chauffeur_idx on public.tournees (chauffeur_id) where chauffeur_id is not null;

-- Le chauffeur lit ses tournées et leurs arrêts, sans pouvoir rien y changer.
create policy "Le chauffeur voit ses tournées" on public.tournees
  for select to authenticated using (chauffeur_id = (select auth.uid()));
create policy "Le chauffeur voit les arrêts de ses tournées" on public.arrets
  for select to authenticated using (
    exists (select 1 from public.tournees t where t.id = tournee_id and t.chauffeur_id = (select auth.uid()))
  );

-- Notes de frais : le membre dépose les siennes, le dirigeant les valide ou les refuse.
create type public.statut_note as enum ('a_valider', 'validee', 'refusee');

create table public.notes_frais (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null,
  user_id uuid not null default auth.uid(),
  jour date not null default current_date,
  nature text not null check (length(trim(nature)) between 1 and 100),
  montant numeric not null check (montant > 0 and montant <= 100000),
  commentaire text check (length(commentaire) <= 500),
  statut public.statut_note not null default 'a_valider',
  cree_le timestamptz not null default now(),
  foreign key (entreprise_id, user_id) references public.membres (entreprise_id, user_id) on delete cascade
);
create index notes_frais_entreprise_idx on public.notes_frais (entreprise_id, jour desc);

alter table public.notes_frais enable row level security;
revoke all on public.notes_frais from anon, authenticated;
-- La seule colonne modifiable est le statut : personne ne retouche un montant après coup.
grant select, insert, delete on public.notes_frais to authenticated;
grant update (statut) on public.notes_frais to authenticated;
grant select, insert, update, delete on public.notes_frais to service_role;

create policy "Chacun voit ses notes, le dirigeant voit toutes celles de l'entreprise" on public.notes_frais
  for select to authenticated using (user_id = (select auth.uid()) or prive.est_dirigeant(entreprise_id));
create policy "Chacun dépose ses propres notes, à valider" on public.notes_frais
  for insert to authenticated with check (user_id = (select auth.uid()) and prive.est_membre(entreprise_id) and statut = 'a_valider');
create policy "Chacun retire sa note tant qu'elle n'est pas traitée" on public.notes_frais
  for delete to authenticated using (user_id = (select auth.uid()) and statut = 'a_valider');
create policy "Le dirigeant valide ou refuse" on public.notes_frais
  for update to authenticated using (prive.est_dirigeant(entreprise_id)) with check (prive.est_dirigeant(entreprise_id));

-- Messages : un fil par chauffeur, entre lui et le dirigeant. On n'efface ni ne modifie un message.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null,
  chauffeur_id uuid not null,
  auteur_id uuid not null default auth.uid(),
  texte text not null check (length(trim(texte)) between 1 and 2000),
  cree_le timestamptz not null default now(),
  foreign key (entreprise_id, chauffeur_id) references public.membres (entreprise_id, user_id) on delete cascade
);
create index messages_fil_idx on public.messages (entreprise_id, chauffeur_id, cree_le);

alter table public.messages enable row level security;
revoke all on public.messages from anon, authenticated;
grant select, insert on public.messages to authenticated;
grant select, insert, update, delete on public.messages to service_role;

create policy "Le chauffeur lit son fil, le dirigeant lit ceux de l'entreprise" on public.messages
  for select to authenticated using (chauffeur_id = (select auth.uid()) or prive.est_dirigeant(entreprise_id));
create policy "Le chauffeur écrit dans son fil, le dirigeant dans ceux de l'entreprise" on public.messages
  for insert to authenticated with check (
    auteur_id = (select auth.uid()) and (chauffeur_id = (select auth.uid()) or prive.est_dirigeant(entreprise_id))
  );
