import { useEffect, useRef, useCallback } from 'react';

/*
  PirateBrawl.tsx — silhouette edition
  ─────────────────────────────────────
  Two black silhouette pirates (like the reference image) drift
  around the screen, chase each other, clash with sparks, flee.
  Rendered on a fixed full-screen canvas with pointer-events:none.

  Add to App.tsx:
    import PirateBrawl from "./components/PirateBrawl";
    <PirateBrawl />   ← place once, outside BrowserRouter
*/

// ─── Geometry ────────────────────────────────────────────────────────────────
interface V2 { x: number; y: number }
const v   = (x: number, y: number): V2 => ({ x, y });
const add = (a: V2, b: V2): V2 => v(a.x + b.x, a.y + b.y);
const sub = (a: V2, b: V2): V2 => v(a.x - b.x, a.y - b.y);
const mag = (a: V2) => Math.hypot(a.x, a.y);
const nor = (a: V2): V2 => { const l = mag(a); return l ? v(a.x / l, a.y / l) : v(0, 0); };
const dst = (a: V2, b: V2) => mag(sub(a, b));
const rnd = (lo: number, hi: number) => Math.random() * (hi - lo) + lo;
const rpos = (W: number, H: number): V2 => v(rnd(80, W - 80), rnd(80, H - 80));

// ─── SVG silhouette path data ─────────────────────────────────────────────────
// Pirate A — wide-stance pose with sword raised (pose 3 from reference)
// Pirate B — lunging attack pose (pose 5 from reference)
// Both are drawn in a 100×180 viewBox, origin = top-left of bounding box

const PATH_A = new Path2D(`
  M 50 0
  C 44 0 40 3 39 7
  C 36 5 32 5 30 8
  C 27 6 24 8 24 12
  C 22 11 19 13 20 17
  C 17 17 15 21 18 24
  C 15 25 14 30 18 32
  C 16 35 17 40 21 41
  L 19 48
  C 15 49 10 52 8 57
  L 4 57
  C 1 57 0 59 0 61
  L 0 65
  C 0 67 2 68 4 68
  L 8 68
  L 10 80
  C 7 82 5 86 6 90
  L 8 102
  C 6 104 5 108 7 111
  L 9 125
  C 8 127 8 131 11 133
  L 11 145
  C 10 148 11 152 14 153
  L 16 153
  C 19 154 22 152 22 149
  L 22 138
  C 25 137 27 134 26 131
  L 24 118
  C 26 116 27 112 25 109
  L 27 95
  L 35 95
  L 37 109
  C 35 112 36 116 38 118
  L 36 131
  C 35 134 37 137 40 138
  L 40 149
  C 40 152 43 154 46 153
  L 48 153
  C 51 152 52 148 51 145
  L 51 133
  C 54 131 54 127 53 125
  L 55 111
  C 57 108 56 104 54 102
  L 56 90
  C 57 86 55 82 52 80
  L 54 68
  L 58 68
  C 60 68 62 67 62 65
  L 62 61
  C 62 59 61 57 58 57
  L 54 57
  C 52 52 47 49 43 48
  L 41 41
  C 45 40 46 35 44 32
  C 48 30 47 25 44 24
  C 47 21 45 17 42 17
  C 43 13 40 11 38 12
  C 38 8 35 6 32 8
  C 30 5 26 5 24 7  
  C 22 3 18 0 12 0
  C 6 0 2 4 2 9
  C 1 7 0 8 0 10
  C 0 13 2 14 4 14
  C 3 17 4 20 7 21
  C 6 24 8 27 11 27
  C 12 30 15 32 18 31
  C 20 34 24 35 27 33
  C 29 36 34 36 36 33
  C 39 35 43 34 44 31
  C 47 32 50 30 51 27
  C 54 27 56 24 55 21
  C 58 20 59 17 58 14
  C 60 14 62 13 62 10
  C 62 8 61 7 60 9
  C 60 4 56 0 50 0 Z
`);

// ─── Simpler, cleaner approach: draw silhouettes procedurally ─────────────────
// Instead of complex path data, we build the silhouette from filled shapes
// that together form a convincing black pirate silhouette.

