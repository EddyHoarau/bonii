"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { DEFAULTS, avec, course, seuilSur, tournee, type Ligne, type Saisie } from "@/moteur";
import { eur, eur2, nf0, nf1, signe } from "@/lib/format";
import { IconeCopier, IconeRetablir } from "@/lib/icones";
import { COUTS, JOURS, type DefChamp, type Profil } from "@/lib/profil";
import { classe, verdict } from "@/lib/simulations";
import { FormulaireEnregistrement } from "./FormulaireEnregistrement";
import { demarrerCarte, type Etat } from "./carte";
import { Marque } from "./Marque";
import { BoutonDeconnexion } from "./BoutonDeconnexion";

type Cle = keyof Saisie;
type Vue = "tournee" | "course";

const CHAMPS: Record<"ao" | "paie" | "course" | "cout", DefChamp[]> = {
  ao: [
    JOURS,
    ["points", "Points à livrer par jour", "points", 1],
    ["km", "Kilomètres par jour", "km", 5],
  ],
  paie: [
    ["prixPoint", "Prix du point livré", "€", 0.1],
    ["forfait", "Forfait par jour de présence", "€", 5],
    ["seuil", "Dégressivité à partir de", "points / mois", 10, "0 si aucune dégressivité"],
    ["prixApres", "Prix du point au-delà", "€", 0.1],
    ["echec", "Points non livrés au premier passage", "%", 1],
    ["prixRepassage", "Prix du point repassé", "€", 0.1],
    ["incidents", "Colis en litige par mois", "colis", 1],
    ["penalite", "Retenue par colis en litige", "€", 5],
  ],
  course: [
    ["cKm", "Distance aller et retour", "km", 10],
    ["cHeures", "Temps passé, attente comprise", "h", 0.5],
    ["cPeages", "Péages et frais", "€", 1],
    ["cMarge", "Marge visée sur le prix", "%", 1],
    ["cOffre", "Prix proposé par le client", "€", 5, "0 si vous fixez le prix"],
  ],
  cout: COUTS,
};

// [clé, libellé, min, max, pas, suffixe]
const LEVIERS: Record<Vue, [Cle, string, number, number, number, string][]> = {
  tournee: [["points", "Points livrés par jour", 5, 120, 1, ""], ["prixPoint", "Prix du point", 3, 12, 0.1, " €"], ["km", "Kilomètres par jour", 20, 400, 5, " km"]],
  course: [["cKm", "Distance aller et retour", 10, 900, 10, " km"], ["cHeures", "Temps passé", 1, 14, 0.5, " h"], ["cMarge", "Marge visée", 0, 60, 1, " %"]],
};

type Verdict = { cls: Etat; pill: string; valeur: number; signe: boolean; unite: string; texte: string; taux: number | null };
type Cellule = { texte: string; cls: string; ici: boolean };
type Affichage = {
  verdict: Verdict; chips: [string, string][]; legende: string; tuiles: [string, string][];
  sousCouts: string; lignes: Ligne[]; totalCouts: number; resume: string;
  scene: [number, number, boolean]; sens: { prix: string[]; lignes: { points: string; cellules: Cellule[] }[] } | null;
};

