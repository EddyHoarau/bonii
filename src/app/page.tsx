import { Marque } from "@/components/Marque";

export default function Accueil() {
  return (
    <div className="app">
      <header className="top">
        <Marque />
      </header>
      <section className="panel pad">
        <p style={{ margin: 0, color: "var(--muted)" }}>Le simulateur arrive à l&apos;étape 3.</p>
      </section>
    </div>
  );
}
