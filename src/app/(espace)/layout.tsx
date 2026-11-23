import { Suspense } from "react";
import { Menu, FilAriane } from "@/components/Menu";
import { clientSupabase, estAdmin } from "@/lib/supabase/serveur";
import { aujourdhuiParis } from "@/lib/echeances";
import { ECHEANCES, echeancesProches } from "@/lib/vehicules";
import { menuPour, type Compteurs, type Role } from "@/lib/navigation";

// Cadre commun des pages connectées : menu de gauche (ordinateur), barres du haut et du bas (téléphone).
// Chaque page garde ses propres contrôles d'accès ; le menu ne fait qu'afficher.
export default function EspaceConnecte({ children }: { children: React.ReactNode }) {
  return (
    <div className="coque">
      <Suspense fallback={<nav className="panneau" aria-hidden="true" />}><Navigation /></Suspense>
      <main className="contenu">
        <FilAriane />
        {children}
      </main>
    </div>
  );
}

async function Navigation() {
  const supabase = await clientSupabase();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;
  // RLS : seul le rattachement de la personne connectée revient.
  const { data: membre } = await supabase.from("membres").select("role, entreprises(nom)").eq("user_id", claims.sub).limit(1).maybeSingle();
  const role = (membre?.role ?? null) as Role;
  const entreprise = (membre?.entreprises as unknown as { nom: string } | null)?.nom ?? null;

  let compteurs: Compteurs | undefined;
  if (role === "dirigeant") {
    const aujourdhui = aujourdhuiParis();
    const [{ count: relances }, { count: notes }, { data: vehicules }] = await Promise.all([
      supabase.from("relances").select("id", { count: "exact", head: true }).is("faite_le", null).lte("prevue_le", aujourdhui),
      supabase.from("notes_frais").select("id", { count: "exact", head: true }).eq("statut", "a_valider"),
      supabase.from("vehicules").select(ECHEANCES.map((e) => e[0]).join(", ")).returns<Record<string, string | null>[]>(),
    ]);
    compteurs = { relances: relances ?? 0, notes: notes ?? 0, echeances: echeancesProches(vehicules ?? [], aujourdhui) };
  }
  return <Menu groupes={menuPour(role, estAdmin(claims.email as string), compteurs)} entreprise={entreprise} />;
}
