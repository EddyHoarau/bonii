// Moteur de calcul de Bonii : aucune interface, aucun accès réseau.
// Traduction fidèle du script id="model" du prototype validé ; le test
// moteur.test.ts vérifie l'identité des résultats sur des valeurs tirées au hasard.

export type Saisie = {
  // Tournée en appel d'offres
  jours: number; points: number; km: number;
  prixPoint: number; forfait: number; seuil: number; prixApres: number;
  echec: number; prixRepassage: number; incidents: number; penalite: number;
  // Profil de coûts
  salaire: number; conso: number; gazole: number; vehicule: number;
  assurance: number; entretien: number; generaux: number;
  // Course au devis
  cKm: number; cHeures: number; cPeages: number; cMarge: number; cOffre: number;
};

export type Ligne = { libelle: string; montant: number };

export const DEFAULTS: Saisie = {
  jours: 22, points: 40, km: 150,
  prixPoint: 7.5, forfait: 80, seuil: 500, prixApres: 5.5, echec: 5, prixRepassage: 4, incidents: 2, penalite: 40,
  salaire: 3000, conso: 10, gazole: 1.45, vehicule: 600, assurance: 200, entretien: 0.05, generaux: 300,
  cKm: 250, cHeures: 8, cPeages: 0, cMarge: 33, cOffre: 0,
};

/** Heures mensuelles légales utilisées pour le coût horaire du chauffeur sur une course. */
const HEURES_MOIS = 151.67;

function somme(lignes: Ligne[]) {
  return lignes.reduce((a, l) => a + l.montant, 0);
}

export function couts(s: Saisie, kmMois: number): Ligne[] {
  return [
    { libelle: "Chauffeur (salaire chargé)", montant: s.salaire },
    { libelle: "Carburant", montant: kmMois * s.conso / 100 * s.gazole },
    { libelle: "Véhicule (loyer ou amortissement)", montant: s.vehicule },
    { libelle: "Assurance", montant: s.assurance },
    { libelle: "Entretien et pneus", montant: kmMois * s.entretien },
    { libelle: "Frais généraux", montant: s.generaux },
  ];
}

export function tournee(s: Saisie) {
  const total = s.points * s.jours;
  const repasses = total * s.echec / 100;
  const livres = total - repasses;
  const plein = s.seuil > 0 ? Math.min(livres, s.seuil) : livres;
  const reduit = livres - plein;
  const caPoints = plein * s.prixPoint + reduit * s.prixApres;
  const caRep = repasses * s.prixRepassage;
  const caForfait = s.forfait * s.jours;
  const retenues = s.incidents * s.penalite;
  const ca = caPoints + caRep + caForfait - retenues;
  const lignes = couts(s, s.km * s.jours);
  const cout = somme(lignes);
  const marge = ca - cout;
  return {
    total, livres, reduit, ca, cout, marge,
    taux: ca > 0 ? marge / ca : -1,
    lignes, retenues,
    coutPoint: total > 0 ? cout / total : 0,
  };
}

export function avec(s: Saisie, o: Partial<Saisie>): Saisie {
  return { ...s, ...o };
}

/** Valeur minimale de `champ` qui rend la marge positive ou nulle, ou null si même `max` ne suffit pas. */
export function seuilSur(s: Saisie, champ: "prixPoint" | "points", max: number): number | null {
  const f = (v: number) => {
    const o: Partial<Saisie> = { [champ]: v };
    // Quand le prix du point bouge, le prix dégressif suit dans la même proportion.
    if (champ === "prixPoint" && s.prixPoint > 0) o.prixApres = v * s.prixApres / s.prixPoint;
    return tournee(avec(s, o)).marge;
  };
  if (f(max) < 0) return null;
  let a = 0, b = max;
  for (let i = 0; i < 50; i++) {
    const m = (a + b) / 2;
    if (f(m) < 0) a = m; else b = m;
  }
  return b;
}

export function course(s: Saisie) {
  const part = s.cHeures / 8;
  const fixesJour = s.jours > 0 ? (s.vehicule + s.assurance + s.generaux) / s.jours : 0;
  const lignes: Ligne[] = [
    { libelle: "Chauffeur (" + s.cHeures + " h)", montant: s.salaire / HEURES_MOIS * s.cHeures },
    { libelle: "Carburant", montant: s.cKm * s.conso / 100 * s.gazole },
    { libelle: "Entretien et pneus", montant: s.cKm * s.entretien },
    { libelle: "Véhicule, assurance, frais généraux", montant: fixesJour * part },
    { libelle: "Péages et frais", montant: s.cPeages },
  ];
  const plancher = somme(lignes);
  const m = Math.min(Math.max(s.cMarge, 0), 90) / 100;
  const conseille = plancher / (1 - m);
  return {
    lignes, plancher, conseille,
    auKm: s.cKm > 0 ? conseille / s.cKm : 0,
    margeOffre: s.cOffre > 0 ? s.cOffre - plancher : null,
  };
}
