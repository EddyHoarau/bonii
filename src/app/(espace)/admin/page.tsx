import { notFound } from "next/navigation";
import { Suspense } from "react";
import { clientSupabase, estAdmin } from "@/lib/supabase/serveur";
import { EntetePage } from "@/components/EntetePage";
import { FormulaireInvitation, FormulaireNouveauLien } from "./FormulaireInvitation";

export const metadata = { title: "Administration · Bonii" };

export default function Admin() {
  return (
    <div className="app">
      <EntetePage titre="Administration" sous="Créez les entreprises clientes et fabriquez les liens d'accès à transmettre à la main." />
      <Suspense><Formulaire /></Suspense>
    </div>
  );
}

// Réservé aux adresses de ADMIN_EMAILS ; l'action serveur revérifie de son côté.
async function Formulaire() {
  const { data } = await (await clientSupabase()).auth.getClaims();
  if (!estAdmin(data?.claims?.email as string | undefined)) notFound();
  return (
    <div className="cols">
      <section className="panel pad">
        <h2>Nouvelle entreprise</h2>
        <p className="sub">Crée l&apos;entreprise et le compte de son dirigeant, puis affiche son lien d&apos;accès. Envoyez-le-lui : il choisira son mot de passe.</p>
        <FormulaireInvitation />
      </section>
      <section className="panel pad">
        <h2>Nouveau lien d&apos;accès</h2>
        <p className="sub">Mot de passe oublié, ou lien expiré : fabriquez-en un nouveau pour un compte existant (dirigeant ou chauffeur).</p>
        <FormulaireNouveauLien />
      </section>
    </div>
  );
}