function drawSilhouetteA(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,    // centre-bottom (feet position)
  scale: number,             // height in px ÷ 100
  flipX: boolean,
  legAngle: number,          // walk swing
  swordAngle: number,        // sword arm angle
  bob: number,               // vertical bob in px
  fighting: boolean,
  t: number
) {
  ctx.save();
  ctx.translate(cx, cy + bob);
  if (flipX) ctx.scale(-1, 1);
  ctx.fillStyle   = 'rgba(15,15,15,0.82)';
  ctx.strokeStyle = 'rgba(15,15,15,0.82)';

  const s = scale;

  // ── Legs ─────────────────────────────────────────────────────────────────
  // Back leg
  ctx.save();
  ctx.translate(0, 0);
  ctx.rotate(-legAngle * 0.6);
  ctx.beginPath();
  ctx.moveTo(-4 * s, -10 * s);
  ctx.lineTo(-6 * s, -40 * s);
  ctx.lineTo(-10 * s, -68 * s);
  // boot
  ctx.lineTo(-14 * s, -72 * s);
  ctx.lineTo(-6  * s, -74 * s);
  ctx.lineTo(-4  * s, -70 * s);
  ctx.lineTo(-4  * s, -68 * s);
  ctx.lineTo(-4  * s, -40 * s);
  ctx.lineTo(-2  * s, -10 * s);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Front leg
  ctx.save();
  ctx.rotate(legAngle);
  ctx.beginPath();
  ctx.moveTo(4  * s, -10 * s);
  ctx.lineTo(6  * s, -40 * s);
  ctx.lineTo(10 * s, -68 * s);
  // boot
  ctx.lineTo(16 * s, -72 * s);
  ctx.lineTo(8  * s, -74 * s);
  ctx.lineTo(5  * s, -70 * s);
  ctx.lineTo(5  * s, -68 * s);
  ctx.lineTo(4  * s, -40 * s);
  ctx.lineTo(2  * s, -10 * s);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // ── Long coat body ────────────────────────────────────────────────────────
  ctx.beginPath();
  // coat skirt (flared)
  ctx.moveTo(-18 * s, -12 * s);
  ctx.bezierCurveTo(-22 * s, -20 * s, -20 * s, -35 * s, -16 * s, -42 * s);
  // left side torso
  ctx.lineTo(-14 * s, -72 * s);
  ctx.lineTo(-10 * s, -80 * s);
  // shoulders
  ctx.lineTo(-16 * s, -83 * s);
  ctx.lineTo(-14 * s, -88 * s);
  ctx.lineTo(14  * s, -88 * s);
  ctx.lineTo(16  * s, -83 * s);
  ctx.lineTo(10  * s, -80 * s);
  // right torso
  ctx.lineTo(14 * s, -72 * s);
  ctx.lineTo(16 * s, -42 * s);
  ctx.bezierCurveTo(20 * s, -35 * s, 22 * s, -20 * s, 18 * s, -12 * s);
  ctx.closePath();
  ctx.fill();

  // coat lapels / front split
  ctx.beginPath();
  ctx.moveTo(-3 * s, -72 * s);
  ctx.lineTo(-6 * s, -50 * s);
  ctx.lineTo(-10 * s, -12 * s);
  ctx.lineTo(-8 * s, -12 * s);
  ctx.lineTo(-3 * s, -45 * s);
  ctx.lineTo(0,      -72 * s);
  ctx.closePath();
  ctx.fill();

  // ── Back arm ─────────────────────────────────────────────────────────────
  ctx.save();
  ctx.translate(-14 * s, -83 * s);
  ctx.rotate(0.3 + legAngle * 0.3);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-8 * s, 5 * s, -12 * s, 18 * s, -10 * s, 28 * s);
  ctx.lineTo(-7 * s, 28 * s);
  ctx.bezierCurveTo(-9 * s, 18 * s, -5 * s, 6 * s, 4 * s, 2 * s);
  ctx.closePath();
  ctx.fill();
  // cuff
  ctx.beginPath();
  ctx.ellipse(-8.5 * s, 26 * s, 4 * s, 2.5 * s, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── Neck ─────────────────────────────────────────────────────────────────
  ctx.beginPath();
  ctx.ellipse(0, -90 * s, 5 * s, 4 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Head ─────────────────────────────────────────────────────────────────
  ctx.beginPath();
  ctx.ellipse(1 * s, -100 * s, 10 * s, 11.5 * s, 0.05, 0, Math.PI * 2);
  ctx.fill();

  // ── Tricorn hat ───────────────────────────────────────────────────────────
  // hat band / base
  ctx.beginPath();
  ctx.ellipse(1 * s, -110 * s, 14 * s, 4 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // hat body
  ctx.beginPath();
  ctx.moveTo(-10 * s, -110 * s);
  ctx.bezierCurveTo(-12 * s, -120 * s, -8 * s, -128 * s, 0, -130 * s);
  ctx.bezierCurveTo(8  * s, -128 * s, 12 * s, -120 * s, 10 * s, -110 * s);
  ctx.closePath();
  ctx.fill();
  // left brim flap
  ctx.beginPath();
  ctx.moveTo(-10 * s, -110 * s);
  ctx.bezierCurveTo(-18 * s, -112 * s, -20 * s, -120 * s, -14 * s, -124 * s);
  ctx.bezierCurveTo(-10 * s, -126 * s, -8  * s, -122 * s, -8  * s, -118 * s);
  ctx.closePath();
  ctx.fill();
  // right brim flap
  ctx.beginPath();
  ctx.moveTo(10 * s, -110 * s);
  ctx.bezierCurveTo(18 * s, -112 * s, 20 * s, -120 * s, 14 * s, -124 * s);
  ctx.bezierCurveTo(10 * s, -126 * s, 8  * s, -122 * s, 8  * s, -118 * s);
  ctx.closePath();
  ctx.fill();
  // feather
  ctx.beginPath();
  ctx.moveTo(-8 * s, -124 * s);
  ctx.bezierCurveTo(-16 * s, -135 * s, -10 * s, -145 * s, -4 * s, -140 * s);
  ctx.bezierCurveTo(-2  * s, -138 * s, -6  * s, -132 * s, -8 * s, -124 * s);
  ctx.fill();

  // ── Sword arm (raised) ────────────────────────────────────────────────────
  ctx.save();
  ctx.translate(14 * s, -83 * s);
  const sa = fighting
    ? -Math.PI / 2.8 + Math.sin(t / 110) * 0.5
    : swordAngle;
  ctx.rotate(sa);
  // upper arm
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(8 * s, 5 * s, 12 * s, 18 * s, 10 * s, 30 * s);
  ctx.lineTo(6 * s, 30 * s);
  ctx.bezierCurveTo(8 * s, 18 * s, 4 * s, 6 * s, -4 * s, 2 * s);
  ctx.closePath();
  ctx.fill();
  // cuff
  ctx.beginPath();
  ctx.ellipse(8 * s, 28 * s, 4 * s, 2.5 * s, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // hand
  ctx.beginPath();
  ctx.ellipse(9 * s, 33 * s, 4.5 * s, 4 * s, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // sword grip
  ctx.beginPath();
  ctx.roundRect(7 * s, 33 * s, 4 * s, 12 * s, 1);
  ctx.fill();
  // crossguard
  ctx.beginPath();
  ctx.roundRect(3 * s, 44 * s, 12 * s, 3.5 * s, 1);
  ctx.fill();
  // blade (tapers to point)
  ctx.beginPath();
  ctx.moveTo(8  * s, 47 * s);
  ctx.lineTo(10 * s, 47 * s);
  ctx.lineTo(9.5 * s, fighting ? 90 * s : 82 * s);
  ctx.closePath();
  ctx.fill();

  ctx.restore(); // sword arm
  ctx.restore(); // whole pirate
}

// ─── Pirate B — lunging forward pose ─────────────────────────────────────────
function drawSilhouetteB(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  scale: number,
  flipX: boolean,
  legAngle: number,
  swordAngle: number,
  bob: number,
  fighting: boolean,
  t: number
) {
  ctx.save();
  ctx.translate(cx, cy + bob);
  if (flipX) ctx.scale(-1, 1);
  ctx.fillStyle   = 'rgba(15,15,15,0.82)';
  ctx.strokeStyle = 'rgba(15,15,15,0.82)';

  const s = scale;

  // ── Back leg (straight / planted) ────────────────────────────────────────
  ctx.save();
  ctx.rotate(-legAngle * 0.5 - 0.15);
  ctx.beginPath();
  ctx.moveTo(-2 * s, -8 * s);
  ctx.lineTo(-4 * s, -38 * s);
  ctx.lineTo(-8 * s, -65 * s);
  ctx.lineTo(-14 * s, -70 * s);
  ctx.lineTo(-6  * s, -72 * s);
  ctx.lineTo(-4  * s, -67 * s);
  ctx.lineTo(-3  * s, -38 * s);
  ctx.lineTo(0,       -8 * s);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // ── Front leg (bent / lunging) ────────────────────────────────────────────
  ctx.save();
  ctx.rotate(legAngle + 0.2);
  ctx.beginPath();
  ctx.moveTo(2  * s, -8  * s);
  ctx.lineTo(8  * s, -32 * s);
  ctx.lineTo(14 * s, -55 * s);
  ctx.lineTo(22 * s, -60 * s);
  ctx.lineTo(14 * s, -62 * s);
  ctx.lineTo(10 * s, -58 * s);
  ctx.lineTo(5  * s, -32 * s);
  ctx.lineTo(0,       -8 * s);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // ── Coat body ─────────────────────────────────────────────────────────────
  ctx.beginPath();
  ctx.moveTo(-20 * s, -10 * s);
  ctx.bezierCurveTo(-24 * s, -25 * s, -22 * s, -42 * s, -18 * s, -50 * s);
  ctx.lineTo(-15 * s, -75 * s);
  ctx.lineTo(-12 * s, -82 * s);
  ctx.lineTo(-18 * s, -85 * s);
  ctx.lineTo(-14 * s, -90 * s);
  ctx.lineTo(12  * s, -90 * s);
  ctx.lineTo(18  * s, -85 * s);
  ctx.lineTo(12  * s, -82 * s);
  ctx.lineTo(15  * s, -75 * s);
  ctx.lineTo(18  * s, -50 * s);
  ctx.bezierCurveTo(22 * s, -42 * s, 24 * s, -25 * s, 20 * s, -10 * s);
  ctx.closePath();
  ctx.fill();

  // coat vent / back flap  
  ctx.beginPath();
  ctx.moveTo(-20 * s, -10 * s);
  ctx.bezierCurveTo(-28 * s, -8 * s, -32 * s, 2 * s, -26 * s, 8 * s);
  ctx.lineTo(-18 * s, 5 * s);
  ctx.lineTo(-18 * s, -10 * s);
  ctx.closePath();
  ctx.fill();

  // ── Neck ─────────────────────────────────────────────────────────────────
  ctx.beginPath();
  ctx.ellipse(0, -92 * s, 5 * s, 4 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Head (slightly forward tilt) ─────────────────────────────────────────
  ctx.beginPath();
  ctx.ellipse(2 * s, -102 * s, 10 * s, 12 * s, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // ── Wide-brim captain hat ─────────────────────────────────────────────────
  ctx.beginPath();
  ctx.ellipse(2 * s, -112 * s, 16 * s, 4.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // hat crown
  ctx.beginPath();
  ctx.moveTo(-11 * s, -112 * s);
  ctx.bezierCurveTo(-13 * s, -122 * s, -8 * s, -130 * s, 2  * s, -132 * s);
  ctx.bezierCurveTo(10  * s, -130 * s, 15 * s, -122 * s, 13 * s, -112 * s);
  ctx.closePath();
  ctx.fill();
  // brim upturn right
  ctx.beginPath();
  ctx.moveTo(13 * s, -112 * s);
  ctx.bezierCurveTo(20 * s, -115 * s, 22 * s, -124 * s, 15 * s, -127 * s);
  ctx.bezierCurveTo(12 * s, -128 * s, 10 * s, -124 * s, 11 * s, -120 * s);
  ctx.closePath();
  ctx.fill();

  // ── Back arm (non-sword, behind body) ────────────────────────────────────
  ctx.save();
  ctx.translate(-14 * s, -85 * s);
  ctx.rotate(0.5 + legAngle * 0.25);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-9 * s, 6 * s, -13 * s, 20 * s, -11 * s, 30 * s);
  ctx.lineTo(-7 * s, 30 * s);
  ctx.bezierCurveTo(-9 * s, 20 * s, -5 * s, 7 * s, 4 * s, 2 * s);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-9 * s, 28 * s, 4 * s, 2.5 * s, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── Sword arm (forward thrust) ────────────────────────────────────────────
  ctx.save();
  ctx.translate(12 * s, -85 * s);
  const sa = fighting
    ? -Math.PI / 3 + Math.sin(t / 105) * 0.55
    : swordAngle - 0.1;
  ctx.rotate(sa);
  // arm
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(9 * s, 4 * s, 14 * s, 16 * s, 12 * s, 28 * s);
  ctx.lineTo(8 * s, 28 * s);
  ctx.bezierCurveTo(10 * s, 16 * s, 5 * s, 5 * s, -3 * s, 2 * s);
  ctx.closePath();
  ctx.fill();
  // cuff
  ctx.beginPath();
  ctx.ellipse(10 * s, 26 * s, 4 * s, 2.5 * s, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // hand
  ctx.beginPath();
  ctx.ellipse(11 * s, 31 * s, 4.5 * s, 4 * s, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // grip
  ctx.beginPath();
  ctx.roundRect(9 * s, 31 * s, 4 * s, 12 * s, 1);
  ctx.fill();
  // guard
  ctx.beginPath();
  ctx.roundRect(5 * s, 42 * s, 12 * s, 3.5 * s, 1);
  ctx.fill();
  // blade
  ctx.beginPath();
  ctx.moveTo(9.5 * s, 45.5 * s);
  ctx.lineTo(11.5 * s, 45.5 * s);
  ctx.lineTo(11   * s, fighting ? 92 * s : 84 * s);
  ctx.closePath();
  ctx.fill();

  ctx.restore(); // sword arm
  ctx.restore(); // whole pirate
}

// ─── Spark ────────────────────────────────────────────────────────────────────
interface Spark { x: number; y: number; vx: number; vy: number; life: number; sz: number; }

// ─── Pirate AI state ──────────────────────────────────────────────────────────
type Mode = 'wander' | 'chase' | 'fight' | 'flee';
interface Pirate { pos: V2; target: V2; mode: Mode; facingRight: boolean; walkT: number; timer: number; }

const SPD  = { wander: 0.48, chase: 1.45, flee: 1.75 };
const DIST = { chase: 260, fight: 52 };
const DUR  = { fight: 2000, flee: 3000 };
const SCALE = 0.28; // 100 units × 0.28 = 28px tall — roughly 48px with hat

// ─── Component ────────────────────────────────────────────────────────────────
const PirateBrawl = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);

  const mkPirate = useCallback((W: number, H: number): Pirate => ({
    pos: rpos(W, H), target: rpos(W, H),
    mode: 'wander', facingRight: Math.random() > 0.5,
    walkT: rnd(0, Math.PI * 2), timer: 0,
  }), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    let a = mkPirate(canvas.width, canvas.height);
    let b = mkPirate(canvas.width, canvas.height);
    let sparks: Spark[] = [];
    let lastTime = performance.now();

    const burst = (cx: number, cy: number, n = 16) => {
      for (let i = 0; i < n; i++) {
        const ang = rnd(0, Math.PI * 2);
        const spd = rnd(1.0, 4.5);
        sparks.push({ x: cx, y: cy, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - rnd(0.5, 2), life: 1, sz: rnd(1.5, 3.5) });
      }
    };

    const step = (p: Pirate, dt: number) => {
      if (p.mode === 'fight') return;
      const spd = SPD[p.mode as keyof typeof SPD] ?? SPD.wander;
      const dir = nor(sub(p.target, p.pos));
      p.pos = add(p.pos, v(dir.x * spd, dir.y * spd));
      if (Math.abs(dir.x) > 0.05) p.facingRight = dir.x > 0;
      p.walkT += dt * 0.005;
      const W = canvas.width, H = canvas.height, pad = 80;
      if (p.pos.x < pad || p.pos.x > W - pad || p.pos.y < pad || p.pos.y > H - pad) {
        p.target = rpos(W, H);
        p.pos.x = Math.max(pad, Math.min(W - pad, p.pos.x));
        p.pos.y = Math.max(pad, Math.min(H - pad, p.pos.y));
      }
      if (p.mode === 'wander' && dst(p.pos, p.target) < 14) p.target = rpos(canvas.width, canvas.height);
    };

    const tick = (now: number) => {
      const dt = Math.min(now - lastTime, 50);
      lastTime = now;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const W = canvas.width, H = canvas.height;
      const d = dst(a.pos, b.pos);

      // ── AI ──────────────────────────────────────────────────────────────
      if (a.mode === 'fight') {
        a.timer -= dt;
        if (Math.random() < 0.14) burst((a.pos.x + b.pos.x) / 2, (a.pos.y + b.pos.y) / 2, 5);
        if (a.timer <= 0) {
          const aw = nor(sub(a.pos, b.pos));
          a.mode = 'flee'; a.target = add(a.pos, v(aw.x  * 300, aw.y  * 300)); a.timer = DUR.flee;
          b.mode = 'flee'; b.target = add(b.pos, v(-aw.x * 300, -aw.y * 300)); b.timer = DUR.flee;
        }
      } else if (a.mode === 'flee') {
        a.timer -= dt; b.timer -= dt;
        if (a.timer <= 0) { a.mode = 'wander'; a.target = rpos(W, H); }
        if (b.timer <= 0) { b.mode = 'wander'; b.target = rpos(W, H); }
      } else {
        if (d < DIST.fight) {
          a.mode = 'fight'; b.mode = 'fight';
          a.timer = DUR.fight; b.timer = DUR.fight;
          a.facingRight = b.pos.x > a.pos.x;
          b.facingRight = a.pos.x > b.pos.x;
          burst((a.pos.x + b.pos.x) / 2, (a.pos.y + b.pos.y) / 2, 24);
        } else if (d < DIST.chase) {
          a.mode = 'chase'; b.mode = 'chase';
          a.target = { ...b.pos }; b.target = { ...a.pos };
          a.facingRight = b.pos.x > a.pos.x;
          b.facingRight = a.pos.x > b.pos.x;
        } else {
          if (a.mode === 'chase') { a.mode = 'wander'; a.target = rpos(W, H); }
          if (b.mode === 'chase') { b.mode = 'wander'; b.target = rpos(W, H); }
        }
      }

      step(a, dt); step(b, dt);

      // ── Sparks ──────────────────────────────────────────────────────────
      sparks = sparks.filter(sp => sp.life > 0.03);
      for (const sp of sparks) {
        sp.x += sp.vx; sp.y += sp.vy; sp.vy += 0.08; sp.life -= 0.024;
        ctx.save();
        ctx.globalAlpha = sp.life * 0.8;
        ctx.fillStyle = sp.sz > 2.5 ? 'rgba(255,255,255,0.9)' : 'rgba(255,230,80,0.9)';
        const sz = sp.sz * sp.life;
        ctx.fillRect(sp.x - sz / 2, sp.y - sz / 2, sz, sz);
        ctx.restore();
      }

      // ── Clash flash ─────────────────────────────────────────────────────
      if (a.mode === 'fight') {
        const mx = (a.pos.x + b.pos.x) / 2;
        const my = Math.min(a.pos.y, b.pos.y) - 32;
        const bop = Math.sin(now / 140) * 4;
        const frame = Math.floor(now / 200) % 2;
        ctx.save();
        ctx.globalAlpha = 0.75;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${14 + frame * 2}px monospace`;
        ctx.fillStyle = '#fff';
        ctx.fillText(frame ? '✦' : '✸', mx, my + bop);
        ctx.restore();
      }

      // ── Shadows ──────────────────────────────────────────────────────────
      for (const p of [a, b]) {
        ctx.save();
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(p.pos.x, p.pos.y + 2, 16, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // ── Walk animation ───────────────────────────────────────────────────
      const anim = (p: Pirate) => {
        const sw = Math.sin(p.walkT);
        return {
          legAngle:   sw * (p.mode === 'fight' ? 0.18 : 0.32),
          swordAngle: p.mode === 'fight' ? 0 : (-sw * 0.38 - 0.2),
          bob: p.mode === 'fight'
            ? Math.sin(now / 80) * 1.2
            : Math.abs(sw) * -1.4,
        };
      };

      const aa = anim(a), ab = anim(b);
      const shake = (p: Pirate) => p.mode === 'fight' ? (Math.random() - 0.5) * 2 : 0;

      // Drop shadow while fighting
      if (a.mode === 'fight') {
        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse((a.pos.x + b.pos.x) / 2, (a.pos.y + b.pos.y) / 2 - 30, 30, 30, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      drawSilhouetteA(ctx, a.pos.x + shake(a), a.pos.y, SCALE, !a.facingRight, aa.legAngle, aa.swordAngle, aa.bob, a.mode === 'fight', now);
      drawSilhouetteB(ctx, b.pos.x + shake(b), b.pos.y, SCALE, !b.facingRight, ab.legAngle, ab.swordAngle, ab.bob, b.mode === 'fight', now);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize); };
  }, [mkPirate]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: 9990, pointerEvents: 'none' }}
    />
  );
};

export default PirateBrawl;
