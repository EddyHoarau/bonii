import { seDeconnecter } from "@/app/connexion/actions";
import { IconeSortie } from "@/lib/icones";

/** `compact` : icône seule (colonne du menu), avec son nom pour les lecteurs d'écran. */
export function BoutonDeconnexion({ compact = false }: { compact?: boolean }) {
  return (
    <form action={seDeconnecter}>
      {compact
        ? <button type="submit" className="rail-bouton" aria-label="Se déconnecter" title="Se déconnecter"><IconeSortie size={22} /></button>
        : <button type="submit" className="discret"><IconeSortie />Se déconnecter</button>}
    </form>
  );
}
