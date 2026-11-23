"use client";

import { useActionState } from "react";
import { IconeAjouter, IconeCle } from "@/lib/icones";
import { LienAcces } from "@/components/LienAcces";
import { creerEntreprise, nouveauLien } from "./actions";

export function FormulaireInvitation() {
  const [etat, action, enCours] = useActionState(creerEntreprise, null);
  return (
    <form action={action} className="stack-form">
      <div className="field">
        <label htmlFor="nom">Nom de l&apos;entreprise</label>
        <div className="box"><input id="nom" name="nom" required maxLength={200} /></div>
      </div>
      <div className="field">
        <label htmlFor="email">E-mail du dirigeant</label>
        <div className="box"><input id="email" name="email" type="email" required /></div>
      </div>
      <button type="submit" className="principal" disabled={enCours}>
        <IconeAjouter />{enCours ? "Création…" : "Créer l'entreprise"}
      </button>
      {etat && <p className={etat.ok ? "note" : "alerte"} role="status">{etat.message}</p>}
      {etat?.lien && <LienAcces lien={etat.lien} pour={etat.pour ?? ""} />}
    </form>
  );
}

export function FormulaireNouveauLien() {
  const [etat, action, enCours] = useActionState(nouveauLien, null);
  return (
    <form action={action} className="stack-form">
      <div className="field">
        <label htmlFor="lien-email">Adresse e-mail du compte</label>
        <div className="box"><input id="lien-email" name="email" type="email" required /></div>
      </div>
      <button type="submit" className="principal" disabled={enCours}>
        <IconeCle />{enCours ? "Fabrication…" : "Fabriquer un nouveau lien"}
      </button>
      {etat && !etat.lien && <p className={etat.ok ? "note" : "alerte"} role="status">{etat.message}</p>}
      {etat?.lien && <LienAcces lien={etat.lien} pour={etat.pour ?? ""} />}
    </form>
  );
}
