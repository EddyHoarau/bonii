import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Simulateur } from "@/components/Simulateur";
import { EspaceChauffeur } from "@/components/EspaceChauffeur";
import { clientSupabase, estAdmin } from "@/lib/supabase/serveur";
import { CLES_PROFIL, type Profil } from "@/lib/profil";
import { CLES_COUTS_VEHICULE, type CleCout } from "@/lib/vehicules";

export default function Accueil() {
  return (
    <Suspense fallback={<div className="app" />}>
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
  if (membre && entreprise && membre.role === "chauffeur") {
    return (
      <div className="app">
        <EspaceChauffeur supabase={supabase} userId={claims.sub as string} />
      </div>
    );
  }
  if (!membre || !entreprise || membre.role !== "dirigeant") {
    return (
      <div className="app">
        <section className="panel pad">
          <h2>Votre compte n&apos;est rattaché à aucune entreprise</h2>
          <p className="sub">Demandez à votre dirigeant ou à votre cabinet de vous inviter.</p>
          {admin && <p><Link className="lien" href="/admin">Créer une entreprise et le compte de son dirigeant</Link></p>}
        </section>
      </div>
    );
  }

  // RLS : le dirigeant ne lit que le profil de son entreprise. Sans profil, le simulateur garde les valeurs d'exemple.
  // Les compteurs (relances, échéances, notes de frais) sont lus par le menu, dans (espace)/layout.tsx.
  type LigneVehicule = { id: string; nom: string } & Record<CleCout, number | null>;
  const [{ data: profil }, { data: carnet }, { data: vehicules }] = await Promise.all([
    supabase.from("profils_couts").select(CLES_PROFIL.join(", ")).maybeSingle<Profil>(),
    supabase.from("donneurs_ordre").select("nom").order("nom").returns<{ nom: string }[]>(),
    supabase.from("vehicules").select(["id", "nom", ...CLES_COUTS_VEHICULE].join(", ")).order("nom").returns<LigneVehicule[]>(),
  ]);
  return <Simulateur profil={profil ?? {}} donneurs={(carnet ?? []).map((d) => d.nom)} vehicules={vehicules ?? []} />;
}
