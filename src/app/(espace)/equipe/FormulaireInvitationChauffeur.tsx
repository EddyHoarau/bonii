"use client";

import { useActionState } from "react";
import { IconeAjouter, IconeCle } from "@/lib/icones";
import { LienAcces } from "@/components/LienAcces";
import { inviterChauffeur, lienChauffeur } from "./actions";

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
          <span className="hint">Elle lui servira d&apos;identifiant pour se connecter.</span>
        </div>
      </div>
      <div className="actions">
        <button type="submit" className="principal" disabled={enCours}><IconeAjouter />{enCours ? "Ajout…" : "Ajouter ce chauffeur"}</button>
        {etat && <p className={etat.ok ? "note" : "alerte"} role="status">{etat.message}</p>}
      </div>
      {etat?.lien && <LienAcces lien={etat.lien} pour={etat.pour ?? ""} />}
    </form>
  );
}

/** Bouton de la liste : nouveau lien d'accès pour ce chauffeur, affiché juste en dessous. */
export function NouveauLienChauffeur({ id, nom }: { id: string; nom: string }) {
  const [etat, action, enCours] = useActionState(lienChauffeur, null);
  return (
    <form action={action} className="nouveau-lien">
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="discret" disabled={enCours}><IconeCle />{enCours ? "…" : "Nouveau lien"}</button>
      {etat?.message && <p className="alerte" role="alert">{etat.message}</p>}
      {etat?.lien && <LienAcces lien={etat.lien} pour={nom} />}
    </form>
  );
}
