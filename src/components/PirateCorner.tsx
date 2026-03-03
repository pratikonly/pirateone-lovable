import { useEffect, useRef } from 'react';

const PI    = Math.PI;
const TAU   = PI * 2;
const lerp  = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const easeOut   = (t: number) => 1 - Math.pow(1 - t, 3);
const easeIn    = (t: number) => t * t * t;
const easeInOut = (t: number) => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;

const BODY   = '#0c0814';
const BODY2  = '#140c24';
const EDGE   = 'rgba(168,85,247,0.25)';
const PURPLE = '#a855f7';
const PDIM   = 'rgba(168,85,247,0.3)';
const WHITE  = 'rgba(255,255,255,0.92)';
const BLADE  = 'rgba(230,220,255,0.95)';
const SKIN   = '#1a0f2e';

type Phase = 'idle'|'windup'|'throw'|'stuck'|'recall'|'catch'|'cooldown';

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number; color: string;
}

function glow(ctx: CanvasRenderingContext2D, color: string, blur: number) {
  ctx.shadowColor = color; ctx.shadowBlur = blur;
}
function noGlow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
}

function drawSword(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, sc: number, glowPow = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const b = sc;
  if (glowPow > 0) glow(ctx, PURPLE, 8 + glowPow * 24);

  // blade
  ctx.beginPath();
  ctx.moveTo(0, -b*0.5);
  ctx.lineTo(b*0.9, b*14);
  ctx.lineTo(-b*0.9, b*14);
  ctx.closePath();
  ctx.fillStyle = BLADE; ctx.fill();

  // fuller
  ctx.beginPath();
  ctx.moveTo(0, b*2); ctx.lineTo(0, b*11);
  ctx.strokeStyle = PURPLE; ctx.lineWidth = b*0.25; ctx.globalAlpha = 0.5; ctx.stroke(); ctx.globalAlpha = 1;

  // crossguard
  ctx.beginPath();
  ctx.moveTo(-b*4.5, b*1.5); ctx.lineTo(b*4.5, b*1.5);
  ctx.lineTo(b*4, b*3); ctx.lineTo(-b*4, b*3);
  ctx.closePath();
  ctx.fillStyle = BODY; ctx.fill();
  ctx.strokeStyle = EDGE; ctx.lineWidth = 0.5; ctx.stroke();

  // grip
  ctx.beginPath();
  ctx.roundRect(-b*1.1, b*3, b*2.2, b*6, b*0.5);
  ctx.fillStyle = BODY2; ctx.fill();
  ctx.strokeStyle = EDGE; ctx.lineWidth = 0.5; ctx.stroke();

  // grip wrap
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-b*1.1, b*(3.8+i*1.2)); ctx.lineTo(b*1.1, b*(3.8+i*1.2));
    ctx.strokeStyle = PURPLE; ctx.lineWidth = b*0.35; ctx.globalAlpha = 0.6; ctx.stroke(); ctx.globalAlpha = 1;
  }

  // pommel
  ctx.beginPath(); ctx.arc(0, b*9.5, b*1.5, 0, TAU);
  ctx.fillStyle = PURPLE; ctx.fill();
  ctx.strokeStyle = WHITE; ctx.lineWidth = 0.4; ctx.stroke();

  noGlow(ctx);
  ctx.restore();
}

interface PirateProps {
  ctx: CanvasRenderingContext2D;
  ox: number; oy: number;
  sc: number;
  breathT: number;
  windupT: number;
  throwT: number;
  recallT: number;
  hasSword: boolean;
}

