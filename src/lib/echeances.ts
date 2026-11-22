import type { Etat } from "@/components/carte";

// Dates au format AAAA-MM-JJ, comme en base. Sert aux relances (lot 3) et aux échéances des véhicules (lot 4).

const FORMAT_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const estDate = (v: unknown): v is string => typeof v === "string" && FORMAT_DATE.test(v) && !Number.isNaN(Date.parse(v));

/** Date du jour à Paris : le serveur, lui, est à l'heure UTC. */
export const aujourdhuiParis = () => new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date());

/** Nombre de jours entre aujourd'hui et la date (négatif si elle est passée). */
export const joursAvant = (date: string, aujourdhui: string) => Math.round((Date.parse(date) - Date.parse(aujourdhui)) / 86_400_000);

/** Passée : rouge. Dans moins de `alerte` jours : orange. Sinon vert. */
export const urgence = (jours: number, alerte: number): Etat => (jours < 0 ? "bad" : jours <= alerte ? "warn" : "ok");

export function delai(jours: number) {
  const n = Math.abs(jours), j = n > 1 ? " jours" : " jour";
  return jours === 0 ? "aujourd'hui" : jours < 0 ? "en retard de " + n + j : "dans " + n + j;
}

export const dateFr = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
