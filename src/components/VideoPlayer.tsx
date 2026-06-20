import React, { forwardRef, useEffect, useRef, useCallback, useMemo } from 'react';
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
    const wrapperRef = useRef<HTMLDivElement>(null);
    const iframeRef  = useRef<HTMLIFrameElement>(null);
    const adCountRef = useRef(0);
    const onAdBlockedRef   = useRef(onAdBlocked);
    const lastClickTimeRef = useRef(0);

    const videoKey = useMemo(() => `${id}-${type}-${season}-${episode}-${server}-${isDub}`, [id, type, season, episode, server, isDub]);
    const initialProgressRef = useRef<number | null>(null);
    const lastVideoKeyRef = useRef<string>('');

    if (videoKey !== lastVideoKeyRef.current) {
      initialProgressRef.current = progressSeconds ?? null;
      lastVideoKeyRef.current = videoKey;
    }

    const playerUrl = useMemo(() => {
      return getPlayerUrl(id, type, server, season, episode, isDub, initialProgressRef.current ?? undefined);
    }, [id, type, server, season, episode, isDub]);

    useEffect(() => { onAdBlockedRef.current = onAdBlocked; }, [onAdBlocked]);

    const reportBlock = useCallback(() => {
      adCountRef.current += 1;
      onAdBlockedRef.current?.(adCountRef.current);
    }, []);

    // Block window.open popups — re-apply every 50ms to outlast player scripts that restore it
    useEffect(() => {
      const kill = () => {
        try { window.open = () => { reportBlock(); return null; }; } catch { /* cross-origin */ }
      };
      kill();
      const interval = setInterval(kill, 50);
      return () => clearInterval(interval);
    }, [reportBlock]);

    // Block page-level navigation hijacks (top.location redirects from inside iframes)
    useEffect(() => {
      const blockNav = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
      window.addEventListener('beforeunload', blockNav);
      return () => window.removeEventListener('beforeunload', blockNav);
    }, []);

    // Detect when an iframe click steals focus (opens a new tab) and snap focus back immediately.
    // We check if the blur happened within 1500ms of a recorded mousedown on the iframe wrapper —
    // if so, it was almost certainly an ad popup, so we call window.focus() synchronously (no delay)
    // to reclaim focus before the new tab can fully render.
    useEffect(() => {
      let blockUntil = 0;

      const onBlur = () => {
        if (document.hidden) return;
        const sinceClick = Date.now() - lastClickTimeRef.current;
        if (sinceClick < 1500) {
          // Synchronous snap-back — beats the new tab getting focus
          window.focus();
          reportBlock();
          // Keep blocking for a short window in case of rapid repeat attempts
          blockUntil = Date.now() + 2000;
        }
      };

      // Secondary guard: if focus somehow left and blockUntil is set, reclaim again
      const onFocusIn = () => {
        if (Date.now() < blockUntil) window.focus();
      };

      const onVis = () => {
        if (document.hidden && Date.now() - lastClickTimeRef.current < 1500) {
          window.focus();
          reportBlock();
        }
      };

      window.addEventListener('blur', onBlur);
      window.addEventListener('focusin', onFocusIn);
      document.addEventListener('visibilitychange', onVis);
      return () => {
        window.removeEventListener('blur', onBlur);
        window.removeEventListener('focusin', onFocusIn);
        document.removeEventListener('visibilitychange', onVis);
      };
    }, [reportBlock]);

    // Remove ad iframes injected into the page DOM
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
            if (node instanceof HTMLElement && isAd((node as HTMLIFrameElement).src || ''))
              { node.remove(); reportBlock(); }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
      return () => observer.disconnect();
    }, [reportBlock]);

    // Track clicks near the iframe so blur detection knows when to fire
    const handleMouseDown = useCallback(() => {
      lastClickTimeRef.current = Date.now();
    }, []);

    const setIframeRef = (el: HTMLIFrameElement | null) => {
      (iframeRef as React.MutableRefObject<HTMLIFrameElement | null>).current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLIFrameElement | null>).current = el;
    };

    return (
      <div
        ref={wrapperRef}
        className="relative w-full bg-black"
        style={{ paddingBottom: '56.25%', height: 0, borderRadius: '0.5rem' }}
        onMouseDown={handleMouseDown}
      >
        <iframe
          ref={setIframeRef}
          src={playerUrl}
          title={title || 'Video player'}
          className="absolute top-0 left-0 w-full h-full"
          allow="autoplay; encrypted-media; fullscreen *; picture-in-picture"
          allowFullScreen
          style={{ border: 'none', borderRadius: '0.5rem' }}
        />
      </div>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';
export default VideoPlayer;
