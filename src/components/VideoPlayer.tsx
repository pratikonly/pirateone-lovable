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
  'vidking.net', 'youtube.com', 'themoviedb.org', 'jwplatform.com',
  'jwpcdn.com', 'cloudfront.net', 'akamai.net', 'fastly.net',
];

function isAllowedUrl(url: string): boolean {
  if (!url || url === 'about:blank' || url.startsWith('javascript:') || url.startsWith('#')) return true;
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
    // Track if blur was caused by user clicking the iframe (expected) vs a popup
    const iframeClickedRef = useRef(false);

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

    // ── 2. Smart blur detection ───────────────────────────────────────────────
    // When user clicks iframe, window loses focus — that's EXPECTED and fine.
    // When a popup tries to open, window also loses focus — that's what we block.
    // We tell the difference by tracking whether the iframe itself was just clicked.
    useEffect(() => {
      const container = iframeRef.current?.parentElement;

      const handleIframeMouseDown = () => {
        // User is clicking into the player — expected focus loss, don't block
        iframeClickedRef.current = true;
        setTimeout(() => { iframeClickedRef.current = false; }, 500);
      };

      const handleBlur = () => {
        if (blurTimerRef.current) clearTimeout(blurTimerRef.current);

        // If blur happened because user clicked the iframe, allow it
        if (iframeClickedRef.current) return;

        // Otherwise it's likely a popup — refocus quickly
        blurTimerRef.current = setTimeout(() => {
          window.focus();
          reportBlock();
        }, 50);
      };

      const handleFocus = () => {
        if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      };

      container?.addEventListener('mousedown', handleIframeMouseDown);
      window.addEventListener('blur', handleBlur);
      window.addEventListener('focus', handleFocus);

      return () => {
        container?.removeEventListener('mousedown', handleIframeMouseDown);
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
        if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

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

    // ── 5. Block postMessage navigation attempts ──────────────────────────────
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

    // ── 6. Remove injected ad iframes/scripts via MutationObserver ───────────
    useEffect(() => {
      const AD_PATTERNS = [
        /doubleclick\.net/i, /googlesyndication/i, /adnxs\.com/i,
        /exoclick/i, /trafficjunky/i, /popads/i, /popcash/i,
        /propellerads/i, /adsterra/i, /juicyads/i, /adsystem/i,
      ];
      const isAd = (src: string) => AD_PATTERNS.some(p => p.test(src));

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

    // ── 7. Block location.assign / replace redirects ──────────────────────────
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
      } catch { /* browser restriction — skip silently */ }

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
