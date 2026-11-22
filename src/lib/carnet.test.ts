import { describe, expect, it } from "vitest";
import { lireDonneur, trouverDonneur } from "./carnet";
import { delai, estDate, joursAvant, urgence } from "./echeances";

const lire = (o: Record<string, string>) => (cle: string) => o[cle] ?? "";

describe("lireDonneur", () => {
  it("nettoie les espaces et vide les champs non remplis", () => {
    expect(lireDonneur(lire({ nom: "  Colis Express ", statut: "prospect", telephone: " 03 83 00 00 00 " }))).toEqual({
      fiche: { nom: "Colis Express", statut: "prospect", interlocuteur: null, telephone: "03 83 00 00 00", email: null, notes: null },
    });
  });
  it("refuse un nom vide, un statut inconnu ou un e-mail faux", () => {
    expect(lireDonneur(lire({ nom: " ", statut: "prospect" }))).toHaveProperty("erreur");
    expect(lireDonneur(lire({ nom: "A", statut: "pirate" }))).toHaveProperty("erreur");
    expect(lireDonneur(lire({ nom: "A", statut: "client", email: "pas-une-adresse" }))).toHaveProperty("erreur");
  });
});

describe("trouverDonneur", () => {
  const carnet = [{ id: 1, nom: "Colis Express" }, { id: 2, nom: "Nord Fret" }];
  it("ignore les majuscules et les espaces autour", () => {
    expect(trouverDonneur(carnet, " colis express ")?.id).toBe(1);
  });
  it("ne trouve rien pour un nom vide ou inconnu", () => {
    expect(trouverDonneur(carnet, "")).toBeUndefined();
    expect(trouverDonneur(carnet, "Colis")).toBeUndefined();
  });
});

describe("échéances", () => {
  it("compte les jours, même à cheval sur un changement d'heure", () => {
    expect(joursAvant("2026-11-25", "2026-11-22")).toBe(3);
    expect(joursAvant("2026-10-24", "2026-10-26")).toBe(-2);
    expect(joursAvant("2027-03-29", "2027-03-27")).toBe(2);
  });
  it("classe : passée en rouge, proche en orange, lointaine en vert", () => {
    expect([urgence(-1, 7), urgence(0, 7), urgence(7, 7), urgence(8, 7)]).toEqual(["bad", "warn", "warn", "ok"]);
  });
  it("écrit le délai en clair", () => {
    expect([delai(0), delai(1), delai(12), delai(-1), delai(-3)]).toEqual(["aujourd'hui", "dans 1 jour", "dans 12 jours", "en retard de 1 jour", "en retard de 3 jours"]);
  });
  it("reconnaît une date valide", () => {
    expect([estDate("2026-11-22"), estDate("2026-13-40"), estDate("22/11/2026"), estDate(null)]).toEqual([true, false, false, false]);
  });
});
