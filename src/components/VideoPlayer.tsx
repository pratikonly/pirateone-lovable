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

    // ── 1. Kill window.open popups every 50ms ────────────────────────────────
    useEffect(() => {
      const kill = () => {
        try { window.open = () => { reportBlock(); return null; }; } catch { /* cross-origin */ }
      };
      kill();
      const interval = setInterval(kill, 50);
      return () => clearInterval(interval);
    }, [reportBlock]);

    // ── 2. Kill beforeunload hijacks ─────────────────────────────────────────
    useEffect(() => {
      const handle = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
      window.addEventListener('beforeunload', handle);
      return () => window.removeEventListener('beforeunload', handle);
    }, []);

    // ── 3. Popup detection — NO window.focus() ───────────────────────────────
    // window.focus() was causing the refresh loop on tab switch.
    // Tab switch  → document.hidden goes true before/with blur → ignored
    // Real popup  → document stays visible, focus lost → count only, don't refocus
    useEffect(() => {
      let pendingCheck: ReturnType<typeof setTimeout> | null = null;

      const cancel = () => { if (pendingCheck) { clearTimeout(pendingCheck); pendingCheck = null; } };

      const onVisibilityChange = () => { if (document.hidden) cancel(); };

      const onBlur = () => {
        if (document.hidden) return;
        if (Date.now() - lastClickTimeRef.current < 1500) return;
        pendingCheck = setTimeout(() => {
          pendingCheck = null;
          if (!document.hidden) reportBlock(); // popup — just count, no focus()
        }, 80);
      };

      document.addEventListener('visibilitychange', onVisibilityChange);
      window.addEventListener('blur', onBlur);
      window.addEventListener('focus', cancel);

      return () => {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('blur', onBlur);
        window.removeEventListener('focus', cancel);
        cancel();
      };
    }, [reportBlock]);

    // ── 4. Remove injected ad nodes ──────────────────────────────────────────
    useEffect(() => {
      const AD = [/doubleclick\.net/i, /googlesyndication/i, /adnxs\.com/i,
        /exoclick/i, /trafficjunky/i, /popads/i, /popcash/i,
        /propellerads/i, /adsterra/i, /juicyads/i, /adsystem/i];
      const isAd = (src: string) => AD.some(p => p.test(src));
      const observer = new MutationObserver(mutations => {
        for (const m of mutations)
          for (const node of m.addedNodes)
            if (node instanceof HTMLElement && isAd((node as HTMLIFrameElement).src || ''))
              { node.remove(); reportBlock(); }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
      return () => observer.disconnect();
    }, [reportBlock]);

    const handleOverlayClick = useCallback(() => {
      lastClickTimeRef.current = Date.now();
      setOverlayVisible(false);
      setTimeout(() => setOverlayVisible(true), 800);
    }, []);

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
          // FIX: removed allowFullScreen prop — it conflicts with allow="fullscreen"
          // and generates the console warning. allow="fullscreen" is sufficient.
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
