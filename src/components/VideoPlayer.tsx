import React, { forwardRef, useEffect, useRef, useCallback, useState } from 'react';
import { getPlayerUrl, ServerType } from '@/lib/tmdb';
import { MousePointerClick } from 'lucide-react';

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

    // ── 3. Blur = popup stealing focus → refocus ──────────────────────────────
    useEffect(() => {
      let t: ReturnType<typeof setTimeout> | null = null;
      const onBlur = () => {
        if (Date.now() - lastClickTimeRef.current < 1200) return;
        t = setTimeout(() => { window.focus(); reportBlock(); }, 30);
      };
      const onFocus = () => { if (t) clearTimeout(t); };
      window.addEventListener('blur', onBlur);
      window.addEventListener('focus', onFocus);
      return () => {
        window.removeEventListener('blur', onBlur);
        window.removeEventListener('focus', onFocus);
        if (t) clearTimeout(t);
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

    // ── Overlay click handler ─────────────────────────────────────────────────
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
      <div ref={wrapperRef} className="w-full space-y-2">
        {/* Player wrapper */}
        <div
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

        {/* Yellow hint note below the player */}
        <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-yellow-500/10 border border-yellow-500/30">
          <MousePointerClick className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-300/90 leading-relaxed">
            <span className="font-semibold text-yellow-300">Tip:</span> Sometimes you may need to{' '}
            <span className="font-semibold">click twice</span> to interact with the video player —
            the first click activates it, the second performs the action (play, pause, fullscreen, etc).
          </p>
        </div>
      </div>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';
export default VideoPlayer;
