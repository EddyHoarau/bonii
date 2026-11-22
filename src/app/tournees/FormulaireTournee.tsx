"use client";

import { useActionState } from "react";
import { IconeAjouter } from "@/lib/icones";
import { creerTournee } from "./actions";

export function FormulaireTournee({ aujourdhui, depart }: { aujourdhui: string; depart: string }) {
  const [etat, action, enCours] = useActionState(creerTournee, null);
  const v = (cle: string, defaut: string) => etat?.saisie[cle] ?? defaut;
  return (
    <form action={action} className="stack-form">
      <div className="fields">
        <div className="field">
          <label htmlFor="to-nom">Nom</label>
          <div className="box"><input id="to-nom" name="nom" required maxLength={200} placeholder="Nancy centre" defaultValue={v("nom", "")} /></div>
        </div>
        <div className="field">
          <label htmlFor="to-jour">Date</label>
          <div className="box"><input id="to-jour" name="jour" type="date" required defaultValue={v("jour", aujourdhui)} /></div>
        </div>
        <div className="field">
          <label htmlFor="to-heure">Heure de départ</label>
          <div className="box"><input id="to-heure" name="heure_depart" type="time" required defaultValue={v("heure_depart", "08:00")} /></div>
        </div>
        <div className="field">
          <label htmlFor="to-minutes">Temps par arrêt</label>
          <div className="box"><input id="to-minutes" name="minutes_par_arret" type="number" inputMode="decimal" min={0} max={120} step={0.5} required defaultValue={v("minutes_par_arret", "3")} /><span>min</span></div>
        </div>
        <div className="field large">
          <label htmlFor="to-depart">Adresse de départ et de retour</label>
          <div className="box"><input id="to-depart" name="depart" required maxLength={300} placeholder="12 rue Saint-Dizier 54000 Nancy" defaultValue={v("depart", depart)} /></div>
          <span className="hint">Votre dépôt. La tournée y revient à la fin.</span>
        </div>
      </div>
      <div className="actions">
        <button type="submit" className="principal" disabled={enCours}><IconeAjouter />{enCours ? "Création…" : "Créer la tournée"}</button>
        {etat && <p className={etat.ok ? "note" : "alerte"} role="status">{etat.message}</p>}
      </div>
    </form>
  );
}
