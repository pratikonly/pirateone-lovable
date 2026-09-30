import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play, Plus } from 'lucide-react';
import { Movie, getBackdropUrl, getMovieImages, getTVImages, getLogoUrl, getMovieVideos, getTVVideos, getYouTubeEmbedUrl, Video } from '@/lib/tmdb';
import { addToWatchlist, isInWatchlist } from '@/lib/watchlist';
import { addToWatchlistDb, isInWatchlistDb } from '@/lib/watchlistDb';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import TrailerModal from './TrailerModal';
import { useSetBackdropUrl } from '@/contexts/BackdropContext';

const preloadImage = (src: string | null) => {
  if (!src) return Promise.resolve();

  return new Promise<void>((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = src;
  });
};

interface HeroBannerProps {
  movies: Movie[];
  isLoading?: boolean;
}

const HeroBanner = ({ movies, isLoading = false }: HeroBannerProps) => {
  const navigate = useNavigate();
  const setBackdropUrl = useSetBackdropUrl();
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'next' | 'previous'>('next');
  const [inWatchlist, setInWatchlist] = useState(false);
  const [logos, setLogos] = useState<Record<string, string | null>>({});
  const [trailers, setTrailers] = useState<Record<string, Video | null>>({});
  const [trailerOpen, setTrailerOpen] = useState(false);
  const requestedLogoKeys = useRef(new Set<string>());
  const requestedTrailerKeys = useRef(new Set<string>());
  const transitionTimeout = useRef<number | null>(null);
  const sceneIframeRef = useRef<HTMLIFrameElement | null>(null);

  const featuredMovies = useMemo(() => movies.slice(0, 5), [movies]);
  const currentMovie = featuredMovies[currentIndex];
  const logoKey = currentMovie
    ? `${currentMovie.media_type || 'movie'}-${currentMovie.id}`
    : '';
  const logoPath = logos[logoKey];
  const logoUrl = logoPath ? getLogoUrl(logoPath, 'w500') : null;
  const isLogoReady = !currentMovie || logos[logoKey] !== undefined;
  const currentTrailer = trailers[logoKey];

  useEffect(() => {
    if (currentMovie?.backdrop_path) {
      setBackdropUrl(getBackdropUrl(currentMovie.backdrop_path, 'original'));
    }

    return () => {
      setBackdropUrl(null);
    };
  }, [currentMovie, setBackdropUrl]);

  useEffect(() => {
    const fetchLogos = async () => {
      const logoPromises = featuredMovies.map(async (movie) => {
        const key = `${movie.media_type || 'movie'}-${movie.id}`;
        if (requestedLogoKeys.current.has(key)) return;
        requestedLogoKeys.current.add(key);

        try {
          const mediaType = movie.media_type || 'movie';
          const images = mediaType === 'tv'
            ? await getTVImages(movie.id)
            : await getMovieImages(movie.id);

          const englishLogos = images.logos
            .filter(l => l.iso_639_1 === 'en' || l.iso_639_1 === null)
            .sort((a, b) => b.width - a.width);

          const logoPath = englishLogos[0]?.file_path || null;
          await preloadImage(logoPath ? getLogoUrl(logoPath, 'w500') : null);
          setLogos(prev => ({ ...prev, [key]: logoPath }));
        } catch {
          setLogos(prev => ({ ...prev, [key]: null }));
        }
      });

      await Promise.all(logoPromises);
    };

    if (featuredMovies.length > 0) {
      fetchLogos();
    }
  }, [featuredMovies]);

  useEffect(() => {
    const fetchTrailers = async () => {
      const trailerPromises = featuredMovies.map(async (movie) => {
        const key = `${movie.media_type || 'movie'}-${movie.id}`;
        if (requestedTrailerKeys.current.has(key)) return;
        requestedTrailerKeys.current.add(key);

        try {
          const mediaType = movie.media_type || 'movie';
          const videos = mediaType === 'tv'
            ? await getTVVideos(movie.id)
            : await getMovieVideos(movie.id);

          const trailer = videos.results.find(
            v => v.site === 'YouTube' && v.type === 'Trailer' && v.official
          ) || videos.results.find(
            v => v.site === 'YouTube' && v.type === 'Trailer'
          ) || videos.results.find(
            v => v.site === 'YouTube' && (v.type === 'Teaser' || v.type === 'Clip')
          );

          setTrailers(prev => ({ ...prev, [key]: trailer || null }));
        } catch {
          setTrailers(prev => ({ ...prev, [key]: null }));
        }
      });

      await Promise.all(trailerPromises);
    };

    if (featuredMovies.length > 0) {
      fetchTrailers();
    }
  }, [featuredMovies]);

  const goToSlide = useCallback((nextIndex: number, direction: 'next' | 'previous') => {
    if (featuredMovies.length <= 1 || nextIndex === currentIndex || isTransitioning) return;

    if (transitionTimeout.current) {
      window.clearTimeout(transitionTimeout.current);
    }

    setSlideDirection(direction);
    setIsTransitioning(true);
    transitionTimeout.current = window.setTimeout(() => {
      setCurrentIndex(nextIndex);
      setIsTransitioning(false);
      transitionTimeout.current = null;
    }, 480);
  }, [currentIndex, featuredMovies.length, isTransitioning]);

  const subscribeToSceneEvents = useCallback((iframe: HTMLIFrameElement) => {
    const postMessage = (message: object) => {
      iframe.contentWindow?.postMessage(JSON.stringify(message), '*');
    };

    postMessage({ event: 'listening', id: 'pirateone-hero-scene', channel: 'pirateone-hero-scene' });
    postMessage({
      event: 'command',
      func: 'addEventListener',
      args: ['onStateChange'],
      id: 'pirateone-hero-scene',
      channel: 'pirateone-hero-scene',
    });
  }, []);

  useEffect(() => {
    const handleSceneMessage = (event: MessageEvent) => {
      if (!['https://www.youtube.com', 'https://www.youtube-nocookie.com'].includes(event.origin)) return;

      let data: { event?: string; info?: number } | null = null;
      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      if (data?.event === 'onStateChange' && Number(data.info) === 0) {
        goToSlide((currentIndex + 1) % featuredMovies.length, 'next');
      }
    };

    window.addEventListener('message', handleSceneMessage);
    return () => window.removeEventListener('message', handleSceneMessage);
  }, [currentIndex, featuredMovies.length, goToSlide]);

  useEffect(() => {
    if (featuredMovies.length <= 1 || currentTrailer?.key) return;

    const interval = window.setInterval(() => {
      goToSlide((currentIndex + 1) % featuredMovies.length, 'next');
    }, 8500);

    return () => window.clearInterval(interval);
  }, [currentIndex, currentTrailer?.key, featuredMovies.length, goToSlide]);

  useEffect(() => () => {
    if (transitionTimeout.current) {
      window.clearTimeout(transitionTimeout.current);
    }
  }, []);

  useEffect(() => {
    const syncWatchlistState = async () => {
      if (!currentMovie) return;
      const mediaType = currentMovie.media_type || 'movie';

      if (user) {
        const inDb = await isInWatchlistDb(currentMovie.id, mediaType);
        setInWatchlist(inDb);
        return;
      }

      setInWatchlist(isInWatchlist(currentMovie.id, mediaType));
    };

    syncWatchlistState();
  }, [currentMovie, user]);

  if (isLoading || !currentMovie || !isLogoReady) {
    return (
      <div
        className="relative h-[60vh] md:h-[70vh] min-h-[400px] max-h-[600px] -mt-14 mb-8 overflow-hidden"
        role="status"
        aria-label="Loading featured titles"
      >
        <div className="absolute inset-0 bg-muted/40 animate-pulse" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-background/50" />
        <div className="absolute inset-0 flex items-center">
          <div className="container mx-auto px-4 lg:px-6 pt-14">
            <div className="flex items-center gap-6 lg:gap-10">
              <div className="flex-1 max-w-2xl space-y-5">
                <div className="flex items-center gap-3">
                  <div className="h-7 w-20 rounded-full bg-muted animate-shimmer" />
                  <div className="h-7 w-14 rounded-full bg-muted animate-shimmer" />
                  <div className="h-7 w-12 rounded-full bg-muted animate-shimmer" />
                </div>
               <div className="h-14 sm:h-16 md:h-20 w-[72%] max-w-lg rounded-md bg-muted animate-shimmer" />
                <div className="flex gap-3 pt-1">
                  <div className="h-11 w-28 rounded-md bg-primary/15 animate-shimmer" />
                  <div className="h-11 w-28 rounded-md bg-muted animate-shimmer" />
                  <div className="h-11 w-24 rounded-md bg-muted animate-shimmer" />
                </div>
              </div>
             <div className="hidden md:block flex-1 aspect-video rounded-2xl border border-border bg-muted animate-shimmer" />
            </div>
          </div>
        </div>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <div className="h-2 w-6 rounded-full bg-muted-foreground/40 animate-pulse" />
          {[...Array(4)].map((_, index) => (
            <div key={index} className="h-2 w-2 rounded-full bg-muted animate-pulse" />
          ))}
        </div>
        <span className="sr-only">Loading featured titles</span>
      </div>
    );
  }

  const backdropUrl = getBackdropUrl(currentMovie.backdrop_path, 'original');
  const title = currentMovie.title || currentMovie.name || 'Untitled';
  const rating = currentMovie.vote_average?.toFixed(1) || 'N/A';
  const year = (currentMovie.release_date || currentMovie.first_air_date)?.split('-')[0] || '';
  const mediaType = currentMovie.media_type || 'movie';

  const handlePlay = () => {
    navigate(`/watch/${mediaType}/${currentMovie.id}`);
  };

  const handleAddToList = async () => {
    if (inWatchlist) return;

    if (user) {
      await addToWatchlistDb({ ...currentMovie, media_type: mediaType });
    } else {
      addToWatchlist({ ...currentMovie, media_type: mediaType });
    }

    setInWatchlist(true);
  };

  const handleTrailerClick = () => {
    if (currentTrailer) {
      setTrailerOpen(true);
    }
  };


  return (
    <div
      className="hero-banner relative -mt-14 mb-8 min-h-[680px] overflow-hidden bg-black md:h-[72vh] md:min-h-[520px] md:max-h-[720px]"
      aria-roledescription="carousel"
      aria-label="Featured titles"
    >
      <div className="absolute inset-0">
        {featuredMovies.map((movie, index) => {
          const url = getBackdropUrl(movie.backdrop_path, 'original');
          return (
            <div
              key={movie.id}
              className={cn(
                'hero-slide absolute inset-0 overflow-hidden transition-[opacity,transform] duration-700 ease-out',
                index === currentIndex
                  ? 'opacity-100 translate-x-0'
                  : cn(
                    'pointer-events-none opacity-0',
                    slideDirection === 'next' ? 'translate-x-10' : '-translate-x-10'
                  )
              )}
            >
              {url && (
                <img
                  src={url}
                  alt=""
                  className="h-full w-full object-cover opacity-40"
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/50" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/70" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-transparent" />
      <div className="absolute inset-0 shadow-[inset_0_0_180px_45px_rgba(0,0,0,0.95)]" />

      <div className="relative z-10 flex min-h-[680px] items-center md:h-full md:min-h-0">
        <div className="container mx-auto px-5 pb-16 pt-24 sm:px-8 lg:px-10">
          <div className="grid items-center gap-10 md:grid-cols-[2fr_3fr] md:gap-10 lg:gap-14">
            <div className={cn(
              'min-w-0 transition-all duration-500',
              isTransitioning ? 'translate-x-4 opacity-0' : 'translate-x-0 opacity-100'
            )}>
              <div className="mb-4 flex flex-wrap items-center gap-2 md:gap-3">
                <span className="rounded-full border border-white/40 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-black shadow-lg">
                  {mediaType === 'tv' ? 'TV Series' : 'Movie'}
                </span>
                <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-white backdrop-blur-sm">
                  <svg className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  <span className="text-xs font-semibold">{rating}</span>
                </div>
                <span className="rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-xs text-white/70 backdrop-blur-sm">
                  {year}
                </span>
              </div>

              {logoUrl ? (
                <div className="mb-3 md:mb-4">
                  <img
                    src={logoUrl}
                    alt={title}
                    className="max-h-20 w-auto object-contain drop-shadow-[0_5px_10px_rgba(0,0,0,0.95)] filter brightness-110 sm:max-h-24 md:max-h-28 lg:max-h-32"
                    loading="eager"
                  />
                </div>
              ) : (
                <h1 className="mb-3 text-4xl font-black leading-[0.95] tracking-[-0.045em] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] sm:text-5xl md:mb-4 md:text-6xl lg:text-7xl">
                  {title}
                </h1>
              )}

              <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                <Button
                  size="default"
                  className="h-9 rounded-full border border-white bg-white px-3.5 text-xs font-bold uppercase tracking-[0.08em] text-black shadow-[0_8px_30px_rgba(0,0,0,0.35)] hover:bg-zinc-200 md:h-10 md:px-4 md:text-sm"
                  onClick={handlePlay}
                >
                  <Play className="mr-1.5 h-4 w-4 fill-current md:mr-2 md:h-5 md:w-5" />
                  Watch
                </Button>
                {currentTrailer && (
                  <Button
                    size="default"
                    variant="outline"
                    onClick={handleTrailerClick}
                    className="h-9 rounded-full border-white/35 bg-black/25 px-3.5 text-xs font-semibold uppercase tracking-[0.08em] text-white backdrop-blur-sm hover:bg-white hover:text-black md:h-10 md:px-4 md:text-sm"
                  >
                    <Play className="mr-1.5 h-4 w-4 md:mr-2 md:h-5 md:w-5" />
                    Trailer
                  </Button>
                )}
                <Button
                  size="default"
                  variant="secondary"
                  onClick={handleAddToList}
                  disabled={inWatchlist}
                  className="h-9 rounded-full border border-white/20 bg-white/[0.08] px-3.5 text-xs font-semibold uppercase tracking-[0.08em] text-white backdrop-blur-sm hover:bg-white/15 md:h-10 md:px-4 md:text-sm"
                >
                  {inWatchlist ? (
                    <svg className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    <Plus className="mr-1.5 h-4 w-4 md:mr-2 md:h-5 md:w-5" />
                  )}
                  {inWatchlist ? 'Added' : 'My List'}
                </Button>
              </div>
            </div>

            <div className={cn(
              'relative min-w-0 transition-all duration-500',
              isTransitioning ? 'translate-x-4 opacity-0' : 'translate-x-0 opacity-100'
            )}>
              <div className="relative aspect-video overflow-hidden bg-black/20">
                <div className="relative h-full w-full overflow-hidden">
                  {currentTrailer?.key ? (
                    <iframe
                      ref={sceneIframeRef}
                      key={`${logoKey}-${currentTrailer.key}`}
                      src={`${getYouTubeEmbedUrl(currentTrailer.key)}&mute=1&controls=0&playsinline=1&modestbranding=1&disablekb=1&enablejsapi=1`}
                      title={`${title} muted featured scene`}
                      aria-label={`${title} muted featured scene`}
                      tabIndex={-1}
                      allow="autoplay; encrypted-media"
                      onLoad={(event) => subscribeToSceneEvents(event.currentTarget)}
                      className="pointer-events-none absolute inset-0 h-full w-full scale-[1.28] object-cover"
                    />
                  ) : (
                    <img
                      src={backdropUrl || ''}
                      alt=""
                      className="h-full w-full object-cover opacity-60"
                    />
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.62),transparent_18%,transparent_82%,rgba(0,0,0,0.62))]" />
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/75 to-transparent" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/80 to-transparent" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {featuredMovies.length > 1 && (
        <div className="absolute bottom-6 left-5 right-5 z-10 flex items-center justify-between gap-4 sm:left-8 sm:right-8 lg:left-10 lg:right-10">
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/60 p-1.5 backdrop-blur-md">
            <button
              type="button"
              aria-label="Previous featured title"
              onClick={() => goToSlide((currentIndex - 1 + featuredMovies.length) % featuredMovies.length, 'previous')}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white hover:text-black disabled:opacity-30"
              disabled={isTransitioning}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1.5 px-1">
              {featuredMovies.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Show featured title ${index + 1}`}
                  aria-current={index === currentIndex ? 'true' : undefined}
                  onClick={() => goToSlide(index, index > currentIndex ? 'next' : 'previous')}
                  className={cn(
                     'h-1.5 transition-all duration-500',
                    index === currentIndex
                       ? 'w-9 rounded-full bg-white'
                       : 'w-1.5 rounded-full bg-white/35 hover:bg-white/75'
                  )}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Next featured title"
              onClick={() => goToSlide((currentIndex + 1) % featuredMovies.length, 'next')}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white hover:text-black disabled:opacity-30"
              disabled={isTransitioning}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

        </div>
      )}

      <TrailerModal
        isOpen={trailerOpen}
        onClose={() => setTrailerOpen(false)}
        videoKey={currentTrailer?.key || null}
        title={title}
      />

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .hero-slide {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
};

export default HeroBanner;

