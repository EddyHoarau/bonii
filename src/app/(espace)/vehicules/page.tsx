import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { clientSupabase } from "@/lib/supabase/serveur";
import { aujourdhuiParis, dateFr, delai, joursAvant, urgence } from "@/lib/echeances";
import { ALERTE_ECHEANCE, CLES_COUTS_VEHICULE, COLONNES_VEHICULE, ECHEANCES, type CleCout, type Vehicule } from "@/lib/vehicules";
import { FormulaireVehicule } from "./FormulaireVehicule";

export const metadata = { title: "Mes véhicules · Bonii" };

export default function PageVehicules() {
  return (
    <div className="app">
      <Suspense><Contenu /></Suspense>
    </div>
  );
}

async function Contenu() {
  const supabase = await clientSupabase();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/connexion");

  // RLS : seuls les véhicules de l'entreprise du dirigeant reviennent (rien pour un chauffeur).
  const [{ data }, { data: profil }] = await Promise.all([
    supabase.from("vehicules").select("id, " + COLONNES_VEHICULE).order("nom").returns<(Vehicule & { id: string })[]>(),
    supabase.from("profils_couts").select(CLES_COUTS_VEHICULE.join(", ")).maybeSingle<Record<CleCout, number>>(),
  ]);
  const vehicules = data ?? [];
  const aujourdhui = aujourdhuiParis();

  return (
    <>
      <section className="panel pad">
        <h2>Mes véhicules</h2>
        <p className="sub">Les échéances passent à l&apos;orange 30 jours avant, au rouge une fois dépassées.</p>
        {vehicules.length === 0 ? (
          <p className="note vide">Aucun véhicule. Ajoutez le premier ci-dessous.</p>
        ) : (
          <ul className="liste">
            {vehicules.map((v) => (
              <li key={v.id} className="ligne">
                <div className="ident">
                  <Link className="nom" href={"/vehicules/fiche?id=" + v.id}>{v.nom}</Link>
                  <span className="meta">{v.immatriculation ?? "Immatriculation non renseignée"}</span>
                </div>
                <div className="echeances">
                  {ECHEANCES.map(([cle, libelle]) => {
                    const d = v[cle];
                    if (!d) return null;
                    const j = joursAvant(d, aujourdhui);
                    return <span key={cle} className={"echeance etat-" + urgence(j, ALERTE_ECHEANCE)}>{libelle} : {dateFr(d)}, {delai(j)}</span>;
                  })}
                  {ECHEANCES.every(([cle]) => !v[cle]) && <span className="meta">Aucune échéance renseignée</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel pad">
        <h2>Ajouter un véhicule</h2>
        <p className="sub">Le nom suffit. Dates et coûts se complètent quand vous voulez.</p>
        <FormulaireVehicule profil={profil ?? {}} />
      </section>
    </>
  );
}
