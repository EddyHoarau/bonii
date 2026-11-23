import { liensTournee } from "@/lib/equipe";
import { IconeGuidage } from "@/lib/icones";

/** Boutons qui ouvrent la tournée dans Google Maps, 10 arrêts à la fois (limite de Google). */
export function GuidageTournee({ arrets }: { arrets: { lat: number | null; lon: number | null }[] }) {
  const liens = liensTournee(arrets);
  if (liens.length === 0) return null;
  return (
    <div className="guidage-tournee">
      <p className="meta">Toute la tournée dans Google Maps, par 10 arrêts à la fois :</p>
      <div className="actions">
        {liens.map((l) => (
          <a key={l.de} className="bouton" href={l.href} target="_blank" rel="noreferrer">
            <IconeGuidage />{l.de === l.a ? "Arrêt " + l.de : "Arrêts " + l.de + " à " + l.a}
          </a>
        ))}
      </div>
    </div>
  );
}
