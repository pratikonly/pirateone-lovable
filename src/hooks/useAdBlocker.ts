import { useEffect, useRef, useCallback } from 'react';

interface UseAdBlockerOptions {
  enabled?: boolean;
  onAdBlocked?: (type: string) => void;
}

const LEGITIMATE_PLAYER_DOMAINS = ['videasy', 'vidking', 'vidzee', 'vidsrc', 'embed', 'player'];

const SUSPICIOUS_DIALOG_PATTERNS = [
  /virus/i, /malware/i, /infected/i, /warning/i, /prize/i,
  /winner/i, /congratulations/i, /urgent/i, /security/i,
  /ad/i, /click/i, /leave/i, /stay/i
];

const SUSPICIOUS_MESSAGE_KEYWORDS = [
  'ad', 'click', 'popup', 'redirect', 'track', 'analytics', 'banner'
];

const SUSPICIOUS_ELEMENT_PATTERNS = ['ad', 'popup', 'overlay', 'banner', 'sponsor'];

export const useAdBlocker = ({ enabled = true, onAdBlocked }: UseAdBlockerOptions = {}) => {
  const originalRefs = useRef({
    pushState: null as typeof history.pushState | null,
    replaceState: null as typeof history.replaceState | null,
    windowOpen: null as typeof window.open | null,
    alert: null as typeof window.alert | null,
    confirm: null as typeof window.confirm | null,
    prompt: null as typeof window.prompt | null,
  });
  const currentUrl = useRef(window.location.href);

  const logBlock = useCallback((type: string) => {
    console.log(`[AdBlocker] Blocked: ${type}`);
    onAdBlocked?.(type);
  }, [onAdBlocked]);

  // Block window.open popups
  useEffect(() => {
    if (!enabled) return;
    originalRefs.current.windowOpen = window.open.bind(window);
    window.open = function (url?: string | URL, target?: string, features?: string) {
      const urlStr = url?.toString() || '';
      if (urlStr.startsWith(window.location.origin) || urlStr.startsWith('/')) {
        return originalRefs.current.windowOpen?.(url, target, features) ?? null;
      }
      logBlock(`window.open popup to ${urlStr}`);
      return null;
    };
    return () => { if (originalRefs.current.windowOpen) window.open = originalRefs.current.windowOpen; };
  }, [enabled, logBlock]);

  // History manipulation protection
  useEffect(() => {
    if (!enabled) return;
    originalRefs.current.pushState = history.pushState.bind(history);
    originalRefs.current.replaceState = history.replaceState.bind(history);

    const isLegit = (url: string | URL | null | undefined) => {
      if (!url) return true;
      const s = url.toString();
      return s.startsWith('/') || s.startsWith(window.location.origin);
    };

    history.pushState = function (state, title, url) {
      if (isLegit(url)) originalRefs.current.pushState?.(state, title, url);
      else logBlock(`history.pushState to ${url}`);
    };
    history.replaceState = function (state, title, url) {
      if (isLegit(url)) originalRefs.current.replaceState?.(state, title, url);
      else logBlock(`history.replaceState to ${url}`);
    };

    return () => {
      if (originalRefs.current.pushState) history.pushState = originalRefs.current.pushState;
      if (originalRefs.current.replaceState) history.replaceState = originalRefs.current.replaceState;
    };
  }, [enabled, logBlock]);

  // Dialog overrides
  useEffect(() => {
    if (!enabled) return;
    originalRefs.current.alert = window.alert.bind(window);
    originalRefs.current.confirm = window.confirm.bind(window);
    originalRefs.current.prompt = window.prompt.bind(window);

    window.alert = (message?: string) => {
      if (message && SUSPICIOUS_DIALOG_PATTERNS.some(p => p.test(message))) {
        logBlock(`suspicious alert: ${message.substring(0, 50)}`);
        return;
      }
      originalRefs.current.alert?.(message);
    };

    window.confirm = (message?: string) => {
      if (message && SUSPICIOUS_DIALOG_PATTERNS.some(p => p.test(message))) {
        logBlock(`suspicious confirm: ${message.substring(0, 50)}`);
        return false;
      }
      return originalRefs.current.confirm?.(message) ?? false;
    };

    // Block ALL prompts
    window.prompt = (message?: string) => {
      logBlock(`blocked prompt: ${message?.substring(0, 50)}`);
      return null;
    };

    return () => {
      if (originalRefs.current.alert) window.alert = originalRefs.current.alert;
      if (originalRefs.current.confirm) window.confirm = originalRefs.current.confirm;
      if (originalRefs.current.prompt) window.prompt = originalRefs.current.prompt;
    };
  }, [enabled, logBlock]);

  // Popstate / hashchange protection
  useEffect(() => {
    if (!enabled) return;
    const handlePopState = (e: PopStateEvent) => {
      const newUrl = window.location.href;
      if (newUrl !== currentUrl.current && !newUrl.startsWith(window.location.origin)) {
        e.preventDefault();
        logBlock('popstate redirect');
        window.history.forward();
      }
      currentUrl.current = window.location.href;
    };
    const handleHashChange = (e: HashChangeEvent) => {
      if (!e.newURL.startsWith(window.location.origin)) {
        e.preventDefault();
        logBlock('hashchange redirect');
      }
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [enabled, logBlock]);

  // Focus/visibility monitoring
  useEffect(() => {
    if (!enabled) return;
    let lastFocusTime = Date.now();

    const handleBlur = () => {
      const now = Date.now();
      if (now - lastFocusTime < 100) {
        logBlock('rapid focus loss (potential tab steal)');
        setTimeout(() => window.focus(), 0);
      }
    };
    const handleFocus = () => { lastFocusTime = Date.now(); };
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTimeout(() => {
          if (document.hidden) {
            logBlock('unexpected visibility change');
            window.focus();
          }
        }, 100);
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, logBlock]);

  // PostMessage filtering
  useEffect(() => {
    if (!enabled) return;
    const handleMessage = (e: MessageEvent) => {
      if (e.origin === window.location.origin) return;
      const dataStr = typeof e.data === 'string' ? e.data : JSON.stringify(e.data);
      if (SUSPICIOUS_MESSAGE_KEYWORDS.some(kw => dataStr.toLowerCase().includes(kw))) {
        logBlock(`suspicious postMessage from ${e.origin}`);
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener('message', handleMessage, true);
    return () => window.removeEventListener('message', handleMessage, true);
  }, [enabled, logBlock]);

  // MutationObserver for dynamic ad injection
  useEffect(() => {
    if (!enabled) return;

    const isLegitimatePlayerSrc = (src: string) =>
      LEGITIMATE_PLAYER_DOMAINS.some(d => src.toLowerCase().includes(d));

    const isAdElement = (el: Element): boolean => {
      const tag = el.tagName;
      // Remove external iframes/scripts not from legitimate players
      if (tag === 'IFRAME' || tag === 'SCRIPT') {
        const src = el.getAttribute('src') || '';
        if (src && !isLegitimatePlayerSrc(src)) return true;
        if (tag === 'IFRAME') {
          const style = window.getComputedStyle(el);
          if (style.width === '0px' || style.height === '0px' ||
            style.visibility === 'hidden' || style.opacity === '0') return true;
        }
      }
      // Check overlay divs with z-index > 1000
      if (tag === 'DIV') {
        const style = window.getComputedStyle(el);
        const zIndex = parseInt(style.zIndex) || 0;
        if (zIndex > 1000 && (style.position === 'fixed' || style.position === 'absolute')) {
          const cls = (el.className?.toLowerCase() || '') + ' ' + (el.id?.toLowerCase() || '');
          if (SUSPICIOUS_ELEMENT_PATTERNS.some(p => cls.includes(p))) return true;
        }
      }
      return false;
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          const el = node as Element;
          if (isAdElement(el)) { logBlock(`injected ad: ${el.tagName}`); el.remove(); return; }
          el.querySelectorAll('iframe, script, div').forEach((child) => {
            if (isAdElement(child)) { logBlock(`injected ad child: ${child.tagName}`); child.remove(); }
          });
        });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [enabled, logBlock]);

  return { isEnabled: enabled };
};