function drawPirate(p: PirateProps) {
  const { ctx, ox, oy, sc, breathT, windupT, throwT, recallT, hasSword } = p;
  const breathY = Math.sin(breathT) * sc * 0.3;
  const lean    = windupT * -0.13 + throwT * 0.09 + recallT * 0.11;

  ctx.save();
  ctx.translate(ox, oy + breathY);
  ctx.rotate(lean);

  const fs = (fill: string, str = EDGE, lw = 0.6) => {
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = str; ctx.lineWidth = lw; ctx.stroke();
  };

  // ── BOOTS ──────────────────────────────────────────────────────────────────
  // Left boot
  ctx.beginPath();
  ctx.moveTo(-sc*5.5, 0);
  ctx.lineTo(-sc*6.5, -sc*11);
  ctx.lineTo(-sc*4.5, -sc*12.5);
  ctx.lineTo(-sc*2.5, -sc*11);
  ctx.lineTo(-sc*2.5, 0);
  ctx.lineTo(-sc*8.5, sc*0.8);
  ctx.lineTo(-sc*8.5, -sc*1.5);
  ctx.lineTo(-sc*2.5, -sc*1.5);
  ctx.closePath(); fs(BODY);

  // Right boot
  ctx.beginPath();
  ctx.moveTo(sc*2.5, 0);
  ctx.lineTo(sc*2.5, -sc*11);
  ctx.lineTo(sc*4.5, -sc*12.5);
  ctx.lineTo(sc*6.5, -sc*11);
  ctx.lineTo(sc*5.5, 0);
  ctx.lineTo(sc*8.5, sc*0.8);
  ctx.lineTo(sc*8.5, -sc*1.5);
  ctx.lineTo(sc*2.5, -sc*1.5);
  ctx.closePath(); fs(BODY);

  // Boot cuffs
  for (const bx of [-sc*4.5, sc*4.5]) {
    ctx.beginPath();
    ctx.ellipse(bx, -sc*11.5, sc*2.5, sc*1.5, 0, 0, TAU);
    fs(BODY2, PURPLE, 0.7);
  }

  // ── BREECHES ────────────────────────────────────────────────────────────────
  ctx.beginPath();
  ctx.moveTo(-sc*7, -sc*11);
  ctx.bezierCurveTo(-sc*9, -sc*18, -sc*8, -sc*24, -sc*5, -sc*26);
  ctx.lineTo(sc*5, -sc*26);
  ctx.bezierCurveTo(sc*8, -sc*24, sc*9, -sc*18, sc*7, -sc*11);
  ctx.closePath(); fs(BODY);
  ctx.beginPath();
  ctx.moveTo(0, -sc*26); ctx.lineTo(0, -sc*13);
  ctx.strokeStyle = PDIM; ctx.lineWidth = sc*0.8; ctx.stroke();

  // ── COAT BODY ───────────────────────────────────────────────────────────────
  ctx.beginPath();
  ctx.moveTo(-sc*11, -sc*13);
  ctx.bezierCurveTo(-sc*13, -sc*20, -sc*12, -sc*34, -sc*9, -sc*40);
  ctx.lineTo(-sc*8, -sc*56);
  ctx.lineTo(-sc*7, -sc*62);
  ctx.lineTo(-sc*4, -sc*64);
  ctx.lineTo(-sc*3, -sc*60);
  ctx.lineTo(0, -sc*58);
  ctx.lineTo(sc*3, -sc*60);
  ctx.lineTo(sc*4, -sc*64);
  ctx.lineTo(sc*7, -sc*62);
  ctx.lineTo(sc*8, -sc*56);
  ctx.lineTo(sc*9, -sc*40);
  ctx.bezierCurveTo(sc*12, -sc*34, sc*13, -sc*20, sc*11, -sc*13);
  ctx.closePath(); fs(BODY);

  // Coat tails
  ctx.beginPath();
  ctx.moveTo(-sc*11, -sc*13);
  ctx.bezierCurveTo(-sc*17, -sc*10, -sc*18, -sc*4, -sc*14, sc*2);
  ctx.lineTo(-sc*10, sc*1);
  ctx.bezierCurveTo(-sc*12, -sc*6, -sc*11, -sc*11, -sc*8, -sc*13);
  ctx.closePath(); fs(BODY);
  ctx.beginPath();
  ctx.moveTo(sc*11, -sc*13);
  ctx.bezierCurveTo(sc*17, -sc*10, sc*18, -sc*4, sc*14, sc*2);
  ctx.lineTo(sc*10, sc*1);
  ctx.bezierCurveTo(sc*12, -sc*6, sc*11, -sc*11, sc*8, -sc*13);
  ctx.closePath(); fs(BODY);

  // Lapels
  ctx.beginPath();
  ctx.moveTo(-sc*3, -sc*60); ctx.lineTo(-sc*5, -sc*38);
  ctx.lineTo(-sc*8, -sc*26); ctx.lineTo(-sc*6, -sc*26);
  ctx.lineTo(-sc*3, -sc*35); ctx.lineTo(-sc*1.5, -sc*60);
  ctx.closePath(); fs(BODY2);
  ctx.beginPath();
  ctx.moveTo(sc*3, -sc*60); ctx.lineTo(sc*5, -sc*38);
  ctx.lineTo(sc*8, -sc*26); ctx.lineTo(sc*6, -sc*26);
  ctx.lineTo(sc*3, -sc*35); ctx.lineTo(sc*1.5, -sc*60);
  ctx.closePath(); fs(BODY2);

  // Buttons
  for (let i = 0; i < 5; i++) {
    ctx.beginPath(); ctx.arc(0, -sc*32 - i*sc*5, sc*0.8, 0, TAU);
    ctx.fillStyle = PURPLE; ctx.fill();
  }

  // Belt
  ctx.fillStyle = PDIM;
  ctx.fillRect(-sc*12, -sc*27.5, sc*24, sc*2);
  ctx.beginPath(); ctx.roundRect(-sc*2.5, -sc*29, sc*5, sc*4, sc*0.5);
  ctx.fillStyle = PURPLE; ctx.fill();
  ctx.strokeStyle = WHITE; ctx.lineWidth = 0.5; ctx.stroke();

  // Epaulettes
  for (const ex of [-sc*10, sc*10]) {
    ctx.beginPath(); ctx.ellipse(ex, -sc*60, sc*3.5, sc*2, 0, 0, TAU);
    ctx.fillStyle = BODY; ctx.fill(); ctx.strokeStyle = PURPLE; ctx.lineWidth = 0.8; ctx.stroke();
  }

  // ── LEFT ARM ────────────────────────────────────────────────────────────────
  const leftLean = recallT * 0.2 - 0.1;
  ctx.save();
  ctx.translate(-sc*10, -sc*60);
  ctx.rotate(0.18 + leftLean);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-sc*5, sc*4, -sc*6, sc*14, -sc*5, sc*20);
  ctx.lineTo(-sc*2, sc*20);
  ctx.bezierCurveTo(-sc*3, sc*14, -sc*2, sc*4, sc*3, sc*2);
  ctx.closePath(); fs(BODY);
  ctx.beginPath(); ctx.ellipse(-sc*3.5, sc*19.5, sc*3, sc*2, -0.25, 0, TAU);
  ctx.fillStyle = BODY2; ctx.fill(); ctx.strokeStyle = PURPLE; ctx.lineWidth = 0.7; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-sc*4, sc*24, sc*3.5, sc*3, -0.15, 0, TAU);
  fs(SKIN, EDGE, 0.5);
  ctx.restore();

  // ── RIGHT ARM (sword arm) ────────────────────────────────────────────────────
  const armRot = windupT*(-PI/2.1) + throwT*(PI/2.4) + recallT*(-PI/2.8) - 0.18;
  ctx.save();
  ctx.translate(sc*10, -sc*60);
  ctx.rotate(armRot);

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(sc*5, sc*3, sc*7, sc*14, sc*5.5, sc*20);
  ctx.lineTo(sc*3, sc*20);
  ctx.bezierCurveTo(sc*4.5, sc*14, sc*2.5, sc*3, -sc*2, sc*2);
  ctx.closePath(); fs(BODY);

  ctx.beginPath(); ctx.ellipse(sc*4.5, sc*19.5, sc*3, sc*2, 0.25, 0, TAU);
  ctx.fillStyle = BODY2; ctx.fill(); ctx.strokeStyle = PURPLE; ctx.lineWidth = 0.7; ctx.stroke();

  ctx.beginPath(); ctx.ellipse(sc*5, sc*24, sc*3.8, sc*3.2, 0.15, 0, TAU);
  fs(SKIN, EDGE, 0.5);

  // knuckles
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.moveTo(sc*3.5+k*sc*0.9, sc*23); ctx.lineTo(sc*3.5+k*sc*0.9, sc*25.5);
    ctx.strokeStyle = PDIM; ctx.lineWidth = 0.6; ctx.stroke();
  }

  // sword in hand
  if (hasSword) {
    ctx.save();
    ctx.translate(sc*5.5, sc*24);
    ctx.rotate(0.12);
    glow(ctx, PURPLE, 6);
    drawSword(ctx, 0, sc*3, 0, sc*0.55, 0);
    noGlow(ctx);
    ctx.restore();
  }

  // recall hand glow (Thor moment)
  if (recallT > 0.05) {
    const pulse = 0.4 + Math.sin(Date.now()*0.008)*0.3;
    ctx.beginPath(); ctx.arc(sc*5, sc*24, sc*5*recallT, 0, TAU);
    ctx.fillStyle = `rgba(168,85,247,${recallT*pulse*0.5})`; ctx.fill();
    glow(ctx, PURPLE, 18*recallT);
    ctx.beginPath(); ctx.arc(sc*5, sc*24, sc*3*recallT, 0, TAU);
    ctx.fillStyle = `rgba(200,160,255,${recallT*0.35})`; ctx.fill();
    noGlow(ctx);
  }

  ctx.restore(); // right arm

  // ── NECK ────────────────────────────────────────────────────────────────────
  ctx.beginPath();
  ctx.moveTo(-sc*3.5, -sc*62); ctx.lineTo(sc*3.5, -sc*62);
  ctx.lineTo(sc*3, -sc*68); ctx.lineTo(-sc*3, -sc*68);
  ctx.closePath(); fs(SKIN, EDGE, 0.5);

  // Cravat
  ctx.beginPath();
  ctx.moveTo(-sc*3.5, -sc*64); ctx.lineTo(0, -sc*68);
  ctx.lineTo(sc*3.5, -sc*64); ctx.lineTo(sc*2, -sc*62);
  ctx.lineTo(0, -sc*65); ctx.lineTo(-sc*2, -sc*62);
  ctx.closePath(); ctx.fillStyle = WHITE; ctx.fill();

  // ── HEAD ────────────────────────────────────────────────────────────────────
  ctx.beginPath(); ctx.ellipse(sc*0.5, -sc*76, sc*8, sc*9, 0.03, 0, TAU);
  fs(SKIN, EDGE, 0.5);

  // right eye
  ctx.beginPath(); ctx.arc(sc*3, -sc*77, sc*1.5, 0, TAU);
  ctx.fillStyle = WHITE; ctx.fill();
  ctx.beginPath(); ctx.arc(sc*3.3, -sc*77, sc*0.85, 0, TAU);
  ctx.fillStyle = BODY; ctx.fill();
  ctx.beginPath(); ctx.arc(sc*2.8, -sc*77.5, sc*0.3, 0, TAU);
  ctx.fillStyle = WHITE; ctx.fill();

  // eyepatch
  ctx.beginPath(); ctx.arc(-sc*2.5, -sc*77, sc*2.2, 0, TAU);
  ctx.fillStyle = BODY; ctx.fill(); ctx.strokeStyle = PURPLE; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-sc*4.5, -sc*76); ctx.lineTo(-sc*7.5, -sc*74);
  ctx.strokeStyle = PURPLE; ctx.lineWidth = 0.7; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-sc*0.5, -sc*76); ctx.lineTo(sc*2, -sc*75);
  ctx.strokeStyle = PURPLE; ctx.lineWidth = 0.7; ctx.stroke();

  // nose
  ctx.beginPath();
  ctx.moveTo(sc*1.5, -sc*74.5); ctx.quadraticCurveTo(sc*3, -sc*73.5, sc*2.2, -sc*72);
  ctx.strokeStyle = 'rgba(168,85,247,0.2)'; ctx.lineWidth = 0.6; ctx.stroke();

  // mouth
  ctx.beginPath(); ctx.arc(sc*1.5, -sc*70, sc*3, 0.2, PI-0.1);
  ctx.strokeStyle = WHITE; ctx.lineWidth = 0.9; ctx.stroke();
  ctx.fillStyle = WHITE;
  ctx.beginPath(); ctx.roundRect(-sc*0.3, -sc*70.3, sc*1.3, sc*1.1, sc*0.2); ctx.fill();
  ctx.beginPath(); ctx.roundRect(sc*1.2, -sc*70.1, sc*1.3, sc*1, sc*0.2); ctx.fill();

  // scar
  ctx.strokeStyle = PDIM; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(sc*5, -sc*73.5); ctx.lineTo(sc*6.5, -sc*71); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sc*5.8, -sc*72.5); ctx.lineTo(sc*7, -sc*72); ctx.stroke();

  // stubble
  ctx.fillStyle = 'rgba(168,85,247,0.15)';
  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    ctx.arc(Math.sin(i*2.1)*sc*3.5+sc*0.5, -sc*69.5+Math.cos(i*1.9)*sc*1.2, sc*0.35, 0, TAU);
    ctx.fill();
  }

  // ── TRICORN HAT ─────────────────────────────────────────────────────────────
  ctx.beginPath(); ctx.ellipse(sc*0.5, -sc*84.5, sc*13.5, sc*4, 0, 0, TAU);
  fs(BODY, EDGE, 0.5);
  ctx.strokeStyle = PURPLE; ctx.lineWidth = sc*1.4;
  ctx.beginPath(); ctx.ellipse(sc*0.5, -sc*84.5, sc*13, sc*3.5, 0, 0, TAU); ctx.stroke();

  // crown
  ctx.beginPath();
  ctx.moveTo(-sc*10, -sc*84.5);
  ctx.bezierCurveTo(-sc*12, -sc*92, -sc*8, -sc*102, sc*0.5, -sc*104);
  ctx.bezierCurveTo(sc*9, -sc*102, sc*13, -sc*92, sc*10, -sc*84.5);
  ctx.closePath(); fs(BODY, EDGE, 0.5);

  // left upturn
  ctx.beginPath();
  ctx.moveTo(-sc*10, -sc*84.5);
  ctx.bezierCurveTo(-sc*17, -sc*88, -sc*19, -sc*98, -sc*13, -sc*102);
  ctx.bezierCurveTo(-sc*8, -sc*104.5, -sc*6, -sc*98, -sc*8, -sc*92);
  ctx.closePath(); fs(BODY, EDGE, 0.5);

  // right upturn
  ctx.beginPath();
  ctx.moveTo(sc*10, -sc*84.5);
  ctx.bezierCurveTo(sc*17, -sc*88, sc*19, -sc*98, sc*14, -sc*102);
  ctx.bezierCurveTo(sc*9, -sc*104.5, sc*7, -sc*98, sc*8, -sc*92);
  ctx.closePath(); fs(BODY, EDGE, 0.5);

  // hat buckle
  ctx.beginPath(); ctx.roundRect(-sc*2.5, -sc*88, sc*5, sc*3.5, sc*0.5);
  ctx.fillStyle = PURPLE; ctx.fill(); ctx.strokeStyle = WHITE; ctx.lineWidth = 0.5; ctx.stroke();

  // skull
  ctx.fillStyle = WHITE; ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 0.3;
  ctx.beginPath(); ctx.arc(sc*0.5, -sc*95, sc*2.5, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = BODY;
  ctx.beginPath(); ctx.arc(-sc*0.8, -sc*95.4, sc*0.65, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(sc*1.8, -sc*95.4, sc*0.65, 0, TAU); ctx.fill();
  ctx.strokeStyle = WHITE; ctx.lineWidth = sc*0.75; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-sc*3.5, -sc*91.5); ctx.lineTo(sc*4.5, -sc*99); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sc*4.5, -sc*91.5); ctx.lineTo(-sc*3.5, -sc*99); ctx.stroke();
  ctx.lineCap = 'butt';

  // feather
  ctx.save();
  ctx.translate(-sc*12, -sc*99); ctx.rotate(-0.3);
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.quadraticCurveTo(sc*2, -sc*8, sc*1, -sc*16);
  ctx.strokeStyle = PURPLE; ctx.lineWidth = 0.8; ctx.stroke();
  for (let i = 0; i < 10; i++) {
    const t = i/9;
    ctx.beginPath();
    ctx.moveTo(lerp(sc*0.3, sc*0.8, t), lerp(0, -sc*15.5, t));
    ctx.lineTo(lerp(sc*0.3, sc*0.8, t) - sc*3*(1-t*0.5), lerp(0,-sc*15.5,t) - sc*2);
    ctx.strokeStyle = `rgba(168,85,247,${0.4-t*0.2})`; ctx.lineWidth = 0.5; ctx.stroke();
  }
  ctx.restore();

  ctx.restore(); // main
}

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const SC      = 3.8;
const TOTAL_H = SC * 110;

