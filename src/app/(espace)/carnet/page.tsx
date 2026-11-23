import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { clientSupabase } from "@/lib/supabase/serveur";
import { ALERTE_RELANCE, STATUTS_DONNEUR, estStatutDonneur, type StatutDonneur } from "@/lib/carnet";
import { aujourdhuiParis, dateFr, delai, joursAvant, urgence } from "@/lib/echeances";
import { IconeFait } from "@/lib/icones";
import { FormulaireDonneur } from "./FormulaireDonneur";
import { marquerRelanceFaite } from "./actions";

export const metadata = { title: "Mon carnet · Bonii" };

export default function PageCarnet({ searchParams }: PageProps<"/carnet">) {
  return (
    <div className="app">
      <Suspense><Contenu searchParams={searchParams} /></Suspense>
    </div>
  );
}

type LigneDonneur = { id: string; nom: string; statut: StatutDonneur; interlocuteur: string | null; telephone: string | null };
type LigneRelance = { id: string; donneur_ordre_id: string; prevue_le: string; objet: string };

async function Contenu({ searchParams }: { searchParams: PageProps<"/carnet">["searchParams"] }) {
  const { statut } = await searchParams;
  const filtre = estStatutDonneur(statut) ? statut : null;
  const supabase = await clientSupabase();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/connexion");

  // RLS : seul le carnet de l'entreprise du dirigeant revient (rien pour un chauffeur).
  const [{ data: d }, { data: r }] = await Promise.all([
    supabase.from("donneurs_ordre").select("id, nom, statut, interlocuteur, telephone").order("nom").returns<LigneDonneur[]>(),
    supabase.from("relances").select("id, donneur_ordre_id, prevue_le, objet").is("faite_le", null).order("prevue_le").returns<LigneRelance[]>(),
  ]);
  const donneurs = d ?? [], relances = r ?? [];
  const noms = new Map(donneurs.map((x) => [x.id, x.nom]));
  // Les relances sont triées par date : la première rencontrée pour un donneur d'ordre est sa prochaine.
  const prochaine = new Map<string, string>();
  for (const x of relances) if (!prochaine.has(x.donneur_ordre_id)) prochaine.set(x.donneur_ordre_id, x.prevue_le);
  const aujourdhui = aujourdhuiParis();
  const visibles = filtre ? donneurs.filter((x) => x.statut === filtre) : donneurs;

  return (
    <>
      {relances.length > 0 && (
        <section className="panel pad">
          <h2>À relancer</h2>
          <p className="sub">Les relances prévues, la plus urgente en premier.</p>
          <ul className="liste">
            {relances.map((x) => {
              const j = joursAvant(x.prevue_le, aujourdhui);
              return (
                <li key={x.id} className={"ligne etat-" + urgence(j, ALERTE_RELANCE)}>
                  <div className="ident">
                    <Link className="nom" href={"/carnet/fiche?id=" + x.donneur_ordre_id}>{noms.get(x.donneur_ordre_id)}</Link>
                    <span className="meta">{x.objet}</span>
                  </div>
                  <span className="echeance">{dateFr(x.prevue_le)}, {delai(j)}</span>
                  <form action={marquerRelanceFaite}>
                    <input type="hidden" name="id" value={x.id} />
                    <button type="submit" className="discret"><IconeFait />Fait</button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="panel pad">
        <h2>Mon carnet</h2>
        <p className="sub">Vos prospects et vos donneurs d&apos;ordre. Un nom tapé dans une simulation y entre tout seul.</p>
        <nav className="onglets filtres" aria-label="Filtrer par statut">
          <Link href="/carnet" aria-current={filtre ? undefined : "page"}>Tous</Link>
          {Object.entries(STATUTS_DONNEUR).map(([v, l]) => <Link key={v} href={"/carnet?statut=" + v} aria-current={filtre === v ? "page" : undefined}>{l}</Link>)}
        </nav>
        {visibles.length === 0 ? (
          <p className="note vide">{filtre ? "Personne avec ce statut." : "Votre carnet est vide. Ajoutez un premier contact ci-dessous."}</p>
        ) : (
          <ul className="liste">
            {visibles.map((x) => {
              const date = prochaine.get(x.id);
              const j = date ? joursAvant(date, aujourdhui) : null;
              return (
                <li key={x.id} className={"ligne etat-" + (j === null ? "ok" : urgence(j, ALERTE_RELANCE))}>
                  <div className="ident">
                    <Link className="nom" href={"/carnet/fiche?id=" + x.id}>{x.nom}</Link>
                    <span className="meta">{[x.interlocuteur, x.telephone].filter(Boolean).join(", ") || "Pas encore d'interlocuteur"}</span>
                  </div>
                  <span className="echeance">{date && j !== null ? "Relance " + delai(j) : ""}</span>
                  <span className="etiquette">{STATUTS_DONNEUR[x.statut]}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="panel pad">
        <h2>Ajouter un contact</h2>
        <p className="sub">Le nom suffit. Le reste se complète sur la fiche.</p>
        <FormulaireDonneur />
      </section>
    </>
  );
}
