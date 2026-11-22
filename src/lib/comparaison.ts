import type { SupabaseClient } from "@supabase/supabase-js";
import { course, seuilSur, tournee, type Saisie } from "@/moteur";
import { eur, eur2, nf0, nf1, signe } from "@/lib/format";
import { STATUTS, TYPES, lireSaisie, type Statut, type TypeSimulation } from "@/lib/simulations";

export type Sim = { id: string; type: TypeSimulation; nom: string; donneur_ordre: string | null; date_simulation: string; statut: Statut; s: Saisie };

/** Lignes du tableau, communes à l'écran et au PDF : libellé, puis valeur par simulation (null si sans objet pour ce type). */
export const LIGNES: [string, (x: Sim) => string | null][] = [
  ["Type", (x) => TYPES[x.type]],
  ["Donneur d'ordre", (x) => x.donneur_ordre ?? ""],
  ["Date", (x) => new Date(x.date_simulation + "T12:00:00").toLocaleDateString("fr-FR")],
  ["Statut", (x) => STATUTS[x.statut]],
  ["Marge mensuelle", (x) => (x.type === "tournee" ? signe(tournee(x.s).marge) : null)],
  ["Marge en % du chiffre d'affaires", (x) => (x.type === "tournee" ? Math.round(tournee(x.s).taux * 100) + " %" : null)],
  ["Chiffre d'affaires mensuel", (x) => (x.type === "tournee" ? eur(tournee(x.s).ca) : null)],
  ["Coût de revient mensuel", (x) => (x.type === "tournee" ? eur(tournee(x.s).cout) : null)],
  ["Prix du point minimum", (x) => (x.type !== "tournee" ? null : ((p) => (p === null ? "Aucun" : eur2(p)))(seuilSur(x.s, "prixPoint", 60)))],
  ["Points par jour minimum", (x) => (x.type !== "tournee" ? null : ((n) => (n === null ? "Jamais" : nf0(Math.ceil(n))))(seuilSur(x.s, "points", 600)))],
  ["Points par jour", (x) => (x.type === "tournee" ? nf0(x.s.points) : null)],
  ["Kilomètres par jour", (x) => (x.type === "tournee" ? nf0(x.s.km) + " km" : null)],
  ["Jours travaillés par mois", (x) => (x.type === "tournee" ? nf0(x.s.jours) : null)],
  ["Prix du point", (x) => (x.type === "tournee" ? eur2(x.s.prixPoint) : null)],
  ["Prix proposé par le client", (x) => (x.type === "course" ? (x.s.cOffre > 0 ? eur(x.s.cOffre) : "Non indiqué") : null)],
  ["Marge au prix proposé", (x) => (x.type === "course" ? ((m) => (m === null ? "" : signe(m)))(course(x.s).margeOffre) : null)],
  ["Prix plancher", (x) => (x.type === "course" ? eur(course(x.s).plancher) : null)],
  ["Prix conseillé", (x) => (x.type === "course" ? eur(course(x.s).conseille) + " à " + nf0(x.s.cMarge) + " %" : null)],
  ["Distance aller et retour", (x) => (x.type === "course" ? nf0(x.s.cKm) + " km" : null)],
  ["Temps passé", (x) => (x.type === "course" ? nf1(x.s.cHeures) + " h" : null)],
  ["Salaire chargé", (x) => eur(x.s.salaire)],
  ["Gazole hors taxe", (x) => eur2(x.s.gazole) + " / L"],
];

/** Lignes qui concernent au moins une des simulations, avec leurs valeurs. */
export const tableau = (sims: Sim[]) =>
  LIGNES.map(([libelle, f]) => [libelle, sims.map(f)] as const).filter(([, vals]) => vals.some((v) => v !== null));

const FORMAT_ID = /^[0-9a-f-]{36}$/i;

/** Identifiants lus dans l'adresse (?ids=…&ids=…), dédoublonnés et au bon format. */
export const lireIds = (ids: string | string[] | undefined) => [...new Set([ids ?? []].flat())].filter((id) => FORMAT_ID.test(id));

/** Simulations demandées, dans l'ordre demandé. RLS : celles d'une autre entreprise ne reviennent jamais. */
export async function chargerSimulations(supabase: SupabaseClient, ids: string[]): Promise<Sim[]> {
  const { data } = await supabase.from("simulations").select("id, type, nom, donneur_ordre, date_simulation, statut, saisie").in("id", ids);
  return ids.flatMap((id) => {
    const l = data?.find((d) => d.id === id);
    const s = l && lireSaisie(l.saisie);
    return l && s ? [{ ...(l as Omit<Sim, "s">), s }] : [];
  });
}
