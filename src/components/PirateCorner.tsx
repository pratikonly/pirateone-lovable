import { useEffect, useRef } from 'react';

/*
  PirateCorner.tsx
  ─────────────────
  A single highly-detailed pirate silhouette stands permanently
  in the bottom-right corner. Every few seconds he winds up and
  hurls his sword across the screen. The sword flies, sticks into
  a random spot (with a thud shake), hangs there on a glowing
  chain/rope, then gets slowly yanked back. The pirate reacts to
  each phase with subtle body animations.

  Colors match the PirateOne site palette:
    • Silhouette body  : deep dark  rgba(12, 8, 20, 0.92)
    • Accent / glow    : purple     #a855f7
    • Sword highlight  : white      rgba(255,255,255,0.9)
    • Rope             : purple → white gradient

  Add to App.tsx (already done if you used the previous step):
    import PirateCorner from "./components/PirateCorner";
    <PirateCorner />
*/

// ─── Math helpers ────────────────────────────────────────────────────────────
const PI  = Math.PI;
const TAU = PI * 2;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const easeOut  = (t: number) => 1 - Math.pow(1 - t, 3);
const easeIn   = (t: number) => t * t * t;
const easeInOut= (t: number) => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  body:       'rgba(12,8,20,0.93)',
  bodyEdge:   'rgba(168,85,247,0.18)',
  purple:     '#a855f7',
  purpleGlow: 'rgba(168,85,247,0.55)',
  purpleDim:  'rgba(168,85,247,0.25)',
  white:      'rgba(255,255,255,0.92)',
  whiteDim:   'rgba(255,255,255,0.35)',
  blade:      'rgba(255,255,255,0.88)',
  bladeGlow:  'rgba(168,85,247,0.7)',
  spark:      ['#fff','#e9d5ff','#a855f7','#f0abfc','rgba(255,255,255,0.6)'],
};

// ─── Sword state machine ──────────────────────────────────────────────────────
type Phase =
  | 'idle'       // standing, idle breathing
  | 'windup'     // arm pulls back
  | 'throw'      // sword flies through air
  | 'stuck'      // sword embedded, rope taut, pirate pulls
  | 'pulling'    // sword slides back along rope
  | 'catch'      // sword returns to hand
  | 'cooldown';  // brief pause before next cycle

interface SwordState {
  // world position of sword tip
  x: number; y: number;
  // velocity during throw
  vx: number; vy: number;
  // rotation of sword
  angle: number;
  spinRate: number;
  // stuck position
  stuckX: number; stuckY: number;
  stuckAngle: number;
  // rope sag points (catenary approximation via bezier)
  sagAmount: number;
  // phase timing
  phase: Phase;
  phaseT: number;   // 0→1 normalised progress within current phase
  phaseMs: number;  // duration of current phase in ms
  elapsed: number;  // ms since phase start
}

interface Spark {
  x: number; y: number;
  vx: number; vy: number;
  life: number; size: number;
  color: string;
}

// ─── Pirate draw ─────────────────────────────────────────────────────────────
// Origin is feet-centre. Y grows upward in logical coords, but canvas is
// flipped so we pass negative Y for "up". Scale = px per unit.
// The pirate is ~130 units tall (feet to hat tip).
interface PirateOpts {
  ctx:       CanvasRenderingContext2D;
  ox:        number;   // foot-centre X on canvas
  oy:        number;   // foot-centre Y on canvas
  scale:     number;
  // animation params
  breathT:   number;   // breathing cycle 0..TAU
  windupT:   number;   // 0 = relaxed, 1 = fully wound up
  throwT:    number;   // 0 = at rest post-throw, arm follows through
  pullT:     number;   // 0→1 pulling-rope lean
  // hand position (world canvas coords) for rope anchor
  handX:     number;
  handY:     number;
}

