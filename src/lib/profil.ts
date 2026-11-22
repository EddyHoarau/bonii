import type { Saisie } from "@/moteur";

// [clé, libellé, unité, pas, aide]
export type DefChamp = [keyof Saisie, string, string, number, string?];

export const JOURS: DefChamp = ["jours", "Jours travaillés par mois", "jours", 1];

export const COUTS: DefChamp[] = [
  ["salaire", "Chauffeur, salaire chargé", "€ / mois", 50],
  ["conso", "Consommation", "L / 100 km", 0.5],
  ["gazole", "Gazole hors taxe", "€ / L", 0.01],
  ["vehicule", "Véhicule, loyer ou amortissement", "€ / mois", 10],
  ["assurance", "Assurance", "€ / mois", 10],
  ["entretien", "Entretien et pneus", "€ / km", 0.01],
  ["generaux", "Frais généraux", "€ / mois", 10],
];

/** Colonnes de la table profils_couts : les jours travaillés et les coûts. */
export const CLES_PROFIL = [JOURS, ...COUTS].map((d) => d[0]);

export type Profil = Partial<Pick<Saisie, "jours" | "salaire" | "conso" | "gazole" | "vehicule" | "assurance" | "entretien" | "generaux">>;
