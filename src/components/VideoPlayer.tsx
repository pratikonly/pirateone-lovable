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

const ALLOWED_DOMAINS = [
  'videasy.net', 'vidnest.fun', 'vidsrc.cc', 'vidzee.wtf', 'vidify.top',
  'autoembed.cc', 'vidsrc-embed.ru', 'vidsrc.su', 'vidlink.pro', 'vidfast.pro',
  'vidrock.net', '111movies.com', '2embed.cc', 'embed.su', 'vidup.to',
  'vidking.net', 'youtube.com', 'themoviedb.org',
];

function isAllowedUrl(url: string): boolean {
  try {
    const u = new URL(url, window.location.href);
    if (u.origin === window.location.origin) return true;
    return ALLOWED_DOMAINS.some(d => u.hostname === d || u.hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

const NOOP = () => null;

const VideoPlayer = forwardRef<HTMLIFrameElement, VideoPlayerProps>(
  ({ id, type, season, episode, isDub = false, title, server = 'videasy', onAdBlocked }, ref) => {
    const playerUrl = getPlayerUrl(id, type, server, season, episode, isDub);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const adCountRef = useRef(0);
    const lockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onAdBlockedRef = useRef(onAdBlocked);

    useEffect(() => { onAdBlockedRef.current = onAdBlocked; }, [onAdBlocked]);

    const reportBlock = useCallback(() => {
      adCountRef.current += 1;
      onAdBlockedRef.current?.(adCountRef.current);
    }, []);

    // ── 1. Lock window.open permanently, re-enforce every 100ms ──────────────
    useEffect(() => {
      window.open = NOOP as typeof window.open;
      lockIntervalRef.current = setInterval(() => {
        if (window.open !== (NOOP as typeof window.open)) {
          window.open = NOOP as typeof window.open;
          reportBlock();
        }
      }, 100);
      return () => {
        if (lockIntervalRef.current) clearInterval(lockIntervalRef.current);
      };
    }, [reportBlock]);

    // ── 2. Blur → popup detector: refocus within 20ms ────────────────────────
    useEffect(() => {
      const handleBlur = () => {
        if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
        blurTimerRef.current = setTimeout(() => {
          window.focus();
          reportBlock();
        }, 20);
      };
      const handleFocus = () => {
        if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      };
      window.addEventListener('blur', handleBlur);
      window.addEventListener('focus', handleFocus);
      return () => {
        window.removeEventListener('blur', handleBlur);
        window.removeEventListener('focus', handleFocus);
        if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      };
    }, [reportBlock]);

    // ── 3. Block external anchor clicks ──────────────────────────────────────
    useEffect(() => {
      const handleClick = (e: MouseEvent) => {
        const anchor = (e.target as HTMLElement)?.closest('a');
        if (!anchor) return;
        const href = anchor.getAttribute('href') ?? '';
        const target = anchor.getAttribute('target') ?? '';
        if (!href) return;
        const isExternal = href.startsWith('http') && !isAllowedUrl(href);
        const isNewTab = ['_blank', '_top', '_parent'].includes(target);
        if (isExternal || (isNewTab && !isAllowedUrl(href))) {
          e.preventDefault();
          e.stopImmediatePropagation();
          reportBlock();
        }
      };
      document.addEventListener('click', handleClick, true);
      return () => document.removeEventListener('click', handleClick, true);
    }, [reportBlock]);

    // ── 4. Block beforeunload hijacks ─────────────────────────────────────────
    useEffect(() => {
      const handle = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('beforeunload', handle);
      return () => window.removeEventListener('beforeunload', handle);
    }, []);

    // ── 5. Block postMessage navigation ──────────────────────────────────────
    useEffect(() => {
      const NAV = /\b(window\.location|top\.location|parent\.location)\s*[=.]/i;
      const OPEN = /window\.open\s*\(/i;
      const handle = (e: MessageEvent) => {
        if (typeof e.data === 'string' && (NAV.test(e.data) || OPEN.test(e.data))) {
          e.stopImmediatePropagation();
          reportBlock();
        }
      };
      window.addEventListener('message', handle, true);
      return () => window.removeEventListener('message', handle, true);
    }, [reportBlock]);

    // ── 6. Remove injected ad iframes/scripts ────────────────────────────────
    useEffect(() => {
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
              isAd(node.src || '')
            ) {
              node.remove();
              reportBlock();
            }
          }
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
      return () => observer.disconnect();
    }, [reportBlock]);

    // ── 7. Block location.assign / location.replace redirects ────────────────
    useEffect(() => {
      const proto = Object.getPrototypeOf(window.location) as Location;
      const origAssign = window.location.assign.bind(window.location);
      const origReplace = window.location.replace.bind(window.location);

      try {
        Object.defineProperty(proto, 'assign', {
          configurable: true,
          value(url: string) {
            if (isAllowedUrl(url)) origAssign(url);
            else reportBlock();
          },
        });
        Object.defineProperty(proto, 'replace', {
          configurable: true,
          value(url: string) {
            if (isAllowedUrl(url)) origReplace(url);
            else reportBlock();
          },
        });
      } catch { /* cross-origin restriction — skip */ }

      return () => {
        try {
          Object.defineProperty(proto, 'assign', { configurable: true, value: origAssign });
          Object.defineProperty(proto, 'replace', { configurable: true, value: origReplace });
        } catch { /* ignore */ }
      };
    }, [reportBlock]);

    // Merge refs
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
          /*
           * CRITICAL: sandbox WITHOUT allow-popups and WITHOUT allow-top-navigation
           * This is the browser's own hard block — embeds CANNOT open new tabs
           * or navigate the top frame. Players still work because:
           * - allow-scripts     → player JS runs fine
           * - allow-same-origin → player can talk to its own server
           * - allow-forms       → any form inside works
           * - allow-presentation → fullscreen presentations
           *
           * What is intentionally MISSING:
           * - allow-popups              → cannot open new tabs AT ALL
           * - allow-top-navigation      → cannot redirect parent page
           * - allow-popups-to-escape-sandbox → no sandbox escape
           */
          sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
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