function drawPirate(o: PirateOpts) {
  const { ctx, ox, oy, scale: sc, breathT, windupT, throwT, pullT } = o;

  // Subtle body lean: windup leans back, throw follows through, pull leans forward
  const leanAngle = windupT * -0.12 + throwT * 0.08 + pullT * 0.1;
  const breathY   = Math.sin(breathT) * 0.6; // subtle vertical bob

  ctx.save();
  ctx.translate(ox, oy + breathY * sc);
  ctx.rotate(leanAngle);
  ctx.fillStyle   = C.body;
  ctx.strokeStyle = C.bodyEdge;
  ctx.lineWidth   = 0.6;
  ctx.lineJoin    = 'round';
  ctx.lineCap     = 'round';

  const s = sc;
  const fill = () => { ctx.fill(); ctx.stroke(); };

  // ── Boots ──────────────────────────────────────────────────────────────
  // Left boot
  ctx.beginPath();
  ctx.moveTo(-8*s, 0);
  ctx.lineTo(-9*s, -18*s);
  ctx.lineTo(-7*s, -20*s);
  ctx.lineTo(-4*s, -18*s);
  ctx.lineTo(-3*s, 0);
  // boot toe
  ctx.lineTo(-14*s, 1*s);
  ctx.lineTo(-14*s, -2*s);
  ctx.lineTo(-3*s, -2*s);
  ctx.closePath(); fill();

  // Right boot
  ctx.beginPath();
  ctx.moveTo(3*s, 0);
  ctx.lineTo(4*s, -18*s);
  ctx.lineTo(7*s, -20*s);
  ctx.lineTo(9*s, -18*s);
  ctx.lineTo(8*s, 0);
  ctx.lineTo(14*s, 1*s);
  ctx.lineTo(14*s, -2*s);
  ctx.lineTo(3*s, -2*s);
  ctx.closePath(); fill();

  // boot cuffs
  for (const bx of [-6.5, 5.5]) {
    ctx.beginPath();
    ctx.ellipse(bx*s, -18*s, 3*s, 1.8*s, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo((bx-3)*s, -18*s);
    ctx.lineTo((bx+3)*s, -18*s);
    ctx.strokeStyle = C.purpleDim;
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.strokeStyle = C.bodyEdge;
    ctx.lineWidth = 0.6;
  }

  // ── Breeches ──────────────────────────────────────────────────────────
  ctx.beginPath();
  ctx.moveTo(-10*s, -18*s);
  ctx.bezierCurveTo(-12*s,-28*s, -10*s,-36*s, -6*s,-38*s);
  ctx.lineTo(6*s,-38*s);
  ctx.bezierCurveTo(10*s,-36*s, 12*s,-28*s, 10*s,-18*s);
  ctx.closePath(); fill();
  // breeches centre split
  ctx.beginPath();
  ctx.moveTo(0,-38*s); ctx.lineTo(0,-20*s);
  ctx.strokeStyle='rgba(168,85,247,0.12)'; ctx.lineWidth=1.5; ctx.stroke();
  ctx.strokeStyle=C.bodyEdge; ctx.lineWidth=0.6;

  // ── Long coat body ────────────────────────────────────────────────────
  ctx.beginPath();
  // left skirt flare
  ctx.moveTo(-18*s, -20*s);
  ctx.bezierCurveTo(-22*s,-30*s, -20*s,-44*s, -16*s,-52*s);
  ctx.lineTo(-14*s,-80*s);
  ctx.lineTo(-12*s,-88*s);
  // left shoulder
  ctx.lineTo(-18*s,-92*s);
  ctx.lineTo(-15*s,-96*s);
  // collar left
  ctx.lineTo(-8*s,-96*s);
  ctx.lineTo(-6*s,-92*s);
  ctx.lineTo(0*s,-90*s);
  ctx.lineTo(6*s,-92*s);
  ctx.lineTo(8*s,-96*s);
  // collar right
  ctx.lineTo(15*s,-96*s);
  ctx.lineTo(18*s,-92*s);
  // right shoulder
  ctx.lineTo(12*s,-88*s);
  ctx.lineTo(14*s,-80*s);
  ctx.lineTo(16*s,-52*s);
  ctx.bezierCurveTo(20*s,-44*s, 22*s,-30*s, 18*s,-20*s);
  ctx.closePath(); fill();

  // coat front split / lapels
  ctx.beginPath();
  ctx.moveTo(-4*s,-96*s);
  ctx.lineTo(-6*s,-68*s);
  ctx.lineTo(-10*s,-38*s);
  ctx.lineTo(-8*s,-38*s);
  ctx.lineTo(-4*s,-62*s);
  ctx.lineTo(-2*s,-96*s);
  ctx.closePath(); fill();
  ctx.beginPath();
  ctx.moveTo(4*s,-96*s);
  ctx.lineTo(6*s,-68*s);
  ctx.lineTo(10*s,-38*s);
  ctx.lineTo(8*s,-38*s);
  ctx.lineTo(4*s,-62*s);
  ctx.lineTo(2*s,-96*s);
  ctx.closePath(); fill();

  // coat buttons (purple glow dots)
  ctx.strokeStyle = C.purple;
  ctx.lineWidth   = 0.5;
  for (let i = 0; i < 5; i++) {
    const by = (-58 - i * 7) * s;
    ctx.beginPath();
    ctx.arc(0, by, 1.2*s, 0, TAU);
    ctx.fillStyle = C.purple;
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle   = C.body;
  ctx.strokeStyle = C.bodyEdge;
  ctx.lineWidth   = 0.6;

  // belt
  ctx.beginPath();
  ctx.moveTo(-16*s,-38*s); ctx.lineTo(16*s,-38*s);
  ctx.strokeStyle='rgba(168,85,247,0.4)'; ctx.lineWidth=2.5; ctx.stroke();
  // belt buckle
  ctx.fillStyle=C.purple;
  ctx.strokeStyle=C.white;
  ctx.lineWidth=0.7;
  ctx.beginPath();
  ctx.roundRect(-3*s,-40.5*s, 6*s,4*s, 0.8*s);
  ctx.fill(); ctx.stroke();
  // buckle pin
  ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.lineWidth=0.6;
  ctx.beginPath(); ctx.moveTo(0,-40.5*s); ctx.lineTo(0,-36.5*s); ctx.stroke();
  ctx.fillStyle=C.body; ctx.strokeStyle=C.bodyEdge; ctx.lineWidth=0.6;

  // coat back tail left
  ctx.beginPath();
  ctx.moveTo(-18*s,-20*s);
  ctx.bezierCurveTo(-26*s,-16*s, -28*s,-8*s, -22*s, 2*s);
  ctx.lineTo(-16*s, 0*s);
  ctx.lineTo(-18*s,-20*s);
  ctx.closePath(); fill();

  // coat back tail right
  ctx.beginPath();
  ctx.moveTo(18*s,-20*s);
  ctx.bezierCurveTo(26*s,-16*s, 28*s,-8*s, 22*s, 2*s);
  ctx.lineTo(16*s, 0*s);
  ctx.lineTo(18*s,-20*s);
  ctx.closePath(); fill();

  // ── Left arm (non-sword, at side/slightly bent) ───────────────────────
  // Lean forward when pulling rope
  const leftArmRotate = pullT * 0.35;
  ctx.save();
  ctx.translate(-16*s, -88*s);
  ctx.rotate(0.15 + leftArmRotate);
  // upper arm
  ctx.beginPath();
  ctx.moveTo(0,0);
  ctx.bezierCurveTo(-7*s,5*s, -10*s,16*s, -9*s,26*s);
  ctx.lineTo(-5*s,26*s);
  ctx.bezierCurveTo(-6*s,16*s, -3*s,5*s, 4*s,2*s);
  ctx.closePath(); fill();
  // cuff detail
  ctx.beginPath();
  ctx.ellipse(-7*s,25*s, 4*s,2.5*s, -0.3,0,TAU);
  ctx.fillStyle=C.purple; ctx.fill();
  ctx.fillStyle=C.body;
  // fist
  ctx.beginPath();
  ctx.ellipse(-8*s,30*s, 4.5*s,3.8*s, -0.2,0,TAU);
  ctx.fill(); ctx.stroke();
  // knuckle lines
  ctx.strokeStyle='rgba(168,85,247,0.3)'; ctx.lineWidth=0.5;
  for (let k=0;k<3;k++) ctx.strokeRect((-11+k*2)*s,29*s,1.5*s,2*s);
  ctx.strokeStyle=C.bodyEdge; ctx.lineWidth=0.6;
  ctx.restore();

  // ── Right arm (sword arm) ─────────────────────────────────────────────
  // windup: arm sweeps back; throw: snaps forward; pull: holds rope upward
  const windupRot  = windupT  * (-PI / 2.2);
  const throwRot   = throwT   * (PI / 2.8);
  const pullRot    = pullT    * (-PI / 3.5);
  const swordArmR  = windupRot + throwRot + pullRot - 0.2;

  ctx.save();
  ctx.translate(16*s, -88*s);
  ctx.rotate(swordArmR);
  // upper arm
  ctx.beginPath();
  ctx.moveTo(0,0);
  ctx.bezierCurveTo(8*s,4*s, 12*s,15*s, 10*s,26*s);
  ctx.lineTo(6*s,26*s);
  ctx.bezierCurveTo(8*s,15*s, 4*s,4*s, -3*s,2*s);
  ctx.closePath(); fill();
  // cuff
  ctx.beginPath();
  ctx.ellipse(8*s,25*s, 4*s,2.5*s, 0.3,0,TAU);
  ctx.fillStyle=C.purple; ctx.fill();
  ctx.fillStyle=C.body;
  // hand / fist
  ctx.beginPath();
  ctx.ellipse(9*s,30*s, 4.5*s,4*s, 0.15,0,TAU);
  ctx.fill(); ctx.stroke();

  // ── Sword in hand (only when NOT thrown) ─────────────────────────────
  // sword is drawn in arm-local coords when phase is idle/windup
  // During throw/stuck/pull the sword is drawn separately in world coords
  if (windupT > 0 || throwT < 0.3) {
    // grip
    ctx.beginPath();
    ctx.roundRect(7*s,30*s, 4.5*s,13*s, 1*s);
    ctx.fillStyle=C.body; ctx.fill();
    // grip wrap (purple thread)
    ctx.strokeStyle=C.purple; ctx.lineWidth=1;
    for (let w=0;w<4;w++) {
      ctx.beginPath();
      ctx.moveTo(7*s,(33+w*2.5)*s); ctx.lineTo(11.5*s,(33+w*2.5)*s);
      ctx.stroke();
    }
    // crossguard
    ctx.fillStyle=C.body;
    ctx.strokeStyle=C.white; ctx.lineWidth=0.8;
    ctx.beginPath();
    ctx.roundRect(3.5*s,42*s, 11*s,4*s, 1*s);
    ctx.fill(); ctx.stroke();
    // pommel
    ctx.beginPath();
    ctx.arc(9*s,31*s, 2.5*s,0,TAU);
    ctx.fillStyle=C.purple; ctx.fill();
    ctx.strokeStyle=C.white; ctx.lineWidth=0.5; ctx.stroke();
    // blade
    ctx.beginPath();
    ctx.moveTo(8*s,46*s);
    ctx.lineTo(10*s,46*s);
    ctx.lineTo(9.5*s,90*s);
    ctx.closePath();
    ctx.fillStyle=C.blade; ctx.fill();
    // blade fuller
    ctx.strokeStyle='rgba(168,85,247,0.5)'; ctx.lineWidth=0.5;
    ctx.beginPath();
    ctx.moveTo(9*s,48*s); ctx.lineTo(9*s,82*s); ctx.stroke();
    // blade edge glint
    ctx.strokeStyle='rgba(255,255,255,0.4)'; ctx.lineWidth=0.4;
    ctx.beginPath();
    ctx.moveTo(8.5*s,48*s); ctx.lineTo(8*s,78*s); ctx.stroke();
  }

  ctx.restore(); // sword arm

  // ── Neck ─────────────────────────────────────────────────────────────
  ctx.fillStyle=C.body; ctx.strokeStyle=C.bodyEdge; ctx.lineWidth=0.6;
  ctx.beginPath();
  ctx.moveTo(-5*s,-96*s); ctx.lineTo(5*s,-96*s);
  ctx.lineTo(4*s,-104*s); ctx.lineTo(-4*s,-104*s);
  ctx.closePath(); fill();
  // cravat / neckerchief
  ctx.beginPath();
  ctx.moveTo(-5*s,-98*s); ctx.lineTo(0,-102*s); ctx.lineTo(5*s,-98*s);
  ctx.lineTo(3*s,-96*s); ctx.lineTo(0,-99*s); ctx.lineTo(-3*s,-96*s);
  ctx.closePath();
  ctx.fillStyle=C.white; ctx.fill();

  // ── Head ─────────────────────────────────────────────────────────────
  ctx.fillStyle=C.body; ctx.strokeStyle=C.bodyEdge; ctx.lineWidth=0.6;
  ctx.beginPath();
  ctx.ellipse(1*s,-112*s, 11*s,13*s, 0.04,0,TAU);
  ctx.fill(); ctx.stroke();

  // jaw / chin detail
  ctx.beginPath();
  ctx.moveTo(-8*s,-104*s);
  ctx.bezierCurveTo(-10*s,-102*s,-9*s,-100*s,-6*s,-100*s);
  ctx.bezierCurveTo(-2*s,-99*s, 2*s,-99*s, 6*s,-100*s);
  ctx.bezierCurveTo(9*s,-100*s,10*s,-102*s, 8*s,-104*s);
  ctx.strokeStyle='rgba(168,85,247,0.15)'; ctx.lineWidth=0.7; ctx.stroke();

  // eye (white highlight)
  ctx.beginPath();
  ctx.arc(4*s,-113*s, 1.8*s,0,TAU);
  ctx.fillStyle=C.white; ctx.fill();
  ctx.beginPath();
  ctx.arc(4.5*s,-113*s, 0.9*s,0,TAU);
  ctx.fillStyle='rgba(12,8,20,1)'; ctx.fill();
  // eye gleam
  ctx.beginPath();
  ctx.arc(4*s,-113.5*s, 0.35*s,0,TAU);
  ctx.fillStyle=C.white; ctx.fill();

  // eyepatch (left eye)
  ctx.beginPath();
  ctx.arc(-3*s,-113*s, 2.5*s,0,TAU);
  ctx.fillStyle='rgba(12,8,20,1)'; ctx.fill();
  ctx.strokeStyle=C.purple; ctx.lineWidth=0.7; ctx.stroke();
  // patch strap
  ctx.strokeStyle=C.purple; ctx.lineWidth=0.6;
  ctx.beginPath();
  ctx.moveTo(-5.5*s,-112*s); ctx.lineTo(-9*s,-110*s); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-0.5*s,-112*s); ctx.lineTo(3*s,-111*s); ctx.stroke();

  // nose
  ctx.strokeStyle=C.body; ctx.lineWidth=0.4;
  ctx.beginPath();
  ctx.moveTo(2*s,-110*s);
  ctx.quadraticCurveTo(4*s,-109*s, 3*s,-107.5*s);
  ctx.strokeStyle='rgba(168,85,247,0.2)'; ctx.stroke();

  // mouth / smirk
  ctx.strokeStyle=C.white; ctx.lineWidth=0.8;
  ctx.beginPath();
  ctx.arc(2*s,-106*s, 3.5*s, 0.15, PI-0.15);
  ctx.stroke();
  // teeth
  ctx.fillStyle=C.white;
  ctx.beginPath(); ctx.roundRect(-0.5*s,-106.2*s,1.5*s,1.2*s,0.3*s); ctx.fill();
  ctx.beginPath(); ctx.roundRect(1.2*s,-106*s,1.5*s,1.1*s,0.3*s); ctx.fill();

  // scar on cheek
  ctx.strokeStyle='rgba(168,85,247,0.35)'; ctx.lineWidth=0.5;
  ctx.beginPath();
  ctx.moveTo(6*s,-109*s); ctx.lineTo(8*s,-106*s); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(7*s,-108*s); ctx.lineTo(9*s,-107*s); ctx.stroke();

  // stubble dots
  ctx.fillStyle='rgba(168,85,247,0.18)';
  for (let i=0;i<8;i++) {
    const bx=(Math.sin(i*2.4)*4-1)*s;
    const by=(-105+Math.cos(i*1.7)*2)*s;
    ctx.beginPath(); ctx.arc(bx,by,0.4*s,0,TAU); ctx.fill();
  }

  // ── Tricorn hat ───────────────────────────────────────────────────────
  ctx.fillStyle=C.body; ctx.strokeStyle=C.bodyEdge; ctx.lineWidth=0.6;

  // hat base / brim
  ctx.beginPath();
  ctx.ellipse(1*s,-122*s, 16.5*s,4.5*s, 0,0,TAU);
  ctx.fill(); ctx.stroke();
  // hat band (purple)
  ctx.strokeStyle=C.purple; ctx.lineWidth=1.8;
  ctx.beginPath();
  ctx.ellipse(1*s,-122*s, 16*s,4*s, 0,0,TAU);
  ctx.stroke();
  ctx.strokeStyle=C.bodyEdge; ctx.lineWidth=0.6;

  // hat crown body
  ctx.beginPath();
  ctx.moveTo(-12*s,-122*s);
  ctx.bezierCurveTo(-14*s,-130*s, -10*s,-140*s, 1*s,-142*s);
  ctx.bezierCurveTo(12*s,-140*s, 14*s,-130*s, 12*s,-122*s);
  ctx.closePath(); fill();

  // left brim upturn
  ctx.beginPath();
  ctx.moveTo(-12*s,-122*s);
  ctx.bezierCurveTo(-20*s,-126*s, -22*s,-136*s, -15*s,-140*s);
  ctx.bezierCurveTo(-10*s,-142*s, -8*s,-136*s, -10*s,-130*s);
  ctx.closePath(); fill();

  // right brim upturn
  ctx.beginPath();
  ctx.moveTo(12*s,-122*s);
  ctx.bezierCurveTo(20*s,-126*s, 22*s,-136*s, 16*s,-140*s);
  ctx.bezierCurveTo(11*s,-142*s, 9*s,-136*s, 10*s,-130*s);
  ctx.closePath(); fill();

  // hat buckle (purple)
  ctx.fillStyle=C.purple; ctx.strokeStyle=C.white; ctx.lineWidth=0.5;
  ctx.beginPath(); ctx.roundRect(-2.5*s,-125*s, 5*s,3.5*s, 0.6*s); ctx.fill(); ctx.stroke();

  // skull & crossbones on hat
  ctx.fillStyle=C.white; ctx.strokeStyle='rgba(12,8,20,0.4)'; ctx.lineWidth=0.3;
  ctx.beginPath(); ctx.arc(1*s,-134*s, 2.5*s,0,TAU); ctx.fill(); ctx.stroke();
  // skull eyes
  ctx.fillStyle='rgba(12,8,20,0.9)';
  ctx.beginPath(); ctx.arc(-0.6*s,-134.3*s,0.6*s,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(2.6*s,-134.3*s,0.6*s,0,TAU); ctx.fill();
  // crossbones
  ctx.strokeStyle='rgba(255,255,255,0.9)'; ctx.lineWidth=0.8;
  ctx.beginPath(); ctx.moveTo(-3*s,-130*s); ctx.lineTo(5*s,-138*s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(5*s,-130*s); ctx.lineTo(-3*s,-138*s); ctx.stroke();

  // feather in hat (sweeping up-left)
  ctx.fillStyle=C.body; ctx.strokeStyle=C.purpleDim; ctx.lineWidth=0.6;
  ctx.beginPath();
  ctx.moveTo(-10*s,-138*s);
  ctx.bezierCurveTo(-20*s,-150*s,-16*s,-165*s,-8*s,-162*s);
  ctx.bezierCurveTo(-4*s,-160*s,-8*s,-152*s,-10*s,-146*s);
  ctx.bezierCurveTo(-12*s,-140*s,-11*s,-138*s,-10*s,-138*s);
  ctx.fill(); ctx.stroke();
  // feather spine
  ctx.strokeStyle=C.purpleDim; ctx.lineWidth=0.4;
  ctx.beginPath();
  ctx.moveTo(-10*s,-138*s); ctx.bezierCurveTo(-18*s,-152*s,-14*s,-163*s,-8*s,-161*s);
  ctx.stroke();

  ctx.restore(); // whole pirate
}

// ─── Sword draw (world coords) ────────────────────────────────────────────────
function drawSword(
  ctx: CanvasRenderingContext2D,
  sx: number, sy: number,
  angle: number,
  glowPulse: number   // 0→1 glow intensity when stuck
) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(angle);

  // blade glow when stuck
  if (glowPulse > 0) {
    ctx.shadowColor = C.purple;
    ctx.shadowBlur  = 8 + glowPulse * 14;
  }

  // blade
  ctx.beginPath();
  ctx.moveTo(-1.5, 0);
  ctx.lineTo(1.5, 0);
  ctx.lineTo(1, 50);
  ctx.lineTo(-1, 50);
  ctx.closePath();
  ctx.fillStyle = C.blade;
  ctx.fill();

  // fuller line
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(168,85,247,0.55)';
  ctx.lineWidth   = 0.6;
  ctx.beginPath();
  ctx.moveTo(0, 2); ctx.lineTo(0, 42); ctx.stroke();

  // glint edge
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth   = 0.5;
  ctx.beginPath();
  ctx.moveTo(-1, 2); ctx.lineTo(-1.2, 38); ctx.stroke();

  // crossguard
  ctx.fillStyle   = C.body;
  ctx.strokeStyle = C.white;
  ctx.lineWidth   = 0.8;
  ctx.beginPath();
  ctx.roundRect(-7, -2, 14, 4, 1.2);
  ctx.fill(); ctx.stroke();

  // guard decorative inlay
  ctx.fillStyle = C.purple;
  ctx.beginPath(); ctx.arc(0, 0, 1.5, 0, TAU); ctx.fill();

  // grip
  ctx.fillStyle   = C.body;
  ctx.strokeStyle = C.bodyEdge;
  ctx.lineWidth   = 0.5;
  ctx.beginPath();
  ctx.roundRect(-2, -14, 4, 12, 1);
  ctx.fill(); ctx.stroke();
  // grip wrap
  ctx.strokeStyle = C.purple;
  ctx.lineWidth   = 0.8;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-2, -3 - i*2.5);
    ctx.lineTo(2,  -3 - i*2.5);
    ctx.stroke();
  }

  // pommel
  ctx.fillStyle   = C.purple;
  ctx.strokeStyle = C.white;
  ctx.lineWidth   = 0.5;
  ctx.beginPath();
  ctx.arc(0, -16, 3, 0, TAU);
  ctx.fill(); ctx.stroke();
  // pommel gem
  ctx.fillStyle = C.white;
  ctx.beginPath(); ctx.arc(0, -16, 1, 0, TAU); ctx.fill();

  ctx.shadowBlur = 0;
  ctx.restore();
}

