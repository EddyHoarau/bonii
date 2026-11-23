import { describe, expect, it } from "vitest";
import { estActive, filAriane, menuPour } from "./navigation";

const hrefs = (g: ReturnType<typeof menuPour>) => g.flatMap((x) => x.rubriques.map((r) => r.href));

describe("menu", () => {
  it("le chauffeur ne voit que sa tournée, ses notes et ses messages", () => {
    expect(hrefs(menuPour("chauffeur", false))).toEqual(["/", "/frais", "/messages"]);
  });
  it("le dirigeant voit tout sauf l'administration, réservée à l'administrateur", () => {
    expect(hrefs(menuPour("dirigeant", false))).not.toContain("/admin");
    expect(hrefs(menuPour("dirigeant", true))).toContain("/admin");
    expect(hrefs(menuPour("dirigeant", false))).not.toContain("/messages"); // le dirigeant passe par Mon équipe
  });
  it("4 rubriques au plus dans la barre du bas", () => {
    for (const r of ["dirigeant", "chauffeur", null] as const) {
      expect(menuPour(r, true).flatMap((g) => g.rubriques).filter((x) => x.principal).length).toBeLessThanOrEqual(4);
    }
  });
  it("reporte les compteurs", () => {
    const r = menuPour("dirigeant", false, { relances: 2, echeances: 1, notes: 3 }).flatMap((g) => g.rubriques);
    expect(r.find((x) => x.href === "/carnet")?.compteur).toBe(2);
    expect(r.find((x) => x.href === "/frais")?.compteur).toBe(3);
  });
});

describe("rubrique active", () => {
  it("l'accueil n'est actif que sur lui-même, une fiche active sa rubrique", () => {
    expect(estActive("/", "/")).toBe(true);
    expect(estActive("/", "/carnet")).toBe(false);
    expect(estActive("/tournees", "/tournees/fiche")).toBe(true);
    expect(estActive("/frais", "/fraisx")).toBe(false);
  });
});

describe("fil d'Ariane", () => {
  it("nomme chaque niveau, sans lien sur le dernier", () => {
    expect(filAriane("/")).toEqual([{ libelle: "Accueil" }]);
    expect(filAriane("/tournees/fiche")).toEqual([
      { libelle: "Accueil", href: "/" }, { libelle: "Mes tournées", href: "/tournees" }, { libelle: "Tournée" },
    ]);
    expect(filAriane("/simulations/comparer").map((x) => x.libelle)).toEqual(["Accueil", "Mes simulations", "Comparer"]);
  });
});
