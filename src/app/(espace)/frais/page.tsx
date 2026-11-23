import { redirect } from "next/navigation";
import { Suspense } from "react";
import { membreConnecte } from "@/lib/supabase/serveur";
import { aujourdhuiParis, dateFr } from "@/lib/echeances";
import { STATUTS_NOTE, type StatutNote } from "@/lib/equipe";
import { eur2 } from "@/lib/format";
import { IconeFait, IconeSupprimer } from "@/lib/icones";
import { FormulaireNote } from "./FormulaireNote";
import { statuerNote, supprimerNote } from "./actions";
import { EntetePage } from "@/components/EntetePage";

export const metadata = { title: "Notes de frais · Bonii" };

export default function PageFrais() {
  return (
    <div className="app">
      <EntetePage titre="Notes de frais" />
      <Suspense><Contenu /></Suspense>
    </div>
  );
}

type Note = { id: string; user_id: string; jour: string; nature: string; montant: number; commentaire: string | null; statut: StatutNote };
const COULEUR: Record<StatutNote, string> = { a_valider: "warn", validee: "ok", refusee: "bad" };

async function Contenu() {
  const { supabase, userId, entrepriseId, role } = await membreConnecte();
  if (!userId) redirect("/connexion");
  if (!entrepriseId) redirect("/");
  const dirigeant = role === "dirigeant";

  // RLS : le chauffeur ne reçoit que ses notes, le dirigeant celles de toute son entreprise.
  const [{ data }, { data: membres }] = await Promise.all([
    supabase.from("notes_frais").select("id, user_id, jour, nature, montant, commentaire, statut").order("jour", { ascending: false }).order("cree_le", { ascending: false }).limit(200).returns<Note[]>(),
    supabase.from("membres").select("user_id, nom").returns<{ user_id: string; nom: string | null }[]>(),
  ]);
  const notes = data ?? [];
  const noms = new Map((membres ?? []).map((m) => [m.user_id, m.nom ?? "Chauffeur"]));
  const attente = notes.filter((n) => n.statut === "a_valider");

  return (
    <>

      {!dirigeant && (
        <section className="panel pad">
          <h2>Déposer une note de frais</h2>
          <p className="sub">Une dépense payée de votre poche pour le travail.</p>
          <FormulaireNote aujourdhui={aujourdhuiParis()} />
        </section>
      )}

      <section className="panel pad">
        <h2>{dirigeant ? "Notes de frais de l'équipe" : "Mes notes de frais"}</h2>
        <p className="sub">{attente.length === 0 ? "Rien en attente." : attente.length + " en attente, pour " + eur2(attente.reduce((s, n) => s + Number(n.montant), 0)) + "."}</p>
        {notes.length === 0 ? (
          <p className="note vide">Aucune note de frais.</p>
        ) : (
          <ul className="liste">
            {notes.map((n) => (
              <li key={n.id} className={"ligne etat-" + COULEUR[n.statut]}>
                <div className="ident">
                  <span className="nom">{n.nature}, {eur2(Number(n.montant))}</span>
                  <span className="meta">{[dateFr(n.jour), dirigeant && noms.get(n.user_id), n.commentaire].filter(Boolean).join(", ")}</span>
                </div>
                <span className="echeance">{STATUTS_NOTE[n.statut]}</span>
                {n.statut !== "a_valider" ? <span /> : dirigeant ? (
                  <form action={statuerNote} className="actions">
                    <input type="hidden" name="id" value={n.id} />
                    <button type="submit" name="statut" value="validee" className="discret"><IconeFait />Valider</button>
                    <button type="submit" name="statut" value="refusee" className="discret danger">Refuser</button>
                  </form>
                ) : (
                  <form action={supprimerNote}>
                    <input type="hidden" name="id" value={n.id} />
                    <button type="submit" className="discret"><IconeSupprimer />Retirer</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
