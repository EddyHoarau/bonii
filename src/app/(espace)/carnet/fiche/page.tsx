import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BoutonSupprimer } from "@/components/BoutonSupprimer";
import { clientSupabase } from "@/lib/supabase/serveur";
import { ALERTE_RELANCE, type Donneur } from "@/lib/carnet";
import { aujourdhuiParis, dateFr, delai, joursAvant, urgence } from "@/lib/echeances";
import { STATUTS, TYPES, lireSaisie, verdict, type Statut, type TypeSimulation } from "@/lib/simulations";
import { signe } from "@/lib/format";
import { IconeFait } from "@/lib/icones";
import { FormulaireDonneur } from "../FormulaireDonneur";
import { FormulaireRelance } from "../FormulaireRelance";
import { marquerRelanceFaite, supprimerDonneur } from "../actions";

export const metadata = { title: "Fiche · Bonii" };

export default function PageFiche({ searchParams }: PageProps<"/carnet/fiche">) {
  return (
    <div className="app">
      <Suspense><Fiche searchParams={searchParams} /></Suspense>
    </div>
  );
}

type Relance = { id: string; prevue_le: string; objet: string; faite_le: string | null };
type Simulation = { id: string; type: TypeSimulation; nom: string; date_simulation: string; statut: Statut; saisie: unknown };

async function Fiche({ searchParams }: { searchParams: PageProps<"/carnet/fiche">["searchParams"] }) {
  const { id } = await searchParams;
  const supabase = await clientSupabase();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/connexion");

  // RLS : une fiche d'une autre entreprise ne revient pas, comme si elle n'existait pas.
  const valide = typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id);
  const { data: donneur } = valide
    ? await supabase.from("donneurs_ordre").select("nom, statut, interlocuteur, telephone, email, notes").eq("id", id).maybeSingle<Donneur>()
    : { data: null };
  if (!valide || !donneur) {
    return <section className="panel pad"><h2>Fiche introuvable</h2><p className="note"><Link className="lien" href="/carnet">Retour à mon carnet</Link></p></section>;
  }

  const [{ data: r }, { data: s }] = await Promise.all([
    supabase.from("relances").select("id, prevue_le, objet, faite_le").eq("donneur_ordre_id", id).order("prevue_le", { ascending: false }).limit(30).returns<Relance[]>(),
    supabase.from("simulations").select("id, type, nom, date_simulation, statut, saisie").eq("donneur_ordre_id", id).order("date_simulation", { ascending: false }).returns<Simulation[]>(),
  ]);
  const relances = r ?? [], simulations = s ?? [];
  const aFaire = relances.filter((x) => !x.faite_le).reverse(), faites = relances.filter((x) => x.faite_le);
  const aujourdhui = aujourdhuiParis();

  return (
    <>
      <section className="panel pad">
        <h2>{donneur.nom}</h2>
        <p className="sub">Coordonnées et notes de ce contact.</p>
        <FormulaireDonneur id={id} donneur={donneur} />
      </section>

      <section className="panel pad">
        <h2>Relances</h2>
        <p className="sub">Notez quand rappeler, puis cochez « Fait ».</p>
        {aFaire.length > 0 && (
          <ul className="liste">
            {aFaire.map((x) => {
              const j = joursAvant(x.prevue_le, aujourdhui);
              return (
                <li key={x.id} className={"ligne etat-" + urgence(j, ALERTE_RELANCE)}>
                  <div className="ident"><span className="nom">{x.objet}</span></div>
                  <span className="echeance">{dateFr(x.prevue_le)}, {delai(j)}</span>
                  <form action={marquerRelanceFaite}>
                    <input type="hidden" name="id" value={x.id} />
                    <button type="submit" className="discret"><IconeFait />Fait</button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
        <FormulaireRelance donneurId={id} />
        {faites.length > 0 && (
          <ul className="liste historique">
            {faites.map((x) => <li key={x.id} className="meta">Fait le {dateFr(x.faite_le!)} : {x.objet}</li>)}
          </ul>
        )}
      </section>

      <section className="panel pad">
        <h2>Simulations</h2>
        <p className="sub">Les chiffrages enregistrés pour ce donneur d&apos;ordre.</p>
        {simulations.length === 0 ? (
          <p className="note vide">Aucune simulation pour l&apos;instant. Indiquez ce nom dans « Donneur d&apos;ordre » en enregistrant un calcul.</p>
        ) : (
          <ul className="liste">
            {simulations.map((x) => {
              const saisie = lireSaisie(x.saisie);
              const v = saisie ? verdict(x.type, saisie) : null;
              return (
                <li key={x.id} className={"ligne etat-" + (v?.cls ?? "warn")}>
                  <div className="ident">
                    <Link className="nom" href={"/simulations/comparer?ids=" + x.id}>{x.nom}</Link>
                    <span className="meta">{[TYPES[x.type], dateFr(x.date_simulation)].join(", ")}</span>
                  </div>
                  <div className="resultat">
                    {v && <span className="pill">{v.pill}</span>}
                    {v && v.marge !== null && <b>{signe(v.marge)}</b>}
                  </div>
                  <span className="etiquette">{STATUTS[x.statut]}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="actions">
        <BoutonSupprimer action={supprimerDonneur} id={id} libelle="Supprimer ce contact" question={"Supprimer « " + donneur.nom + " » et ses relances ? Les simulations sont conservées."} />
      </div>
    </>
  );
}