// ─── Rope / chain draw ────────────────────────────────────────────────────────
function drawRope(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,   // pirate hand
  x2: number, y2: number,   // sword hilt
  sag: number,               // sag amount (0 = taut)
  tension: number            // 0=loose 1=taut (affects color)
) {
  const mx = (x1+x2)/2;
  const my = (y1+y2)/2 + sag;

  // rope glow
  const grad = ctx.createLinearGradient(x1,y1, x2,y2);
  grad.addColorStop(0,   `rgba(168,85,247,${0.15+tension*0.5})`);
  grad.addColorStop(0.5, `rgba(255,255,255,${0.1+tension*0.3})`);
  grad.addColorStop(1,   `rgba(168,85,247,${0.15+tension*0.5})`);

  // outer glow pass
  ctx.save();
  ctx.strokeStyle = `rgba(168,85,247,${0.08+tension*0.15})`;
  ctx.lineWidth   = 4;
  ctx.lineCap     = 'round';
  ctx.filter      = 'blur(2px)';
  ctx.beginPath();
  ctx.moveTo(x1,y1);
  ctx.quadraticCurveTo(mx,my,x2,y2);
  ctx.stroke();
  ctx.filter = 'none';

  // main rope
  ctx.strokeStyle = grad;
  ctx.lineWidth   = 1.4;
  ctx.setLineDash([4,3]);
  ctx.beginPath();
  ctx.moveTo(x1,y1);
  ctx.quadraticCurveTo(mx,my,x2,y2);
  ctx.stroke();
  ctx.setLineDash([]);

  // core bright line
  ctx.strokeStyle = `rgba(255,255,255,${0.08+tension*0.22})`;
  ctx.lineWidth   = 0.6;
  ctx.beginPath();
  ctx.moveTo(x1,y1);
  ctx.quadraticCurveTo(mx,my,x2,y2);
  ctx.stroke();

  ctx.restore();
}

