import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BoutonSupprimer } from "@/components/BoutonSupprimer";
import { clientSupabase } from "@/lib/supabase/serveur";
import { CLES_COUTS_VEHICULE, COLONNES_VEHICULE, type CleCout, type Vehicule } from "@/lib/vehicules";
import { FormulaireVehicule } from "../FormulaireVehicule";
import { supprimerVehicule } from "../actions";

export const metadata = { title: "Véhicule · Bonii" };

export default function PageFicheVehicule({ searchParams }: PageProps<"/vehicules/fiche">) {
  return (
    <div className="app">
      <Suspense><Fiche searchParams={searchParams} /></Suspense>
    </div>
  );
}

async function Fiche({ searchParams }: { searchParams: PageProps<"/vehicules/fiche">["searchParams"] }) {
  const { id } = await searchParams;
  const supabase = await clientSupabase();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/connexion");

  // RLS : un véhicule d'une autre entreprise ne revient pas, comme s'il n'existait pas.
  const valide = typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id);
  const { data: vehicule } = valide
    ? await supabase.from("vehicules").select(COLONNES_VEHICULE).eq("id", id).maybeSingle<Vehicule>()
    : { data: null };
  if (!valide || !vehicule) {
    return <section className="panel pad"><h2>Véhicule introuvable</h2><p className="note"><Link className="lien" href="/vehicules">Retour à mes véhicules</Link></p></section>;
  }
  const { data: profil } = await supabase.from("profils_couts").select(CLES_COUTS_VEHICULE.join(", ")).maybeSingle<Record<CleCout, number>>();

  return (
    <>
      <section className="panel pad">
        <h2>{vehicule.nom}</h2>
        <p className="sub">Échéances et coûts de ce véhicule. Dans le simulateur, choisissez-le pour chiffrer avec ses coûts.</p>
        <FormulaireVehicule id={id} vehicule={vehicule} profil={profil ?? {}} />
      </section>
      <div className="actions">
        <BoutonSupprimer action={supprimerVehicule} id={id} libelle="Supprimer ce véhicule" question={"Supprimer « " + vehicule.nom + " » ? Les simulations déjà enregistrées ne changent pas."} />
      </div>
    </>
  );
}
