import { useEffect, useRef, useCallback } from 'react';

/*
  PirateBrawl.tsx
  ───────────────
  Two tiny SVG line-art pirates (~40px tall) that drift around
  the screen, spot each other, charge, clash with sparks, then
  wander off. Rendered on a fixed full-screen <canvas>.

  Drop once in App.tsx:
    import PirateBrawl from '@/components/PirateBrawl';
    // inside return: <PirateBrawl />
*/

// ── Geometry helpers ─────────────────────────────────────────────────────────
interface V2 { x: number; y: number }
const v    = (x: number, y: number): V2 => ({ x, y });
const add  = (a: V2, b: V2): V2 => v(a.x + b.x, a.y + b.y);
const sub  = (a: V2, b: V2): V2 => v(a.x - b.x, a.y - b.y);
const mag  = (a: V2) => Math.hypot(a.x, a.y);
const nor  = (a: V2): V2 => { const l = mag(a); return l ? v(a.x / l, a.y / l) : v(0, 0); };
const dst  = (a: V2, b: V2) => mag(sub(a, b));
const rnd  = (lo: number, hi: number) => Math.random() * (hi - lo) + lo;
const rpos = (W: number, H: number) => v(rnd(70, W - 70), rnd(80, H - 80));

// ── Pirate renderer ──────────────────────────────────────────────────────────
// All coordinates are in "unit" space (±20 units).
// Origin = hip centre. Scale = px per unit.
interface DrawOpts {
  ctx: CanvasRenderingContext2D;
  x: number; y: number;
  scale: number;
  facingRight: boolean;
  legSwing: number;   // radians, front leg
  armSwing: number;   // radians, sword arm
  bob: number;        // vertical offset in units
  fighting: boolean;
  isA: boolean;       // A = tricorn hat / B = bandana
  t: number;          // timestamp for fighting animation
}

