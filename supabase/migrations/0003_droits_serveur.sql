-- Le serveur (clé secrète, jamais dans le navigateur) crée les entreprises depuis /admin.
-- L'accès API automatique étant décoché, service_role n'a aucun droit par défaut : on les donne ici.
grant select, insert, update, delete on public.entreprises, public.membres, public.profils_couts, public.simulations to service_role;
