// Menu de l'espace connecté : quelles rubriques pour qui, laquelle est active, et le fil d'Ariane.

export type Role = "dirigeant" | "chauffeur" | null;
export type Icone = "simulateur" | "simulations" | "couts" | "carnet" | "tournees" | "vehicules" | "equipe" | "frais" | "messages" | "admin";
export type Rubrique = { href: string; libelle: string; icone: Icone; compteur?: number; principal?: boolean };
export type Groupe = { titre: string; icone: Icone; rubriques: Rubrique[] };
export type Compteurs = { relances: number; echeances: number; notes: number };

/** Rubriques visibles selon le rôle. `principal` : dans la barre du bas sur téléphone (4 au plus). */
export function menuPour(role: Role, admin: boolean, c: Compteurs = { relances: 0, echeances: 0, notes: 0 }): Groupe[] {
  const administration: Groupe[] = admin ? [{ titre: "Administration", icone: "admin", rubriques: [{ href: "/admin", libelle: "Administration", icone: "admin" }] }] : [];
  if (role === "chauffeur") {
    return [{ titre: "Ma journée", icone: "tournees", rubriques: [
      { href: "/", libelle: "Ma tournée", icone: "tournees", principal: true },
      { href: "/frais", libelle: "Notes de frais", icone: "frais", principal: true },
      { href: "/messages", libelle: "Messages", icone: "messages", principal: true },
    ] }];
  }
  if (role === "dirigeant") {
    return [
      { titre: "Rentabilité", icone: "simulateur", rubriques: [
        { href: "/", libelle: "Simulateur", icone: "simulateur", principal: true },
        { href: "/simulations", libelle: "Mes simulations", icone: "simulations" },
        { href: "/profil", libelle: "Mes coûts", icone: "couts" },
      ] },
      { titre: "Commercial", icone: "carnet", rubriques: [
        { href: "/carnet", libelle: "Mon carnet", icone: "carnet", compteur: c.relances, principal: true },
      ] },
      { titre: "Exploitation", icone: "vehicules", rubriques: [
        { href: "/tournees", libelle: "Mes tournées", icone: "tournees", principal: true },
        { href: "/vehicules", libelle: "Mes véhicules", icone: "vehicules", compteur: c.echeances },
        { href: "/equipe", libelle: "Mon équipe", icone: "equipe", principal: true },
        { href: "/frais", libelle: "Notes de frais", icone: "frais", compteur: c.notes },
      ] },
      ...administration,
    ];
  }
  // Compte sans entreprise (l'administrateur, par exemple).
  return [{ titre: "Accueil", icone: "simulateur", rubriques: [{ href: "/", libelle: "Accueil", icone: "simulateur", principal: true }] }, ...administration];
}

/** La rubrique est-elle celle de la page affichée ? Ses fiches comptent (/tournees/fiche active « Mes tournées »). */
export function estActive(href: string, chemin: string): boolean {
  return href === "/" ? chemin === "/" : chemin === href || chemin.startsWith(href + "/");
}

const LIBELLES: Record<string, string> = {
  simulations: "Mes simulations", comparer: "Comparer", profil: "Mes coûts", carnet: "Mon carnet",
  tournees: "Mes tournées", vehicules: "Mes véhicules", equipe: "Mon équipe", frais: "Notes de frais",
  messages: "Messages", admin: "Administration",
};
const FICHES: Record<string, string> = { carnet: "Fiche", tournees: "Tournée", vehicules: "Véhicule" };

/** Fil d'Ariane : « Accueil / Mes tournées / Tournée ». Le dernier élément n'a pas de lien. */
export function filAriane(chemin: string): { libelle: string; href?: string }[] {
  const parts = chemin.split("/").filter(Boolean);
  const fil: { libelle: string; href?: string }[] = [{ libelle: "Accueil", href: "/" }];
  parts.forEach((p, i) => {
    const libelle = p === "fiche" ? FICHES[parts[i - 1]] ?? "Fiche" : LIBELLES[p];
    if (libelle) fil.push({ libelle, href: "/" + parts.slice(0, i + 1).join("/") });
  });
  delete fil[fil.length - 1].href;
  return fil;
}
