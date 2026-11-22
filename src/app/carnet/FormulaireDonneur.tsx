"use client";

import { useActionState } from "react";
import { IconeAjouter, IconeEnregistrer } from "@/lib/icones";
import { STATUTS_DONNEUR, type Donneur } from "@/lib/carnet";
import { enregistrerDonneur } from "./actions";

/** Sans « id » : ajoute au carnet. Avec : modifie la fiche (et montre les notes). */
export function FormulaireDonneur({ id, donneur }: { id?: string; donneur?: Donneur }) {
  const [etat, action, enCours] = useActionState(enregistrerDonneur, null);
  const valeur = (cle: keyof Donneur) => etat?.saisie[cle] ?? donneur?.[cle] ?? "";
  const texte = (cle: "nom" | "interlocuteur" | "telephone" | "email", libelle: string, max: number, type = "text") => (
    <div className="field">
      <label htmlFor={"do-" + cle}>{libelle}</label>
      <div className="box"><input id={"do-" + cle} name={cle} type={type} maxLength={max} required={cle === "nom"} defaultValue={valeur(cle)} /></div>
    </div>
  );
  return (
    <form action={action} className="stack-form">
      {id && <input type="hidden" name="id" value={id} />}
      <div className="fields">
        {texte("nom", "Nom", 200)}
        <div className="field">
          <label htmlFor="do-statut">Statut</label>
          <div className="box">
            <select id="do-statut" name="statut" defaultValue={valeur("statut") || "prospect"}>
              {Object.entries(STATUTS_DONNEUR).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        {texte("interlocuteur", "Interlocuteur", 200)}
        {texte("telephone", "Téléphone", 40, "tel")}
        {texte("email", "E-mail", 254, "email")}
        {id && (
          <div className="field large">
            <label htmlFor="do-notes">Notes</label>
            <div className="box"><textarea id="do-notes" name="notes" maxLength={4000} rows={3} defaultValue={valeur("notes")} /></div>
          </div>
        )}
      </div>
      <div className="actions">
        <button type="submit" className="principal" disabled={enCours}>
          {id ? <IconeEnregistrer /> : <IconeAjouter />}{enCours ? "Enregistrement…" : id ? "Enregistrer la fiche" : "Ajouter au carnet"}
        </button>
        {etat && <p className={etat.ok ? "note" : "alerte"} role="status">{etat.message}</p>}
      </div>
    </form>
  );
}
