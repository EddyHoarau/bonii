# Structure de Bonii

Application web pour les dirigeants de petites entreprises de transport et de livraison
de colis (1 à 5 véhicules). Aucun nom de client dans le code : chaque entreprise ne voit
que ses propres données (règles RLS de Supabase sur toutes les tables).

## Dossiers

| Dossier | Rôle |
|---|---|
| `prototype/` | Prototype validé, référence du moteur et du design. Ne pas modifier. |
| `src/moteur/` | Moteur de calcul, sans interface ni réseau. Tests : `npm test`. |
| `src/app/` | Écrans (Next.js, App Router). |
| `src/components/` | Morceaux d'écran réutilisés. |
| `src/lib/echeances.ts` | Dates et délais (relances, échéances), à l'heure de Paris. |
| `src/lib/icones.tsx` | Seul endroit où les icônes Phosphor (trait fin) sont importées. |
| `supabase/migrations/` | Tables et règles de sécurité, dans l'ordre d'application. |

## Règles du moteur à connaître

- Le coût horaire du chauffeur sur une course se calcule sur 151,67 h par mois (durée
  légale). Les congés et les heures non productives n'y sont pas, donc le prix plancher
  est un peu optimiste. Un réglage « heures réellement travaillées » pourra être ajouté.
- « Jours travaillés par mois » vient du profil de coûts (22 par défaut) et peut être
  changé dans une tournée.
- La carte animée est une illustration : son ordre de passage n'est pas une vraie tournée.

## Lot 1 (construit)

Connexion par lien e-mail (comptes sur invitation), profil de coûts par entreprise,
simulateur tournée et course, simulations enregistrées et figées (statut : à l'étude,
répondu, gagné, perdu), export PDF interne.

## Lot 3 (construit) : prospects et donneurs d'ordre

Carnet (`/carnet`) réservé au dirigeant : prospects, clients, anciens clients, avec une fiche
par contact (`/carnet/fiche`). Relances datées, à cocher « Fait » ; celles qui sont dues
s'affichent en nombre à côté de « Mon carnet ». Le nom tapé dans une simulation est relié
au carnet (un nom nouveau y entre comme prospect) ; la simulation garde aussi le nom tel
qu'il a été tapé. Migration : `0004_carnet.sql`.

## Lots suivants : prévus, pas construits

Chaque table future porte `entreprise_id` et suit les mêmes règles RLS.

- **Lot 2, tournée du jour.** Saisie des adresses par capture d'écran ou photo d'étiquettes
  lue par IA, avec écran de vérification. Ordre de passage et créneaux calculés par un
  moteur d'optimisation existant, jamais par un algorithme maison. Les adresses des
  destinataires sont des données personnelles : conservation minimale et purge automatique.
- **Lot 4, véhicules et rappels.** Contrôle technique, pneus, assurance ; profil de coûts
  par véhicule ; prix du carburant autour d'un trajet à partir des données publiques.
- **Lot 5, accès chauffeur.** Le rôle « chauffeur » existe dès le lot 1 dans la table des
  membres ; au lot 5 il ne verra que sa tournée, ses notes de frais et ses messages.
