import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Marque } from "@/components/Marque";
import { BoutonDeconnexion } from "@/components/BoutonDeconnexion";
import { clientSupabase } from "@/lib/supabase/serveur";
import { STATUTS, TYPES, lireSaisie, verdict, type Statut, type TypeSimulation } from "@/lib/simulations";
import { course, seuilSur, tournee, type Saisie } from "@/moteur";
import { eur, eur2, nf0, nf1, signe } from "@/lib/format";

export const metadata = { title: "Comparaison · Bonii" };

export default function PageComparer({ searchParams }: PageProps<"/simulations/comparer">) {
  return (
    <div className="app">
      <div className="compte"><Link className="lien" href="/simulations">Retour à mes simulations</Link><BoutonDeconnexion /></div>
      <header className="top"><Marque /></header>
      <Suspense><Comparaison searchParams={searchParams} /></Suspense>
    </div>
  );
}

type Sim = { id: string; type: TypeSimulation; nom: string; donneur_ordre: string | null; date_simulation: string; statut: Statut; s: Saisie };

// Une ligne du tableau : libellé et valeur pour une simulation (null si sans objet pour ce type).
const LIGNES: [string, (x: Sim) => string | null][] = [
  ["Type", (x) => TYPES[x.type]],
  ["Donneur d'ordre", (x) => x.donneur_ordre ?? ""],
  ["Date", (x) => new Date(x.date_simulation + "T12:00:00").toLocaleDateString("fr-FR")],
  ["Statut", (x) => STATUTS[x.statut]],
  ["Marge mensuelle", (x) => (x.type === "tournee" ? signe(tournee(x.s).marge) : null)],
  ["Marge en % du chiffre d'affaires", (x) => (x.type === "tournee" ? Math.round(tournee(x.s).taux * 100) + " %" : null)],
  ["Chiffre d'affaires mensuel", (x) => (x.type === "tournee" ? eur(tournee(x.s).ca) : null)],
  ["Coût de revient mensuel", (x) => (x.type === "tournee" ? eur(tournee(x.s).cout) : null)],
  ["Prix du point minimum", (x) => (x.type !== "tournee" ? null : ((p) => (p === null ? "Aucun" : eur2(p)))(seuilSur(x.s, "prixPoint", 60)))],
  ["Points par jour minimum", (x) => (x.type !== "tournee" ? null : ((n) => (n === null ? "Jamais" : nf0(Math.ceil(n))))(seuilSur(x.s, "points", 600)))],
  ["Points par jour", (x) => (x.type === "tournee" ? nf0(x.s.points) : null)],
  ["Kilomètres par jour", (x) => (x.type === "tournee" ? nf0(x.s.km) + " km" : null)],
  ["Jours travaillés par mois", (x) => (x.type === "tournee" ? nf0(x.s.jours) : null)],
  ["Prix du point", (x) => (x.type === "tournee" ? eur2(x.s.prixPoint) : null)],
  ["Prix proposé par le client", (x) => (x.type === "course" ? (x.s.cOffre > 0 ? eur(x.s.cOffre) : "Non indiqué") : null)],
  ["Marge au prix proposé", (x) => (x.type === "course" ? ((m) => (m === null ? "" : signe(m)))(course(x.s).margeOffre) : null)],
  ["Prix plancher", (x) => (x.type === "course" ? eur(course(x.s).plancher) : null)],
  ["Prix conseillé", (x) => (x.type === "course" ? eur(course(x.s).conseille) + " à " + nf0(x.s.cMarge) + " %" : null)],
  ["Distance aller et retour", (x) => (x.type === "course" ? nf0(x.s.cKm) + " km" : null)],
  ["Temps passé", (x) => (x.type === "course" ? nf1(x.s.cHeures) + " h" : null)],
  ["Salaire chargé", (x) => eur(x.s.salaire)],
  ["Gazole hors taxe", (x) => eur2(x.s.gazole) + " / L"],
];

const FORMAT_ID = /^[0-9a-f-]{36}$/i;

async function Comparaison({ searchParams }: { searchParams: PageProps<"/simulations/comparer">["searchParams"] }) {
  const { ids } = await searchParams;
  const choisis = [...new Set([ids ?? []].flat())].filter((id) => FORMAT_ID.test(id));
  const supabase = await clientSupabase();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/connexion");

  if (choisis.length === 0 || choisis.length > 3) {
    return (
      <section className="panel pad">
        <h2>Comparaison</h2>
        <p className="note">{choisis.length > 3 ? "Choisissez 3 simulations au plus." : "Choisissez 2 ou 3 simulations dans la liste."} <Link className="lien" href="/simulations">Retour à mes simulations</Link></p>
      </section>
    );
  }

  // RLS : une simulation d'une autre entreprise ne revient jamais, même si son identifiant est dans l'adresse.
  const { data } = await supabase.from("simulations").select("id, type, nom, donneur_ordre, date_simulation, statut, saisie").in("id", choisis);
  const sims: Sim[] = choisis.flatMap((id) => {
    const l = data?.find((d) => d.id === id);
    const s = l && lireSaisie(l.saisie);
    return l && s ? [{ ...(l as Omit<Sim, "s">), s }] : [];
  });
  if (sims.length === 0) return <section className="panel pad"><h2>Comparaison</h2><p className="note">Simulation introuvable.</p></section>;

  // On n'affiche que les lignes qui concernent au moins une des simulations choisies.
  const lignes = LIGNES.map(([libelle, f]) => [libelle, sims.map(f)] as const).filter(([, vals]) => vals.some((v) => v !== null));

  return (
    <section className="panel pad">
      <h2>{sims.length === 1 ? sims[0].nom : "Comparaison"}</h2>
      <p className="sub">Chiffres figés au jour de l&apos;enregistrement.</p>
      <table className="comparaison">
        <thead>
          <tr>
            <th scope="col"><span className="sr">Critère</span></th>
            {sims.map((x) => <th scope="col" key={x.id}>{x.nom}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Verdict</th>
            {sims.map((x) => { const v = verdict(x.type, x.s); return <td key={x.id} className={"etat-" + v.cls}><span className="pill">{v.pill}</span></td>; })}
          </tr>
          {lignes.map(([libelle, vals]) => (
            <tr key={libelle}><th scope="row">{libelle}</th>{vals.map((v, i) => <td key={sims[i].id}>{v ?? ""}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
