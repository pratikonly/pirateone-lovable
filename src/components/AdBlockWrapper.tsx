import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAdBlocker } from '@/hooks/useAdBlocker';
import { cn } from '@/lib/utils';
import { Shield, ShieldCheck, MousePointerClick } from 'lucide-react';

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
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showTapHint, setShowTapHint] = useState(false);
  const [blockedCount, setBlockedCount] = useState(0);
  const [showBlockedAnimation, setShowBlockedAnimation] = useState(false);
  const lastClickTime = useRef<number>(0);
  const clickTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleAdBlocked = useCallback((type: string) => {
    setBlockedCount((prev) => prev + 1);
    setShowBlockedAnimation(true);
    setTimeout(() => setShowBlockedAnimation(false), 300);
  }, []);

  // Enable ad blocking protections
  useAdBlocker({
    enabled: true,
    onAdBlocked: handleAdBlocked,
  });

  // Handle click shield - requires 2 rapid clicks to unlock
  const handleShieldClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const now = Date.now();
    const timeSinceLastClick = now - lastClickTime.current;

    if (timeSinceLastClick < 500 && lastClickTime.current > 0) {
      // Second click within 500ms - unlock!
      setIsUnlocked(true);
      setShowTapHint(false);
      if (clickTimeout.current) {
        clearTimeout(clickTimeout.current);
      }
    } else {
      // First click - show hint
      setShowTapHint(true);
      lastClickTime.current = now;

      // Reset hint after timeout
      if (clickTimeout.current) {
        clearTimeout(clickTimeout.current);
      }
      clickTimeout.current = setTimeout(() => {
        setShowTapHint(false);
        lastClickTime.current = 0;
      }, 1500);
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (clickTimeout.current) {
        clearTimeout(clickTimeout.current);
      }
    };
  }, []);

  return (
    <div className={cn('relative', className)}>
      {/* Protection badge */}
      {showProtectionBadge && (
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/70 backdrop-blur-sm text-xs text-white shadow-lg">
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
            {blockedCount} blocked
          </span>
        </div>
      )}

      {/* Click shield overlay */}
      {!isUnlocked && (
        <div
          onClick={handleShieldClick}
          className={cn(
            'absolute inset-0 z-10 cursor-pointer transition-all duration-300',
            'flex items-center justify-center',
            'bg-black/20 hover:bg-black/10',
            showTapHint && 'animate-pulse'
          )}
        >
          <div
            className={cn(
              'flex flex-col items-center gap-2 px-4 py-3 rounded-xl',
              'bg-black/70 backdrop-blur-sm transition-all duration-200',
              showTapHint ? 'scale-110 bg-black/80' : 'scale-100'
            )}
          >
            {showTapHint ? (
              <>
                <MousePointerClick className="w-8 h-8 text-white animate-bounce" />
                <span className="text-white text-sm font-medium">Tap again to play</span>
              </>
            ) : (
              <>
                <Shield className="w-8 h-8 text-white/70" />
                <span className="text-white/70 text-sm">Tap to unlock player</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Video player content */}
      {children}
    </div>
  );
};

export default AdBlockWrapper;
