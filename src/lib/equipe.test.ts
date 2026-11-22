import { describe, expect, it } from "vitest";
import { lienGuidage, lireInvitation, lireMessage, lireNote } from "./equipe";

const lire = (o: Record<string, string>) => (cle: string) => o[cle] ?? "";
const note = { jour: "2026-11-23", nature: "Carburant", montant: "62,4", commentaire: " Plein à Toul " };

describe("lireNote", () => {
  it("accepte la virgule et arrondit au centime", () => {
    expect(lireNote(lire(note))).toEqual({ fiche: { jour: "2026-11-23", nature: "Carburant", montant: 62.4, commentaire: "Plein à Toul" } });
    const lu = lireNote(lire({ ...note, montant: "12.345", commentaire: "" }));
    expect("fiche" in lu && [lu.fiche.montant, lu.fiche.commentaire]).toEqual([12.35, null]);
  });
  it("refuse une date fausse, une nature inconnue, un montant nul, négatif, vide ou en texte", () => {
    for (const faux of [{ jour: "hier" }, { nature: "Cadeau" }, { montant: "0" }, { montant: "-5" }, { montant: "" }, { montant: "dix" }, { montant: "200000" }]) {
      expect(lireNote(lire({ ...note, ...faux }))).toHaveProperty("erreur");
    }
  });
});

describe("lireMessage", () => {
  it("retire les espaces autour et refuse le vide, le trop long et ce qui n'est pas du texte", () => {
    expect(lireMessage("  Bien reçu  ")).toBe("Bien reçu");
    expect([lireMessage("   "), lireMessage("x".repeat(2001)), lireMessage(null)]).toEqual([null, null, null]);
  });
});

describe("lireInvitation", () => {
  it("met l'adresse en minuscules", () => {
    expect(lireInvitation(lire({ nom: " Karim ", email: " Karim@Exemple.FR " }))).toEqual({ nom: "Karim", email: "karim@exemple.fr" });
  });
  it("refuse un nom vide ou une adresse fausse", () => {
    expect(lireInvitation(lire({ nom: "", email: "a@b.fr" }))).toHaveProperty("erreur");
    expect(lireInvitation(lire({ nom: "Karim", email: "karim" }))).toHaveProperty("erreur");
  });
});

describe("lienGuidage", () => {
  it("donne la latitude puis la longitude", () => {
    expect(lienGuidage(48.69, 6.18)).toBe("https://www.google.com/maps/dir/?api=1&destination=48.69,6.18");
  });
});
