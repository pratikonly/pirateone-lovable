import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, Maximize, PictureInPicture2, Radio, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { fetchLiveChannel, getLiveApiErrorMessage, LiveApiError } from '@/lib/liveApi';

type PlaybackState = 'idle' | 'loading' | 'ready' | 'error';

type ShakaPlayerLike = {
  attach: (video: HTMLVideoElement) => Promise<void>;
  configure: (configuration: { drm: { clearKeys: Record<string, string> } }) => void;
  load: (source: string, startTime?: number) => Promise<void>;
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
  destroy: () => Promise<void>;
};

interface LivePlayerProps {
  channelId: string | null;
  channelName?: string;
}

const isHttpStatus = (value: unknown): value is number =>
  typeof value === 'number' && value >= 400 && value < 600;

const getShakaHttpStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object') return undefined;
  const data = (error as { data?: unknown }).data;
  return Array.isArray(data) ? data.find(isHttpStatus) : undefined;
};

const LivePlayer = ({ channelId, channelName }: LivePlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [playbackError, setPlaybackError] = useState('');
  const [resolvedName, setResolvedName] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRefreshingSource, setIsRefreshingSource] = useState(false);
  const [controlMessage, setControlMessage] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const container = playerContainerRef.current;
    const updateFullscreen = () => setIsFullscreen(document.fullscreenElement === container);
    document.addEventListener('fullscreenchange', updateFullscreen);
    return () => document.removeEventListener('fullscreenchange', updateFullscreen);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!channelId || !video) {
      setPlaybackState('idle');
      setPlaybackError('');
      setResolvedName('');
      setIsRefreshingSource(false);
      return;
    }

    let active = true;
    let player: ShakaPlayerLike | null = null;
    let isRefreshing = false;
    let lastRefreshAt = 0;
    const abortController = new AbortController();

    setPlaybackState('loading');
    setPlaybackError('');
    setResolvedName('');

    const loadFreshSource = async (resumeAt = 0) => {
      const activePlayer = player;
      if (!activePlayer) throw new Error('The video player is not ready yet.');

      const details = await fetchLiveChannel(channelId, abortController.signal);
      if (!active || abortController.signal.aborted) return;

      setResolvedName(details.name);
      if (details.drm?.type === 'clearkey') {
        activePlayer.configure({
          drm: { clearKeys: { [details.drm.keyId]: details.drm.key } },
        });
      }

      await activePlayer.load(details.sources[0], Math.max(0, resumeAt));
      if (active) {
        setPlaybackError('');
        setPlaybackState('ready');
      }
    };

    const handlePlayerError: EventListener = (event) => {
      const statusCode = getShakaHttpStatus((event as CustomEvent<unknown>).detail);

      if (statusCode === 401 || statusCode === 403 || statusCode === 410) {
        if (isRefreshing) return;
        if (Date.now() - lastRefreshAt > 15_000) {
          isRefreshing = true;
          lastRefreshAt = Date.now();
          setIsRefreshingSource(true);
          const currentTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;
          void loadFreshSource(currentTime)
            .catch((error: unknown) => {
              if (!active || abortController.signal.aborted) return;
              setPlaybackError(getLiveApiErrorMessage(error));
              setPlaybackState('error');
            })
            .finally(() => {
              isRefreshing = false;
              if (active) setIsRefreshingSource(false);
            });
        } else {
          setPlaybackError(getLiveApiErrorMessage(new LiveApiError(statusCode)));
          setPlaybackState('error');
        }
        return;
      }

      if (statusCode) {
        setPlaybackError(getLiveApiErrorMessage(new LiveApiError(statusCode)));
        setPlaybackState('error');
      }
    };

    const initializePlayer = async () => {
      try {
        const shakaModule = await import('shaka-player');
        if (!active) return;

        const shaka = shakaModule.default;
        shaka.polyfill.installAll();
        if (!shaka.Player.isBrowserSupported()) {
          throw new Error('This browser does not support the playback features required for this stream.');
        }

        const createdPlayer = new shaka.Player() as ShakaPlayerLike;
        player = createdPlayer;
        await createdPlayer.attach(video);
        if (!active) return;

        createdPlayer.addEventListener('error', handlePlayerError);
        await loadFreshSource();
      } catch (error) {
        if (!active || abortController.signal.aborted) return;
        const statusCode = getShakaHttpStatus(error);
        setPlaybackError(getLiveApiErrorMessage(statusCode ? new LiveApiError(statusCode) : error));
        setPlaybackState('error');
      }
    };

    void initializePlayer();

    return () => {
      active = false;
      abortController.abort();
      if (player) {
        player.removeEventListener('error', handlePlayerError);
        void player.destroy();
        player = null;
      }
    };
  }, [channelId, retryKey]);

  const toggleFullscreen = async () => {
    const container = playerContainerRef.current;
    if (!container) return;
    try {
      if (document.fullscreenElement === container) {
        await document.exitFullscreen();
      } else {
        await container.requestFullscreen();
      }
    } catch {
      setControlMessage('Fullscreen is not available in this browser.');
    }
  };

  const togglePictureInPicture = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement === video) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled && typeof video.requestPictureInPicture === 'function') {
        await video.requestPictureInPicture();
      } else {
        setControlMessage('Picture-in-picture is not available in this browser.');
      }
    } catch {
      setControlMessage('Picture-in-picture could not be started.');
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const displayName = resolvedName || channelName || (channelId ? 'Loading channel…' : 'Live TV');

  return (
    <section className="space-y-3" aria-label="Live channel player">
      <div
        ref={playerContainerRef}
        className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_18px_55px_rgba(0,0,0,0.45)]"
      >
        <video
          ref={videoRef}
          controls={Boolean(channelId)}
          playsInline
          preload="none"
          onVolumeChange={(event) => setIsMuted(event.currentTarget.muted)}
          className="h-full w-full bg-black object-contain"
          aria-label={channelId ? `Live stream: ${displayName}` : 'Live stream player'}
        />

        {(playbackState === 'idle' || playbackState === 'loading') && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/65 px-5 text-center">
            {playbackState === 'loading' ? (
              <LoaderCircle className="h-8 w-8 animate-spin text-red-500" aria-hidden="true" />
            ) : (
              <Radio className="h-9 w-9 text-red-500" aria-hidden="true" />
            )}
            <div>
              <p className="text-sm font-semibold text-white">
                {playbackState === 'loading' ? 'Connecting to channel…' : 'Choose a channel to start watching'}
              </p>
              {playbackState === 'loading' && (
                <p className="mt-1 text-xs text-zinc-400">{displayName}</p>
              )}
            </div>
          </div>
        )}

        {playbackState === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 px-5 text-center">
            <Radio className="h-8 w-8 text-red-500" aria-hidden="true" />
            <p className="max-w-lg text-sm text-zinc-200" role="alert">{playbackError}</p>
            <button
              type="button"
              onClick={() => setRetryKey((current) => current + 1)}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-zinc-950 transition-colors hover:bg-zinc-200"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Retry
            </button>
          </div>
        )}

        {isRefreshingSource && (
          <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/75 px-3 py-1.5 text-[11px] text-zinc-200">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin text-red-400" aria-hidden="true" />
            Refreshing stream…
          </div>
        )}

        {isFullscreen && (
          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            aria-label="Exit fullscreen"
            className="absolute right-3 top-3 rounded-full border border-white/15 bg-black/70 p-2 text-white hover:bg-black"
          >
            <Maximize className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{displayName}</p>
          {channelId && (
            <p className="mt-0.5 text-xs text-zinc-500">
              {playbackState === 'ready' ? 'Live stream' : playbackState === 'error' ? 'Playback unavailable' : 'Preparing stream'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            disabled={!channelId}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            title={isMuted ? 'Unmute' : 'Mute'}
            className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-zinc-300 transition-colors hover:border-white/25 hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isMuted
              ? <VolumeX className="h-4 w-4" aria-hidden="true" />
              : <Volume2 className="h-4 w-4" aria-hidden="true" />}
          </button>
          <button
            type="button"
            onClick={() => void togglePictureInPicture()}
            disabled={!channelId}
            aria-label="Picture in picture"
            title="Picture in picture"
            className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-zinc-300 transition-colors hover:border-white/25 hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <PictureInPicture2 className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            disabled={!channelId}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-zinc-300 transition-colors hover:border-white/25 hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Maximize className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {controlMessage && (
        <p className="text-xs text-zinc-400" role="status">{controlMessage}</p>
      )}
      <p className="text-xs leading-relaxed text-zinc-500">
        Streams may be geo-restricted to India.
      </p>
    </section>
  );
};

export default LivePlayer;