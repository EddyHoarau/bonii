"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { estActive, filAriane, type Groupe, type Rubrique } from "@/lib/navigation";
import { IconeFermer, IconeMenu, IconePlus } from "@/lib/icones";
import { BoutonDeconnexion } from "./BoutonDeconnexion";

/** Menu de l'espace connecté. Ordinateur : colonne d'icônes + panneau sombre. Téléphone : barre en haut, onglets en bas, « Plus » pour le reste. */
export function Menu({ groupes, entreprise }: { groupes: Groupe[]; entreprise: string | null }) {
  const chemin = usePathname();
  const feuille = useRef<HTMLDialogElement>(null);
  // Une rubrique choisie dans « Plus » change la page : la feuille se referme.
  useEffect(() => { feuille.current?.close(); }, [chemin]);
  const rubriques = groupes.flatMap((g) => g.rubriques);

  return (
    <>
      <nav className="rail" aria-label="Grandes rubriques">
        <Link href="/" className="logo-carre" aria-label="Bonii, accueil">B</Link>
        {groupes.map((g) => (
          <Link key={g.titre} href={g.rubriques[0].href} className="rail-bouton" title={g.titre} aria-label={g.titre}
            aria-current={g.rubriques.some((r) => estActive(r.href, chemin)) ? "true" : undefined}>
            <IconeMenu nom={g.icone} size={22} />
          </Link>
        ))}
        <div className="rail-bas"><BoutonDeconnexion compact /></div>
      </nav>

      <nav className="panneau" aria-label="Menu">
        <Entete entreprise={entreprise} />
        {groupes.map((g) => (
          <div className="groupe" key={g.titre}>
            <p className="groupe-titre">{g.titre}</p>
            <ul>{g.rubriques.map((r) => <li key={r.href}><Lien r={r} chemin={chemin} /></li>)}</ul>
          </div>
        ))}
      </nav>

      <header className="barre-haut"><Entete entreprise={entreprise} /></header>

      <nav className="barre-bas" aria-label="Menu principal">
        {rubriques.filter((r) => r.principal).map((r) => (
          <Link key={r.href} href={r.href} aria-current={estActive(r.href, chemin) ? "page" : undefined}>
            <span className="icone"><IconeMenu nom={r.icone} size={22} />{!!r.compteur && <b className="compteur">{r.compteur}</b>}</span>
            {court(r.libelle)}
          </Link>
        ))}
        {/* La page affichée est rangée dans « Plus » : c'est lui qui s'allume. */}
        <button type="button" onClick={() => feuille.current?.showModal()}
          aria-current={rubriques.some((r) => !r.principal && estActive(r.href, chemin)) ? "page" : undefined}>
          <span className="icone"><IconePlus size={22} /></span>Plus
        </button>
      </nav>

      <dialog ref={feuille} className="feuille" aria-label="Autres rubriques" onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }}>
        <div className="feuille-tete">
          <h2>Menu</h2>
          <button type="button" className="discret" aria-label="Fermer" onClick={() => feuille.current?.close()}><IconeFermer /></button>
        </div>
        <ul>{rubriques.filter((r) => !r.principal).map((r) => <li key={r.href}><Lien r={r} chemin={chemin} /></li>)}</ul>
        <BoutonDeconnexion />
      </dialog>
    </>
  );
}

function Entete({ entreprise }: { entreprise: string | null }) {
  return (
    <div className="entete">
      <span className="logo-mot">BONI<i>I</i></span>
      {entreprise && <span className="entreprise">{entreprise}</span>}
    </div>
  );
}

function Lien({ r, chemin }: { r: Rubrique; chemin: string }) {
  return (
    <Link href={r.href} className="rubrique" aria-current={estActive(r.href, chemin) ? "page" : undefined}>
      <IconeMenu nom={r.icone} />
      <span>{r.libelle}</span>
      {!!r.compteur && <b className="compteur" aria-label={r.compteur + " à traiter"}>{r.compteur}</b>}
    </Link>
  );
}

/** « Mes tournées » devient « Tournées » dans la barre du bas, faute de place. */
function court(libelle: string) {
  const s = libelle.replace(/^(Mon|Ma|Mes) /, "");
  return s[0].toUpperCase() + s.slice(1);
}

/** « Accueil / Mes tournées / Tournée », en haut du contenu. */
export function FilAriane() {
  const fil = filAriane(usePathname());
  if (fil.length < 2) return null;
  return (
    <nav className="fil-ariane" aria-label="Fil d'Ariane">
      <ol>
        {fil.map((x) => <li key={x.libelle}>{x.href ? <Link href={x.href}>{x.libelle}</Link> : <span aria-current="page">{x.libelle}</span>}</li>)}
      </ol>
    </nav>
  );
}
