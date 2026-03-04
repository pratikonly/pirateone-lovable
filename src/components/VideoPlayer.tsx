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
      const handle = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('beforeunload', handle);
      return () => window.removeEventListener('beforeunload', handle);
    }, []);

    // ── 3. Popup-blocker via new-window detection ─────────────────────────────
    // ROOT CAUSE OF TAB-SWITCH REFRESH:
    // The previous approach called window.focus() on blur, which forcibly
    // yanked focus back every time the user switched tabs, causing React
    // Router to re-run navigation/render logic.
    //
    // New approach: we DO NOT call window.focus() at all.
    // Instead, we detect popup attempts via two signals:
    //   a) window.open is already killed above (returns null)
    //   b) We watch for new top-level windows via the 'blur' event ONLY when
    //      the page is currently visible AND the blur happens within a very
    //      short window after an iframe interaction (not a tab switch).
    //
    // Tab switches are identified by document.hidden becoming true, which fires
    // on the visibilitychange event BEFORE or simultaneously with blur.
    useEffect(() => {
      let pendingPopupCheck: ReturnType<typeof setTimeout> | null = null;

      const onVisibilityChange = () => {
        // Tab is being hidden — cancel any pending check immediately
        if (document.hidden && pendingPopupCheck) {
          clearTimeout(pendingPopupCheck);
          pendingPopupCheck = null;
        }
      };

      const onBlur = () => {
        // If the page is hidden, this is a tab switch — ignore completely
        if (document.hidden) return;

        // If user just clicked the overlay, the iframe is naturally receiving
        // focus — this is expected, not a popup
        if (Date.now() - lastClickTimeRef.current < 1500) return;

        // Schedule a popup check — but only actually act if the page is STILL
        // visible after the delay (rules out tab switches that fire blur then
        // visibilitychange in quick succession)
        pendingPopupCheck = setTimeout(() => {
          pendingPopupCheck = null;
          // Page is still visible but we lost focus → likely a popup
          if (!document.hidden) {
            reportBlock();
            // Do NOT call window.focus() — that's what caused the refresh loop
          }
        }, 100);
      };

      const onFocus = () => {
        // We got focus back — cancel popup check
        if (pendingPopupCheck) {
          clearTimeout(pendingPopupCheck);
          pendingPopupCheck = null;
        }
      };

      document.addEventListener('visibilitychange', onVisibilityChange);
      window.addEventListener('blur', onBlur);
      window.addEventListener('focus', onFocus);

      return () => {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('blur', onBlur);
        window.removeEventListener('focus', onFocus);
        if (pendingPopupCheck) clearTimeout(pendingPopupCheck);
      };
    }, [reportBlock]);

    // ── 4. Remove injected ad nodes ───────────────────────────────────────────
    useEffect(() => {
      const AD = [
        /doubleclick\.net/i, /googlesyndication/i, /adnxs\.com/i,
        /exoclick/i, /trafficjunky/i, /popads/i, /popcash/i,
        /propellerads/i, /adsterra/i, /juicyads/i, /adsystem/i,
      ];
      const isAd = (src: string) => AD.some(p => p.test(src));
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

    // ── Overlay click: hide 800ms so click reaches player, then restore ───────
    const handleOverlayClick = useCallback(() => {
      lastClickTimeRef.current = Date.now();
      setOverlayVisible(false);
      setTimeout(() => setOverlayVisible(true), 800);
    }, []);

    // Merge refs
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