// ─── Spark burst ──────────────────────────────────────────────────────────────
function spawnSparks(sparks: Spark[], x: number, y: number, n: number) {
  for (let i = 0; i < n; i++) {
    const ang = Math.random() * TAU;
    const spd = 1.5 + Math.random() * 5;
    sparks.push({
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - Math.random() * 2,
      life: 1,
      size: 1.2 + Math.random() * 3,
      color: C.spark[Math.floor(Math.random() * C.spark.length)],
    });
  }
}

// ─── Main component ───────────────────────────────────────────────────────────
const PirateCorner: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // ── Pirate anchor (bottom-right, peeking in) ──────────────────────────
    const PIRATE_SCALE = 0.62; // scale factor → ~80px tall character
    const getPiratePos = () => ({
      x: canvas.width  - 52,
      y: canvas.height - 8,
    });

    // ── Sword state ───────────────────────────────────────────────────────
    let sw: SwordState = {
      x: 0, y: 0, vx: 0, vy: 0,
      angle: 0, spinRate: 0,
      stuckX: 0, stuckY: 0, stuckAngle: 0,
      sagAmount: 0,
      phase: 'idle', phaseT: 0, phaseMs: 3500,
      elapsed: 0,
    };

    // ── Sparks ────────────────────────────────────────────────────────────
    let sparks: Spark[] = [];

    // ── Screen shake ──────────────────────────────────────────────────────
    let shakeAmt   = 0;
    let shakeDecay = 0;

    // ── Anim params ───────────────────────────────────────────────────────
    let breathT  = 0;
    let windupT  = 0;
    let throwT   = 0;
    let pullT    = 0;
    let lastTime = performance.now();

    // ── Compute sword hand world position ─────────────────────────────────
    // (approximate — right shoulder of pirate, adjusted by arm rotation)
    const getSwordHandPos = (): { hx: number; hy: number } => {
      const pp = getPiratePos();
      const sc = PIRATE_SCALE;
      // right arm base in world coords
      const armBaseX = pp.x + 16 * sc;
      const armBaseY = pp.y - 88 * sc;
      // arm rotated by current sword-arm angle
      const swordArmR = windupT * (-PI/2.2) + throwT * (PI/2.8) + pullT * (-PI/3.5) - 0.2;
      const handDist  = 30 * sc; // approx distance to hand tip
      return {
        hx: armBaseX + Math.sin(swordArmR) * handDist,
        hy: armBaseY + Math.cos(swordArmR) * handDist,
      };
    };

    // ── Phase transition ──────────────────────────────────────────────────
    const setPhase = (p: Phase, ms: number) => {
      sw.phase   = p;
      sw.elapsed = 0;
      sw.phaseMs = ms;
      sw.phaseT  = 0;
    };

    // ── Pick a random target for the sword to stick ───────────────────────
    const pickTarget = () => {
      const W = canvas.width, H = canvas.height;
      const pp = getPiratePos();
      // avoid throwing into the pirate itself; pick somewhere on screen
      const tx = Math.random() * (W * 0.75) + W * 0.05;
      const ty = Math.random() * (H * 0.65) + H * 0.1;
      const dx = tx - pp.x;
      const dy = ty - pp.y;
      const dist = Math.hypot(dx, dy);
      const speed = 8 + Math.random() * 5;
      sw.vx = (dx / dist) * speed;
      sw.vy = (dy / dist) * speed - 2; // slight upward arc
      sw.spinRate = (Math.random() > 0.5 ? 1 : -1) * (0.18 + Math.random() * 0.12);
      sw.stuckX = tx;
      sw.stuckY = ty;
      sw.stuckAngle = Math.atan2(dy, dx) + PI / 2 + (Math.random() - 0.5) * 0.3;
    };

    // ── Main tick ─────────────────────────────────────────────────────────
    const tick = (now: number) => {
      const dt  = Math.min(now - lastTime, 50);
      lastTime  = now;
      breathT  += dt * 0.0018;

      const pp = getPiratePos();
      const { hx, hy } = getSwordHandPos();

      // ── Phase logic ────────────────────────────────────────────────────
      sw.elapsed += dt;
      sw.phaseT   = clamp(sw.elapsed / sw.phaseMs, 0, 1);

      switch (sw.phase) {

        case 'idle': {
          windupT = 0; throwT = 0; pullT = 0;
          sw.x = hx; sw.y = hy;
          if (sw.phaseT >= 1) {
            setPhase('windup', 600 + Math.random() * 300);
          }
          break;
        }

        case 'windup': {
          windupT = easeInOut(sw.phaseT);
          throwT  = 0; pullT = 0;
          sw.x = hx; sw.y = hy;
          if (sw.phaseT >= 1) {
            pickTarget();
            sw.x = hx; sw.y = hy;
            setPhase('throw', 800 + Math.random() * 200);
          }
          break;
        }

        case 'throw': {
          throwT  = easeOut(sw.phaseT);
          windupT = 1 - sw.phaseT; // arm relaxes as throw progresses
          pullT   = 0;

          // physics step
          sw.x     += sw.vx;
          sw.y     += sw.vy;
          sw.vy    += 0.15; // gravity
          sw.angle += sw.spinRate;

          // spawn brief trail sparks
          if (Math.random() < 0.25) {
            sparks.push({
              x: sw.x, y: sw.y,
              vx: (Math.random()-0.5)*0.5, vy:(Math.random()-0.5)*0.5,
              life: 0.4, size: 1+Math.random()*1.5,
              color: C.spark[Math.floor(Math.random()*C.spark.length)],
            });
          }

          // check arrival
          const d = Math.hypot(sw.x - sw.stuckX, sw.y - sw.stuckY);
          if (d < 18 || sw.phaseT >= 1) {
            sw.x = sw.stuckX; sw.y = sw.stuckY;
            sw.angle = sw.stuckAngle;
            sw.vx = 0; sw.vy = 0;
            shakeAmt   = 5;
            shakeDecay = 0.82;
            spawnSparks(sparks, sw.stuckX, sw.stuckY, 28);
            setPhase('stuck', 1800 + Math.random() * 1000);
          }
          break;
        }

        case 'stuck': {
          windupT = 0; throwT = 0;
          pullT   = easeInOut(Math.min(sw.phaseT * 2, 1)); // ramp up pull
          sw.x = sw.stuckX; sw.y = sw.stuckY;
          sw.angle = sw.stuckAngle;
          // sag: rope starts loose, tightens as pirate pulls
          sw.sagAmount = lerp(40, 5, easeIn(sw.phaseT));
          if (sw.phaseT >= 1) {
            setPhase('pulling', 1200 + Math.random() * 400);
          }
          break;
        }

        case 'pulling': {
          pullT = 1;
          // sword slides back toward hand
          const t  = easeInOut(sw.phaseT);
          sw.x     = lerp(sw.stuckX, hx, t);
          sw.y     = lerp(sw.stuckY, hy, t);
          sw.angle = lerp(sw.stuckAngle, -PI/2.5, t); // rotate to hand angle
          sw.sagAmount = lerp(5, 0, t);
          if (sw.phaseT >= 1) {
            setPhase('catch', 300);
          }
          break;
        }

        case 'catch': {
          // small spark burst on catch
          if (sw.elapsed < dt * 2) {
            spawnSparks(sparks, hx, hy, 8);
          }
          pullT = 1 - easeOut(sw.phaseT);
          sw.x = hx; sw.y = hy;
          if (sw.phaseT >= 1) {
            setPhase('cooldown', 1200 + Math.random() * 800);
          }
          break;
        }

        case 'cooldown': {
          windupT = 0; throwT = 0; pullT = 0;
          sw.x = hx; sw.y = hy;
          if (sw.phaseT >= 1) setPhase('idle', 2000 + Math.random() * 2000);
          break;
        }
      }

      // ── Screen shake decay ─────────────────────────────────────────────
      shakeAmt *= shakeDecay;
      const shakeX = shakeAmt > 0.3 ? (Math.random()-0.5)*shakeAmt : 0;
      const shakeY = shakeAmt > 0.3 ? (Math.random()-0.5)*shakeAmt : 0;

      // ── Clear ──────────────────────────────────────────────────────────
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(shakeX, shakeY);

      // ── Sparks ─────────────────────────────────────────────────────────
      sparks = sparks.filter(sp => sp.life > 0.02);
      for (const sp of sparks) {
        sp.x   += sp.vx;
        sp.y   += sp.vy;
        sp.vy  += 0.06;
        sp.life -= 0.022;
        ctx.save();
        ctx.globalAlpha = sp.life * 0.85;
        ctx.fillStyle   = sp.color;
        if (sp.color === C.purple || sp.color.includes('168')) {
          ctx.shadowColor = C.purple; ctx.shadowBlur = 4;
        }
        const sz = sp.size * sp.life;
        ctx.fillRect(sp.x-sz/2, sp.y-sz/2, sz, sz);
        ctx.restore();
      }

      // ── Rope (only during stuck / pulling / catch) ────────────────────
      if (sw.phase === 'stuck' || sw.phase === 'pulling' || sw.phase === 'catch') {
        const tension = sw.phase === 'pulling' ? easeInOut(sw.phaseT)
                      : sw.phase === 'catch'   ? 1
                      : easeIn(sw.phaseT);
        drawRope(ctx, hx, hy, sw.x, sw.y, sw.sagAmount, tension);
      }

      // ── Sword (world space, when thrown / stuck / pulling) ───────────
      const showWorldSword = sw.phase === 'throw' || sw.phase === 'stuck' || sw.phase === 'pulling';
      if (showWorldSword) {
        const glowPulse = sw.phase === 'stuck'
          ? 0.5 + Math.sin(now * 0.004) * 0.5
          : sw.phase === 'pulling' ? 1 - sw.phaseT : 0;
        drawSword(ctx, sw.x, sw.y, sw.angle, glowPulse);
      }

      // ── Pirate ────────────────────────────────────────────────────────
      drawPirate({
        ctx,
        ox: pp.x, oy: pp.y,
        scale: PIRATE_SCALE,
        breathT,
        windupT,
        throwT,
        pullT,
        handX: hx, handY: hy,
      });

      // ── Subtle ground shadow under pirate ─────────────────────────────
      ctx.save();
      ctx.globalAlpha = 0.1;
      const sgrd = ctx.createRadialGradient(pp.x, pp.y+2, 0, pp.x, pp.y+2, 28);
      sgrd.addColorStop(0,   'rgba(168,85,247,0.5)');
      sgrd.addColorStop(1,   'rgba(168,85,247,0)');
      ctx.fillStyle = sgrd;
      ctx.beginPath();
      ctx.ellipse(pp.x, pp.y+2, 28, 6, 0, 0, TAU);
      ctx.fill();
      ctx.restore();

      ctx.restore(); // shake
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9990,
        pointerEvents: 'none',
      }}
    />
  );
};

export default PirateCorner;
