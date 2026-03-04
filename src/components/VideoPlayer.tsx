import React, { forwardRef, useEffect, useRef, useCallback, useState } from 'react';
import { getPlayerUrl, ServerType } from '@/lib/tmdb';

interface VideoPlayerProps {
  id: number;
  type: 'movie' | 'tv' | 'anime';
  season?: number;
  episode?: number;
  isDub?: boolean;
  title?: string;
  server?: ServerType;
  progressSeconds?: number;
  onAdBlocked?: (count: number) => void;
}

const VideoPlayer = forwardRef<HTMLIFrameElement, VideoPlayerProps>(
  ({ id, type, season, episode, isDub = false, title, server = 'videasy', progressSeconds, onAdBlocked }, ref) => {
    const playerUrl = getPlayerUrl(id, type, server, season, episode, isDub, progressSeconds);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const adCountRef = useRef(0);
    const onAdBlockedRef = useRef(onAdBlocked);
    const lastClickTimeRef = useRef(0);
    const [overlayVisible, setOverlayVisible] = useState(true);

    useEffect(() => { onAdBlockedRef.current = onAdBlocked; }, [onAdBlocked]);

    const reportBlock = useCallback(() => {
      adCountRef.current += 1;
      onAdBlockedRef.current?.(adCountRef.current);
    }, []);

    // ── 1. Kill window.open every 50ms ────────────────────────────────────────
    useEffect(() => {
      const kill = () => {
        try { window.open = () => { reportBlock(); return null; }; } catch { /* ignore */ }
      };
      kill();
      const interval = setInterval(kill, 50);
      return () => clearInterval(interval);
    }, [reportBlock]);

    // ── 2. Kill beforeunload hijacks ──────────────────────────────────────────
    useEffect(() => {
      const handle = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
      window.addEventListener('beforeunload', handle);
      return () => window.removeEventListener('beforeunload', handle);
    }, []);

    // ── 3. Detect popups WITHOUT calling window.focus() ───────────────────────
    //
    // ROOT CAUSE of tab-switch refresh:
    //   Previous code called window.focus() on every blur event, including when
    //   the user simply switched to another tab. This triggered React Router's
    //   navigation listeners, causing the Watch page to re-render/refresh.
    //
    // New approach:
    //   • Tab switch  → document.hidden becomes true BEFORE or WITH blur → ignore
    //   • Real popup  → document stays visible but focus is lost → count it
    //   • Never call window.focus() — that's what caused the loop
    useEffect(() => {
      let pendingCheck: ReturnType<typeof setTimeout> | null = null;

      const cancelPending = () => {
        if (pendingCheck) { clearTimeout(pendingCheck); pendingCheck = null; }
      };

      const onVisibilityChange = () => {
        // Tab is hiding — cancel any pending popup check immediately
        if (document.hidden) cancelPending();
      };

      const onBlur = () => {
        // Tab switch: page is now hidden → not a popup
        if (document.hidden) return;
        // User just clicked the player overlay → expected focus loss
        if (Date.now() - lastClickTimeRef.current < 1500) return;

        pendingCheck = setTimeout(() => {
          pendingCheck = null;
          // Still visible after delay → a real popup stole focus
          if (!document.hidden) {
            reportBlock();
            // ← NO window.focus() here — that was the refresh bug
          }
        }, 80);
      };

      const onFocus = () => cancelPending();

      document.addEventListener('visibilitychange', onVisibilityChange);
      window.addEventListener('blur', onBlur);
      window.addEventListener('focus', onFocus);

      return () => {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('blur', onBlur);
        window.removeEventListener('focus', onFocus);
        cancelPending();
      };
    }, [reportBlock]);

    // ── 4. Remove injected ad iframes ─────────────────────────────────────────
    useEffect(() => {
      const AD_PATTERNS = [
        /doubleclick\.net/i, /googlesyndication/i, /adnxs\.com/i,
        /exoclick/i, /trafficjunky/i, /popads/i, /popcash/i,
        /propellerads/i, /adsterra/i, /juicyads/i, /adsystem/i,
      ];
      const isAd = (src: string) => AD_PATTERNS.some(p => p.test(src));
      const observer = new MutationObserver(mutations => {
        for (const m of mutations)
          for (const node of m.addedNodes)
            if (node instanceof HTMLElement && isAd((node as HTMLIFrameElement).src || '')) {
              node.remove();
              reportBlock();
            }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
      return () => observer.disconnect();
    }, [reportBlock]);

    // ── Overlay click: pass click to player, then restore overlay ────────────
    const handleOverlayClick = useCallback(() => {
      lastClickTimeRef.current = Date.now();
      setOverlayVisible(false);
      setTimeout(() => setOverlayVisible(true), 800);
    }, []);

    // Merge forwarded ref with local ref
    const setIframeRef = (el: HTMLIFrameElement | null) => {
      (iframeRef as React.MutableRefObject<HTMLIFrameElement | null>).current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLIFrameElement | null>).current = el;
    };

    return (
      <div
        ref={wrapperRef}
        className="relative w-full rounded-lg overflow-hidden bg-black"
        style={{ paddingBottom: '56.25%', height: 0 }}
      >
        <iframe
          ref={setIframeRef}
          src={playerUrl}
          title={title || 'Video player'}
          className="absolute top-0 left-0 w-full h-full"
          allowFullScreen
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          referrerPolicy="no-referrer"
          style={{ border: 'none' }}
        />
        {overlayVisible && (
          <div
            className="absolute inset-0 z-10"
            style={{ background: 'transparent', cursor: 'pointer' }}
            onClick={handleOverlayClick}
          />
        )}
      </div>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';
export default VideoPlayer;