function calculerTournee(s: Saisie): Affichage {
  const r = tournee(s);
  const pMin = seuilSur(s, "prixPoint", 60), nMin = seuilSur(s, "points", 600);
  const efface = s.prixPoint > 0 ? Math.ceil(s.penalite / s.prixPoint) : 0;
  const { cls, pill } = verdict("tournee", s);
  let texte = cls === "bad"
    ? "Cette tournée coûte plus qu'elle ne rapporte. Il manque " + eur(-r.marge) + " par mois pour atteindre l'équilibre."
    : cls === "warn"
      ? "La marge existe mais ne couvre pas un imprévu : panne, arrêt, litiges. Elle représente " + Math.round(r.taux * 100) + " % du chiffre d'affaires."
      : "La marge représente " + Math.round(r.taux * 100) + " % du chiffre d'affaires.";
  if (efface > 0) texte += " Un colis en litige efface le gain de " + efface + " points livrés.";
  const rep = Math.round(Math.min(120, s.points) * s.echec / 100);

  const dp = [-10, -5, 0, 5, 10], dx = [-1, -0.5, 0, 0.5, 1];
  const sens = {
    prix: dx.map((d) => eur2(Math.max(0, s.prixPoint + d))),
    lignes: dp.map((a) => {
      const pts = Math.max(0, s.points + a);
      return {
        points: nf0(pts),
        cellules: dx.map((d) => {
          const px = Math.max(0, s.prixPoint + d);
          const o = tournee(avec(s, { points: pts, prixPoint: px, prixApres: s.prixPoint > 0 ? px * s.prixApres / s.prixPoint : s.prixApres }));
          const c = classe(o.marge, o.taux);
          return { texte: signe(o.marge), cls: c === "bad" ? "neg" : c === "warn" ? "low" : "pos", ici: a === 0 && d === 0 };
        }),
      };
    }),
  };

  return {
    verdict: { cls, pill, valeur: r.marge, signe: true, unite: "de marge par mois", texte, taux: r.taux },
    chips: [[nf0(s.points), "points par jour"], [nf0(s.km) + " km", "par jour"], [eur2(r.coutPoint), "de coût par point"]],
    legende: "Illustration d'une tournée de " + nf0(Math.min(120, Math.round(s.points))) + " points. " + (rep > 0 ? "Les arrêts cerclés de rouge sont à repasser." : ""),
    tuiles: [
      [eur(r.ca), "Chiffre d'affaires mensuel"],
      [eur(r.cout), "Coût de revient mensuel"],
      [pMin === null ? "Aucun" : eur2(pMin), "Prix du point minimum pour l'équilibre"],
      [nMin === null ? "Jamais" : nf0(Math.ceil(nMin)), "Points par jour minimum pour l'équilibre"],
      [nf0(Math.round(r.reduit)), "Points payés au tarif dégressif"],
    ],
    sousCouts: "Répartition des " + eur(r.cout) + " de coûts mensuels.",
    lignes: r.lignes, totalCouts: r.cout,
    resume: "Tournée : " + s.points + " points/jour, " + s.km + " km/jour, " + s.jours + " jours/mois, " + eur2(s.prixPoint) + " le point.\n" +
      "Chiffre d'affaires " + eur(r.ca) + ", coûts " + eur(r.cout) + ", marge " + signe(r.marge) + " par mois (" + pill + ").\n" +
      "Équilibre : " + (pMin === null ? "inatteignable sur le prix" : eur2(pMin) + " le point") + " ou " + (nMin === null ? "inatteignable sur le volume" : Math.ceil(nMin) + " points/jour") + ".",
    scene: [Math.max(1, Math.min(120, Math.round(s.points))), rep, false],
    sens,
  };
}

function calculerCourse(s: Saisie): Affichage {
  const r = course(s);
  let v: Verdict;
  if (r.margeOffre !== null) {
    const t = r.margeOffre / s.cOffre;
    const { cls, pill } = verdict("course", s);
    v = { cls, pill, valeur: r.margeOffre, signe: true, unite: "de marge au prix proposé",
      texte: "Le client propose " + eur(s.cOffre) + ". Le prix plancher est de " + eur(r.plancher) + " et le prix conseillé de " + eur(r.conseille) + ".", taux: t };
  } else {
    v = { cls: "ok", pill: "Prix conseillé", valeur: r.conseille, signe: false, unite: "hors taxe",
      texte: "En dessous de " + eur(r.plancher) + ", la course se fait à perte.", taux: null };
  }
  return {
    verdict: v,
    chips: [[nf0(s.cKm) + " km", "aller et retour"], [nf1(s.cHeures) + " h", "temps passé"], [eur2(r.auKm), "conseillé au km"]],
    legende: "Illustration d'une course aller et retour.",
    tuiles: [
      [eur(r.plancher), "Prix plancher, le coût de revient"],
      [eur(r.conseille), "Prix conseillé à " + s.cMarge + " % de marge"],
      [eur2(r.auKm), "Prix conseillé au kilomètre"],
      [eur(r.conseille - r.plancher), "Marge au prix conseillé"],
    ],
    sousCouts: "Répartition des " + eur(r.plancher) + " de coût de revient de la course.",
    lignes: r.lignes, totalCouts: r.plancher,
    resume: "Course : " + s.cKm + " km, " + s.cHeures + " h.\nPrix plancher " + eur(r.plancher) + ", prix conseillé " + eur(r.conseille) + " HT (" + eur2(r.auKm) + " du km).",
    scene: [1, 0, true],
    sens: null,
  };
}

function useVue(): Vue {
  const hash = useSyncExternalStore(
    (cb) => { window.addEventListener("hashchange", cb); return () => window.removeEventListener("hashchange", cb); },
    () => window.location.hash,
    () => "",
  );
  return hash === "#course" ? "course" : "tournee";
}

