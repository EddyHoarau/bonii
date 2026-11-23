import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { clientSupabase } from "@/lib/supabase/serveur";
import { verdict } from "@/lib/simulations";
import { chargerSimulations, lireIds, tableau } from "@/lib/comparaison";
import { IconeTelecharger } from "@/lib/icones";

export const metadata = { title: "Comparaison · Bonii" };

export default function PageComparer({ searchParams }: PageProps<"/simulations/comparer">) {
  return (
    <div className="app">
      <Suspense><Comparaison searchParams={searchParams} /></Suspense>
    </div>
  );
}

async function Comparaison({ searchParams }: { searchParams: PageProps<"/simulations/comparer">["searchParams"] }) {
  const choisis = lireIds((await searchParams).ids);
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

  const sims = await chargerSimulations(supabase, choisis);
  if (sims.length === 0) return <section className="panel pad"><h2>Comparaison</h2><p className="note">Simulation introuvable.</p></section>;

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
          {tableau(sims).map(([libelle, vals]) => (
            <tr key={libelle}><th scope="row">{libelle}</th>{vals.map((v, i) => <td key={sims[i].id}>{v ?? ""}</td>)}</tr>
          ))}
        </tbody>
      </table>
      <div className="actions apres-tableau">
        {/* Lien simple : le navigateur télécharge le fichier, sans script. */}
        <a className="bouton" href={"/simulations/pdf?" + sims.map((x) => "ids=" + x.id).join("&")}><IconeTelecharger />Télécharger le PDF</a>
        <span className="note">Document interne : il montre votre marge.</span>
      </div>
    </section>
  );
}
