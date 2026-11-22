-- Test d'isolement entre entreprises. À lancer dans l'éditeur SQL de Supabase.
-- Il crée deux entreprises fictives, joue chaque utilisateur, puis ANNULE tout :
-- il se termine toujours par un message d'erreur volontaire.
--   « TESTS RÉUSSIS » : tout va bien, aucune donnée de test ne reste.
--   « ÉCHEC : ... »   : une règle de sécurité laisse passer quelque chose.
do $$
declare
  a uuid := gen_random_uuid();  -- dirigeant de l'entreprise A
  b uuid := gen_random_uuid();  -- dirigeant de l'entreprise B
  c uuid := gen_random_uuid();  -- chauffeur de l'entreprise A
  d uuid := gen_random_uuid();  -- autre chauffeur de l'entreprise A
  nc uuid;                      -- note de frais du chauffeur C
  ea uuid; eb uuid; n int;
  ta uuid; tb uuid;  -- tournées de A et de B
  da uuid; db uuid; sa uuid;  -- donneurs d'ordre de A et de B, simulation de A
begin
  insert into auth.users (id, email, aud, role) values
    (a, 'test-a@bonii.invalid', 'authenticated', 'authenticated'),
    (b, 'test-b@bonii.invalid', 'authenticated', 'authenticated'),
    (c, 'test-c@bonii.invalid', 'authenticated', 'authenticated'),
    (d, 'test-d@bonii.invalid', 'authenticated', 'authenticated');
  insert into public.entreprises (nom) values ('Test A') returning id into ea;
  insert into public.entreprises (nom) values ('Test B') returning id into eb;
  insert into public.membres values (ea, a, 'dirigeant'), (eb, b, 'dirigeant'), (ea, c, 'chauffeur'), (ea, d, 'chauffeur');
  insert into public.profils_couts (entreprise_id) values (ea), (eb);
  insert into public.simulations (entreprise_id, type, nom, saisie, cree_par) values
    (ea, 'tournee', 'Simulation A', '{}', a),
    (eb, 'tournee', 'Simulation B', '{}', b);
  select id into sa from public.simulations where entreprise_id = ea;
  -- Lot 3 : un donneur d'ordre et une relance par entreprise.
  insert into public.donneurs_ordre (entreprise_id, nom) values (ea, 'Donneur A') returning id into da;
  insert into public.donneurs_ordre (entreprise_id, nom) values (eb, 'Donneur B') returning id into db;
  insert into public.relances (entreprise_id, donneur_ordre_id, prevue_le, objet) values
    (ea, da, current_date, 'Relance A'), (eb, db, current_date, 'Relance B');
  -- Lot 4 : un véhicule par entreprise.
  insert into public.vehicules (entreprise_id, nom) values (ea, 'Véhicule A'), (eb, 'Véhicule B');
  -- Lot 2 : une tournée et un arrêt par entreprise, plus une vieille tournée chez A pour la purge.
  insert into public.tournees (entreprise_id, nom, depart, depart_lat, depart_lon) values (ea, 'Tournée A', 'Dépôt A', 48.69, 6.18) returning id into ta;
  insert into public.tournees (entreprise_id, nom, depart, depart_lat, depart_lon) values (eb, 'Tournée B', 'Dépôt B', 49.12, 6.17) returning id into tb;
  insert into public.arrets (entreprise_id, tournee_id, adresse) values (ea, ta, 'Adresse A'), (eb, tb, 'Adresse B');
  insert into public.tournees (entreprise_id, nom, depart, depart_lat, depart_lon, jour) values
    (ea, 'Vieille tournée', 'Dépôt A', 48.69, 6.18, current_date - 8),
    (ea, 'Tournée de la semaine', 'Dépôt A', 48.69, 6.18, current_date - 7);
  insert into public.arrets (entreprise_id, tournee_id, adresse)
    select ea, id, 'Vieille adresse' from public.tournees where nom = 'Vieille tournée' and entreprise_id = ea;
  -- La purge efface la tournée de 8 jours et son arrêt, pas celle de 7 jours.
  select prive.purger_tournees() into n; if n <> 1 then raise exception 'ÉCHEC : la purge a effacé % tournées (attendu 1)', n; end if;
  select count(*) into n from public.arrets where adresse = 'Vieille adresse'; if n <> 0 then raise exception 'ÉCHEC : l''adresse d''une tournée purgée est restée'; end if;
  select count(*) into n from public.tournees where entreprise_id = ea; if n <> 2 then raise exception 'ÉCHEC : la purge a touché une tournée récente'; end if;
  delete from public.tournees where nom = 'Tournée de la semaine' and entreprise_id = ea;

  -- 1. Dirigeant A : ne voit que son entreprise.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.entreprises;   if n <> 1 then raise exception 'ÉCHEC : A voit % entreprises', n; end if;
  select count(*) into n from public.membres;       if n <> 3 then raise exception 'ÉCHEC : A voit % membres (attendu 3)', n; end if;
  select count(*) into n from public.profils_couts; if n <> 1 then raise exception 'ÉCHEC : A voit % profils de coûts', n; end if;
  select count(*) into n from public.simulations;   if n <> 1 then raise exception 'ÉCHEC : A voit % simulations', n; end if;
  select count(*) into n from public.simulations where entreprise_id = eb;
  if n <> 0 then raise exception 'ÉCHEC : A voit les simulations de B'; end if;

  -- A ne peut ni créer, ni modifier, ni supprimer chez B.
  begin
    insert into public.simulations (entreprise_id, type, nom, saisie) values (eb, 'course', 'Intrus', '{}');
    raise exception 'ÉCHEC : A a créé une simulation chez B';
  exception when insufficient_privilege then null;
  end;
  update public.simulations set nom = 'Modifié' where entreprise_id = eb; get diagnostics n = row_count;
  if n <> 0 then raise exception 'ÉCHEC : A a modifié une simulation de B'; end if;
  delete from public.simulations where entreprise_id = eb; get diagnostics n = row_count;
  if n <> 0 then raise exception 'ÉCHEC : A a supprimé une simulation de B'; end if;
  update public.profils_couts set salaire = 0 where entreprise_id = eb; get diagnostics n = row_count;
  if n <> 0 then raise exception 'ÉCHEC : A a modifié les coûts de B'; end if;
  begin
    update public.simulations set entreprise_id = eb where entreprise_id = ea;
    raise exception 'ÉCHEC : A a déplacé sa simulation chez B';
  exception when insufficient_privilege then null;
  end;
  -- A ne peut pas se donner accès à B.
  begin
    insert into public.membres values (eb, a, 'dirigeant');
    raise exception 'ÉCHEC : A s''est ajouté chez B';
  exception when insufficient_privilege then null;
  end;

  -- Lot 3 : A ne voit que son carnet et ne peut rien accrocher à celui de B.
  select count(*) into n from public.donneurs_ordre; if n <> 1 then raise exception 'ÉCHEC : A voit % donneurs d''ordre', n; end if;
  select count(*) into n from public.relances;       if n <> 1 then raise exception 'ÉCHEC : A voit % relances', n; end if;
  begin
    insert into public.donneurs_ordre (entreprise_id, nom) values (eb, 'Intrus');
    raise exception 'ÉCHEC : A a créé un donneur d''ordre chez B';
  exception when insufficient_privilege then null;
  end;
  update public.donneurs_ordre set nom = 'Modifié' where entreprise_id = eb; get diagnostics n = row_count;
  if n <> 0 then raise exception 'ÉCHEC : A a modifié le carnet de B'; end if;
  delete from public.relances where entreprise_id = eb; get diagnostics n = row_count;
  if n <> 0 then raise exception 'ÉCHEC : A a supprimé une relance de B'; end if;
  begin
    insert into public.relances (entreprise_id, donneur_ordre_id, prevue_le, objet) values (ea, db, current_date, 'Intrus');
    raise exception 'ÉCHEC : A a créé une relance vers un donneur d''ordre de B';
  exception when foreign_key_violation then null;
  end;
  begin
    update public.simulations set donneur_ordre_id = db where id = sa;
    raise exception 'ÉCHEC : A a relié sa simulation à un donneur d''ordre de B';
  exception when foreign_key_violation then null;
  end;
  begin
    insert into public.donneurs_ordre (entreprise_id, nom) values (ea, 'DONNEUR A');
    raise exception 'ÉCHEC : le même nom est entré deux fois dans le carnet de A';
  exception when unique_violation then null;
  end;
  -- Supprimer un donneur d'ordre efface ses relances, pas la simulation : seul le lien tombe.
  update public.simulations set donneur_ordre_id = da where id = sa;
  delete from public.donneurs_ordre where id = da;
  select count(*) into n from public.relances; if n <> 0 then raise exception 'ÉCHEC : la relance a survécu à son donneur d''ordre'; end if;
  select count(*) into n from public.simulations where id = sa and donneur_ordre_id is null and entreprise_id = ea;
  if n <> 1 then raise exception 'ÉCHEC : la simulation n''a pas survécu à la suppression du donneur d''ordre'; end if;
  insert into public.donneurs_ordre (entreprise_id, nom) values (ea, 'Donneur A') returning id into da;

  -- Lot 4 : A ne voit et ne touche que ses véhicules.
  select count(*) into n from public.vehicules; if n <> 1 then raise exception 'ÉCHEC : A voit % véhicules', n; end if;
  begin
    insert into public.vehicules (entreprise_id, nom) values (eb, 'Intrus');
    raise exception 'ÉCHEC : A a créé un véhicule chez B';
  exception when insufficient_privilege then null;
  end;
  update public.vehicules set nom = 'Modifié' where entreprise_id = eb; get diagnostics n = row_count;
  if n <> 0 then raise exception 'ÉCHEC : A a modifié un véhicule de B'; end if;
  delete from public.vehicules where entreprise_id = eb; get diagnostics n = row_count;
  if n <> 0 then raise exception 'ÉCHEC : A a supprimé un véhicule de B'; end if;
  begin
    update public.vehicules set entreprise_id = eb where entreprise_id = ea;
    raise exception 'ÉCHEC : A a déplacé son véhicule chez B';
  exception when insufficient_privilege then null;
  end;
  update public.vehicules set conso = 9 where entreprise_id = ea; get diagnostics n = row_count;
  if n <> 1 then raise exception 'ÉCHEC : A ne peut pas modifier son propre véhicule'; end if;

  -- Lot 2 : A ne voit et ne touche que ses tournées et ses arrêts.
  select count(*) into n from public.tournees; if n <> 1 then raise exception 'ÉCHEC : A voit % tournées', n; end if;
  select count(*) into n from public.arrets;   if n <> 1 then raise exception 'ÉCHEC : A voit % arrêts', n; end if;
  begin
    insert into public.tournees (entreprise_id, nom, depart, depart_lat, depart_lon) values (eb, 'Intrus', 'x', 0, 0);
    raise exception 'ÉCHEC : A a créé une tournée chez B';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.arrets (entreprise_id, tournee_id, adresse) values (ea, tb, 'Intrus');
    raise exception 'ÉCHEC : A a ajouté un arrêt à une tournée de B';
  exception when foreign_key_violation then null;
  end;
  update public.arrets set adresse = 'Modifié' where entreprise_id = eb; get diagnostics n = row_count;
  if n <> 0 then raise exception 'ÉCHEC : A a modifié un arrêt de B'; end if;
  delete from public.tournees where entreprise_id = eb; get diagnostics n = row_count;
  if n <> 0 then raise exception 'ÉCHEC : A a supprimé une tournée de B'; end if;
  begin
    perform prive.purger_tournees();
    raise exception 'ÉCHEC : un dirigeant peut lancer la purge générale';
  exception when insufficient_privilege then null;
  end;
  update public.arrets set ordre = 2 where tournee_id = ta; get diagnostics n = row_count;
  if n <> 1 then raise exception 'ÉCHEC : A ne peut pas modifier son propre arrêt'; end if;

  -- A travaille normalement chez lui.
  update public.profils_couts set salaire = 3100 where entreprise_id = ea; get diagnostics n = row_count;
  if n <> 1 then raise exception 'ÉCHEC : A ne peut pas modifier ses propres coûts'; end if;
  insert into public.simulations (entreprise_id, type, nom, saisie) values (ea, 'course', 'Course A', '{}');
  select count(*) into n from public.simulations; if n <> 2 then raise exception 'ÉCHEC : A ne retrouve pas sa nouvelle simulation'; end if;
  execute 'reset role';

  -- 2. Chauffeur de A : voit son entreprise, pas les coûts ni les simulations.
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.entreprises;   if n <> 1 then raise exception 'ÉCHEC : le chauffeur voit % entreprises', n; end if;
  select count(*) into n from public.profils_couts; if n <> 0 then raise exception 'ÉCHEC : le chauffeur voit les coûts'; end if;
  select count(*) into n from public.simulations;   if n <> 0 then raise exception 'ÉCHEC : le chauffeur voit les simulations'; end if;
  select count(*) into n from public.donneurs_ordre; if n <> 0 then raise exception 'ÉCHEC : le chauffeur voit le carnet'; end if;
  select count(*) into n from public.relances;       if n <> 0 then raise exception 'ÉCHEC : le chauffeur voit les relances'; end if;
  select count(*) into n from public.vehicules;      if n <> 0 then raise exception 'ÉCHEC : le chauffeur voit les véhicules'; end if;
  select count(*) into n from public.tournees;       if n <> 0 then raise exception 'ÉCHEC : le chauffeur voit les tournées'; end if;
  select count(*) into n from public.arrets;         if n <> 0 then raise exception 'ÉCHEC : le chauffeur voit les arrêts'; end if;
  execute 'reset role';

  -- Lot 5. La tournée de A est confiée au chauffeur C ; une seconde tournée de A reste sans chauffeur.
  update public.tournees set chauffeur_id = c where id = ta;
  insert into public.tournees (entreprise_id, nom, depart, depart_lat, depart_lon) values (ea, 'Tournée sans chauffeur', 'Dépôt A', 48.69, 6.18);
  begin
    update public.tournees set chauffeur_id = c where id = tb;
    raise exception 'ÉCHEC : une tournée de B a été confiée à un chauffeur de A';
  exception when foreign_key_violation then null;
  end;

  -- Chauffeur C : sa tournée et ses arrêts en lecture seule, ses notes de frais, son fil de messages.
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.tournees; if n <> 1 then raise exception 'ÉCHEC : le chauffeur voit % tournées (attendu 1, la sienne)', n; end if;
  select count(*) into n from public.arrets;   if n <> 1 then raise exception 'ÉCHEC : le chauffeur voit % arrêts (attendu 1)', n; end if;
  update public.arrets set adresse = 'Modifié' where tournee_id = ta; get diagnostics n = row_count;
  if n <> 0 then raise exception 'ÉCHEC : le chauffeur a modifié un arrêt'; end if;
  update public.tournees set nom = 'Modifié' where id = ta; get diagnostics n = row_count;
  if n <> 0 then raise exception 'ÉCHEC : le chauffeur a modifié sa tournée'; end if;
  delete from public.tournees where id = ta; get diagnostics n = row_count;
  if n <> 0 then raise exception 'ÉCHEC : le chauffeur a supprimé sa tournée'; end if;
  select count(*) into n from public.profils_couts; if n <> 0 then raise exception 'ÉCHEC : le chauffeur voit les coûts'; end if;

  insert into public.notes_frais (entreprise_id, nature, montant) values (ea, 'Carburant', 62.40) returning id into nc;
  begin
    insert into public.notes_frais (entreprise_id, user_id, nature, montant) values (ea, d, 'Repas', 15);
    raise exception 'ÉCHEC : C a déposé une note au nom de D';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.notes_frais (entreprise_id, nature, montant, statut) values (ea, 'Repas', 15, 'validee');
    raise exception 'ÉCHEC : C a déposé une note déjà validée';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.notes_frais (entreprise_id, nature, montant) values (eb, 'Repas', 15);
    raise exception 'ÉCHEC : C a déposé une note chez B';
  exception when insufficient_privilege or foreign_key_violation then null;
  end;
  update public.notes_frais set statut = 'validee' where id = nc; get diagnostics n = row_count;
  if n <> 0 then raise exception 'ÉCHEC : C a validé sa propre note'; end if;

  insert into public.messages (entreprise_id, chauffeur_id, texte) values (ea, c, 'Bonjour');
  begin
    insert into public.messages (entreprise_id, chauffeur_id, texte) values (ea, d, 'Intrus');
    raise exception 'ÉCHEC : C a écrit dans le fil de D';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.messages (entreprise_id, chauffeur_id, auteur_id, texte) values (ea, c, a, 'Faux');
    raise exception 'ÉCHEC : C a écrit au nom du dirigeant';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.messages set texte = 'Modifié' where chauffeur_id = c;
    raise exception 'ÉCHEC : un message a pu être modifié';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';

  -- Chauffeur D : ne voit ni la tournée, ni la note, ni le fil de C.
  perform set_config('request.jwt.claims', json_build_object('sub', d, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.tournees;    if n <> 0 then raise exception 'ÉCHEC : D voit la tournée de C'; end if;
  select count(*) into n from public.arrets;      if n <> 0 then raise exception 'ÉCHEC : D voit les arrêts de C'; end if;
  select count(*) into n from public.notes_frais; if n <> 0 then raise exception 'ÉCHEC : D voit la note de C'; end if;
  select count(*) into n from public.messages;    if n <> 0 then raise exception 'ÉCHEC : D lit le fil de C'; end if;
  delete from public.notes_frais where id = nc; get diagnostics n = row_count;
  if n <> 0 then raise exception 'ÉCHEC : D a retiré la note de C'; end if;
  execute 'reset role';

  -- Dirigeant A : voit la note et le fil, répond, valide ; ne peut pas retoucher un montant.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.notes_frais; if n <> 1 then raise exception 'ÉCHEC : A voit % notes de frais (attendu 1)', n; end if;
  select count(*) into n from public.messages;    if n <> 1 then raise exception 'ÉCHEC : A voit % messages (attendu 1)', n; end if;
  insert into public.messages (entreprise_id, chauffeur_id, texte) values (ea, c, 'Bien reçu');
  begin
    update public.notes_frais set montant = 1 where id = nc;
    raise exception 'ÉCHEC : le dirigeant a modifié le montant d''une note';
  exception when insufficient_privilege then null;
  end;
  update public.notes_frais set statut = 'validee' where id = nc; get diagnostics n = row_count;
  if n <> 1 then raise exception 'ÉCHEC : le dirigeant ne peut pas valider une note'; end if;
  execute 'reset role';

  -- Dirigeant B : rien de tout cela.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.notes_frais; if n <> 0 then raise exception 'ÉCHEC : B voit les notes de frais de A'; end if;
  select count(*) into n from public.messages;    if n <> 0 then raise exception 'ÉCHEC : B lit les messages de A'; end if;
  begin
    insert into public.messages (entreprise_id, chauffeur_id, texte) values (ea, c, 'Intrus');
    raise exception 'ÉCHEC : B a écrit dans un fil de A';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';

  -- C ne peut plus retirer sa note une fois validée ; s'il quitte l'entreprise, sa tournée redevient libre.
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  delete from public.notes_frais where id = nc; get diagnostics n = row_count;
  if n <> 0 then raise exception 'ÉCHEC : C a retiré une note déjà validée'; end if;
  execute 'reset role';
  delete from public.membres where user_id = c;
  select count(*) into n from public.tournees where id = ta and chauffeur_id is null and entreprise_id = ea;
  if n <> 1 then raise exception 'ÉCHEC : la tournée n''a pas survécu au départ de son chauffeur'; end if;
  select count(*) into n from public.notes_frais where user_id = c; if n <> 0 then raise exception 'ÉCHEC : les notes du chauffeur parti sont restées'; end if;

  -- 3. Visiteur non connecté : aucun accès.
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
  begin
    select count(*) into n from public.simulations;
    raise exception 'ÉCHEC : un visiteur non connecté lit les simulations';
  exception when insufficient_privilege then null;
  end;
  begin
    select count(*) into n from public.donneurs_ordre;
    raise exception 'ÉCHEC : un visiteur non connecté lit le carnet';
  exception when insufficient_privilege then null;
  end;
  begin
    select count(*) into n from public.messages;
    raise exception 'ÉCHEC : un visiteur non connecté lit les messages';
  exception when insufficient_privilege then null;
  end;
  begin
    select count(*) into n from public.notes_frais;
    raise exception 'ÉCHEC : un visiteur non connecté lit les notes de frais';
  exception when insufficient_privilege then null;
  end;
  begin
    select count(*) into n from public.arrets;
    raise exception 'ÉCHEC : un visiteur non connecté lit les arrêts';
  exception when insufficient_privilege then null;
  end;
  begin
    select count(*) into n from public.vehicules;
    raise exception 'ÉCHEC : un visiteur non connecté lit les véhicules';
  exception when insufficient_privilege then null;
  end;
  begin
    select count(*) into n from public.entreprises;
    raise exception 'ÉCHEC : un visiteur non connecté lit les entreprises';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';

  raise exception 'TESTS RÉUSSIS : isolement des entreprises vérifié (données de test annulées)';
end $$;
