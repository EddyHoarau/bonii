import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Marque } from "@/components/Marque";
import { BoutonDeconnexion } from "@/components/BoutonDeconnexion";
import { clientSupabase } from "@/lib/supabase/serveur";
import { CLES_PROFIL, type Profil } from "@/lib/profil";
import { FormulaireProfil } from "./FormulaireProfil";

export const metadata = { title: "Mes coûts · Bonii" };

export default function PageProfil() {
  return (
    <div className="app">
      <div className="compte"><Link className="lien" href="/">Retour au simulateur</Link><BoutonDeconnexion /></div>
      <header className="top"><Marque /></header>
      <Suspense><Contenu /></Suspense>
    </div>
  );
}

// Réservé au dirigeant : RLS ne lui renvoie que le profil de son entreprise, et rien à un chauffeur.
async function Contenu() {
  const supabase = await clientSupabase();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/connexion");
  const { data: profil } = await supabase.from("profils_couts").select(CLES_PROFIL.join(", ")).maybeSingle<Profil>();
  if (!profil) notFound();
  return (
    <section className="panel pad">
      <h2>Mes coûts</h2>
      <p className="sub">Vos coûts habituels. Chaque nouveau calcul part de ces valeurs. Mieux vaut surestimer un peu.</p>
      <FormulaireProfil profil={profil} />
    </section>
  );
}
