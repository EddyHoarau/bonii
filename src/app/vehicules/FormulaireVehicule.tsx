"use client";

import { useActionState } from "react";
import { IconeAjouter, IconeEnregistrer } from "@/lib/icones";
import { COUTS_VEHICULE, ECHEANCES, type CleCout, type Vehicule } from "@/lib/vehicules";
import { enregistrerVehicule } from "./actions";

/** Sans « id » : ajoute un véhicule. Avec : le modifie. `profil` donne la valeur de « Mes coûts » rappelée sous chaque coût. */
export function FormulaireVehicule({ id, vehicule, profil }: { id?: string; vehicule?: Vehicule; profil: Partial<Record<CleCout, number>> }) {
  const [etat, action, enCours] = useActionState(enregistrerVehicule, null);
  const valeur = (cle: keyof Vehicule) => etat?.saisie[cle] ?? vehicule?.[cle] ?? "";
  return (
    <form action={action} className="stack-form">
      {id && <input type="hidden" name="id" value={id} />}
      <div className="fields">
        <div className="field">
          <label htmlFor="ve-nom">Nom</label>
          <div className="box"><input id="ve-nom" name="nom" required maxLength={100} placeholder="Master 2" defaultValue={valeur("nom")} /></div>
        </div>
        <div className="field">
          <label htmlFor="ve-immat">Immatriculation</label>
          <div className="box"><input id="ve-immat" name="immatriculation" maxLength={20} defaultValue={valeur("immatriculation")} /></div>
        </div>
        {ECHEANCES.map(([cle, libelle]) => (
          <div className="field" key={cle}>
            <label htmlFor={"ve-" + cle}>{libelle}, prochaine échéance</label>
            <div className="box"><input id={"ve-" + cle} name={cle} type="date" defaultValue={valeur(cle)} /></div>
          </div>
        ))}
      </div>
      <p className="note">Coûts propres à ce véhicule. Laissez vide pour garder la valeur de « Mes coûts ».</p>
      <div className="fields">
        {COUTS_VEHICULE.map(([k, libelle, unite, pas]) => {
          const cle = k as CleCout;
          return (
            <div className="field" key={cle}>
              <label htmlFor={"ve-" + cle}>{libelle}</label>
              <div className="box">
                <input id={"ve-" + cle} name={cle} type="number" inputMode="decimal" min={0} step={pas} placeholder={profil[cle] === undefined ? undefined : String(profil[cle])} defaultValue={valeur(cle)} />
                <span>{unite}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="actions">
        <button type="submit" className="principal" disabled={enCours}>
          {id ? <IconeEnregistrer /> : <IconeAjouter />}{enCours ? "Enregistrement…" : id ? "Enregistrer le véhicule" : "Ajouter ce véhicule"}
        </button>
        {etat && <p className={etat.ok ? "note" : "alerte"} role="status">{etat.message}</p>}
      </div>
    </form>
  );
}
