import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULTS, course, seuilSur, tournee, type Saisie } from "./index";

describe("valeurs par défaut du prototype", () => {
  it("tournée : CA 7 454 €, coûts 4 744 €, marge 2 711 €", () => {
    const r = tournee(DEFAULTS);
    expect(Math.round(r.ca)).toBe(7454);
    expect(Math.round(r.cout)).toBe(4744);
    expect(Math.round(r.marge)).toBe(2711);
  });

  it("équilibre : 3,87 € le point ou 20 points par jour", () => {
    expect(seuilSur(DEFAULTS, "prixPoint", 60)!.toFixed(2)).toBe("3.87");
    expect(Math.ceil(seuilSur(DEFAULTS, "points", 600)!)).toBe(20);
  });

  it("course 250 km et 8 h : plancher 257 €, conseillé 384 €", () => {
    const r = course({ ...DEFAULTS, cKm: 250, cHeures: 8 });
    expect(Math.round(r.plancher)).toBe(257);
    expect(Math.round(r.conseille)).toBe(384);
  });
});

describe("cas limites", () => {
  it("équilibre inatteignable : null", () => {
    expect(seuilSur({ ...DEFAULTS, salaire: 1e6 }, "prixPoint", 60)).toBeNull();
  });
  it("aucun point : pas de division par zéro", () => {
    const r = tournee({ ...DEFAULTS, points: 0, forfait: 0 });
    expect(r.coutPoint).toBe(0);
    expect(r.taux).toBe(-1);
  });
  it("marge visée plafonnée à 90 %", () => {
    const r = course({ ...DEFAULTS, cMarge: 200 });
    expect(r.conseille).toBeCloseTo(r.plancher * 10);
  });
  it("offre du client : marge = offre moins plancher", () => {
    const r = course({ ...DEFAULTS, cOffre: 300 });
    expect(r.margeOffre).toBeCloseTo(300 - r.plancher);
  });
});

// Le moteur du prototype, chargé tel quel depuis le fichier validé.
type Proto = {
  tournee: (s: Saisie) => ReturnType<typeof tournee> & { lignes: [string, number][] };
  seuilSur: typeof seuilSur;
  course: (s: Saisie) => ReturnType<typeof course> & { lignes: [string, number][] };
};
function chargerPrototype(): Proto {
  const html = readFileSync(new URL("../../prototype/convoi-prototype.html", import.meta.url), "utf8");
  const src = html.match(/<script id="model">([\s\S]*?)<\/script>/)![1];
  const conteneur = { exports: {} as Proto };
  new Function("module", src)(conteneur);
  return conteneur.exports;
}

describe("identique au prototype sur 500 jeux de valeurs au hasard", () => {
  const proto = chargerPrototype();
  // Générateur pseudo-aléatoire à graine fixe : le test rejoue toujours les mêmes cas.
  let graine = 42;
  const hasard = () => ((graine = (graine * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const tirer = (): Saisie => {
    const s = {} as Saisie;
    for (const k of Object.keys(DEFAULTS) as (keyof Saisie)[]) {
      // De 0 à 3 fois la valeur d'exemple, avec parfois des zéros pour tester les cas limites.
      s[k] = hasard() < 0.08 ? 0 : Math.round(DEFAULTS[k] * hasard() * 3 * 100) / 100;
    }
    return s;
  };

  it("tournee, seuilSur et course donnent les mêmes résultats", () => {
    for (let i = 0; i < 500; i++) {
      const s = tirer();
      const a = tournee(s), b = proto.tournee(s);
      for (const k of ["total", "livres", "reduit", "ca", "cout", "marge", "taux", "retenues", "coutPoint"] as const)
        expect(a[k]).toBeCloseTo(b[k], 9);
      expect(a.lignes.map((l) => [l.libelle, l.montant])).toEqual(b.lignes);

      expect(seuilSur(s, "prixPoint", 60)).toEqual(proto.seuilSur(s, "prixPoint", 60));
      expect(seuilSur(s, "points", 600)).toEqual(proto.seuilSur(s, "points", 600));

      const c = course(s), d = proto.course(s);
      for (const k of ["plancher", "conseille", "auKm"] as const) expect(c[k]).toBeCloseTo(d[k], 9);
      expect(c.margeOffre).toEqual(d.margeOffre);
      expect(c.lignes.map((l) => [l.libelle, l.montant])).toEqual(d.lignes);
    }
  });
});
