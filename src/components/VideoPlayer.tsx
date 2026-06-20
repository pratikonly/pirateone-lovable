import React, { forwardRef, useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { Play } from 'lucide-react';
import { getPlayerUrl, ServerType } from '@/lib/tmdb';

interface VideoPlayerProps {
  id: number;
  type: 'movie' | 'tv' | 'anime';
  season?: number;
  episode?: number;
  isDub?: boolean;
  title?: string;
  poster?: string | null;
  server?: ServerType;
  progressSeconds?: number;
  onAdBlocked?: (count: number) => void;
}

const VideoPlayer = forwardRef<HTMLIFrameElement, VideoPlayerProps>(
  ({ id, type, season, episode, isDub = false, title, poster, server = 'videasy', progressSeconds, onAdBlocked }, ref) => {
    const wrapperRef       = useRef<HTMLDivElement>(null);
    const iframeRef        = useRef<HTMLIFrameElement>(null);
    const adCountRef       = useRef(0);
    const onAdBlockedRef   = useRef(onAdBlocked);
    const lastClickTimeRef = useRef(0);
    const blockUntilRef    = useRef(0);

    // Lazy-load state — iframe is not injected until the user clicks Play.
    // This eliminates the page-load redirect that some servers trigger automatically.
    const [loaded, setLoaded] = useState(false);

    const videoKey = useMemo(
      () => `${id}-${type}-${season}-${episode}-${server}-${isDub}`,
      [id, type, season, episode, server, isDub]
    );
    const initialProgressRef = useRef<number | null>(null);
    const lastVideoKeyRef    = useRef<string>('');

    // Reset to poster screen whenever the video/server changes
    useEffect(() => {
      if (videoKey !== lastVideoKeyRef.current) {
        initialProgressRef.current = progressSeconds ?? null;
        lastVideoKeyRef.current    = videoKey;
        setLoaded(false);
      }
    }, [videoKey, progressSeconds]);

    const playerUrl = useMemo(
      () => getPlayerUrl(id, type, server, season, episode, isDub, initialProgressRef.current ?? undefined),
      [id, type, server, season, episode, isDub]
    );

    useEffect(() => { onAdBlockedRef.current = onAdBlocked; }, [onAdBlocked]);

    const reportBlock = useCallback(() => {
      adCountRef.current += 1;
      onAdBlockedRef.current?.(adCountRef.current);
    }, []);

    // Override window.open every 50 ms — outlasts player scripts that try to restore it
    useEffect(() => {
      const kill = () => {
        try { window.open = () => { reportBlock(); return null; }; } catch { /* cross-origin */ }
      };
      kill();
      const interval = setInterval(kill, 50);
      return () => clearInterval(interval);
    }, [reportBlock]);

    // Block top-level navigation hijacks (beforeunload redirect)
    useEffect(() => {
      const blockNav = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
      window.addEventListener('beforeunload', blockNav);
      return () => window.removeEventListener('beforeunload', blockNav);
    }, []);

    // Focus-snap: immediately reclaim focus when the iframe steals it.
    // Fires synchronously so we beat the new tab before it fully renders.
    useEffect(() => {
      const onBlur = () => {
        if (document.hidden) return;
        const sinceClick = Date.now() - lastClickTimeRef.current;
        const inBlock    = Date.now() < blockUntilRef.current;
        if (sinceClick < 1500 || inBlock) {
          window.focus();
          reportBlock();
          blockUntilRef.current = Date.now() + 2000;
        }
      };

      const onFocusIn = () => {
        if (Date.now() < blockUntilRef.current) window.focus();
      };

      const onVis = () => {
        const sinceClick = Date.now() - lastClickTimeRef.current;
        const inBlock    = Date.now() < blockUntilRef.current;
        if (document.hidden && (sinceClick < 1500 || inBlock)) {
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
      const AD = [
        /doubleclick\.net/i, /googlesyndication/i, /adnxs\.com/i,
        /exoclick/i, /trafficjunky/i, /popads/i, /popcash/i,
        /propellerads/i, /adsterra/i, /juicyads/i, /adsystem/i,
      ];
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

    // Keep lastClickTimeRef fresh while the mouse moves over the iframe
    // so the blur guard stays active throughout playback interaction
    const handleMouseMove = useCallback(() => {
      lastClickTimeRef.current = Date.now();
    }, []);

    const handleMouseDown = useCallback(() => {
      lastClickTimeRef.current = Date.now();
    }, []);

    // User explicitly clicks Play — record the time, open a 15-second protection
    // window that covers both our click and the player's own "click to start" button
    const handlePlay = useCallback(() => {
      lastClickTimeRef.current = Date.now();
      blockUntilRef.current    = Date.now() + 15000;
      setLoaded(true);
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
        onMouseMove={handleMouseMove}
      >
        {!loaded ? (
          /* ── Poster / Play overlay ── */
          <div className="absolute inset-0 flex items-center justify-center rounded-lg overflow-hidden cursor-pointer group"
            onClick={handlePlay}>
            {poster ? (
              <img
                src={poster}
                alt={title || 'Video thumbnail'}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-zinc-900" />
            )}
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-colors" />
            {/* Play button */}
            <div className="relative z-10 w-20 h-20 rounded-full bg-white/10 border-2 border-white/60 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 group-hover:bg-white/20 transition-all duration-200 shadow-2xl">
              <Play className="w-8 h-8 text-white fill-white ml-1" />
            </div>
            {title && (
              <span className="absolute bottom-4 left-0 right-0 text-center text-sm font-semibold text-white/80 drop-shadow">
                {title}
              </span>
            )}
          </div>
        ) : (
          /* ── Actual iframe ── */
          <iframe
            ref={setIframeRef}
            src={playerUrl}
            title={title || 'Video player'}
            className="absolute top-0 left-0 w-full h-full"
            allow="autoplay; encrypted-media; fullscreen *; picture-in-picture"
            allowFullScreen
            style={{ border: 'none', borderRadius: '0.5rem' }}
          />
        )}
      </div>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';
export default VideoPlayer;
