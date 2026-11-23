"use client";

import { useActionState } from "react";
import { IconeItineraire } from "@/lib/icones";
import { optimiser } from "../actions";

export function BoutonOptimiser({ tourneeId, refaire }: { tourneeId: string; refaire: boolean }) {
  const [etat, action, enCours] = useActionState(optimiser, null);
  return (
    <form action={action} className="actions">
      <input type="hidden" name="id" value={tourneeId} />
      <button type="submit" className="principal" disabled={enCours}>
        <IconeItineraire />{enCours ? "Calcul en cours…" : refaire ? "Recalculer l'ordre de passage" : "Calculer l'ordre de passage"}
      </button>
      {etat && <p className={etat.ok ? "note" : "alerte"} role="status">{etat.message}</p>}
    </form>
  );
}