function drawPirate(o: DrawOpts) {
  const { ctx, x, y, scale: s, facingRight, legSwing, armSwing, bob, fighting, isA, t } = o;
  const flip = facingRight ? 1 : -1;
  const lw = 1.15;

  ctx.save();
  ctx.translate(x, y + bob * s);
  ctx.scale(flip, 1);
  ctx.strokeStyle = 'rgba(255,255,255,0.88)';
  ctx.fillStyle   = 'rgba(255,255,255,0.88)';
  ctx.lineWidth   = lw;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';

  // ── Back leg ──
  ctx.save();
  ctx.rotate(-legSwing * 0.65);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-1.2 * s, 4.5 * s);
  ctx.lineTo(-2 * s, 9 * s);
  ctx.stroke();
  // back boot
  ctx.beginPath();
  ctx.moveTo(-2 * s, 9 * s);
  ctx.lineTo(-0.5 * s, 9.8 * s);
  ctx.stroke();
  ctx.restore();

  // ── Front leg ──
  ctx.save();
  ctx.rotate(legSwing);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(1.2 * s, 4.5 * s);
  ctx.lineTo(2 * s, 9 * s);
  ctx.stroke();
  // front boot
  ctx.beginPath();
  ctx.moveTo(2 * s, 9 * s);
  ctx.lineTo(3.8 * s, 9.8 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1.5 * s, 9 * s);
  ctx.lineTo(3.8 * s, 9.8 * s);
  ctx.stroke();
  ctx.restore();

  // ── Torso ──
  ctx.beginPath();
  ctx.moveTo(-3 * s, -10 * s);
  ctx.lineTo(-3.2 * s, 0);
  ctx.lineTo(3.2 * s,  0);
  ctx.lineTo(3 * s,  -10 * s);
  ctx.closePath();
  ctx.stroke();

  // coat tails
  ctx.beginPath();
  ctx.moveTo(-3.2 * s, 0);
  ctx.lineTo(-4 * s, 5 * s);
  ctx.lineTo(-1.5 * s, 4 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(3.2 * s, 0);
  ctx.lineTo(4 * s, 5 * s);
  ctx.lineTo(1.5 * s, 4 * s);
  ctx.stroke();

  // belt
  ctx.beginPath();
  ctx.moveTo(-3.2 * s, -1.5 * s);
  ctx.lineTo(3.2 * s,  -1.5 * s);
  ctx.stroke();
  // buckle
  ctx.strokeRect(-.7 * s, -2.1 * s, 1.4 * s, 1.2 * s);

  // button row
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(0, (-9 + i * 2.5) * s, 0.3 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Back arm (non-sword) ──
  ctx.save();
  ctx.translate(-3 * s, -9 * s);
  ctx.rotate(armSwing * 0.35 + 0.25);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-1.8 * s, 3 * s);
  ctx.lineTo(-2 * s, 6 * s);
  ctx.stroke();
  if (!isA) {
    // hook for pirate B
    ctx.beginPath();
    ctx.arc(-2.2 * s, 6.5 * s, 1.1 * s, Math.PI * 0.3, Math.PI * 1.3);
    ctx.stroke();
  } else {
    // fist for pirate A
    ctx.beginPath();
    ctx.arc(-2 * s, 6.3 * s, 0.8 * s, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // ── Neck ──
  ctx.beginPath();
  ctx.moveTo(0, -10 * s);
  ctx.lineTo(0, -12 * s);
  ctx.stroke();

  // ── Head ──
  ctx.beginPath();
  ctx.ellipse(0, -15.5 * s, 3.4 * s, 4.2 * s, 0, 0, Math.PI * 2);
  ctx.stroke();

  // eye
  ctx.beginPath();
  ctx.arc(1.6 * s, -16 * s, 0.65 * s, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(1.9 * s, -16 * s, 0.22 * s, 0, Math.PI * 2);
  ctx.fill();

  // grin
  ctx.beginPath();
  ctx.arc(0.4 * s, -14 * s, 1.7 * s, 0.1, Math.PI - 0.1);
  ctx.stroke();

  // nose
  ctx.beginPath();
  ctx.moveTo(0.8 * s, -15 * s);
  ctx.quadraticCurveTo(1.5 * s, -14 * s, 1.1 * s, -13.8 * s);
  ctx.stroke();

  // ── Hat / Headgear ──
  if (isA) {
    // Tricorn hat
    ctx.beginPath();
    ctx.moveTo(-5 * s, -19 * s);
    ctx.lineTo(5 * s,  -19 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-4.2 * s, -19 * s);
    ctx.bezierCurveTo(-5 * s, -22 * s, -3 * s, -24.5 * s, 0, -24.5 * s);
    ctx.bezierCurveTo(3 * s, -24.5 * s, 5 * s, -22 * s, 4.2 * s, -19 * s);
    ctx.stroke();
    // brim folds
    ctx.beginPath();
    ctx.moveTo(-5 * s, -19 * s);
    ctx.bezierCurveTo(-5.8 * s, -20.5 * s, -4.5 * s, -22 * s, -4.2 * s, -19 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(5 * s, -19 * s);
    ctx.bezierCurveTo(5.8 * s, -20.5 * s, 4.5 * s, -22 * s, 4.2 * s, -19 * s);
    ctx.stroke();
    // skull on hat
    ctx.beginPath();
    ctx.arc(0, -22 * s, 1.2 * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = lw * 0.75;
    ctx.beginPath();
    ctx.moveTo(-1.6 * s, -20.5 * s); ctx.lineTo(1.6 * s, -23.5 * s);
    ctx.moveTo(1.6 * s,  -20.5 * s); ctx.lineTo(-1.6 * s, -23.5 * s);
    ctx.stroke();
    ctx.lineWidth = lw;
    // eyepatch on A
    ctx.beginPath();
    ctx.arc(-1.6 * s, -16 * s, 0.8 * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-0.8 * s, -15.6 * s);
    ctx.lineTo(0.9 * s,  -15.4 * s);
    ctx.stroke();
  } else {
    // Bandana for B
    ctx.beginPath();
    ctx.moveTo(-3.8 * s, -17.5 * s);
    ctx.bezierCurveTo(-4 * s, -21 * s, 4 * s, -21 * s, 3.8 * s, -17.5 * s);
    ctx.stroke();
    // bandana knot (trailing ends)
    ctx.beginPath();
    ctx.moveTo(3.8 * s, -17.5 * s);
    ctx.lineTo(5.5 * s, -15.5 * s);
    ctx.lineTo(5 * s,   -14 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(3.8 * s, -17.5 * s);
    ctx.lineTo(6 * s,   -14.5 * s);
    ctx.stroke();
    // scar
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath();
    ctx.moveTo(-0.3 * s, -18 * s);
    ctx.lineTo(0.6 * s,  -14 * s);
    ctx.stroke();
    ctx.lineWidth = lw;
    // earring
    ctx.beginPath();
    ctx.arc(-3.6 * s, -14.8 * s, 0.7 * s, 0, Math.PI * 2);
    ctx.stroke();
    // second eye
    ctx.beginPath();
    ctx.arc(-1.5 * s, -16 * s, 0.55 * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-1.3 * s, -16 * s, 0.18 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Sword arm (front) ──
  ctx.save();
  ctx.translate(3 * s, -9 * s);
  const swordAngle = fighting
    ? -Math.PI / 2.5 + Math.sin(t / 120) * 0.45
    : armSwing - 0.15;
  ctx.rotate(swordAngle);
  // upper arm
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(2.2 * s, 3.5 * s);
  ctx.stroke();
  // forearm
  ctx.beginPath();
  ctx.moveTo(2.2 * s, 3.5 * s);
  ctx.lineTo(2.8 * s, 7 * s);
  ctx.stroke();
  // grip
  ctx.beginPath();
  ctx.moveTo(2.2 * s, 7 * s);
  ctx.lineTo(3.4 * s, 7 * s);
  ctx.stroke();
  // crossguard
  ctx.beginPath();
  ctx.moveTo(1.8 * s, 7.5 * s);
  ctx.lineTo(4 * s,   7.5 * s);
  ctx.stroke();
  // pommel
  ctx.beginPath();
  ctx.arc(2 * s, 7.5 * s, 0.6 * s, 0, Math.PI * 2);
  ctx.stroke();
  // blade
  const bLen = fighting ? 13 : 10;
  ctx.lineWidth = lw * 0.85;
  ctx.beginPath();
  ctx.moveTo(2.8 * s, 7.5 * s);
  ctx.lineTo(2.6 * s, (7.5 + bLen) * s);
  ctx.stroke();
  // blade fuller (groove detail)
  ctx.lineWidth = lw * 0.4;
  ctx.beginPath();
  ctx.moveTo(2.55 * s, 9 * s);
  ctx.lineTo(2.35 * s, (7.5 + bLen * 0.7) * s);
  ctx.stroke();

  ctx.restore(); // sword arm
  ctx.restore(); // whole pirate
}

// ── Spark ────────────────────────────────────────────────────────────────────
interface Spark { x: number; y: number; vx: number; vy: number; life: number; sz: number; }

// ── Pirate state ──────────────────────────────────────────────────────────────
type Mode = 'wander' | 'chase' | 'fight' | 'flee';
interface Pirate {
  pos: V2; target: V2;
  mode: Mode;
  facingRight: boolean;
  walkT: number;
  timer: number;   // fight or flee timer
}

const SPD  = { wander: 0.52, chase: 1.55, flee: 1.85 };
const DIST = { chase: 230, fight: 46 };
const DUR  = { fight: 1900, flee: 2800 };
const SCALE = 2.1;

// ── Component ─────────────────────────────────────────────────────────────────
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

    let a: Pirate = mkPirate(canvas.width, canvas.height);
    let b: Pirate = mkPirate(canvas.width, canvas.height);
    let sparks: Spark[] = [];
    let lastTime = performance.now();

    const burst = (cx: number, cy: number, n = 14) => {
      for (let i = 0; i < n; i++) {
        const ang = rnd(0, Math.PI * 2);
        const spd = rnd(1.2, 4.2);
        sparks.push({ x: cx, y: cy, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - rnd(0, 1.2), life: 1, sz: rnd(1.4, 3.2) });
      }
    };

    const step = (p: Pirate, dt: number) => {
      if (p.mode === 'fight') return;
      const spd = SPD[p.mode as 'wander' | 'chase' | 'flee'] ?? SPD.wander;
      const dir = nor(sub(p.target, p.pos));
      p.pos = add(p.pos, v(dir.x * spd, dir.y * spd));
      if (Math.abs(dir.x) > 0.05) p.facingRight = dir.x > 0;
      p.walkT += dt * 0.0058;
      const W = canvas.width, H = canvas.height, pad = 55;
      if (p.pos.x < pad || p.pos.x > W - pad || p.pos.y < pad || p.pos.y > H - pad) {
        p.target = rpos(W, H);
        p.pos.x = Math.max(pad, Math.min(W - pad, p.pos.x));
        p.pos.y = Math.max(pad, Math.min(H - pad, p.pos.y));
      }
      if (p.mode === 'wander' && dst(p.pos, p.target) < 12) p.target = rpos(canvas.width, canvas.height);
    };

    const tick = (now: number) => {
      const dt = Math.min(now - lastTime, 50);
      lastTime = now;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // ── AI ─────────────────────────────────────────────────────────────
      const d = dst(a.pos, b.pos);
      const W = canvas.width, H = canvas.height;

      if (a.mode === 'fight') {
        a.timer -= dt;
        if (Math.random() < 0.15) burst((a.pos.x + b.pos.x) / 2, (a.pos.y + b.pos.y) / 2, 4);
        if (a.timer <= 0) {
          const aw = nor(sub(a.pos, b.pos));
          a.mode = 'flee'; a.target = add(a.pos, v(aw.x * 280, aw.y * 280)); a.timer = DUR.flee;
          b.mode = 'flee'; b.target = add(b.pos, v(-aw.x * 280, -aw.y * 280)); b.timer = DUR.flee;
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
          burst((a.pos.x + b.pos.x) / 2, (a.pos.y + b.pos.y) / 2, 22);
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

      // ── Sparks ─────────────────────────────────────────────────────────
      sparks = sparks.filter(sp => sp.life > 0.03);
      for (const sp of sparks) {
        sp.x += sp.vx; sp.y += sp.vy; sp.vy += 0.09; sp.life -= 0.026;
        ctx.save();
        ctx.globalAlpha = sp.life * 0.85;
        ctx.fillStyle = sp.sz > 2.4 ? 'rgba(255,255,255,0.95)' : 'rgba(255,235,120,0.9)';
        const sz = sp.sz * sp.life;
        ctx.fillRect(sp.x - sz / 2, sp.y - sz / 2, sz, sz);
        ctx.restore();
      }

      // ── Clash symbol ───────────────────────────────────────────────────
      if (a.mode === 'fight') {
        const mx = (a.pos.x + b.pos.x) / 2;
        const my = Math.min(a.pos.y, b.pos.y) - 28;
        const bop = Math.sin(now / 150) * 3.5;
        const ring = Math.floor(now / 240) % 2;
        ctx.save();
        ctx.globalAlpha = 0.82;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${13 + ring}px monospace`;
        ctx.fillStyle = '#fff';
        ctx.fillText(ring ? '✦' : '✸', mx, my + bop);
        ctx.restore();
      }

      // ── Shadows ────────────────────────────────────────────────────────
      for (const p of [a, b]) {
        ctx.save();
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(p.pos.x, p.pos.y + 9, 13, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // ── Walk values → draw ──────────────────────────────────────────────
      const anim = (p: Pirate) => {
        const swing = Math.sin(p.walkT);
        return {
          legSwing: swing * 0.36,
          armSwing: -swing * 0.42,
          bob: p.mode === 'fight'
            ? Math.sin(now / 85) * 0.55
            : Math.abs(swing) * -0.45,
        };
      };

      const aa = anim(a), ab = anim(b);
      const shake = (p: Pirate) => p.mode === 'fight' ? (Math.random() - 0.5) * 1.6 : 0;

      drawPirate({ ctx, x: a.pos.x + shake(a), y: a.pos.y, scale: SCALE, facingRight: a.facingRight, legSwing: aa.legSwing, armSwing: aa.armSwing, bob: aa.bob, fighting: a.mode === 'fight', isA: true,  t: now });
      drawPirate({ ctx, x: b.pos.x + shake(b), y: b.pos.y, scale: SCALE, facingRight: b.facingRight, legSwing: ab.legSwing, armSwing: ab.armSwing, bob: ab.bob, fighting: b.mode === 'fight', isA: false, t: now });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize); };
  }, [mkPirate]);

  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 9990, pointerEvents: 'none' }} />;
};

export default PirateBrawl;
