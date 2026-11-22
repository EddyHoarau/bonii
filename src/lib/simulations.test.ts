import { describe, expect, it } from "vitest";
import { DEFAULTS } from "@/moteur";
import { lireSaisie, verdict } from "./simulations";

describe("lireSaisie", () => {
  it("garde une saisie complète et retire les clés inconnues", () => {
    expect(lireSaisie({ ...DEFAULTS, pirate: "x" })).toEqual(DEFAULTS);
  });
  it("refuse une valeur négative, texte, infinie ou absente", () => {
    expect(lireSaisie({ ...DEFAULTS, salaire: -1 })).toBeNull();
    expect(lireSaisie({ ...DEFAULTS, salaire: "3000" })).toBeNull();
    expect(lireSaisie({ ...DEFAULTS, km: Infinity })).toBeNull();
    expect(lireSaisie({ ...DEFAULTS, points: undefined })).toBeNull();
    expect(lireSaisie(null)).toBeNull();
  });
});

describe("verdict", () => {
  it("donne le même verdict que le simulateur sur les valeurs d'exemple", () => {
    expect(verdict("tournee", DEFAULTS)).toEqual({ cls: "ok", pill: "Rentable", marge: expect.closeTo(2710.5, 1) });
    expect(verdict("course", { ...DEFAULTS, cOffre: 0 }).pill).toBe("Prix conseillé");
    expect(verdict("course", { ...DEFAULTS, cOffre: 200 }).pill).toBe("À refuser"); // sous le plancher de 257
  });
});
