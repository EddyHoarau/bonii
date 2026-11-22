"use client";

import { useActionState } from "react";
import { IconeAjouter } from "@/lib/icones";
import { inviterChauffeur } from "./actions";

export function FormulaireInvitationChauffeur() {
  const [etat, action, enCours] = useActionState(inviterChauffeur, null);
  return (
    <form action={action} className="stack-form">
      <div className="fields">
        <div className="field">
          <label htmlFor="eq-nom">Nom du chauffeur</label>
          <div className="box"><input id="eq-nom" name="nom" required maxLength={100} defaultValue={etat?.saisie.nom} /></div>
        </div>
        <div className="field">
          <label htmlFor="eq-email">Son adresse e-mail</label>
          <div className="box"><input id="eq-email" name="email" type="email" required maxLength={254} defaultValue={etat?.saisie.email} /></div>
        </div>
      </div>
      <div className="actions">
        <button type="submit" className="principal" disabled={enCours}><IconeAjouter />{enCours ? "Ajout…" : "Ajouter ce chauffeur"}</button>
        {etat && <p className={etat.ok ? "note" : "alerte"} role="status">{etat.message}</p>}
      </div>
    </form>
  );
}
