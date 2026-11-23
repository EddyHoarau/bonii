"use client";

import { affecterChauffeur } from "../actions";

/** Le chauffeur de la tournée s'enregistre dès qu'on le change. */
export function ChoixChauffeur({ tourneeId, chauffeurId, chauffeurs }: { tourneeId: string; chauffeurId: string | null; chauffeurs: { user_id: string; nom: string | null }[] }) {
  return (
    <form action={affecterChauffeur} className="field choix-vehicule">
      <input type="hidden" name="id" value={tourneeId} />
      <label htmlFor="to-chauffeur">Chauffeur</label>
      <div className="box">
        <select id="to-chauffeur" name="chauffeur" defaultValue={chauffeurId ?? ""} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
          <option value="">Personne pour l&apos;instant</option>
          {chauffeurs.map((c) => <option key={c.user_id} value={c.user_id}>{c.nom ?? "Chauffeur"}</option>)}
        </select>
      </div>
      <span className="hint">Il verra cette tournée en se connectant.</span>
    </form>
  );
}
