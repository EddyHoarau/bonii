import { DEFAULTS, course, tournee, type Saisie } from "@/moteur";
import type { Etat } from "@/components/carte";

export type TypeSimulation = "tournee" | "course";
export type Statut = "a_l_etude" | "repondu" | "gagne" | "perdu";

export const STATUTS: Record<Statut, string> = { a_l_etude: "À l'étude", repondu: "Répondu", gagne: "Gagné", perdu: "Perdu" };
export const TYPES: Record<TypeSimulation, string> = { tournee: "Tournée", course: "Course" };

export const estStatut = (v: unknown): v is Statut => typeof v === "string" && v in STATUTS;
export const estType = (v: unknown): v is TypeSimulation => v === "tournee" || v === "course";

/** Marge sous 0 : à perte ; sous 15 % du prix : trop juste ; sinon rentable. */
export const classe = (marge: number, taux: number): Etat => (marge < 0 ? "bad" : taux < 0.15 ? "warn" : "ok");

/** Verdict affiché par le simulateur, repris dans la liste et la comparaison. */
export function verdict(type: TypeSimulation, s: Saisie): { cls: Etat; pill: string; marge: number | null } {
  if (type === "tournee") {
    const r = tournee(s);
    const cls = classe(r.marge, r.taux);
    return { cls, pill: cls === "bad" ? "À perte" : cls === "warn" ? "Trop juste" : "Rentable", marge: r.marge };
  }
  const r = course(s);
  if (r.margeOffre === null) return { cls: "ok", pill: "Prix conseillé", marge: null };
  const cls = classe(r.margeOffre, r.margeOffre / s.cOffre);
  return { cls, pill: cls === "bad" ? "À refuser" : cls === "warn" ? "À négocier" : "À accepter", marge: r.margeOffre };
}

/** Saisie reçue du navigateur ou lue en base : seules les clés connues, en nombres positifs. Null si une valeur est fausse. */
export function lireSaisie(brut: unknown): Saisie | null {
  if (!brut || typeof brut !== "object") return null;
  const s = { ...DEFAULTS };
  for (const cle of Object.keys(DEFAULTS) as (keyof Saisie)[]) {
    const v = (brut as Record<string, unknown>)[cle];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1_000_000) return null;
    s[cle] = v;
  }
  return s;
}
