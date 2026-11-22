import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { DEFAULTS } from "@/moteur";
import type { Sim } from "./comparaison";
import { contenuPdf, fabriquerPdf, propre } from "./pdf";

const TIRET_LONG = /[‒-―−]/; // tiret numérique, demi-cadratin, cadratin, barre, signe moins
const FLECHE = /[←-⇿⟰-⟿⤀-⥿⬀-⬯➜-➿]/;

const sim = (o: Partial<Sim>): Sim => ({
  id: "00000000-0000-0000-0000-000000000001", type: "tournee", nom: "Tournée", donneur_ordre: null,
  date_simulation: "2026-11-22", statut: "a_l_etude", s: DEFAULTS, ...o,
});
// Noms piégés : un utilisateur peut taper des tirets longs, des flèches ou un émoji.
const SIMS = [
  sim({ nom: "Tournée Nord — lot 3 → Lille", donneur_ordre: "Réseau – Exemple ⇒ Nord" }),
  sim({ id: "00000000-0000-0000-0000-000000000002", type: "course", nom: "Course ➜ Lyon 🚚", s: { ...DEFAULTS, cOffre: 300 } }),
  sim({ id: "00000000-0000-0000-0000-000000000003", nom: "Perte", s: { ...DEFAULTS, prixPoint: 3 } }),
];

const WINANSI = new TextDecoder("windows-1252"); // codage des polices standard du PDF

/** Texte réellement écrit dans le PDF : chaînes hexadécimales des flux de page, décodées en WinAnsi. */
function texteDuPdf(octets: Uint8Array): string {
  const brut = Buffer.from(octets);
  const morceaux: string[] = [];
  let debut = brut.indexOf("stream");
  while (debut !== -1) {
    const d = debut + (brut[debut + 6] === 0x0d ? 8 : 7);
    const fin = brut.indexOf("endstream", d);
    const flux = brut.subarray(d, fin);
    let contenu: string;
    try { contenu = inflateSync(flux).toString("latin1"); } catch { contenu = flux.toString("latin1"); }
    for (const m of contenu.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)) morceaux.push(WINANSI.decode(Buffer.from(m[1], "hex")));
    debut = brut.indexOf("stream", fin + 9);
  }
  return morceaux.join("\n");
}

describe("PDF interne", () => {
  it("le contenu n'a ni tiret long ni flèche, même dans les noms saisis", () => {
    const c = contenuPdf("Transports — Test", SIMS, new Date("2026-11-22T10:00:00Z"));
    const tout = [c.titre, c.sousTitre, c.entreprise, c.pied, ...c.entetes, ...c.verdicts.map((v) => v.texte), ...c.lignes.flat(2)].join("\n");
    expect(tout).not.toMatch(TIRET_LONG);
    expect(tout).not.toMatch(FLECHE);
  });

  it("le fichier PDF n'en contient pas non plus, et garde les chiffres de référence", async () => {
    const octets = await fabriquerPdf(contenuPdf("Transports — Test", SIMS, new Date("2026-11-22T10:00:00Z")));
    expect(Buffer.from(octets.subarray(0, 5)).toString()).toBe("%PDF-");
    const texte = texteDuPdf(octets);
    expect(texte.length).toBeGreaterThan(200);
    expect(texte).not.toMatch(TIRET_LONG);
    expect(texte).not.toMatch(FLECHE);
    const espaces = texte.replace(/[\xa0 ]/g, " ");
    for (const attendu of ["7 454 €", "4 744 €", "+2 711 €", "3,87 €", "257 €", "384 € à 33 %", "Document interne"]) expect(espaces).toContain(attendu);
  });

  it("propre() remplace les tirets longs et retire les flèches", () => {
    expect(propre("A — B – C → D")).toBe("A - B - C D");
  });
});
