import { describe, expect, it } from "vitest";
import { DEFAULTS, tournee } from "@/moteur";
import { COUTS_VEHICULE, coutsDuVehicule, echeancesProches, lireVehicule } from "./vehicules";

const lire = (o: Record<string, string>) => (cle: string) => o[cle] ?? "";

describe("lireVehicule", () => {
  it("garde les champs remplis et laisse les autres vides", () => {
    expect(lireVehicule(lire({ nom: " Master 2 ", immatriculation: "ab-123-cd", conso: "9,5", pneus_le: "2027-03-01" }))).toEqual({
      fiche: {
        nom: "Master 2", immatriculation: "AB-123-CD", conso: 9.5, vehicule: null, assurance: null, entretien: null,
        controle_technique_le: null, assurance_le: null, pneus_le: "2027-03-01",
      },
    });
  });
  it("accepte un coût à zéro, qui n'est pas un coût vide", () => {
    const lu = lireVehicule(lire({ nom: "Kangoo", vehicule: "0" }));
    expect("fiche" in lu && lu.fiche.vehicule).toBe(0);
  });
  it("refuse un nom vide, un coût négatif ou du texte, une date fausse", () => {
    expect(lireVehicule(lire({ nom: "" }))).toHaveProperty("erreur");
    expect(lireVehicule(lire({ nom: "A", conso: "-1" }))).toHaveProperty("erreur");
    expect(lireVehicule(lire({ nom: "A", assurance: "cher" }))).toHaveProperty("erreur");
    expect(lireVehicule(lire({ nom: "A", assurance_le: "demain" }))).toHaveProperty("erreur");
  });
});

describe("coutsDuVehicule", () => {
  it("ne remplace que les coûts renseignés, zéro compris", () => {
    expect(coutsDuVehicule({ conso: 8, vehicule: 0, assurance: null, entretien: null })).toEqual({ conso: 8, vehicule: 0 });
  });
  it("change bien le résultat du moteur", () => {
    const avant = tournee(DEFAULTS).marge;
    const apres = tournee({ ...DEFAULTS, ...coutsDuVehicule({ conso: 8, vehicule: 450, assurance: null, entretien: null }) }).marge;
    // 150 km x 22 jours = 3 300 km : 2 L/100 de moins à 1,45 € = 95,70 €, plus 150 € de loyer en moins.
    expect(apres - avant).toBeCloseTo(245.7, 2);
  });
  it("porte sur les quatre coûts liés au véhicule", () => {
    expect(COUTS_VEHICULE.map((d) => d[0])).toEqual(["conso", "vehicule", "assurance", "entretien"]);
  });
});

describe("echeancesProches", () => {
  it("compte les échéances dépassées ou à 30 jours au plus", () => {
    const vehicules = [
      { controle_technique_le: "2026-11-01", assurance_le: "2026-12-22", pneus_le: "2026-12-23" }, // dépassée, à 30 jours, à 31 jours
      { controle_technique_le: null, assurance_le: "2026-11-22" },                                   // aujourd'hui
    ];
    expect(echeancesProches(vehicules, "2026-11-22")).toBe(3);
  });
});
