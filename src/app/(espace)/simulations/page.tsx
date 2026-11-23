import Link from "next/link";
import { EntetePage } from "@/components/EntetePage";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { clientSupabase } from "@/lib/supabase/serveur";
import { STATUTS, TYPES, estStatut, lireSaisie, verdict, type Statut, type TypeSimulation } from "@/lib/simulations";
import { course } from "@/moteur";
import { eur, signe } from "@/lib/format";
import { IconeComparer, IconeMenu } from "@/lib/icones";
import { ChoixStatut } from "./ChoixStatut";

export const metadata = { title: "Mes simulations · Bonii" };

export default function PageSimulations({ searchParams }: PageProps<"/simulations">) {
  return (
    <div className="app">
      <EntetePage titre="Mes simulations" sous="Cochez 2 ou 3 simulations pour les comparer. Cliquez sur un nom pour revoir ses chiffres." />
      <Suspense><Liste searchParams={searchParams} /></Suspense>
    </div>
  );
}

type Ligne = { id: string; type: TypeSimulation; nom: string; donneur_ordre: string | null; date_simulation: string; statut: Statut; saisie: unknown };

const dateFr = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

async function Liste({ searchParams }: { searchParams: PageProps<"/simulations">["searchParams"] }) {
  const { statut } = await searchParams;
  const filtre = estStatut(statut) ? statut : null;
  const supabase = await clientSupabase();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/connexion");

  // RLS : seules les simulations de l'entreprise du dirigeant reviennent (rien pour un chauffeur).
  let requete = supabase.from("simulations").select("id, type, nom, donneur_ordre, date_simulation, statut, saisie")
    .order("date_simulation", { ascending: false }).order("cree_le", { ascending: false });
  if (filtre) requete = requete.eq("statut", filtre);
  const { data } = await requete.returns<Ligne[]>();
  const lignes = data ?? [];

  return (
    <section className="panel pad">
      <nav className="onglets filtres" aria-label="Filtrer par statut">
        <Link href="/simulations" aria-current={filtre ? undefined : "page"}>Toutes</Link>
        {Object.entries(STATUTS).map(([v, l]) => <Link key={v} href={"/simulations?statut=" + v} aria-current={filtre === v ? "page" : undefined}>{l}</Link>)}
      </nav>

      {lignes.length === 0 ? (
        <p className="note vide">{filtre ? "Aucune simulation avec ce statut." : "Aucune simulation enregistrée. Faites un calcul dans le simulateur, puis « Enregistrer »."}</p>
      ) : (
        <>
          <form id="comparer" action="/simulations/comparer" method="get" />
          <ul className="liste">
            {lignes.map((l) => {
              const s = lireSaisie(l.saisie);
              const v = s ? verdict(l.type, s) : null;
              const chiffre = !s || !v ? "" : v.marge !== null ? signe(v.marge) : eur(course(s).conseille);
              const unite = l.type === "tournee" ? "par mois" : v?.marge !== null ? "au prix proposé" : "prix conseillé";
              return (
                <li key={l.id} className={"sim etat-" + (v?.cls ?? "warn")}>
                  <input type="checkbox" name="ids" value={l.id} form="comparer" aria-label={"Comparer " + l.nom} />
                  <span className="pastille-type" aria-hidden="true"><IconeMenu nom={l.type === "tournee" ? "tournees" : "simulateur"} /></span>
                  <div className="ident">
                    <Link className="nom" href={"/simulations/comparer?ids=" + l.id}>{l.nom}</Link>
                    <span className="meta">{[TYPES[l.type], l.donneur_ordre, dateFr(l.date_simulation)].filter(Boolean).join(", ")}</span>
                  </div>
                  <div className="resultat">
                    {v && <span className="pill">{v.pill}</span>}
                    <b>{chiffre}</b>
                    <span className="meta">{unite}</span>
                  </div>
                  <ChoixStatut id={l.id} statut={l.statut} nom={l.nom} />
                </li>
              );
            })}
          </ul>
          <div className="actions">
            <button type="submit" form="comparer" className="principal"><IconeComparer />Comparer la sélection</button>
          </div>
        </>
      )}
    </section>
  );
}
