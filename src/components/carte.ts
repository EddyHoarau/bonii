// Carte de tournée animée, reprise du prototype. C'est une illustration générée :
// l'ordre de passage dessiné n'est pas une vraie tournée (lot 2 : moteur d'optimisation existant).

export type Etat = "ok" | "warn" | "bad";
type Pt = [number, number];
type Scene = { path: Pt[]; fail: Record<number, 1>; single: boolean };

const COL: Record<Etat, string> = { ok: "#3fe0a0", warn: "#ff9a3d", bad: "#ff5d5d" };

function rng(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeStreets() {
  const r = rng(7), L: number[][] = [];
  for (let i = 0; i < 13; i++) { const x = (i + r() * 0.6) / 13, d = (r() - 0.5) * 0.12; L.push([x, -0.05, x + d, 1.05, r() < 0.2 ? 2 : 1]); }
  for (let j = 0; j < 9; j++) { const y = (j + r() * 0.6) / 9, e = (r() - 0.5) * 0.14; L.push([-0.05, y, 1.05, y + e, r() < 0.25 ? 2 : 1]); }
  L.push([-0.05, 0.92, 1.05, 0.18, 3]); L.push([0.05, -0.05, 0.62, 1.05, 3]);
  return L;
}

function makeScene(n: number, rep: number, single: boolean): Scene {
  const r = rng(single ? 99 : 1234), pts: Pt[] = [], depot: Pt = [0.11, 0.8];
  if (single) pts.push([0.86, 0.36]);
  else {
    const centers: Pt[] = [[0.36, 0.42], [0.68, 0.3], [0.74, 0.68], [0.45, 0.74], [0.56, 0.5]];
    for (let i = 0; i < n; i++) {
      const c = centers[Math.floor(r() * centers.length)];
      const a = r() * 6.283, d = Math.sqrt(-2 * Math.log(1 - r() * 0.999)) * 0.095;
      pts.push([Math.min(0.95, Math.max(0.2, c[0] + Math.cos(a) * d * 1.25)), Math.min(0.84, Math.max(0.34, c[1] + 0.06 + Math.sin(a) * d))]);
    }
  }
  const left = pts.slice(), order: Pt[] = [];
  let cur = depot;
  while (left.length) {
    let bi = 0, bd = 1e9;
    for (let k = 0; k < left.length; k++) { const dd = Math.hypot(left[k][0] - cur[0], left[k][1] - cur[1]); if (dd < bd) { bd = dd; bi = k; } }
    cur = left.splice(bi, 1)[0]; order.push(cur);
  }
  const path = [depot, ...order, depot];
  const D = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  for (let pass = 0; pass < 3; pass++) {
    for (let x = 1; x < path.length - 2; x++) {
      for (let y = x + 1; y < path.length - 1; y++) {
        if (D(path[x - 1], path[x]) + D(path[y], path[y + 1]) > D(path[x - 1], path[y]) + D(path[x], path[y + 1]) + 1e-9) {
          const seg = path.slice(x, y + 1).reverse(); for (let z = 0; z < seg.length; z++) path[x + z] = seg[z];
        }
      }
    }
  }
  const fail: Record<number, 1> = {}, f = rng(55);
  let tries = 0;
  while (Object.keys(fail).length < Math.min(rep, n) && tries++ < 2000) fail[1 + Math.floor(f() * n)] = 1;
  return { path, fail, single };
}

/** Démarre l'animation sur le canevas. Renvoie de quoi changer la scène et l'arrêter. */
export function demarrerCarte(cv: HTMLCanvasElement) {
  const cx = cv.getContext("2d")!;
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const streets = makeStreets();
  let W = 0, H = 0, scene: Scene | null = null, sceneKey = "", t0 = 0, etat: Etat = "ok";
  let raf = 0, enCours = false;

  function size() {
    const b = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    W = b.width; H = b.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function frame(now: number) {
    enCours = false;
    if (!scene || !W) { relancer(); return; }
    const col = COL[etat], P = scene.path.map((p) => [p[0] * W, p[1] * H]);
    cx.clearRect(0, 0, W, H);
    const g = cx.createRadialGradient(W * 0.6, H * 0.45, 10, W * 0.6, H * 0.45, Math.max(W, H) * 0.8);
    g.addColorStop(0, "rgba(255,255,255,.05)"); g.addColorStop(1, "rgba(255,255,255,0)");
    cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    streets.forEach((l) => {
      cx.beginPath(); cx.moveTo(l[0] * W, l[1] * H); cx.lineTo(l[2] * W, l[3] * H);
      cx.lineWidth = l[4] === 3 ? 5 : l[4]; cx.strokeStyle = l[4] === 3 ? "rgba(255,255,255,.07)" : "rgba(255,255,255,.055)"; cx.stroke();
    });
    const len = [0];
    for (let i = 1; i < P.length; i++) len.push(len[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const total = len[len.length - 1] || 1, el2 = (now - t0) / 1000;
    let draw = calm ? 1 : Math.min(1, el2 / 2.6); draw = 1 - Math.pow(1 - draw, 3);
    const reach = draw * total;
    cx.save(); cx.lineJoin = "round"; cx.lineCap = "round"; cx.shadowColor = col; cx.shadowBlur = 16; cx.strokeStyle = col; cx.lineWidth = 2.4;
    cx.beginPath(); cx.moveTo(P[0][0], P[0][1]);
    for (let j = 1; j < P.length; j++) {
      if (len[j] <= reach) cx.lineTo(P[j][0], P[j][1]);
      else { const q = (reach - len[j - 1]) / (len[j] - len[j - 1] || 1); if (q > 0) cx.lineTo(P[j - 1][0] + (P[j][0] - P[j - 1][0]) * q, P[j - 1][1] + (P[j][1] - P[j - 1][1]) * q); break; }
    }
    cx.stroke(); cx.restore();
    for (let k = 1; k < P.length - 1; k++) {
      const on = len[k] <= reach, bad = scene.fail[k];
      cx.beginPath(); cx.arc(P[k][0], P[k][1], scene.single ? 7 : 4, 0, 6.283);
      cx.fillStyle = on ? (bad ? "#1d1638" : "#f1f3f5") : "rgba(255,255,255,.25)"; cx.fill();
      if (on && bad) { cx.lineWidth = 2; cx.strokeStyle = COL.bad; cx.stroke(); }
    }
    cx.fillStyle = "#b8a4ff"; cx.shadowColor = "#b8a4ff"; cx.shadowBlur = 18;
    cx.fillRect(P[0][0] - 7, P[0][1] - 7, 14, 14); cx.shadowBlur = 0;
    cx.fillStyle = "rgba(241,243,245,.75)"; cx.font = "600 12px 'Albert Sans',sans-serif"; cx.fillText("Dépôt", P[0][0] - 16, P[0][1] + (H < 360 ? -14 : 26)); // carte basse (téléphone) : au-dessus, pour ne pas toucher la légende
    if (!calm && draw >= 1) {
      const loop = scene.single ? 9 : 22, d = (((el2 - 2.6) % loop) / loop) * total;
      let m = 1;
      while (m < len.length - 1 && len[m] < d) m++;
      const u = (d - len[m - 1]) / (len[m] - len[m - 1] || 1), vx = P[m - 1][0] + (P[m][0] - P[m - 1][0]) * u, vy = P[m - 1][1] + (P[m][1] - P[m - 1][1]) * u;
      const pulse = 9 + Math.sin(now / 260) * 3;
      cx.beginPath(); cx.arc(vx, vy, pulse + 6, 0, 6.283); cx.fillStyle = "rgba(184,164,255,.2)"; cx.fill();
      cx.beginPath(); cx.arc(vx, vy, 5.5, 0, 6.283); cx.fillStyle = "#b8a4ff"; cx.shadowColor = "#b8a4ff"; cx.shadowBlur = 20; cx.fill(); cx.shadowBlur = 0;
    }
    if (!calm || draw < 1) relancer();
  }

  function relancer() {
    if (enCours) return;
    enCours = true; raf = requestAnimationFrame(frame);
  }

  size();
  const ro = new ResizeObserver(() => { size(); relancer(); });
  ro.observe(cv);
  relancer();

  return {
    scene(n: number, rep: number, single: boolean) {
      const key = n + "|" + rep + "|" + single;
      if (key !== sceneKey) { sceneKey = key; scene = makeScene(n, rep, single); t0 = performance.now(); }
      relancer();
    },
    etat(e: Etat) { etat = e; relancer(); },
    arreter() { cancelAnimationFrame(raf); ro.disconnect(); },
  };
}
