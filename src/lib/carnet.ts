export type StatutDonneur = "prospect" | "client" | "ancien";

export const STATUTS_DONNEUR: Record<StatutDonneur, string> = { prospect: "Prospect", client: "Client", ancien: "Ancien client" };
export const estStatutDonneur = (v: unknown): v is StatutDonneur => typeof v === "string" && v in STATUTS_DONNEUR;

/** Une relance prévue dans les 7 jours passe à l'orange. */
export const ALERTE_RELANCE = 7;

export type Donneur = { nom: string; statut: StatutDonneur; interlocuteur: string | null; telephone: string | null; email: string | null; notes: string | null };

const FORMAT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Fiche reçue d'un formulaire : tout est relu. Renvoie la fiche propre, ou le message à afficher. */
export function lireDonneur(lire: (cle: string) => string): { fiche: Donneur } | { erreur: string } {
  const [nom, statut, interlocuteur, telephone, email, notes] = ["nom", "statut", "interlocuteur", "telephone", "email", "notes"].map((c) => lire(c).trim());
  if (nom.length < 1 || nom.length > 200) return { erreur: "Indiquez le nom du donneur d'ordre (200 caractères au plus)." };
  if (!estStatutDonneur(statut)) return { erreur: "Statut inconnu. Rechargez la page et recommencez." };
  if (interlocuteur.length > 200) return { erreur: "Le nom de l'interlocuteur dépasse 200 caractères." };
  if (telephone.length > 40) return { erreur: "Le téléphone dépasse 40 caractères." };
  if (email && (!FORMAT_EMAIL.test(email) || email.length > 254)) return { erreur: "L'adresse e-mail ne semble pas valide." };
  if (notes.length > 4000) return { erreur: "Les notes dépassent 4 000 caractères." };
  return { fiche: { nom, statut, interlocuteur: interlocuteur || null, telephone: telephone || null, email: email || null, notes: notes || null } };
}

/** Retrouve dans le carnet le nom tapé dans une simulation, sans tenir compte des majuscules. */
export function trouverDonneur<T extends { nom: string }>(carnet: T[], nom: string): T | undefined {
  const cherche = nom.trim().toLowerCase();
  return cherche ? carnet.find((d) => d.nom.toLowerCase() === cherche) : undefined;
}
