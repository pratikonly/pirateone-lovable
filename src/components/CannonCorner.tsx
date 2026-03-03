import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

const CannonCorner = () => {
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const timeoutRef  = useRef<ReturnType<typeof setTimeout>>();
  const isAnimating = useRef(false);

  const fire = () => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    // Cannonball — fires from bottom-RIGHT toward top-LEFT
    confetti({
      particleCount: 1,
      angle: 125,           // top-left direction
      spread: 0,
      startVelocity: 90,
      decay: 0.96,
      gravity: 1.0,
      origin: { x: 0.97, y: 0.97 },
      colors: ['#0a0a14'],
      shapes: ['circle'],
      scalar: 2.8,
      zIndex: 9999,
    });

    // Heavy smoke cloud
    confetti({
      particleCount: 35,
      angle: 125,
      spread: 22,
      startVelocity: 18,
      decay: 0.85,
      gravity: 0.25,
      origin: { x: 0.97, y: 0.97 },
      colors: ['#2a2a3a', '#3a3a4a', '#4a4a5a', '#1a1a2a', '#555566'],
      shapes: ['circle'],
      scalar: 1.4,
      ticks: 100,
      zIndex: 9999,
    });

    // Purple muzzle sparks
    confetti({
      particleCount: 18,
      angle: 125,
      spread: 35,
      startVelocity: 40,
      decay: 0.88,
      gravity: 1.0,
      origin: { x: 0.97, y: 0.97 },
      colors: ['#a855f7', '#c084fc', '#e9d5ff', '#ffffff', '#7c3aed'],
      shapes: ['circle', 'square'],
      scalar: 0.6,
      ticks: 55,
      zIndex: 9999,
    });

    setTimeout(() => { isAnimating.current = false; }, 600);
  };

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      fire();
      intervalRef.current = setInterval(fire, 5500);
    }, 1500);

    return () => {
      clearTimeout(timeoutRef.current);
      clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div style={{
      position:      'fixed',
      bottom:        0,
      right:         0,
      zIndex:        9998,
      pointerEvents: 'none',
      width:         100,
      height:        74,
    }}>
      <svg viewBox="0 0 100 74" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* Purple glow filter */}
          <filter id="pglow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="softglow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <radialGradient id="wheelGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#2d1b4e" />
            <stop offset="100%" stopColor="#0c0814" />
          </radialGradient>
          <radialGradient id="barrelGrad" cx="30%" cy="30%" r="70%">
            <stop offset="0%"   stopColor="#1e1040" />
            <stop offset="100%" stopColor="#080510" />
          </radialGradient>
          <radialGradient id="groundGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#a855f7" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0"    />
          </radialGradient>
          <linearGradient id="axleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#a855f7" stopOpacity="0.1" />
            <stop offset="50%"  stopColor="#a855f7" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Ground glow */}
        <ellipse cx="55" cy="70" rx="42" ry="5" fill="url(#groundGlow)" />

        {/* ── WHEELS ───────────────────────────────────────────── */}
        {/* Left (big) wheel */}
        <circle cx="30" cy="58" r="13" fill="url(#wheelGrad)" filter="url(#pglow)" />
        <circle cx="30" cy="58" r="13" fill="none" stroke="#a855f7" strokeWidth="1.5" />
        {/* Spokes */}
        {[0,60,120,180,240,300].map(deg => (
          <line key={deg}
            x1={30 + Math.cos(deg*Math.PI/180)*4}
            y1={58 + Math.sin(deg*Math.PI/180)*4}
            x2={30 + Math.cos(deg*Math.PI/180)*11}
            y2={58 + Math.sin(deg*Math.PI/180)*11}
            stroke="#a855f7" strokeWidth="1" strokeOpacity="0.7"
          />
        ))}
        <circle cx="30" cy="58" r="4"  fill="#0c0814" stroke="#a855f7" strokeWidth="1" />
        <circle cx="30" cy="58" r="1.5" fill="#a855f7" />

        {/* Right (small) wheel */}
        <circle cx="72" cy="62" r="9"  fill="url(#wheelGrad)" filter="url(#pglow)" />
        <circle cx="72" cy="62" r="9"  fill="none" stroke="#a855f7" strokeWidth="1.5" />
        {[0,60,120,180,240,300].map(deg => (
          <line key={deg}
            x1={72 + Math.cos(deg*Math.PI/180)*2.5}
            y1={62 + Math.sin(deg*Math.PI/180)*2.5}
            x2={72 + Math.cos(deg*Math.PI/180)*7.5}
            y2={62 + Math.sin(deg*Math.PI/180)*7.5}
            stroke="#a855f7" strokeWidth="0.8" strokeOpacity="0.7"
          />
        ))}
        <circle cx="72" cy="62" r="3"  fill="#0c0814" stroke="#a855f7" strokeWidth="0.8" />
        <circle cx="72" cy="62" r="1.2" fill="#a855f7" />

        {/* Axle beam */}
        <rect x="30" y="43" width="42" height="13" rx="2.5"
          fill="#0f0820" stroke="#a855f7" strokeWidth="1.2" />
        {/* Axle decorative rivets */}
        {[38, 48, 58, 64].map(x => (
          <circle key={x} cx={x} cy="49.5" r="1.2" fill="#a855f7" opacity="0.6" />
        ))}
        {/* Axle top edge highlight */}
        <line x1="32" y1="44.5" x2="70" y2="44.5"
          stroke="#a855f7" strokeWidth="0.5" strokeOpacity="0.4" />

        {/* ── BARREL — angled top-left ──────────────────────── */}
        {/* Barrel shadow/depth */}
        <rect x="12" y="17" width="52" height="20" rx="10"
          fill="#050308" opacity="0.7"
          transform="rotate(-32 62 45) translate(2 2)"
        />
        {/* Main barrel */}
        <rect x="12" y="17" width="52" height="20" rx="10"
          fill="url(#barrelGrad)"
          stroke="#a855f7" strokeWidth="1.5"
          filter="url(#pglow)"
          transform="rotate(-32 62 45)"
        />
        {/* Barrel band rings */}
        {[20, 34, 48].map(x => (
          <rect key={x}
            x={x} y="17" width="5" height="20" rx="0"
            fill="none" stroke="#a855f7" strokeWidth="0.8" strokeOpacity="0.5"
            transform="rotate(-32 62 45)"
          />
        ))}
        {/* Barrel top highlight */}
        <rect x="14" y="19" width="48" height="5" rx="4"
          fill="#a855f7" opacity="0.08"
          transform="rotate(-32 62 45)"
        />
        {/* Muzzle opening — dark circle at top-left end */}
        <ellipse cx="18" cy="21" rx="8" ry="7"
          fill="#050308"
          stroke="#a855f7" strokeWidth="1.2"
          filter="url(#softglow)"
          transform="rotate(-32 62 45)"
        />
        {/* Muzzle inner glow */}
        <ellipse cx="18" cy="21" rx="5" ry="4.5"
          fill="#a855f7" opacity="0.15"
          transform="rotate(-32 62 45)"
        />

        {/* Touch hole with fuse glow */}
        <circle cx="68" cy="39" r="2.5" fill="#a855f7" opacity="0.9" filter="url(#softglow)" />
        <circle cx="68" cy="39" r="1.2" fill="#e9d5ff" />

        {/* Fuse spark line */}
        <path d="M68 39 Q72 35 75 37 Q78 39 76 36"
          stroke="#a855f7" strokeWidth="1" fill="none"
          strokeDasharray="2 1.5" opacity="0.7"
        />
      </svg>
    </div>
  );
};

export default CannonCorner;
