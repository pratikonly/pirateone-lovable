import { useEffect, useRef, useCallback } from 'react';

interface UseAdBlockerOptions {
  enabled?: boolean;
  onAdBlocked?: (type: string) => void;
}

export const useAdBlocker = ({ enabled = true, onAdBlocked }: UseAdBlockerOptions = {}) => {
  const originalHistoryPushState = useRef<typeof history.pushState | null>(null);
  const originalHistoryReplaceState = useRef<typeof history.replaceState | null>(null);
  const originalWindowOpen = useRef<typeof window.open | null>(null);
  const originalAlert = useRef<typeof window.alert | null>(null);
  const originalConfirm = useRef<typeof window.confirm | null>(null);
  const originalPrompt = useRef<typeof window.prompt | null>(null);
  const mutationObserverRef = useRef<MutationObserver | null>(null);
  const currentUrl = useRef(window.location.href);

  const logBlock = useCallback((type: string) => {
    console.log(`[AdBlocker] Blocked: ${type}`);
    onAdBlocked?.(type);
  }, [onAdBlocked]);

  // Block window.open popups
  useEffect(() => {
    if (!enabled) return;

    originalWindowOpen.current = window.open.bind(window);

    window.open = function(url?: string | URL, target?: string, features?: string) {
      const urlStr = url?.toString() || '';
      
      // Allow same-origin popups and blank targets for legitimate use
      if (urlStr.startsWith(window.location.origin) || urlStr.startsWith('/')) {
        return originalWindowOpen.current?.(url, target, features) ?? null;
      }
      
      // Block all external popups
      logBlock(`window.open popup to ${urlStr}`);
      return null;
    };

    return () => {
      if (originalWindowOpen.current) {
        window.open = originalWindowOpen.current;
      }
    };
  }, [enabled, logBlock]);

  // History manipulation protection
  useEffect(() => {
    if (!enabled) return;

    originalHistoryPushState.current = history.pushState.bind(history);
    originalHistoryReplaceState.current = history.replaceState.bind(history);

    const isLegitimateNavigation = (url: string | URL | null | undefined): boolean => {
      if (!url) return true;
      const urlStr = url.toString();
      // Allow same-origin navigations
      if (urlStr.startsWith('/') || urlStr.startsWith(window.location.origin)) {
        return true;
      }
      // Block external redirects
      return false;
    };

    history.pushState = function(state, title, url) {
      if (isLegitimateNavigation(url)) {
        originalHistoryPushState.current?.(state, title, url);
      } else {
        logBlock(`history.pushState to ${url}`);
      }
    };

    history.replaceState = function(state, title, url) {
      if (isLegitimateNavigation(url)) {
        originalHistoryReplaceState.current?.(state, title, url);
      } else {
        logBlock(`history.replaceState to ${url}`);
      }
    };

    return () => {
      if (originalHistoryPushState.current) {
        history.pushState = originalHistoryPushState.current;
      }
      if (originalHistoryReplaceState.current) {
        history.replaceState = originalHistoryReplaceState.current;
      }
    };
  }, [enabled, logBlock]);

  // Dialog overrides (alert, confirm, prompt abuse)
  useEffect(() => {
    if (!enabled) return;

    originalAlert.current = window.alert.bind(window);
    originalConfirm.current = window.confirm.bind(window);
    originalPrompt.current = window.prompt.bind(window);

    // Block suspicious dialogs
    window.alert = (message?: string) => {
      const suspiciousPatterns = [
        /virus/i, /malware/i, /infected/i, /warning/i, /prize/i, 
        /winner/i, /congratulations/i, /urgent/i, /security/i
      ];
      
      if (message && suspiciousPatterns.some(p => p.test(message))) {
        logBlock(`suspicious alert: ${message.substring(0, 50)}`);
        return;
      }
      originalAlert.current?.(message);
    };

    window.confirm = (message?: string) => {
      const suspiciousPatterns = [
        /virus/i, /malware/i, /leave/i, /stay/i, /prize/i, /winner/i
      ];
      
      if (message && suspiciousPatterns.some(p => p.test(message))) {
        logBlock(`suspicious confirm: ${message.substring(0, 50)}`);
        return false;
      }
      return originalConfirm.current?.(message) ?? false;
    };

    window.prompt = (message?: string, defaultValue?: string) => {
      const suspiciousPatterns = [/password/i, /credit/i, /card/i, /ssn/i, /social/i];
      
      if (message && suspiciousPatterns.some(p => p.test(message))) {
        logBlock(`suspicious prompt: ${message.substring(0, 50)}`);
        return null;
      }
      return originalPrompt.current?.(message, defaultValue) ?? null;
    };

    return () => {
      if (originalAlert.current) window.alert = originalAlert.current;
      if (originalConfirm.current) window.confirm = originalConfirm.current;
      if (originalPrompt.current) window.prompt = originalPrompt.current;
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

  // Focus/visibility monitoring - catch tab stealing
  useEffect(() => {
    if (!enabled) return;

    let lastFocusTime = Date.now();

    const handleBlur = () => {
      const now = Date.now();
      // If focus was lost very quickly after an interaction, it might be an ad
      if (now - lastFocusTime < 100) {
        logBlock('rapid focus loss (potential tab steal)');
        setTimeout(() => window.focus(), 0);
      }
    };

    const handleFocus = () => {
      lastFocusTime = Date.now();
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled, logBlock]);

  // PostMessage filtering
  useEffect(() => {
    if (!enabled) return;

    const handleMessage = (e: MessageEvent) => {
      // Allow messages from same origin
      if (e.origin === window.location.origin) return;

      // Block suspicious message patterns
      const suspiciousPatterns = [
        /redirect/i, /navigate/i, /window\.open/i, /location\.href/i
      ];

      const dataStr = typeof e.data === 'string' ? e.data : JSON.stringify(e.data);
      
      if (suspiciousPatterns.some(p => p.test(dataStr))) {
        logBlock(`suspicious postMessage from ${e.origin}`);
        e.stopImmediatePropagation();
      }
    };

    window.addEventListener('message', handleMessage, true);

    return () => {
      window.removeEventListener('message', handleMessage, true);
    };
  }, [enabled, logBlock]);

  // MutationObserver for dynamic ad injection
  useEffect(() => {
    if (!enabled) return;

    const suspiciousSelectors = [
      'iframe[src*="ad"]',
      'iframe[src*="pop"]',
      'iframe[src*="click"]',
      'div[class*="overlay"]',
      'div[class*="popup"]',
      'div[style*="z-index: 999"]',
      'div[style*="z-index:999"]',
      'div[style*="position: fixed"]',
    ];

    const isAdElement = (element: Element): boolean => {
      // Check if it's a suspicious iframe
      if (element.tagName === 'IFRAME') {
        const src = element.getAttribute('src') || '';
        const adPatterns = [/ad/i, /pop/i, /click/i, /track/i, /banner/i];
        if (adPatterns.some(p => p.test(src))) return true;
        
        // Check for hidden iframes
        const style = window.getComputedStyle(element);
        if (style.width === '0px' || style.height === '0px' || 
            style.visibility === 'hidden' || style.opacity === '0') {
          return true;
        }
      }

      // Check for overlay divs
      if (element.tagName === 'DIV') {
        const style = window.getComputedStyle(element);
        const zIndex = parseInt(style.zIndex) || 0;
        
        if (zIndex > 9999 && style.position === 'fixed') {
          const className = element.className?.toLowerCase() || '';
          if (className.includes('ad') || className.includes('pop') || 
              className.includes('overlay') || className.includes('modal')) {
            return true;
          }
        }
      }

      return false;
    };

    mutationObserverRef.current = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            
            if (isAdElement(element)) {
              logBlock(`injected ad element: ${element.tagName}`);
              element.remove();
            }

            // Also check children
            element.querySelectorAll('iframe, div').forEach((child) => {
              if (isAdElement(child)) {
                logBlock(`injected ad child: ${child.tagName}`);
                child.remove();
              }
            });
          }
        });
      });
    });

    mutationObserverRef.current.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      mutationObserverRef.current?.disconnect();
    };
  }, [enabled, logBlock]);

  return {
    isEnabled: enabled,
  };
};
