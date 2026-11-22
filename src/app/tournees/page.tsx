import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Marque } from "@/components/Marque";
import { BoutonDeconnexion } from "@/components/BoutonDeconnexion";
import { clientSupabase } from "@/lib/supabase/serveur";
import { aujourdhuiParis, dateFr } from "@/lib/echeances";
import { RETENTION_JOURS, dureeFr } from "@/lib/tournees";
import { nf1 } from "@/lib/format";
import { FormulaireTournee } from "./FormulaireTournee";

export const metadata = { title: "Mes tournées · Bonii" };
// La création d'une tournée interroge le service d'adresses : on laisse le temps de répondre.
export const maxDuration = 30;

export default function PageTournees() {
  return (
    <div className="app">
      <div className="compte"><Link className="lien" href="/">Retour au simulateur</Link><BoutonDeconnexion /></div>
      <header className="top"><Marque /></header>
      <Suspense><Contenu /></Suspense>
    </div>
  );
}

type Ligne = { id: string; nom: string; jour: string; depart: string; km: number | null; duree_minutes: number | null; optimisee_le: string | null };

async function Contenu() {
  const supabase = await clientSupabase();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/connexion");

  // RLS : seules les tournées de l'entreprise du dirigeant reviennent (rien pour un chauffeur).
  const [{ data: t }, { data: a }] = await Promise.all([
    supabase.from("tournees").select("id, nom, jour, depart, km, duree_minutes, optimisee_le").order("jour", { ascending: false }).order("cree_le", { ascending: false }).returns<Ligne[]>(),
    supabase.from("arrets").select("tournee_id").returns<{ tournee_id: string }[]>(),
  ]);
  const tournees = t ?? [];
  const nombre = new Map<string, number>();
  for (const x of a ?? []) nombre.set(x.tournee_id, (nombre.get(x.tournee_id) ?? 0) + 1);

  return (
    <>
      <section className="panel pad">
        <h2>Mes tournées</h2>
        <p className="sub">Les adresses sont effacées {RETENTION_JOURS} jours après la date de la tournée.</p>
        {tournees.length === 0 ? (
          <p className="note vide">Aucune tournée. Créez la première ci-dessous.</p>
        ) : (
          <ul className="liste">
            {tournees.map((x) => {
              const n = nombre.get(x.id) ?? 0;
              return (
                <li key={x.id} className="ligne">
                  <div className="ident">
                    <Link className="nom" href={"/tournees/fiche?id=" + x.id}>{x.nom}</Link>
                    <span className="meta">{dateFr(x.jour)}, {n} {n > 1 ? "arrêts" : "arrêt"}</span>
                  </div>
                  <span className={"echeance etat-" + (x.optimisee_le ? "ok" : "warn")}>
                    {x.optimisee_le
                      ? [x.km !== null && nf1(x.km) + " km", x.duree_minutes !== null && dureeFr(x.duree_minutes)].filter(Boolean).join(", ") || "Ordre calculé"
                      : "Ordre de passage à calculer"}
                  </span>
                  <span />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="panel pad">
        <h2>Nouvelle tournée</h2>
        <p className="sub">Créez la tournée, puis ajoutez ses adresses en photo ou à la main.</p>
        <FormulaireTournee aujourdhui={aujourdhuiParis()} depart={tournees[0]?.depart ?? ""} />
      </section>
    </>
  );
}
