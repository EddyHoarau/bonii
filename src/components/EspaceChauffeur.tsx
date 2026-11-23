import type { clientSupabase } from "@/lib/supabase/serveur";
import { EntetePage } from "./EntetePage";
import { aujourdhuiParis, dateFr } from "@/lib/echeances";
import { lienGuidage } from "@/lib/equipe";
import { IconeGuidage } from "@/lib/icones";

type Tournee = { id: string; nom: string; jour: string; depart: string; heure_depart: string; optimisee_le: string | null };
type Arret = { id: string; tournee_id: string; adresse: string; lat: number | null; lon: number | null; arrivee: string | null };

/** Ce que voit un chauffeur : ses tournées d'aujourd'hui et à venir, arrêt par arrêt. Rien d'autre (règles RLS de la migration 0007). */
export async function EspaceChauffeur({ supabase, userId }: { supabase: Awaited<ReturnType<typeof clientSupabase>>; userId: string }) {
  const aujourdhui = aujourdhuiParis();
  const { data: t } = await supabase.from("tournees").select("id, nom, jour, depart, heure_depart, optimisee_le")
    .eq("chauffeur_id", userId).gte("jour", aujourdhui).order("jour").order("heure_depart").returns<Tournee[]>();
  const tournees = t ?? [];
  const { data: a } = tournees.length
    ? await supabase.from("arrets").select("id, tournee_id, adresse, lat, lon, arrivee").in("tournee_id", tournees.map((x) => x.id)).order("ordre").returns<Arret[]>()
    : { data: [] as Arret[] };
  const arrets = a ?? [];

  return (
    <>
      {/* Notes de frais et messages sont dans le menu (en bas sur téléphone). */}
      <EntetePage titre="Ma tournée" sous="Vos arrêts, dans l'ordre de passage. « Y aller » ouvre le guidage." />
      {tournees.length === 0 && <section className="panel pad"><p className="note vide">Aucune tournée ne vous est confiée pour aujourd&apos;hui ni pour les jours à venir.</p></section>}
      {tournees.map((x) => {
        const stops = arrets.filter((s) => s.tournee_id === x.id);
        return (
          <section className="panel pad" key={x.id}>
            <h2>{x.nom}</h2>
            <p className="sub">{x.jour === aujourdhui ? "Aujourd'hui" : dateFr(x.jour)}, départ à {x.heure_depart.slice(0, 5)} de {x.depart}. {stops.length} {stops.length > 1 ? "arrêts" : "arrêt"}{x.optimisee_le ? "." : ", ordre de passage pas encore calculé."}</p>
            <ol className="liste arrets">
              {stops.map((s, i) => (
                <li key={s.id} className="ligne etat-ok">
                  <div className="ident arret"><span className="numero" aria-hidden="true">{i + 1}</span><span className="nom"><span className="sr">Arrêt {i + 1} : </span>{s.adresse}</span></div>
                  <span className="echeance">{s.arrivee ? "Vers " + s.arrivee.slice(0, 5) : ""}</span>
                  {s.lat !== null && s.lon !== null
                    ? <a className="bouton" href={lienGuidage(s.lat, s.lon)} target="_blank" rel="noreferrer"><IconeGuidage />Y aller</a>
                    : <span className="meta">Position inconnue</span>}
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </>
  );
}
