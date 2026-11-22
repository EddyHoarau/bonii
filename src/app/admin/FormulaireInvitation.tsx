"use client";

import { useActionState } from "react";
import { IconeEnveloppe } from "@/lib/icones";
import { creerEntreprise } from "./actions";

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
        <IconeEnveloppe />{enCours ? "Création…" : "Créer l'entreprise"}
      </button>
      {etat && <p className={etat.ok ? "note" : "alerte"} role="status">{etat.message}</p>}
    </form>
  );
}
