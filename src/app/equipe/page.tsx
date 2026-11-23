import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Marque } from "@/components/Marque";
import { BoutonDeconnexion } from "@/components/BoutonDeconnexion";
import { BoutonSupprimer } from "@/components/BoutonSupprimer";
import { membreConnecte } from "@/lib/supabase/serveur";
import { FormulaireInvitationChauffeur, NouveauLienChauffeur } from "./FormulaireInvitationChauffeur";
import { retirerChauffeur } from "./actions";

export const metadata = { title: "Mon équipe · Bonii" };

export default function PageEquipe() {
  return (
    <div className="app">
      <div className="compte"><Link className="lien" href="/">Retour au simulateur</Link><BoutonDeconnexion /></div>
      <header className="top"><Marque /></header>
      <Suspense><Contenu /></Suspense>
    </div>
  );
}

async function Contenu() {
  const { supabase, userId, entrepriseId, role } = await membreConnecte();
  if (!userId) redirect("/connexion");
  if (role !== "dirigeant" || !entrepriseId) redirect("/");

  const [{ data }, { count }] = await Promise.all([
    supabase.from("membres").select("user_id, nom").eq("entreprise_id", entrepriseId).eq("role", "chauffeur").order("nom").returns<{ user_id: string; nom: string | null }[]>(),
    supabase.from("notes_frais").select("id", { count: "exact", head: true }).eq("statut", "a_valider"),
  ]);
  const chauffeurs = data ?? [];

  return (
    <>
      <section className="panel pad">
        <h2>Mon équipe</h2>
        <p className="sub">Un chauffeur ne voit que sa tournée, ses notes de frais et ses messages. Jamais vos coûts ni vos prix.</p>
        {chauffeurs.length === 0 ? (
          <p className="note vide">Aucun chauffeur pour l&apos;instant. Ajoutez le premier ci-dessous.</p>
        ) : (
          <ul className="liste">
            {chauffeurs.map((c) => (
              <li key={c.user_id} className="ligne equipe">
                <div className="ident"><span className="nom">{c.nom ?? "Chauffeur"}</span></div>
                <Link className="lien" href={"/messages?avec=" + c.user_id}>Messages</Link>
                <NouveauLienChauffeur id={c.user_id} nom={c.nom ?? "ce chauffeur"} />
                <BoutonSupprimer action={retirerChauffeur} id={c.user_id} libelle="Retirer" question={"Retirer " + (c.nom ?? "ce chauffeur") + " de l'équipe ? Ses notes de frais et ses messages seront effacés."} />
              </li>
            ))}
          </ul>
        )}
        <p className="note"><Link className="lien" href="/frais">Notes de frais</Link>{(count ?? 0) > 0 ? " : " + count + " à valider." : " : rien à valider."}</p>
      </section>

      <section className="panel pad">
        <h2>Ajouter un chauffeur</h2>
        <p className="sub">Bonii fabrique un lien d&apos;accès : envoyez-le au chauffeur par SMS ou WhatsApp. Il y choisira son mot de passe. Aucun e-mail ne part.</p>
        <FormulaireInvitationChauffeur />
      </section>
    </>
  );
}
