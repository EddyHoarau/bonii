import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Etat } from "@/components/carte";
import { verdict } from "@/lib/simulations";
import { tableau, type Sim } from "@/lib/comparaison";

export type ContenuPdf = {
  titre: string; sousTitre: string; entreprise: string; pied: string;
  entetes: string[]; verdicts: { texte: string; cls: Etat }[]; lignes: (readonly [string, string[]])[];
};

/** Règle de présentation : ni tiret long, ni flèche, y compris dans ce que l'utilisateur a tapé. */
export const propre = (t: string) =>
  t.replace(/[‒-―−]/g, "-") // tirets longs et signe moins
    .replace(/[←-⇿⟰-⟿⤀-⥿⬀-⬯➜-➿]/g, " ") // flèches
    .replace(/ /g, " ") // espace fine des nombres : absente des polices standard du PDF
    .replace(/ {2,}/g, " ").trim();

/** Tout le texte du document, sans mise en page. */
export function contenuPdf(entreprise: string, sims: Sim[], edition: Date): ContenuPdf {
  return {
    titre: propre(sims.length === 1 ? sims[0].nom : `Comparaison de ${sims.length} simulations`),
    sousTitre: `Chiffres figés au jour de l'enregistrement. Édité le ${edition.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}.`,
    entreprise: propre(entreprise),
    pied: "Document interne : il montre la marge de l'entreprise. Ne pas le transmettre au donneur d'ordre.",
    entetes: sims.map((x) => propre(x.nom)),
    verdicts: sims.map((x) => { const v = verdict(x.type, x.s); return { texte: v.pill, cls: v.cls }; }),
    lignes: tableau(sims).map(([libelle, vals]) => [propre(libelle), vals.map((v) => propre(v ?? ""))] as const),
  };
}

// Mise en page A4, sobre : noir sur blanc, gris pour les libellés, couleur réservée au verdict.
const A4: [number, number] = [595.28, 841.89];
const MARGE = 48;
const NOIR = rgb(0.1, 0.1, 0.12), GRIS = rgb(0.42, 0.45, 0.5), FILET = rgb(0.86, 0.87, 0.89);
const COULEUR: Record<Etat, ReturnType<typeof rgb>> = { ok: rgb(0.06, 0.5, 0.32), warn: rgb(0.8, 0.4, 0.02), bad: rgb(0.78, 0.13, 0.13) };

/** Découpe un texte en lignes qui tiennent dans la largeur donnée. */
function couper(t: string, font: PDFFont, taille: number, largeur: number): string[] {
  const lignes: string[] = [];
  let courante = "";
  for (const mot of t.split(" ")) {
    const essai = courante ? courante + " " + mot : mot;
    if (font.widthOfTextAtSize(essai, taille) <= largeur) { courante = essai; continue; }
    if (courante) lignes.push(courante);
    courante = mot;
    while (font.widthOfTextAtSize(courante, taille) > largeur && courante.length > 1) { // mot plus large que la colonne
      let i = courante.length - 1;
      while (i > 1 && font.widthOfTextAtSize(courante.slice(0, i), taille) > largeur) i--;
      lignes.push(courante.slice(0, i));
      courante = courante.slice(i);
    }
  }
  if (courante || lignes.length === 0) lignes.push(courante);
  return lignes;
}

export async function fabriquerPdf(c: ContenuPdf): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(c.titre);
  doc.setProducer("Bonii");
  doc.setCreator("Bonii");
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const gras = await doc.embedFont(StandardFonts.HelveticaBold);
  // Un caractère hors de la police standard ferait échouer le PDF : il est remplacé.
  const permis = new Set(normal.getCharacterSet());
  const sur = (t: string) => [...t].map((ch) => (permis.has(ch.codePointAt(0)!) ? ch : "?")).join("");

  let page: PDFPage = doc.addPage(A4);
  let y = A4[1] - MARGE;
  const largeur = A4[0] - 2 * MARGE;
  const ecrire = (t: string, x: number, yy: number, font: PDFFont, taille: number, couleur = NOIR, droite?: number) =>
    page.drawText(sur(t), { x: droite === undefined ? x : droite - font.widthOfTextAtSize(sur(t), taille), y: yy, size: taille, font, color: couleur });

  // En-tête : marque à gauche, entreprise à droite.
  ecrire("BONII", MARGE, y - 14, gras, 18);
  ecrire(c.entreprise, 0, y - 12, normal, 10, GRIS, MARGE + largeur);
  y -= 50;
  for (const l of couper(sur(c.titre), gras, 16, largeur)) { ecrire(l, MARGE, y, gras, 16); y -= 20; }
  ecrire(c.sousTitre, MARGE, y, normal, 9.5, GRIS);
  y -= 26;

  // Tableau : une colonne de libellés, une colonne par simulation, chiffres alignés à droite.
  const colLibelle = c.entetes.length === 1 ? 250 : 170;
  const colValeur = (largeur - colLibelle) / c.entetes.length;
  const ligne = (libelle: string, valeurs: string[], opts: { font?: PDFFont; couleurs?: ReturnType<typeof rgb>[]; filet?: boolean } = {}) => {
    const taille = 10;
    const blocs = valeurs.map((v) => couper(sur(v), opts.font ?? normal, taille, colValeur - 10));
    const gauche = couper(sur(libelle), normal, 9.5, colLibelle - 10);
    const hauteur = Math.max(gauche.length, ...blocs.map((b) => b.length)) * 13 + 9;
    if (y - hauteur < MARGE + 30) { page = doc.addPage(A4); y = A4[1] - MARGE; }
    gauche.forEach((l, i) => ecrire(l, MARGE, y - 13 - i * 13, normal, 9.5, GRIS));
    blocs.forEach((b, j) => b.forEach((l, i) =>
      ecrire(l, 0, y - 13 - i * 13, opts.font ?? normal, taille, opts.couleurs?.[j] ?? NOIR, MARGE + colLibelle + (j + 1) * colValeur)));
    y -= hauteur;
    if (opts.filet !== false) page.drawLine({ start: { x: MARGE, y }, end: { x: MARGE + largeur, y }, thickness: 0.5, color: FILET });
  };
  if (c.entetes.length > 1) ligne("", c.entetes, { font: gras }); // une seule simulation : son nom est déjà le titre
  ligne("Verdict", c.verdicts.map((v) => v.texte), { font: gras, couleurs: c.verdicts.map((v) => COULEUR[v.cls]) });
  for (const [libelle, vals] of c.lignes) ligne(libelle, vals);

  // Pied de page sur chaque page.
  for (const p of doc.getPages()) {
    p.drawText(sur(c.pied), { x: MARGE, y: MARGE - 18, size: 8.5, font: normal, color: GRIS });
  }
  return doc.save();
}
