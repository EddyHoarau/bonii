import { estDate } from "@/lib/echeances";

export type Role = "dirigeant" | "chauffeur";
export type StatutNote = "a_valider" | "validee" | "refusee";

export const STATUTS_NOTE: Record<StatutNote, string> = { a_valider: "À valider", validee: "Validée", refusee: "Refusée" };
export const estStatutNote = (v: unknown): v is StatutNote => typeof v === "string" && v in STATUTS_NOTE;
export const NATURES = ["Carburant", "Péage", "Parking", "Repas", "Lavage", "Entretien", "Autre"];

export type Note = { jour: string; nature: string; montant: number; commentaire: string | null };

/** Note de frais reçue d'un formulaire : tout est relu. Le montant est arrondi au centime. */
export function lireNote(lire: (cle: string) => string): { fiche: Note } | { erreur: string } {
  const jour = lire("jour").trim(), nature = lire("nature").trim(), commentaire = lire("commentaire").trim();
  const brut = lire("montant").trim().replace(",", "."), montant = Math.round(Number(brut) * 100) / 100;
  if (!estDate(jour)) return { erreur: "Choisissez la date de la dépense." };
  if (!NATURES.includes(nature)) return { erreur: "Choisissez la nature de la dépense." };
  if (brut === "" || !Number.isFinite(montant) || montant <= 0 || montant > 100_000) return { erreur: "Indiquez un montant supérieur à zéro." };
  if (commentaire.length > 500) return { erreur: "Le commentaire dépasse 500 caractères." };
  return { fiche: { jour, nature, montant, commentaire: commentaire || null } };
}

/** Message à envoyer : sans espaces autour, 2 000 caractères au plus. Null s'il est vide ou trop long. */
export function lireMessage(texte: unknown): string | null {
  const t = typeof texte === "string" ? texte.trim() : "";
  return t.length >= 1 && t.length <= 2000 ? t : null;
}

const FORMAT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Invitation d'un chauffeur : son nom affiché et son adresse e-mail. */
export function lireInvitation(lire: (cle: string) => string): { nom: string; email: string } | { erreur: string } {
  const nom = lire("nom").trim(), email = lire("email").trim().toLowerCase();
  if (nom.length < 1 || nom.length > 100) return { erreur: "Indiquez le nom du chauffeur (100 caractères au plus)." };
  if (!FORMAT_EMAIL.test(email) || email.length > 254) return { erreur: "L'adresse e-mail ne semble pas valide." };
  return { nom, email };
}

/** Lien qui ouvre le guidage vers un point dans Google Maps (application ou site). */
export const lienGuidage = (lat: number, lon: number) => "https://www.google.com/maps/dir/?api=1&destination=" + lat + "," + lon;
