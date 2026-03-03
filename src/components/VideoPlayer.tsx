import React, { forwardRef, useEffect, useRef, useCallback } from 'react';
import { getPlayerUrl, ServerType } from '@/lib/tmdb';

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
    const adCountRef = useRef(0);
    const onAdBlockedRef = useRef(onAdBlocked);

    useEffect(() => { onAdBlockedRef.current = onAdBlocked; }, [onAdBlocked]);

    const reportBlock = useCallback(() => {
      adCountRef.current += 1;
      onAdBlockedRef.current?.(adCountRef.current);
    }, []);

    // Secondary JS layer — catches anything sandbox misses
    useEffect(() => {
      // Block window.open at parent level (catches non-sandbox cases)
      const origOpen = window.open.bind(window);
      window.open = () => { reportBlock(); return null; };

      // Block beforeunload page hijacks
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('beforeunload', handleBeforeUnload);

      // Remove injected ad iframes/scripts
      const AD = [
        /doubleclick\.net/i, /googlesyndication/i, /adnxs\.com/i,
        /exoclick/i, /trafficjunky/i, /popads/i, /popcash/i,
        /propellerads/i, /adsterra/i, /juicyads/i,
      ];
      const isAd = (src: string) => AD.some(p => p.test(src));
      const observer = new MutationObserver(mutations => {
        for (const m of mutations) {
          for (const node of m.addedNodes) {
            if (
              (node instanceof HTMLIFrameElement || node instanceof HTMLScriptElement) &&
              isAd((node as HTMLIFrameElement | HTMLScriptElement).src || '')
            ) {
              node.remove();
              reportBlock();
            }
          }
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });

      return () => {
        window.open = origOpen;
        window.removeEventListener('beforeunload', handleBeforeUnload);
        observer.disconnect();
      };
    }, [reportBlock]);

    const setIframeRef = (el: HTMLIFrameElement | null) => {
      (iframeRef as React.MutableRefObject<HTMLIFrameElement | null>).current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLIFrameElement | null>).current = el;
    };

    return (
      <div className="relative w-full" style={{ paddingBottom: '56.25%', height: 0 }}>
        <iframe
          ref={setIframeRef}
          src={playerUrl}
          title={title || 'Video player'}
          className="absolute top-0 left-0 w-full h-full rounded-lg"
          // THE KEY: allow-scripts + allow-same-origin + allow-forms = player works fully
          // NO allow-popups = window.open() is completely blocked at browser level
          // allow-top-navigation = player can do internal navigation (needed for some players)
          // This combination does NOT trigger the "sandbox detected" error
          sandbox="allow-scripts allow-same-origin allow-forms allow-top-navigation allow-presentation"
          allowFullScreen
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          referrerPolicy="no-referrer"
          style={{ border: 'none' }}
        />
      </div>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';
export default VideoPlayer;
