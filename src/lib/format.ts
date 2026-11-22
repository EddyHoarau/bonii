// Formats des montants, repris du prototype.
const nf0f = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const nf1f = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
const nf2f = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Le signe moins typographique (U+2212) devient un tiret simple.
const clean = (t: string) => t.replace(/−/g, "-");

export const nf0 = (n: number) => clean(nf0f.format(n));
export const nf1 = (n: number) => clean(nf1f.format(n));
export const eur = (n: number) => clean(nf0f.format(Math.round(n))) + " €";
export const eur2 = (n: number) => clean(nf2f.format(n)) + " €";
export const signe = (n: number) => (Math.round(n) > 0 ? "+" : "") + eur(n);
