import React, { forwardRef } from 'react';
import { getPlayerUrl, ServerType } from '@/lib/tmdb';
import AdBlockWrapper from '@/components/AdBlockWrapper';

interface VideoPlayerProps {
  id: number;
  type: 'movie' | 'tv' | 'anime';
  season?: number;
  episode?: number;
  isDub?: boolean;
  title?: string;
  server?: ServerType;
}

const VideoPlayer = forwardRef<HTMLIFrameElement, VideoPlayerProps>(
  ({ id, type, season, episode, isDub = false, title, server = 'vidnest' }, ref) => {
    const playerUrl = getPlayerUrl(id, type, server, season, episode, isDub);

    return (
      <AdBlockWrapper>
        <div className="relative w-full" style={{ paddingBottom: '56.25%', height: 0 }}>
          <iframe
            ref={ref}
            src={playerUrl}
            title={title || 'PirateOne player'}
            className="absolute top-0 left-0 w-full h-full rounded-lg"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
            allowFullScreen
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            referrerPolicy="no-referrer"
            style={{ border: 'none' }}
          />
        </div>
      </AdBlockWrapper>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;
