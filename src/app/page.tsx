import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Marque } from "@/components/Marque";
import { Simulateur } from "@/components/Simulateur";
import { BoutonDeconnexion } from "@/components/BoutonDeconnexion";
import { clientSupabase, estAdmin } from "@/lib/supabase/serveur";
import { CLES_PROFIL, type Profil } from "@/lib/profil";
import { aujourdhuiParis } from "@/lib/echeances";

export default function Accueil() {
  return (
    <Suspense fallback={<div className="app"><header className="top"><Marque /></header></div>}>
      <EspaceDirigeant />
    </Suspense>
  );
}

// Lit la session au moment de la requête (derrière Suspense, comme le veut Next 16).
async function EspaceDirigeant() {
  const supabase = await clientSupabase();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/connexion");

  // Les règles RLS ne renvoient que les rattachements de la personne connectée.
  const { data: membre } = await supabase
    .from("membres")
    .select("role, entreprises(nom)")
    .eq("user_id", claims.sub)
    .limit(1)
    .maybeSingle();

  // Sans types générés, Supabase annonce un tableau ; c'est un seul objet (lien vers une seule entreprise).
  const entreprise = (membre?.entreprises as unknown as { nom: string } | null)?.nom;
  const admin = estAdmin(claims.email as string);
  if (!membre || !entreprise || membre.role !== "dirigeant") {
    return (
      <div className="app">
        <div className="compte"><BoutonDeconnexion /></div>
        <header className="top"><Marque /></header>
        <section className="panel pad">
          <h2>{membre ? "L'accès chauffeur arrive bientôt" : "Votre compte n'est rattaché à aucune entreprise"}</h2>
          <p className="sub">{membre ? "Votre dirigeant vous préviendra dès qu'il sera ouvert." : "Demandez à votre cabinet de vous inviter."}</p>
          {admin && <p><Link className="lien" href="/admin">Créer une entreprise et le compte de son dirigeant</Link></p>}
        </section>
      </div>
    );
  }

  // RLS : le dirigeant ne lit que le profil de son entreprise. Sans profil, le simulateur garde les valeurs d'exemple.
  const [{ data: profil }, { data: carnet }, { count: aRelancer }] = await Promise.all([
    supabase.from("profils_couts").select(CLES_PROFIL.join(", ")).maybeSingle<Profil>(),
    supabase.from("donneurs_ordre").select("nom").order("nom").returns<{ nom: string }[]>(),
    // Relances prévues jusqu'à aujourd'hui et pas encore faites : le nombre s'affiche à côté de « Mon carnet ».
    supabase.from("relances").select("id", { count: "exact", head: true }).is("faite_le", null).lte("prevue_le", aujourdhuiParis()),
  ]);
  return <Simulateur entreprise={entreprise} admin={admin} profil={profil ?? {}} donneurs={(carnet ?? []).map((d) => d.nom)} aRelancer={aRelancer ?? 0} />;
}
