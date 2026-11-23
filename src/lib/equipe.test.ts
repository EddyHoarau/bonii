import { describe, expect, it } from "vitest";
import { lienGuidage, liensTournee, lireInvitation, lireMessage, lireNote } from "./equipe";

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

describe("liensTournee", () => {
  const p = (k: number) => ({ lat: 48 + k / 100, lon: 6 + k / 100 });
  it("découpe par 10 dans l'ordre, la dernière étape du paquet devenant l'arrivée", () => {
    const liens = liensTournee(Array.from({ length: 23 }, (_, k) => p(k + 1)));
    expect(liens.map((l) => [l.de, l.a])).toEqual([[1, 10], [11, 20], [21, 23]]);
    const q = new URL(liens[0].href).searchParams;
    expect(q.get("destination")).toBe("48.1,6.1");
    expect(q.get("waypoints")?.split("|")).toHaveLength(9);
    expect(q.get("waypoints")?.startsWith("48.01,6.01|48.02,6.02")).toBe(true);
    expect(q.has("origin")).toBe(false);
  });
  it("saute les arrêts sans position mais garde leur numéro ; un arrêt seul n'a pas d'étape", () => {
    const liens = liensTournee([p(1), { lat: null, lon: null }, p(3)]);
    expect(liens.map((l) => [l.de, l.a])).toEqual([[1, 3]]);
    expect(new URL(liens[0].href).searchParams.get("waypoints")).toBe("48.01,6.01");
    expect(new URL(liensTournee([p(5)])[0].href).searchParams.has("waypoints")).toBe(false);
    expect(liensTournee([{ lat: null, lon: null }])).toEqual([]);
  });
});
