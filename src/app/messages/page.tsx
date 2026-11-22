import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Marque } from "@/components/Marque";
import { BoutonDeconnexion } from "@/components/BoutonDeconnexion";
import { membreConnecte } from "@/lib/supabase/serveur";
import { dateFr } from "@/lib/echeances";
import { heureParis } from "@/lib/tournees";
import { FormulaireMessage } from "./FormulaireMessage";

export const metadata = { title: "Messages · Bonii" };

export default function PageMessages({ searchParams }: PageProps<"/messages">) {
  return (
    <div className="app">
      <Suspense><Contenu searchParams={searchParams} /></Suspense>
    </div>
  );
}

type Message = { id: string; auteur_id: string; texte: string; cree_le: string };
const jourParis = (instant: string) => new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date(instant));

async function Contenu({ searchParams }: { searchParams: PageProps<"/messages">["searchParams"] }) {
  const { avec } = await searchParams;
  const { supabase, userId, entrepriseId, role } = await membreConnecte();
  if (!userId) redirect("/connexion");
  if (!entrepriseId) redirect("/");
  const dirigeant = role === "dirigeant";
  // Le chauffeur n'a qu'un fil, le sien. Le dirigeant choisit le chauffeur depuis « Mon équipe ».
  const fil = dirigeant ? (typeof avec === "string" && /^[0-9a-f-]{36}$/i.test(avec) ? avec : null) : userId;
  if (!fil) redirect("/equipe");

  // RLS : le chauffeur ne lit que son fil ; le dirigeant, ceux de son entreprise.
  const [{ data }, { data: chauffeur }] = await Promise.all([
    supabase.from("messages").select("id, auteur_id, texte, cree_le").eq("chauffeur_id", fil).order("cree_le", { ascending: false }).limit(100).returns<Message[]>(),
    supabase.from("membres").select("nom").eq("user_id", fil).eq("role", "chauffeur").maybeSingle<{ nom: string | null }>(),
  ]);
  if (dirigeant && !chauffeur) redirect("/equipe");
  const messages = (data ?? []).reverse();
  const autre = dirigeant ? chauffeur?.nom ?? "Chauffeur" : "Votre dirigeant";

  return (
    <>
      <div className="compte"><Link className="lien" href={dirigeant ? "/equipe" : "/"}>{dirigeant ? "Retour à mon équipe" : "Retour à ma tournée"}</Link><BoutonDeconnexion /></div>
      <header className="top"><Marque /></header>
      <section className="panel pad">
        <h2>{dirigeant ? "Messages avec " + autre : "Messages avec votre dirigeant"}</h2>
        <p className="sub">Les nouveaux messages apparaissent en rechargeant la page. Aucune alerte n&apos;est envoyée.</p>
        {messages.length === 0 ? (
          <p className="note vide">Aucun message pour l&apos;instant.</p>
        ) : (
          <ol className="fil">
            {messages.map((m) => (
              <li key={m.id} className={m.auteur_id === userId ? "moi" : "autre"}>
                <p>{m.texte}</p>
                <span className="meta">{m.auteur_id === userId ? "Vous" : autre}, {dateFr(jourParis(m.cree_le))} à {heureParis(m.cree_le)}</span>
              </li>
            ))}
          </ol>
        )}
        <FormulaireMessage fil={fil} />
      </section>
    </>
  );
}