const calme = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Grand chiffre de marge, qui glisse vers sa nouvelle valeur. */
function GrandChiffre({ valeur, avecSigne }: { valeur: number; avecSigne: boolean }) {
  const [affiche, setAffiche] = useState(valeur);
  const depart = useRef(valeur);
  useEffect(() => {
    const from = depart.current;
    depart.current = valeur;
    const t0 = performance.now();
    let raf = 0;
    const pas = (t: number) => {
      const p = calme() ? 1 : Math.min(1, (t - t0) / 450), e = 1 - Math.pow(1 - p, 3);
      setAffiche(from + (valeur - from) * e);
      if (p < 1) raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(raf);
  }, [valeur]);
  return <div className="big">{avecSigne ? signe(affiche) : eur(affiche)}</div>;
}

function Carte({ scene, etat, chips, legende }: { scene: [number, number, boolean]; etat: Etat; chips: [string, string][]; legende: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const carte = useRef<ReturnType<typeof demarrerCarte>>(null);
  useEffect(() => {
    carte.current = demarrerCarte(canvas.current!);
    return () => carte.current?.arreter();
  }, []);
  const [n, rep, single] = scene;
  useEffect(() => { carte.current?.scene(n, rep, single); }, [n, rep, single]);
  useEffect(() => { carte.current?.etat(etat); }, [etat]);
  return (
    <div className="panel map">
      <canvas ref={canvas} aria-hidden="true" />
      <div className="chips">
        {chips.map(([b, t]) => <div className="chip" key={t}><b>{b}</b><span>{t}</span></div>)}
      </div>
      <p className="cap">{legende}</p>
    </div>
  );
}

function Champ({ def, valeur, changer }: { def: DefChamp; valeur: number; changer: (k: Cle, v: number) => void }) {
  const [k, libelle, unite, pas, aide] = def;
  // On garde le texte tapé (« 7, » ou champ vide) tant qu'il correspond encore à la valeur ;
  // si la valeur change ailleurs (curseur, bouton), le champ affiche la nouvelle valeur.
  const [texte, setTexte] = useState("");
  const lu = parseFloat(texte.replace(",", "."));
  const affiche = (Number.isFinite(lu) && lu >= 0 ? lu : 0) === valeur ? texte : String(valeur);
  return (
    <div className="field">
      <label htmlFor={"in-" + k}>{libelle}</label>
      <div className="box">
        <input
          id={"in-" + k} type="number" inputMode="decimal" min={0} step={pas}
          value={affiche}
          onChange={(e) => { setTexte(e.target.value); changer(k, parseFloat(e.target.value.replace(",", "."))); }}
        />
        <span>{unite}</span>
      </div>
      {aide && <span className="hint">{aide}</span>}
    </div>
  );
}

function Section({ titre, sous, champs, s, changer }: { titre: string; sous: string; champs: DefChamp[]; s: Saisie; changer: (k: Cle, v: number) => void }) {
  return (
    <section className="panel pad">
      <h2>{titre}</h2>
      <p className="sub">{sous}</p>
      <div className="fields">{champs.map((d) => <Champ key={d[0]} def={d} valeur={s[d[0]]} changer={changer} />)}</div>
    </section>
  );
}

export function Simulateur({ entreprise, admin, profil }: { entreprise: string; admin: boolean; profil: Profil }) {
  const vue = useVue();
  // Point de départ : les valeurs d'exemple, remplacées par le profil de coûts enregistré.
  const [depart] = useState<Saisie>(() => ({ ...DEFAULTS, ...profil }));
  const [s, setS] = useState<Saisie>(depart);
  const [message, setMessage] = useState("");
  const changer = (k: Cle, v: number) => setS((p) => ({ ...p, [k]: Number.isFinite(v) && v >= 0 ? v : 0 }));
  const a = vue === "course" ? calculerCourse(s) : calculerTournee(s);
  const v = a.verdict;

  const copier = () => {
    navigator.clipboard.writeText(a.resume).then(
      () => setMessage("Résumé copié."),
      () => setMessage("Copie impossible ici. Sélectionnez les chiffres à la main."),
    );
  };

  return (
    <div className="app">
      <div className="compte">
        <span>{entreprise}</span>
        <Link className="lien" href="/simulations">Mes simulations</Link>
        <Link className="lien" href="/profil">Mes coûts</Link>
        {admin && <Link className="lien" href="/admin">Administration</Link>}
        <BoutonDeconnexion />
      </div>
      <header className="top">
        <Marque />
        <nav className="onglets" aria-label="Type de chiffrage">
          <a href="#tournee" aria-current={vue === "tournee" ? "page" : undefined}>Tournée en appel d&apos;offres</a>
          <a href="#course" aria-current={vue === "course" ? "page" : undefined}>Course au devis</a>
        </nav>
      </header>

      <section className="hero">
        <Carte scene={a.scene} etat={v.cls} chips={a.chips} legende={a.legende} />
        <div className={"panel pad verdict " + v.cls}>
          <span className="pill">{v.pill}</span>
          <GrandChiffre key={vue} valeur={v.valeur} avecSigne={v.signe} />
          <div className="unit">{v.unite}</div>
          <p>{v.texte}</p>
          {v.taux !== null && (
            <div className="gauge">
              <div className="track">
                <div className="needle" style={{ left: (Math.min(1, Math.max(0, (v.taux + 0.1) / 0.6)) * 100).toFixed(1) + "%" }} />
              </div>
              <div className="scale"><span style={{ left: "16.7%" }}>0 %</span><span style={{ left: "41.7%" }}>15 %, marge de sécurité</span></div>
            </div>
          )}
        </div>
      </section>

      <section className="panel pad levers" aria-label="Leviers principaux">
        {LEVIERS[vue].map(([k, libelle, min, max, pas, suffixe]) => (
          <div className="lever" key={k}>
            <div className="head">
              <label htmlFor={"lv-" + k}>{libelle}</label>
              <output htmlFor={"lv-" + k}>{nf1(s[k]) + suffixe}</output>
            </div>
            <input id={"lv-" + k} type="range" min={min} max={max} step={pas} value={s[k]} onChange={(e) => changer(k, parseFloat(e.target.value))} />
          </div>
        ))}
      </section>

      <section className="tiles">
        {a.tuiles.map(([b, t]) => <div className="panel tile" key={t}><b>{b}</b><span>{t}</span></div>)}
      </section>

      <div className="cols">
        <div className="stack">
          {vue === "tournee" ? (
            <>
              <Section titre="Ce que l'appel d'offres annonce" sous="Les volumes estimés par le donneur d'ordre." champs={CHAMPS.ao} s={s} changer={changer} />
              <Section titre="Ce qu'il paie" sous="Prix au point, forfait du matin, dégressivité et retenues." champs={CHAMPS.paie} s={s} changer={changer} />
            </>
          ) : (
            <Section titre="La course demandée" sous="Une livraison ponctuelle à chiffrer." champs={CHAMPS.course} s={s} changer={changer} />
          )}
          <Section titre="Ce que ça coûte" sous="Repris de « Mes coûts ». Les changer ici ne vaut que pour ce calcul." champs={CHAMPS.cout} s={s} changer={changer} />
        </div>
        <div className="stack">
          <section className="panel pad">
            <h2>Où part l&apos;argent</h2>
            <p className="sub">{a.sousCouts}</p>
            <div className="rows">
              {a.lignes.map((l) => (
                <div className="row" key={l.libelle}>
                  <span>{l.libelle}</span>
                  <div className="bar"><i style={{ width: (a.totalCouts > 0 ? l.montant / a.totalCouts * 100 : 0).toFixed(1) + "%" }} /></div>
                  <b>{eur(l.montant)}</b>
                </div>
              ))}
            </div>
          </section>
          {a.sens && (
            <section className="panel pad">
              <h2>Si les volumes ou le prix bougent</h2>
              <p className="sub">Marge mensuelle selon les points livrés par jour et le prix au point. La case encadrée est votre hypothèse.</p>
              <table className="sens">
                <thead><tr><th>Points / jour</th>{a.sens.prix.map((p, i) => <th key={i}>{p}</th>)}</tr></thead>
                <tbody>
                  {a.sens.lignes.map((l, i) => (
                    <tr key={i}><th>{l.points}</th>{l.cellules.map((c, j) => <td key={j} className={c.cls + (c.ici ? " here" : "")}>{c.texte.replace(/ €$/, "")}<span className="eur"> €</span></td>)}</tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
          <div className="actions">
            <button type="button" onClick={copier}><IconeCopier />Copier le résumé</button>
            <button type="button" onClick={() => { setS(depart); setMessage("Valeurs de départ rétablies."); }}><IconeRetablir />Revenir aux valeurs de départ</button>
            <span className="note" role="status">{message}</span>
          </div>
          <FormulaireEnregistrement type={vue} saisie={s} />
        </div>
      </div>
    </div>
  );
}
