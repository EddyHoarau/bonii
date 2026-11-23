import { IconeFait } from "@/lib/icones";

/** Pages publiques (connexion, accès, mot de passe) : panneau sombre de la marque à gauche, formulaire à droite. */
export function CadreAccueil({ titre, sous, haut, children }: { titre: string; sous: React.ReactNode; haut?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="accueil">
      <aside className="accueil-marque sombre">
        <span className="logo-mot">BONI<i>I</i></span>
        <p className="accueil-slogan">Savoir si une tournée rapporte, avant de la signer.</p>
        <ul className="accueil-points">
          <li><IconeFait />Chaque tournée et chaque course chiffrées avant de répondre</li>
          <li><IconeFait />Vos donneurs d&apos;ordre, vos véhicules et leurs échéances</li>
          <li><IconeFait />La tournée du jour pour vos chauffeurs</li>
        </ul>
      </aside>
      <main className="accueil-contenu">
        {haut}
        <section className="panel pad connexion">
          <h1>{titre}</h1>
          <p className="sub">{sous}</p>
          {children}
        </section>
      </main>
    </div>
  );
}
