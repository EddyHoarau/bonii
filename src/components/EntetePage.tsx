/** Titre de la page, sa phrase d'explication et, à droite, ses commandes éventuelles. */
export function EntetePage({ titre, sous, children }: { titre: string; sous?: string; children?: React.ReactNode }) {
  return (
    <header className="entete-page">
      <div>
        <h1>{titre}</h1>
        {sous && <p>{sous}</p>}
      </div>
      {children}
    </header>
  );
}
