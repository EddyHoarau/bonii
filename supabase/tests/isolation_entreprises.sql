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
  ea uuid; eb uuid; n int;
  da uuid; db uuid; sa uuid;  -- donneurs d'ordre de A et de B, simulation de A
begin
  insert into auth.users (id, email, aud, role) values
    (a, 'test-a@bonii.invalid', 'authenticated', 'authenticated'),
    (b, 'test-b@bonii.invalid', 'authenticated', 'authenticated'),
    (c, 'test-c@bonii.invalid', 'authenticated', 'authenticated');
  insert into public.entreprises (nom) values ('Test A') returning id into ea;
  insert into public.entreprises (nom) values ('Test B') returning id into eb;
  insert into public.membres values (ea, a, 'dirigeant'), (eb, b, 'dirigeant'), (ea, c, 'chauffeur');
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

  -- 1. Dirigeant A : ne voit que son entreprise.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.entreprises;   if n <> 1 then raise exception 'ÉCHEC : A voit % entreprises', n; end if;
  select count(*) into n from public.membres;       if n <> 2 then raise exception 'ÉCHEC : A voit % membres (attendu 2)', n; end if;
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
  execute 'reset role';

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
