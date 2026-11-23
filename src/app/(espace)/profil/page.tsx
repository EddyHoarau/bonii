import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { clientSupabase } from "@/lib/supabase/serveur";
import { CLES_PROFIL, type Profil } from "@/lib/profil";
import { FormulaireProfil } from "./FormulaireProfil";
import { EntetePage } from "@/components/EntetePage";

export const metadata = { title: "Mes coûts · Bonii" };

export default function PageProfil() {
  return (
    <div className="app">
      <EntetePage titre="Mes coûts" sous="Vos coûts habituels. Chaque nouveau calcul part de ces valeurs. Mieux vaut surestimer un peu." />
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
      <FormulaireProfil profil={profil} />
    </section>
  );
}