const PirateCorner: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null!);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d')!;

    let breathT  = 0, windupT = 0, throwT = 0, recallT = 0;
    let shakeAmt = 0;
    let particles: Particle[] = [];
    let lastTime = performance.now();

    type SW = {
      phase: Phase; elapsed: number; phaseMs: number;
      sx: number; sy: number; svx: number; svy: number;
      sAngle: number; sSpin: number;
      tX: number; tY: number; tAngle: number;
    };

    const sw: SW = {
      phase:'idle', elapsed:0, phaseMs:2500,
      sx:0, sy:0, svx:0, svy:0, sAngle:-PI/2, sSpin:0,
      tX:0, tY:0, tAngle:0,
    };

    const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const foot = () => ({ x: canvas.width - TOTAL_H*0.55, y: canvas.height - 10 });

    const swordHandPos = () => {
      const f = foot();
      const top = f.y - TOTAL_H;
      const baseX = f.x + SC*10, baseY = top + TOTAL_H*0.44;
      const rot = windupT*(-PI/2.1) + throwT*(PI/2.4) + recallT*(-PI/2.8) - 0.18;
      return { hx: baseX + Math.sin(rot)*SC*30, hy: baseY + Math.cos(rot)*SC*30 };
    };

    const setPhase = (ph: Phase, ms: number) => { sw.phase=ph; sw.elapsed=0; sw.phaseMs=ms; };

    const pickTarget = () => {
      const { hx, hy } = swordHandPos();
      const tx = Math.random()*canvas.width*0.72 + canvas.width*0.04;
      const ty = Math.random()*canvas.height*0.6 + canvas.height*0.06;
      const dx = tx-hx, dy = ty-hy, dist = Math.hypot(dx,dy);
      const spd = 14+Math.random()*8;
      sw.svx=dx/dist*spd; sw.svy=dy/dist*spd-3;
      sw.sSpin=(Math.random()>.5?1:-1)*(0.14+Math.random()*0.12);
      sw.tX=tx; sw.tY=ty;
      sw.tAngle=Math.atan2(dy,dx)+PI/2+(Math.random()-.5)*0.5;
      sw.sx=hx; sw.sy=hy;
    };

    const burst = (x: number, y: number, n: number, big=false) => {
      const colors=['#fff','#e9d5ff','#a855f7','#f0abfc'];
      for(let i=0;i<n;i++){
        const a=Math.random()*TAU, sp=(big?2:1)+Math.random()*(big?6:3.5);
        particles.push({ x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp-(big?2:1),
          life:1, maxLife:0.5+Math.random()*(big?.8:.5),
          size:(big?2.5:1.5)+Math.random()*(big?3:2),
          color:colors[Math.floor(Math.random()*colors.length)] });
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(now-lastTime,50);
      lastTime = now; breathT += dt*0.0019;

      const f = foot();
      const { hx, hy } = swordHandPos();
      sw.elapsed += dt;
      const rawT = clamp(sw.elapsed/sw.phaseMs,0,1);

      switch(sw.phase) {
        case 'idle':
          windupT=0; throwT=0; recallT=0; sw.sx=hx; sw.sy=hy;
          if(rawT>=1) setPhase('windup',500+Math.random()*300);
          break;
        case 'windup':
          windupT=easeInOut(rawT); throwT=0; recallT=0; sw.sx=hx; sw.sy=hy;
          if(rawT>=1){ pickTarget(); setPhase('throw',900+Math.random()*300); }
          break;
        case 'throw': {
          throwT=easeOut(rawT); windupT=1-rawT; recallT=0;
          sw.sx+=sw.svx; sw.sy+=sw.svy; sw.svy+=0.22; sw.sAngle+=sw.sSpin;
          if(Math.random()<.35) particles.push({x:sw.sx,y:sw.sy,
            vx:(Math.random()-.5)*.7,vy:(Math.random()-.5)*.7,
            life:1,maxLife:.35+Math.random()*.2,size:1.5+Math.random()*2,
            color:Math.random()>.5?PURPLE:'#fff'});
          if(Math.hypot(sw.sx-sw.tX,sw.sy-sw.tY)<24||rawT>=1){
            sw.sx=sw.tX; sw.sy=sw.tY; sw.sAngle=sw.tAngle; sw.svx=0; sw.svy=0;
            shakeAmt=8; burst(sw.tX,sw.tY,40,true);
            setPhase('stuck',2000+Math.random()*1200);
          }
          break;
        }
        case 'stuck':
          windupT=0; throwT=0;
          recallT=easeInOut(Math.min(rawT*1.5,1))*0.5;
          sw.sx=sw.tX; sw.sy=sw.tY; sw.sAngle=sw.tAngle;
          if(rawT>=1) setPhase('recall',1000+Math.random()*300);
          break;
        case 'recall': {
          recallT=easeInOut(rawT); throwT=0; windupT=0;
          const t=easeIn(rawT);
          sw.sx=lerp(sw.tX,hx,t); sw.sy=lerp(sw.tY,hy,t);
          const ta=Math.atan2(hy-sw.tY,hx-sw.tX)+PI/2;
          sw.sAngle=lerp(sw.tAngle,ta,easeOut(rawT));
          if(Math.random()>.45) particles.push({
            x:lerp(sw.tX,hx,t+(Math.random()*.15))+(Math.random()-.5)*8,
            y:lerp(sw.tY,hy,t+(Math.random()*.15))+(Math.random()-.5)*8,
            vx:(Math.random()-.5)*.5, vy:(Math.random()-.5)*.5-.3,
            life:1, maxLife:.3+Math.random()*.3,
            size:1.5+Math.random()*2.5,
            color:Math.random()>.5?PURPLE:'#e9d5ff'});
          if(Math.hypot(sw.sx-hx,sw.sy-hy)<20&&rawT>=.9){ burst(hx,hy,18); setPhase('catch',250); }
          if(rawT>=1) setPhase('catch',250);
          break;
        }
        case 'catch':
          recallT=1-easeOut(rawT);
          if(rawT<.1) burst(hx,hy,12);
          sw.sx=hx; sw.sy=hy;
          if(rawT>=1) setPhase('cooldown',1000+Math.random()*800);
          break;
        case 'cooldown':
          windupT=0; throwT=0; recallT=0; sw.sx=hx; sw.sy=hy;
          if(rawT>=1) setPhase('idle',1800+Math.random()*2000);
          break;
      }

      shakeAmt*=0.82;
      const sk=(v: number) => shakeAmt>.3?(Math.random()-.5)*v:0;

      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.save();
      ctx.translate(sk(shakeAmt),sk(shakeAmt));

      // particles
      particles=particles.filter(pt=>pt.life>0.01);
      for(const pt of particles){
        pt.x+=pt.vx; pt.y+=pt.vy; pt.vy+=0.08;
        pt.life-=dt/(pt.maxLife*1000);
        ctx.save(); ctx.globalAlpha=clamp(pt.life,0,1)*0.9;
        ctx.fillStyle=pt.color;
        if(pt.color===PURPLE||pt.color.includes('168')){ctx.shadowColor=PURPLE;ctx.shadowBlur=5;}
        ctx.beginPath(); ctx.arc(pt.x,pt.y,pt.size*pt.life,0,TAU); ctx.fill();
        ctx.restore();
      }

      // recall energy beam
      if(sw.phase==='recall'){
        const grd=ctx.createLinearGradient(hx,hy,sw.sx,sw.sy);
        grd.addColorStop(0,'rgba(168,85,247,0.9)');
        grd.addColorStop(0.5,'rgba(200,160,255,0.5)');
        grd.addColorStop(1,'rgba(168,85,247,0)');
        ctx.save();
        ctx.globalAlpha=0.7+easeIn(rawT)*0.2;
        ctx.strokeStyle=grd; ctx.lineWidth=2+easeOut(rawT)*3;
        ctx.shadowColor=PURPLE; ctx.shadowBlur=12;
        ctx.beginPath(); ctx.moveTo(hx,hy); ctx.lineTo(sw.sx,sw.sy); ctx.stroke();
        ctx.lineWidth=0.8; ctx.globalAlpha=0.3; ctx.stroke();
        ctx.restore();
      }

      // stuck glow
      if(sw.phase==='stuck'){
        const pulse=0.4+Math.sin(now*.004)*.3;
        ctx.save(); ctx.globalAlpha=pulse*.25;
        ctx.shadowColor=PURPLE; ctx.shadowBlur=30;
        ctx.beginPath(); ctx.arc(sw.sx,sw.sy,20,0,TAU);
        ctx.fillStyle=PURPLE; ctx.fill(); ctx.restore();
      }

      // world sword
      const inHand=sw.phase==='idle'||sw.phase==='windup'||sw.phase==='catch'||sw.phase==='cooldown'||(sw.phase==='throw'&&rawT<.08);
      if(!inHand){
        const gp=sw.phase==='stuck'?.4+Math.sin(now*.004)*.3:sw.phase==='recall'?easeOut(rawT)*.8:0;
        drawSword(ctx,sw.sx,sw.sy,sw.sAngle,SC*0.6,gp);
      }

      // ground shadow
      ctx.save(); ctx.globalAlpha=0.08;
      const sg=ctx.createRadialGradient(f.x,f.y+4,0,f.x,f.y+4,TOTAL_H*.28);
      sg.addColorStop(0,'rgba(168,85,247,.6)'); sg.addColorStop(1,'rgba(168,85,247,0)');
      ctx.fillStyle=sg; ctx.beginPath();
      ctx.ellipse(f.x,f.y+4,TOTAL_H*.28,TOTAL_H*.07,0,0,TAU); ctx.fill(); ctx.restore();

      // pirate
      drawPirate({ ctx, ox:f.x, oy:f.y, sc:SC, breathT, windupT, throwT, recallT, hasSword:inHand });

      ctx.restore();
      rafRef.current=requestAnimationFrame(tick);
    };

    rafRef.current=requestAnimationFrame(tick);
    return ()=>{ cancelAnimationFrame(rafRef.current); window.removeEventListener('resize',resize); };
  },[]);

  return <canvas ref={canvasRef} style={{position:'fixed',inset:0,zIndex:9990,pointerEvents:'none'}} />;
};

export default PirateCorner;
