import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Marque } from "@/components/Marque";
import { BoutonDeconnexion } from "@/components/BoutonDeconnexion";
import { clientSupabase, estAdmin } from "@/lib/supabase/serveur";
import { FormulaireInvitation } from "./FormulaireInvitation";

export const metadata = { title: "Administration · Bonii" };

export default function Admin() {
  return (
    <div className="app">
      <div className="compte"><Link className="lien" href="/">Retour au simulateur</Link><BoutonDeconnexion /></div>
      <header className="top"><Marque /></header>
      <Suspense><Formulaire /></Suspense>
    </div>
  );
}

// Réservé aux adresses de ADMIN_EMAILS ; l'action serveur revérifie de son côté.
async function Formulaire() {
  const { data } = await (await clientSupabase()).auth.getClaims();
  if (!estAdmin(data?.claims?.email as string | undefined)) notFound();
  return (
    <section className="panel pad connexion">
      <h2>Nouvelle entreprise</h2>
      <p className="sub">Crée l&apos;entreprise et le compte de son dirigeant. Prévenez-le ensuite : il se connecte avec son adresse e-mail, sans mot de passe.</p>
      <FormulaireInvitation />
    </section>
  );
}
