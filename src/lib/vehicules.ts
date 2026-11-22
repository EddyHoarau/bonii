import type { Saisie } from "@/moteur";
import { COUTS, type DefChamp } from "@/lib/profil";
import { estDate, joursAvant } from "@/lib/echeances";

/** Les coûts qui dépendent du véhicule ; les autres (salaire, gazole, frais généraux) restent ceux de l'entreprise. */
export const CLES_COUTS_VEHICULE = ["conso", "vehicule", "assurance", "entretien"] as const;
export type CleCout = (typeof CLES_COUTS_VEHICULE)[number];
export const COUTS_VEHICULE: DefChamp[] = COUTS.filter((d) => (CLES_COUTS_VEHICULE as readonly string[]).includes(d[0]));

export const ECHEANCES = [
  ["controle_technique_le", "Contrôle technique"],
  ["assurance_le", "Assurance"],
  ["pneus_le", "Pneus"],
] as const;
export type CleEcheance = (typeof ECHEANCES)[number][0];

/** Une échéance à moins de 30 jours passe à l'orange et compte dans les rappels. */
export const ALERTE_ECHEANCE = 30;

export type Vehicule = { nom: string; immatriculation: string | null } & Record<CleCout, number | null> & Record<CleEcheance, string | null>;

export const COLONNES_VEHICULE = ["nom", "immatriculation", ...CLES_COUTS_VEHICULE, ...ECHEANCES.map((e) => e[0])].join(", ");

/** Fiche reçue d'un formulaire : tout est relu. Un coût ou une date laissés vides valent « non renseigné ». */
export function lireVehicule(lire: (cle: string) => string): { fiche: Vehicule } | { erreur: string } {
  const nom = lire("nom").trim(), immatriculation = lire("immatriculation").trim().toUpperCase();
  if (nom.length < 1 || nom.length > 100) return { erreur: "Donnez un nom au véhicule (100 caractères au plus)." };
  if (immatriculation.length > 20) return { erreur: "L'immatriculation dépasse 20 caractères." };
  const fiche = { nom, immatriculation: immatriculation || null } as Vehicule;
  for (const cle of CLES_COUTS_VEHICULE) {
    const brut = lire(cle).trim().replace(",", "."), n = Number(brut);
    if (brut !== "" && (!Number.isFinite(n) || n < 0 || n > 1_000_000)) return { erreur: "Un coût est incorrect. Saisissez un nombre positif, ou laissez vide." };
    fiche[cle] = brut === "" ? null : n;
  }
  for (const [cle, libelle] of ECHEANCES) {
    const brut = lire(cle).trim();
    if (brut !== "" && !estDate(brut)) return { erreur: "La date « " + libelle + " » n'est pas valide." };
    fiche[cle] = brut || null;
  }
  return { fiche };
}

/** Les coûts renseignés sur le véhicule, à poser par-dessus ceux de l'entreprise. */
export function coutsDuVehicule(v: Partial<Record<CleCout, number | null>>): Partial<Saisie> {
  const o: Partial<Saisie> = {};
  for (const cle of CLES_COUTS_VEHICULE) { const n = v[cle]; if (typeof n === "number") o[cle] = n; }
  return o;
}

/** Nombre d'échéances dépassées ou à moins de 30 jours, tous véhicules confondus. */
export function echeancesProches(vehicules: Partial<Record<CleEcheance, string | null>>[], aujourdhui: string) {
  let n = 0;
  for (const v of vehicules) for (const [cle] of ECHEANCES) { const d = v[cle]; if (d && joursAvant(d, aujourdhui) <= ALERTE_ECHEANCE) n++; }
  return n;
}
