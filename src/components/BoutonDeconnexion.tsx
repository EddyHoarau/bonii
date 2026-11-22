import { seDeconnecter } from "@/app/connexion/actions";
import { IconeSortie } from "@/lib/icones";

export function BoutonDeconnexion() {
  return (
    <form action={seDeconnecter}>
      <button type="submit" className="discret"><IconeSortie />Se déconnecter</button>
    </form>
  );
}
