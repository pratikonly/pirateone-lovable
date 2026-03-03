import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

const CannonCorner = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const fire = () => {
    // Cannonball shape — circle
    const cannonball = confetti.shapeFromPath({
      path: 'M5 0 A5 5 0 1 0 5 10 A5 5 0 1 0 5 0 Z',
    });

    // Main cannonball shot
    confetti({
      particleCount: 1,
      angle: 135,
      spread: 0,
      startVelocity: 80,
      decay: 0.94,
      gravity: 1.2,
      origin: { x: 1, y: 1 },
      colors: ['#1a1a2e'],
      shapes: [cannonball],
      scalar: 3,
      zIndex: 9999,
    });

    // Smoke burst at cannon mouth
    confetti({
      particleCount: 30,
      angle: 135,
      spread: 18,
      startVelocity: 20,
      decay: 0.88,
      gravity: 0.4,
      origin: { x: 1, y: 1 },
      colors: ['#555', '#777', '#999', '#aaa', '#333'],
      shapes: ['circle'],
      scalar: 1.2,
      ticks: 80,
      zIndex: 9999,
    });

    // Muzzle flash sparks (purple for your theme)
    confetti({
      particleCount: 15,
      angle: 135,
      spread: 30,
      startVelocity: 35,
      decay: 0.9,
      gravity: 0.8,
      origin: { x: 1, y: 1 },
      colors: ['#a855f7', '#e9d5ff', '#ffffff', '#f0abfc'],
      shapes: ['circle', 'square'],
      scalar: 0.7,
      ticks: 50,
      zIndex: 9999,
    });
  };

  useEffect(() => {
    // First fire after 2s, then every 5s
    const timeout = setTimeout(() => {
      fire();
      intervalRef.current = setInterval(fire, 5000);
    }, 2000);

    return () => {
      clearTimeout(timeout);
      clearInterval(intervalRef.current);
    };
  }, []);

  return (
    // SVG cannon sitting in the bottom-right corner
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        zIndex: 9998,
        pointerEvents: 'none',
        width: 140,
        height: 100,
      }}
    >
      <svg viewBox="0 0 140 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Wheels */}
        <circle cx="40" cy="82" r="16" fill="#1a0f2e" stroke="#a855f7" strokeWidth="2" />
        <circle cx="40" cy="82" r="8"  fill="#0c0814" stroke="#a855f7" strokeWidth="1.5" />
        <circle cx="95" cy="82" r="12" fill="#1a0f2e" stroke="#a855f7" strokeWidth="2" />
        <circle cx="95" cy="82" r="6"  fill="#0c0814" stroke="#a855f7" strokeWidth="1.5" />
        {/* Axle */}
        <line x1="40" y1="82" x2="95" y2="82" stroke="#a855f7" strokeWidth="2" strokeOpacity="0.4" />
        {/* Carriage */}
        <rect x="28" y="62" width="75" height="18" rx="3" fill="#140c24" stroke="#a855f7" strokeWidth="1.5" />
        {/* Barrel — angled top-left (pointing toward where the shot goes) */}
        <rect
          x="60" y="28"
          width="70" height="22"
          rx="11"
          fill="#0c0814"
          stroke="#a855f7"
          strokeWidth="2"
          transform="rotate(-35 95 62)"
        />
        {/* Barrel highlight */}
        <rect
          x="65" y="31"
          width="60" height="7"
          rx="3"
          fill="#1a0f2e"
          transform="rotate(-35 95 62)"
        />
        {/* Muzzle ring */}
        <ellipse
          cx="46" cy="24"
          rx="11" ry="6"
          fill="#140c24"
          stroke="#a855f7"
          strokeWidth="2"
          transform="rotate(-35 95 62) translate(-3 0)"
        />
        {/* Touch hole / fuse */}
        <circle cx="92" cy="56" r="3" fill="#a855f7" opacity="0.8" />
        {/* Purple glow under cannon */}
        <ellipse cx="70" cy="95" rx="55" ry="6" fill="url(#glow)" opacity="0.4" />
        <defs>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
};

export default CannonCorner;
