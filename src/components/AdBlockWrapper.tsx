import React, { useState, useCallback, useRef } from 'react';
import { useAdBlocker } from '@/hooks/useAdBlocker';
import { cn } from '@/lib/utils';
import { ShieldCheck } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

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
  const [badgeExpanded, setBadgeExpanded] = useState(false);
  const [pendingPopupUrl, setPendingPopupUrl] = useState<string | null>(null);
  const lastClickTime = useRef(0);
  const shieldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAdBlocked = useCallback((type: string) => {
    setBlockedCount((prev) => prev + 1);
    setShowBlockedAnimation(true);
    setTimeout(() => setShowBlockedAnimation(false), 300);
  }, []);

  const handlePopupBlocked = useCallback((url: string) => {
    setPendingPopupUrl(url);
  }, []);

  useAdBlocker({ enabled: true, onAdBlocked: handleAdBlocked, onPopupBlocked: handlePopupBlocked });

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
        <button
          onClick={() => setBadgeExpanded(!badgeExpanded)}
          className={cn(
            "absolute top-2 right-2 z-30 flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-sm shadow-lg cursor-pointer transition-all duration-300",
            badgeExpanded ? "px-2.5 py-1.5" : "p-1.5"
          )}
        >
          <ShieldCheck className={cn("w-4 h-4 text-emerald-400 transition-transform", showBlockedAnimation && "scale-125")} />
          {badgeExpanded && (
            <span className="text-xs text-white flex items-center gap-1.5 animate-in fade-in-50 slide-in-from-right-2 duration-200">
              <span className="font-medium">Protected</span>
              <span className="text-white/40">|</span>
              <span className={cn(
                "font-semibold",
                blockedCount > 0 ? "text-red-400" : "text-white/60"
              )}>
                {blockedCount} {blockedCount === 1 ? 'ad' : 'ads'} blocked
              </span>
            </span>
          )}
        </button>
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

      {/* Popup confirmation dialog */}
      <AlertDialog open={!!pendingPopupUrl} onOpenChange={(open) => { if (!open) setPendingPopupUrl(null); }}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Popup Blocked</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              A page is trying to open:
              <span className="block mt-1 text-xs text-zinc-500 break-all bg-zinc-900 rounded px-2 py-1">
                {pendingPopupUrl}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
              onClick={() => setPendingPopupUrl(null)}
            >
              Block
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (pendingPopupUrl) {
                  window.open(pendingPopupUrl, '_blank', 'noopener,noreferrer');
                }
                setPendingPopupUrl(null);
              }}
            >
              Open Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdBlockWrapper;
