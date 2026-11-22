import { Suspense } from "react";
import { Marque } from "@/components/Marque";
import { FormulaireConnexion } from "./FormulaireConnexion";

export const metadata = { title: "Connexion · Bonii" };

export default function Connexion({ searchParams }: PageProps<"/connexion">) {
  return (
    <div className="app">
      <header className="top"><Marque /></header>
      <section className="panel pad connexion">
        <h2>Se connecter</h2>
        <p className="sub">Pas de mot de passe : saisissez votre adresse e-mail, vous recevez un lien de connexion.</p>
        <Suspense><ErreurLien searchParams={searchParams} /></Suspense>
        <FormulaireConnexion />
      </section>
    </div>
  );
}

// Lu au moment de la requête : derrière Suspense, le reste de la page s'affiche tout de suite (Next 16).
async function ErreurLien({ searchParams }: { searchParams: PageProps<"/connexion">["searchParams"] }) {
  const { erreur } = await searchParams;
  if (erreur !== "lien") return null;
  return <p className="alerte" role="alert">Ce lien n&apos;est plus valable (déjà utilisé, expiré, ou ouvert dans un autre navigateur que celui de la demande). Demandez-en un nouveau.</p>;
}
