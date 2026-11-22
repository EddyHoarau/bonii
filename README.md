# Bonii

Savoir si une tournée rapporte, avant de la signer.

- Lancer en local : `npm run dev`, puis ouvrir http://localhost:3000
- Tests du moteur : `npm test`
- Organisation du code et lots à venir : [docs/structure.md](docs/structure.md)

## Base de données (Supabase, région Paris)

- Tables et règles de sécurité : `supabase/migrations/`, à appliquer dans l'ordre
  (éditeur SQL du tableau de bord Supabase). Le carnet (lot 3) a besoin de `0004`,
  les véhicules (lot 4) de `0005` : les appliquer avant de mettre ce code en ligne,
  sinon l'enregistrement d'une simulation échoue.
- Test d'isolement entre entreprises : coller `supabase/tests/isolation_entreprises.sql`
  dans l'éditeur SQL et lancer. Le résultat attendu est le message
  « TESTS RÉUSSIS » (affiché comme une erreur, c'est voulu : tout est annulé).
- Clés : copier `.env.example` en `.env.local`. Seules les clés publiques vont dans
  ce fichier ; la clé secrète ne doit jamais être préfixée par `NEXT_PUBLIC_`.
