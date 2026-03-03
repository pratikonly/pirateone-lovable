import React, { forwardRef, useEffect, useRef, useCallback, useState } from 'react';
import { getPlayerUrl, ServerType } from '@/lib/tmdb';
import { saveWatchProgress, getWatchProgress, getProgressPercentage } from '@/lib/watchProgress';
import { useAuth } from '@/contexts/AuthContext';

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
    const { user } = useAuth();

    // Watch progress tracking state
    const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastSaveTimeRef = useRef(0);
    const lastKnownTimeRef = useRef(0);

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

    // ── 5. Watch progress tracking for autoembed server ───────────────────────
    useEffect(() => {
      // Only track progress for autoembed server when user is logged in
      if (server !== 'autoembed' || !user) return;

      const handleMessage = async (event: MessageEvent) => {
        // Only accept messages from autoembed domain
        if (!event.origin.includes('autoembed.cc')) return;

        try {
          const data = JSON.parse(event.data);

          // Handle time update from player
          if (data.event === 'timeupdate' && typeof data.currentTime === 'number') {
            lastKnownTimeRef.current = data.currentTime;

            // Save progress every 5 seconds or at 10-second intervals
            const now = Date.now();
            if (now - lastSaveTimeRef.current > 5000) {
              lastSaveTimeRef.current = now;
              await saveWatchProgress(
                id,
                type === 'anime' ? 'tv' : type,
                data.currentTime,
                data.duration || 0,
                server,
                season,
                episode
              );
            }
          }

          // Handle duration update
          if (data.event === 'durationchange' && typeof data.duration === 'number') {
            await saveWatchProgress(
              id,
              type === 'anime' ? 'tv' : type,
              lastKnownTimeRef.current,
              data.duration,
              server,
              season,
              episode
            );
          }

          // Handle video end
          if (data.event === 'ended') {
            await saveWatchProgress(
              id,
              type === 'anime' ? 'tv' : type,
              lastKnownTimeRef.current,
              lastKnownTimeRef.current,
              server,
              season,
              episode
            );
          }
        } catch (e) {
          // Ignore non-JSON messages
        }
      };

      // Add message listener
      window.addEventListener('message', handleMessage);

      // Save progress on mount (to track that user started watching)
      const initialSave = async () => {
        const existingProgress = await getWatchProgress(
          id,
          type === 'anime' ? 'tv' : type,
          season,
          episode,
          server
        );
        if (existingProgress && existingProgress.current_time > 0) {
          lastKnownTimeRef.current = existingProgress.current_time;
        }
      };
      initialSave();

      // Set up periodic save as backup (every 10 seconds)
      progressIntervalRef.current = setInterval(async () => {
        if (lastKnownTimeRef.current > 0) {
          await saveWatchProgress(
            id,
            type === 'anime' ? 'tv' : type,
            lastKnownTimeRef.current,
            lastKnownTimeRef.current * 1.2, // Estimate duration
            server,
            season,
            episode
          );
        }
      }, 10000);

      return () => {
        window.removeEventListener('message', handleMessage);
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      };
    }, [id, type, server, season, episode, user]);

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
