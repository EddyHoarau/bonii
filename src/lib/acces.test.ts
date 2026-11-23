import { describe, expect, it } from "vitest";
import { FORMAT_JETON, erreurMotDePasse } from "./acces";

describe("mot de passe", () => {
  it("refuse trop court, trop long ou différent de la confirmation", () => {
    expect(erreurMotDePasse("court", "court")).toMatch(/au moins 10/);
    expect(erreurMotDePasse("a".repeat(73), "a".repeat(73))).toMatch(/72/);
    expect(erreurMotDePasse("assez-long-1", "assez-long-2")).toMatch(/identiques/);
  });
  it("accepte 10 caractères identiques", () => {
    expect(erreurMotDePasse("0123456789", "0123456789")).toBeNull();
  });
});

describe("jeton du lien d'accès", () => {
  it("n'accepte que de l'hexadécimal de longueur raisonnable", () => {
    expect(FORMAT_JETON.test("f699759f240c6c8520f94ac892c7335c4925b17dec641e7d26308636")).toBe(true);
    expect(FORMAT_JETON.test("abc")).toBe(false);
    expect(FORMAT_JETON.test("zzzz759f240c6c8520f94ac892")).toBe(false);
    expect(FORMAT_JETON.test("f699759f240c6c85<script>")).toBe(false);
  });
});
