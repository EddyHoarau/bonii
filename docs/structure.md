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
| `src/lib/tournees.ts`, `src/lib/services.ts` | Tournée du jour : calculs sans réseau, et appels aux trois services. |
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

## Lot 2 (construit, pas encore essayé avec les vrais services) : tournée du jour

Tournées (`/tournees`, fiche sur `/tournees/fiche`) réservées au dirigeant. Les adresses se
saisissent à la main ou se lisent sur des photos et captures d'écran ; dans les deux cas elles
passent par une zone de texte que le dirigeant vérifie avant d'ajouter. Chaque adresse est
placée sur la carte, et celles qui sont introuvables ou douteuses sont signalées et
corrigeables. L'ordre de passage et l'heure d'arrivée à chaque arrêt sont calculés par un
moteur existant, jamais par un algorithme maison. Migration : `0006_tournees.sql`.

| Besoin | Service | Clé (serveur, dans `.env.local` et sur Vercel) |
|---|---|---|
| Lire les photos | API Claude, modèle Haiku | `ANTHROPIC_API_KEY` |
| Placer les adresses | Géocodage public de l'IGN | aucune |
| Ordre de passage | Google Route Optimization | `GOOGLE_SERVICE_ACCOUNT_JSON` |

Sans clé, le lot marche quand même en saisie à la main, sans calcul de l'ordre. Le code de
ces appels est dans `src/lib/services.ts` ; tout ce qui se calcule sans réseau (et se teste)
est dans `src/lib/tournees.ts`.

Données personnelles : seules les adresses sont gardées (la consigne de lecture interdit les
noms et les téléphones), les photos sont réduites par le navigateur, envoyées à l'API Claude
et jamais enregistrées. Les tournées sont effacées 7 jours après leur date : chaque nuit si
l'extension pg_cron est disponible, et à chaque nouvelle tournée pour l'entreprise concernée.

À vérifier au premier essai réel : la version d'API et le format de sortie de la lecture, les
noms de champs de la réponse Google, le seuil de fiabilité des adresses (0,7).

## Lot 3 (construit) : prospects et donneurs d'ordre

Carnet (`/carnet`) réservé au dirigeant : prospects, clients, anciens clients, avec une fiche
par contact (`/carnet/fiche`). Relances datées, à cocher « Fait » ; celles qui sont dues
s'affichent en nombre à côté de « Mon carnet ». Le nom tapé dans une simulation est relié
au carnet (un nom nouveau y entre comme prospect) ; la simulation garde aussi le nom tel
qu'il a été tapé. Migration : `0004_carnet.sql`.

## Lot 4 (construit, sauf le carburant) : véhicules et rappels

Véhicules (`/vehicules`, fiche sur `/vehicules/fiche`) réservés au dirigeant : prochaines
échéances du contrôle technique, de l'assurance et des pneus, à l'orange 30 jours avant et
au rouge une fois dépassées ; leur nombre s'affiche à côté de « Mes véhicules ». Chaque
véhicule peut porter ses propres coûts (consommation, loyer, assurance, entretien) : dans
le simulateur, le choisir pose ces coûts par-dessus « Mes coûts ». Migration : `0005_vehicules.sql`.

Reste à faire : le prix du carburant autour d'un trajet à partir des données publiques,
et l'envoi des rappels par e-mail (aucun service d'envoi
n'est branché ; les rappels ne s'affichent que dans l'application).

## Lot 5 (construit) : accès chauffeur

Le dirigeant ajoute ses chauffeurs dans « Mon équipe » (`/equipe`) : nom et adresse e-mail,
connexion par lien comme lui. Aucun e-mail d'invitation ne part, c'est à lui de prévenir. Un
compte ne peut appartenir qu'à une seule entreprise. Il confie une tournée à un chauffeur
depuis la fiche de la tournée.

En se connectant, le chauffeur arrive sur « Ma tournée » : ses tournées du jour et à venir,
arrêt par arrêt, avec l'heure prévue et un bouton de guidage. Il dépose ses notes de frais
(`/frais`), que le dirigeant valide ou refuse, et échange avec lui par messages (`/messages`).
Il ne voit jamais les coûts, les simulations, le carnet ni les véhicules : ce sont les règles
RLS qui le garantissent, pas les écrans. Migration : `0007_chauffeurs.sql`.

Limites connues : pas de photo du ticket sur une note de frais, pas d'alerte à l'arrivée d'un
message (il faut recharger la page), le chauffeur ne coche pas encore ses arrêts.

## À faire ensuite

- Prix du carburant autour d'un trajet, à partir des données publiques.
- Un service d'envoi d'e-mails : invitations, rappels d'échéances et de relances, alertes de messages.
- Premier essai réel de la lecture des photos et du calcul de l'ordre de passage (lot 2).
