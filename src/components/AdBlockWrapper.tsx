import React, { useState, useCallback, useRef } from 'react';
import { useAdBlocker } from '@/hooks/useAdBlocker';
import { cn } from '@/lib/utils';
import { ShieldCheck } from 'lucide-react';

interface AdBlockWrapperProps {
  children: React.ReactNode;
  className?: string;
  showProtectionBadge?: boolean;
}

const AdBlockWrapper: React.FC<AdBlockWrapperProps> = ({
  children,
  className,
  showProtectionBadge = true,
}) => {
  const [blockedCount, setBlockedCount] = useState(0);
  const [showBlockedAnimation, setShowBlockedAnimation] = useState(false);
  const [clickShieldActive, setClickShieldActive] = useState(true);
  const [clickCount, setClickCount] = useState(0);
  const lastClickTime = useRef(0);
  const shieldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAdBlocked = useCallback((type: string) => {
    setBlockedCount((prev) => prev + 1);
    setShowBlockedAnimation(true);
    setTimeout(() => setShowBlockedAnimation(false), 300);
  }, []);

  useAdBlocker({ enabled: true, onAdBlocked: handleAdBlocked });

  const handleShieldClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const now = Date.now();
    const timeSinceLastClick = now - lastClickTime.current;

    if (timeSinceLastClick > 2000) {
      setClickCount(1);
      lastClickTime.current = now;
      handleAdBlocked('click-shield intercept');
      return;
    }

    lastClickTime.current = now;
    const newCount = clickCount + 1;
    setClickCount(newCount);

    if (newCount >= 2) {
      setClickShieldActive(false);
      setClickCount(0);
      if (shieldTimerRef.current) clearTimeout(shieldTimerRef.current);
      shieldTimerRef.current = setTimeout(() => setClickShieldActive(true), 10000);
    } else {
      handleAdBlocked('click-shield intercept');
    }
  }, [clickCount, handleAdBlocked]);

  return (
    <div className={cn('relative', className)}>
      {showProtectionBadge && (
        <div className="absolute top-2 right-2 z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/70 backdrop-blur-sm text-xs text-white shadow-lg">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="font-medium">Protected</span>
          <span className="mx-1 text-white/40">|</span>
          <span
            className={cn(
              "font-semibold transition-all duration-200",
              blockedCount > 0 ? "text-red-400" : "text-white/60",
              showBlockedAnimation && "scale-125 text-red-300"
            )}
          >
            {blockedCount} {blockedCount === 1 ? 'ad' : 'ads'} blocked
          </span>
        </div>
      )}

      {clickShieldActive && (
        <div
          className="absolute inset-0 z-20 cursor-pointer"
          onClick={handleShieldClick}
          style={{ background: 'transparent' }}
        >
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm text-white/70 text-xs font-medium whitespace-nowrap pointer-events-none">
            Click twice to play (ad protection)
          </div>
        </div>
      )}

      {children}
    </div>
  );
};

export default AdBlockWrapper;
