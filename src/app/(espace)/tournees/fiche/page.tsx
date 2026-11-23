import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BoutonSupprimer } from "@/components/BoutonSupprimer";
import { clientSupabase } from "@/lib/supabase/serveur";
import { dateFr } from "@/lib/echeances";
import { dureeFr } from "@/lib/tournees";
import { nf1 } from "@/lib/format";
import { IconeSupprimer } from "@/lib/icones";
import { corrigerArret, supprimerArret, supprimerTournee } from "../actions";
import { AjoutAdresses } from "./AjoutAdresses";
import { BoutonOptimiser } from "./BoutonOptimiser";
import { ChoixChauffeur } from "./ChoixChauffeur";

export const metadata = { title: "Tournée · Bonii" };
// La lecture des photos et le calcul de l'ordre de passage peuvent prendre plusieurs dizaines de secondes.
export const maxDuration = 60;

export default function PageFicheTournee({ searchParams }: PageProps<"/tournees/fiche">) {
  return (
    <div className="app">
      <Suspense><Fiche searchParams={searchParams} /></Suspense>
    </div>
  );
}

type Tournee = { nom: string; jour: string; depart: string; heure_depart: string; minutes_par_arret: number; optimisee_le: string | null; km: number | null; duree_minutes: number | null; chauffeur_id: string | null };
type Arret = { id: string; adresse: string; reconnue: string | null; lat: number | null; fiable: boolean; arrivee: string | null };

async function Fiche({ searchParams }: { searchParams: PageProps<"/tournees/fiche">["searchParams"] }) {
  const { id } = await searchParams;
  const supabase = await clientSupabase();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/connexion");

  // RLS : une tournée d'une autre entreprise ne revient pas, comme si elle n'existait pas.
  const valide = typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id);
  const { data: tournee } = valide
    ? await supabase.from("tournees").select("nom, jour, depart, heure_depart, minutes_par_arret, optimisee_le, km, duree_minutes, chauffeur_id").eq("id", id).maybeSingle<Tournee>()
    : { data: null };
  if (!valide || !tournee) {
    return <section className="panel pad"><h2>Tournée introuvable</h2><p className="note">Elle a peut-être été effacée, comme toutes les tournées de plus de 7 jours. <Link className="lien" href="/tournees">Retour à mes tournées</Link></p></section>;
  }
  const [{ data }, { data: equipe }] = await Promise.all([
    supabase.from("arrets").select("id, adresse, reconnue, lat, fiable, arrivee").eq("tournee_id", id).order("ordre").returns<Arret[]>(),
    supabase.from("membres").select("user_id, nom").eq("role", "chauffeur").order("nom").returns<{ user_id: string; nom: string | null }[]>(),
  ]);
  const arrets = data ?? [], chauffeurs = equipe ?? [];
  const aVerifier = arrets.filter((a) => a.lat === null || !a.fiable).length;
  const resume = [arrets.length + (arrets.length > 1 ? " arrêts" : " arrêt"), tournee.km !== null && nf1(tournee.km) + " km", tournee.duree_minutes !== null && dureeFr(tournee.duree_minutes) + " dépôt à dépôt"].filter(Boolean).join(", ");

  return (
    <>
      <section className="panel pad">
        <h2>{tournee.nom}</h2>
        <p className="sub">{dateFr(tournee.jour)}, départ à {tournee.heure_depart.slice(0, 5)} de {tournee.depart}. {nf1(tournee.minutes_par_arret)} min par arrêt.</p>
        {chauffeurs.length > 0 && <ChoixChauffeur tourneeId={id} chauffeurId={tournee.chauffeur_id} chauffeurs={chauffeurs} />}
        {arrets.length === 0 ? (
          <p className="note vide">Aucune adresse pour l&apos;instant. Ajoutez-les ci-dessous.</p>
        ) : (
          <>
            <p className="note">{resume}{tournee.optimisee_le ? "." : ". L'ordre de passage n'est pas calculé."}{aVerifier > 0 && " " + aVerifier + (aVerifier > 1 ? " adresses à vérifier." : " adresse à vérifier.")}</p>
            <ol className="liste arrets">
              {arrets.map((a, i) => {
                const etat = a.lat === null ? "bad" : a.fiable ? "ok" : "warn";
                return (
                  <li key={a.id} className={"ligne etat-" + etat}>
                    <div className="ident">
                      <span className="nom">{i + 1}. {a.adresse}</span>
                      <span className="meta">{a.lat === null ? "Adresse introuvable : elle ne sera pas dans l'ordre de passage." : a.fiable ? a.reconnue : "À vérifier, comprise comme : " + a.reconnue}</span>
                      {etat !== "ok" && (
                        <form action={corrigerArret} className="correction">
                          <input type="hidden" name="id" value={a.id} />
                          <div className="box"><input name="adresse" required maxLength={300} defaultValue={a.adresse} aria-label={"Corriger l'adresse " + (i + 1)} /></div>
                          <button type="submit" className="discret">Corriger</button>
                        </form>
                      )}
                    </div>
                    <span className="echeance">{a.arrivee ? "Vers " + a.arrivee.slice(0, 5) : ""}</span>
                    <form action={supprimerArret}>
                      <input type="hidden" name="id" value={a.id} />
                      <button type="submit" className="discret" aria-label={"Retirer l'adresse " + (i + 1)}><IconeSupprimer />Retirer</button>
                    </form>
                  </li>
                );
              })}
            </ol>
            {arrets.length > 1 && <BoutonOptimiser tourneeId={id} refaire={!!tournee.optimisee_le} />}
          </>
        )}
      </section>

      <section className="panel pad">
        <h2>Ajouter des adresses</h2>
        <p className="sub">En photo, en capture d&apos;écran ou à la main. Rien n&apos;est ajouté sans votre accord.</p>
        <AjoutAdresses tourneeId={id} />
      </section>

      <div className="actions">
        <BoutonSupprimer action={supprimerTournee} id={id} libelle="Supprimer cette tournée" question={"Supprimer « " + tournee.nom + " » et ses adresses ?"} />
      </div>
    </>
  );
}
