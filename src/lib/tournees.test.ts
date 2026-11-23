import { describe, expect, it } from "vitest";
import { decouperAdresses, dureeFr, heureParis, instantParis, lireGeocodage, lireLecture, lireOptimisation, lireTournee, requeteOptimisation } from "./tournees";

const lire = (o: Record<string, string>) => (cle: string) => o[cle] ?? "";
const base = { nom: "Nancy centre", jour: "2026-11-23", depart: "12 rue Saint-Dizier 54000 Nancy", heure_depart: "08:00", minutes_par_arret: "3" };

describe("lireTournee", () => {
  it("accepte une tournée complète, avec l'heure telle que la base la renvoie", () => {
    expect(lireTournee(lire({ ...base, heure_depart: "07:30:00", minutes_par_arret: "2,5" }))).toEqual({
      fiche: { nom: "Nancy centre", jour: "2026-11-23", depart: "12 rue Saint-Dizier 54000 Nancy", heure_depart: "07:30", minutes_par_arret: 2.5 },
    });
  });
  it("refuse un nom vide, une date ou une heure fausse, un temps par arrêt absurde", () => {
    for (const faux of [{ nom: " " }, { jour: "demain" }, { depart: "" }, { heure_depart: "25:00" }, { minutes_par_arret: "500" }, { minutes_par_arret: "vite" }]) {
      expect(lireTournee(lire({ ...base, ...faux }))).toHaveProperty("erreur");
    }
  });
});

describe("decouperAdresses", () => {
  it("garde une adresse par ligne, sans lignes vides ni doublons", () => {
    expect(decouperAdresses(" 3 rue des Carmes   54000 Nancy \r\n\n3 RUE DES CARMES 54000 NANCY\n8 place Stanislas 54000 Nancy")).toEqual([
      "3 rue des Carmes 54000 Nancy", "8 place Stanislas 54000 Nancy",
    ]);
  });
});

describe("lireLecture", () => {
  const reponse = (texte: string, stop = "end_turn") => ({ stop_reason: stop, content: [{ type: "thinking" }, { type: "text", text: texte }] });
  it("sort les adresses du bloc de texte, nettoyées", () => {
    expect(lireLecture(reponse('{"adresses":["3 rue des Carmes 54000 Nancy"," ",42,"3 rue des carmes 54000 nancy"]}'))).toEqual({ adresses: ["3 rue des Carmes 54000 Nancy"] });
  });
  it("renvoie un message si la réponse est coupée, refusée ou illisible", () => {
    expect(lireLecture(reponse('{"adresses":["3 rue', "max_tokens"))).toHaveProperty("erreur");
    expect(lireLecture(reponse("Je ne peux pas.", "refusal"))).toHaveProperty("erreur");
    expect(lireLecture(reponse('{"autre":1}'))).toHaveProperty("erreur");
    expect(lireLecture(null)).toHaveProperty("erreur");
  });
});

describe("lireGeocodage", () => {
  const trouve = (score: number) => ({ features: [{ geometry: { type: "Point", coordinates: [6.18, 48.69] }, properties: { label: "8 Place Stanislas 54000 Nancy", score } }] });
  it("lit longitude puis latitude et juge la fiabilité au score", () => {
    expect(lireGeocodage(trouve(0.95))).toEqual({ lat: 48.69, lon: 6.18, reconnue: "8 Place Stanislas 54000 Nancy", fiable: true });
    expect(lireGeocodage(trouve(0.4))?.fiable).toBe(false);
  });
  it("renvoie null quand rien n'est trouvé", () => {
    expect(lireGeocodage({ features: [] })).toBeNull();
    expect(lireGeocodage(null)).toBeNull();
  });
});

describe("heures de Paris", () => {
  it("convertit en hiver (UTC+1) comme en été (UTC+2)", () => {
    expect(instantParis("2026-11-23", "08:00").toISOString()).toBe("2026-11-23T07:00:00.000Z");
    expect(instantParis("2026-07-15", "08:00:00").toISOString()).toBe("2026-07-15T06:00:00.000Z");
    expect(heureParis("2026-07-15T06:42:10Z")).toBe("08:42");
    expect(heureParis("2026-11-23T23:05:00Z")).toBe("00:05");
  });
});

describe("ordre de passage", () => {
  const t = { jour: "2026-11-23", heure_depart: "08:00", minutes_par_arret: 2.5, depart_lat: 48.69, depart_lon: 6.18 };
  it("demande un véhicule qui part du dépôt et y revient, une livraison par arrêt", () => {
    const r = requeteOptimisation(t, [{ lat: 48.7, lon: 6.2 }, { lat: 48.68, lon: 6.17 }]);
    expect(r.considerRoadTraffic).toBe(true);
    expect(r.model.shipments).toHaveLength(2);
    expect(r.model.shipments[1].deliveries[0]).toEqual({ arrivalLocation: { latitude: 48.68, longitude: 6.17 }, duration: "150s" });
    expect(r.model.vehicles[0].startLocation).toEqual(r.model.vehicles[0].endLocation);
    expect([r.model.globalStartTime, r.model.globalEndTime]).toEqual(["2026-11-23T07:00:00.000Z", "2026-11-24T07:00:00.000Z"]);
  });
  it("lit l'ordre, les heures d'arrivée, la distance et la durée ; un index absent vaut 0", () => {
    const reponse = {
      routes: [{
        vehicleStartTime: "2026-11-23T07:00:00Z", vehicleEndTime: "2026-11-23T08:10:00Z",
        visits: [{ shipmentIndex: 2, startTime: "2026-11-23T07:12:00Z" }, { startTime: "2026-11-23T07:30:00Z" }],
        metrics: { travelDistanceMeters: 23456 },
      }],
      skippedShipments: [{ index: 1 }],
    };
    expect(lireOptimisation(reponse, 3)).toEqual({ passages: [{ index: 2, arrivee: "08:12" }, { index: 0, arrivee: "08:30" }], oublies: [1], km: 23.5, minutes: 70 });
  });
  it("refuse une réponse vide, un index hors liste ou en double", () => {
    expect(lireOptimisation({ routes: [{}] }, 3)).toHaveProperty("erreur");
    expect(lireOptimisation({ routes: [{ visits: [{ shipmentIndex: 7, startTime: "2026-11-23T07:12:00Z" }] }] }, 3)).toHaveProperty("erreur");
    expect(lireOptimisation({ routes: [{ visits: [{ startTime: "2026-11-23T07:12:00Z" }, { startTime: "2026-11-23T07:20:00Z" }] }] }, 3)).toHaveProperty("erreur");
  });
  it("écrit la durée en clair", () => {
    expect([dureeFr(45), dureeFr(60), dureeFr(340)]).toEqual(["45 min", "1 h 00", "5 h 40"]);
  });
});
