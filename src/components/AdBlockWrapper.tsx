import React, { useState, useCallback } from 'react';
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

      {/* Video player content */}
      {children}
    </div>
  );
};

export default AdBlockWrapper;
