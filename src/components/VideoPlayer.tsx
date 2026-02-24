import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { getPlayerUrl, ServerType } from '@/lib/tmdb';
import AdBlockWrapper from '@/components/AdBlockWrapper';

interface VideoPlayerProps {
  id: number;
  type: 'movie' | 'tv' | 'anime';
  season?: number;
  episode?: number;
  isDub?: boolean;
  title?: string;
  server?: ServerType;
  onAdBlocked?: (count: number) => void;
}

const VideoPlayer = forwardRef<HTMLIFrameElement, VideoPlayerProps>(
  ({ id, type, season, episode, isDub = false, title, server = 'videasy', onAdBlocked }, ref) => {
    const playerUrl = getPlayerUrl(id, type, server, season, episode, isDub);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const shieldRef = useRef<HTMLDivElement>(null);
    const adCountRef = useRef(0);
    // Has the user clicked once to activate the player?
    const [activated, setActivated] = useState(false);
    const activatedRef = useRef(false);
    const restoreTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const openLockRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const noop = () => null;

    const lockWindowOpen = (durationMs: number) => {
      window.open = noop as typeof window.open;
      if (openLockRef.current) clearInterval(openLockRef.current);
      const deadline = Date.now() + durationMs;
      openLockRef.current = setInterval(() => {
        if (window.open !== (noop as typeof window.open)) {
          window.open = noop as typeof window.open;
          adCountRef.current += 1;
          onAdBlocked?.(adCountRef.current);
        }
        if (Date.now() >= deadline) {
          clearInterval(openLockRef.current!);
          openLockRef.current = null;
        }
      }, 30);
    };

    // ── Shield logic ─────────────────────────────────────────────────────────
    // Phase 1 (before first click): shield is ON — intercepts misclicks / accidental
    //   touches, locks ads, then lowers itself so click reaches iframe.
    // Phase 2 (after first click / activated): shield is OFF permanently.
    //   We rely purely on window-level ad blockers from useAdBlocker.
    //   The only time we re-raise the shield is if focus leaves the window
    //   (indicating a popup/redirect) — we close it immediately.

    const handlePointerDown = () => {
      if (activatedRef.current) return; // Shield is gone, shouldn't fire

      // Lock ads for 2 seconds starting NOW
      lockWindowOpen(2000);

      // Lower shield synchronously so the upcoming 'click' hits the iframe directly
      const shield = shieldRef.current;
      if (shield) shield.style.pointerEvents = 'none';

      // Mark as activated after a short delay (let the click fully process first)
      if (restoreTimer.current) clearTimeout(restoreTimer.current);
      restoreTimer.current = setTimeout(() => {
        activatedRef.current = true;
        setActivated(true); // removes shield from DOM entirely
      }, 400);
    };

    // After activation: if the window loses focus, it means something tried to
    // open a new tab/window. Close it immediately and re-focus.
    useEffect(() => {
      if (!activated) return;
      const handleBlur = () => {
        // Give 80ms — if we're still blurred it's likely a popup
        const t = setTimeout(() => {
          window.focus();
          // Try to close any popup that may have opened
          // (window.open is already blocked, but just in case)
          lockWindowOpen(1000);
          adCountRef.current += 1;
          onAdBlocked?.(adCountRef.current);
        }, 80);
        return () => clearTimeout(t);
      };
      window.addEventListener('blur', handleBlur);
      return () => window.removeEventListener('blur', handleBlur);
    }, [activated]);

    useEffect(() => {
      return () => {
        if (restoreTimer.current) clearTimeout(restoreTimer.current);
        if (openLockRef.current) clearInterval(openLockRef.current);
      };
    }, []);

    // Merge refs
    const setIframeRef = (el: HTMLIFrameElement | null) => {
      (iframeRef as React.MutableRefObject<HTMLIFrameElement | null>).current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLIFrameElement | null>).current = el;
    };

    return (
      <AdBlockWrapper onAdBlocked={(count) => { adCountRef.current = count; onAdBlocked?.(count); }}>
        <div className="relative w-full" style={{ paddingBottom: '56.25%', height: 0 }}>
          <iframe
            ref={setIframeRef}
            src={playerUrl}
            title={title || 'Video player'}
            className="absolute top-0 left-0 w-full h-full rounded-lg"
            allowFullScreen
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            referrerPolicy="no-referrer"
            style={{ border: 'none' }}
          />

          {/* Shield overlay — only present before first click */}
          {!activated && (
            <div
              ref={shieldRef}
              onPointerDown={handlePointerDown}
              onContextMenu={e => e.preventDefault()}
              className="absolute inset-0 z-10 cursor-pointer"
              style={{ background: 'transparent', pointerEvents: 'auto' }}
              aria-hidden="true"
            />
          )}
        </div>
      </AdBlockWrapper>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';
export default VideoPlayer;
