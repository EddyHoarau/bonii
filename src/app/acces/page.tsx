import { Suspense } from "react";
import { Marque } from "@/components/Marque";
import { FormulaireAcces } from "./Formulaires";

export const metadata = { title: "Votre accès · Bonii", referrer: "no-referrer" };

// Page publique : la personne arrive ici depuis le lien d'accès qu'on lui a transmis.
export default function PageAcces({ searchParams }: PageProps<"/acces">) {
  return (
    <div className="app">
      <header className="top"><Marque /></header>
      <section className="panel pad connexion">
        <h2>Bienvenue sur Bonii</h2>
        <p className="sub">Ouvrez votre accès, puis choisissez votre mot de passe. Vous vous connecterez ensuite avec votre adresse e-mail et ce mot de passe.</p>
        <Suspense><Jeton searchParams={searchParams} /></Suspense>
      </section>
    </div>
  );
}

async function Jeton({ searchParams }: { searchParams: PageProps<"/acces">["searchParams"] }) {
  const { jeton } = await searchParams;
  return <FormulaireAcces jeton={typeof jeton === "string" ? jeton : ""} />;
}
