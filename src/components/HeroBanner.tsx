import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Pause, Play, Plus, VolumeX } from 'lucide-react';
import { Movie, getBackdropUrl, getImageUrl, getMovieImages, getTVImages, getLogoUrl, getMovieVideos, getTVVideos, getYouTubeEmbedUrl, Video } from '@/lib/tmdb';
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
  const [isPaused, setIsPaused] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'next' | 'previous'>('next');
  const [inWatchlist, setInWatchlist] = useState(false);
  const [logos, setLogos] = useState<Record<string, string | null>>({});
  const [trailers, setTrailers] = useState<Record<string, Video | null>>({});
  const [trailerOpen, setTrailerOpen] = useState(false);
  const requestedLogoKeys = useRef(new Set<string>());
  const requestedTrailerKeys = useRef(new Set<string>());
  const transitionTimeout = useRef<number | null>(null);

  const featuredMovies = useMemo(() => movies.slice(0, 5), [movies]);
  const currentMovie = featuredMovies[currentIndex];
  const logoKey = currentMovie
    ? `${currentMovie.media_type || 'movie'}-${currentMovie.id}`
    : '';
  const logoPath = logos[logoKey];
  const logoUrl = logoPath ? getLogoUrl(logoPath, 'w500') : null;
  const isLogoReady = !currentMovie || logos[logoKey] !== undefined;

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

  useEffect(() => {
    if (featuredMovies.length <= 1 || isPaused) return;

    const interval = window.setInterval(() => {
      goToSlide((currentIndex + 1) % featuredMovies.length, 'next');
    }, 8500);

    return () => window.clearInterval(interval);
  }, [currentIndex, featuredMovies.length, goToSlide, isPaused]);

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
                <div className="space-y-2.5 max-w-xl">
                  <div className="h-3.5 w-full rounded bg-muted animate-shimmer" />
                  <div className="h-3.5 w-[92%] rounded bg-muted animate-shimmer" />
                  <div className="h-3.5 w-[64%] rounded bg-muted animate-shimmer" />
                </div>
                <div className="flex gap-3 pt-1">
                  <div className="h-11 w-28 rounded-md bg-primary/15 animate-shimmer" />
                  <div className="h-11 w-28 rounded-md bg-muted animate-shimmer" />
                  <div className="h-11 w-24 rounded-md bg-muted animate-shimmer" />
                </div>
              </div>
              <div className="hidden md:block w-40 lg:w-48 aspect-[2/3] rounded-lg border border-border bg-muted animate-shimmer" />
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
  const posterUrl = getImageUrl(currentMovie.poster_path, 'w300');
  const title = currentMovie.title || currentMovie.name || 'Untitled';
  const overview = currentMovie.overview?.slice(0, 200) + (currentMovie.overview?.length > 200 ? '...' : '');
  const rating = currentMovie.vote_average?.toFixed(1) || 'N/A';
  const year = (currentMovie.release_date || currentMovie.first_air_date)?.split('-')[0] || '';
  const mediaType = currentMovie.media_type || 'movie';

  const currentTrailer = trailers[logoKey];

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
      className="hero-banner relative -mt-14 mb-8 min-h-[520px] h-[72vh] max-h-[720px] overflow-hidden bg-black"
      aria-roledescription="carousel"
      aria-label="Featured titles"
    >
      <div className="absolute inset-0">
        {featuredMovies.map((movie, index) => {
          const url = getBackdropUrl(movie.backdrop_path, 'original');
          const movieKey = `${movie.media_type || 'movie'}-${movie.id}`;
          const scene = trailers[movieKey];
          return (
            <div
              key={movie.id}
              className={cn(
                'hero-slide absolute inset-0 overflow-hidden transition-[opacity,transform,filter] duration-1000 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]',
                index === currentIndex
                  ? 'opacity-100 scale-100 translate-x-0 blur-0'
                  : cn(
                    'pointer-events-none opacity-0 scale-[1.08] blur-[3px]',
                    slideDirection === 'next' ? 'translate-x-10' : '-translate-x-10'
                  )
              )}
            >
              {url && (
                <img
                  src={url}
                  alt=""
                  className="h-full w-full object-cover opacity-75"
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
              )}
              {index === currentIndex && scene?.key && (
                <iframe
                  key={`${movieKey}-${scene.key}`}
                  src={`${getYouTubeEmbedUrl(scene.key)}&mute=1&controls=0&loop=1&playlist=${scene.key}&playsinline=1&modestbranding=1&disablekb=1`}
                  title=""
                  aria-hidden="true"
                  tabIndex={-1}
                  allow="autoplay; encrypted-media"
                  className="pointer-events-none absolute inset-0 h-full w-full scale-[1.3] object-cover opacity-60"
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/55" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-transparent" />
      <div className="absolute inset-0 shadow-[inset_0_0_180px_45px_rgba(0,0,0,0.95)]" />
      {currentTrailer?.key && (
        <div className="absolute right-5 top-24 z-10 flex items-center gap-2 border border-white/25 bg-black/45 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white/75 backdrop-blur-md sm:right-8 lg:right-10">
          <VolumeX className="h-3.5 w-3.5 text-white" aria-hidden="true" />
          <span>Scene · muted</span>
        </div>
      )}

      <div className="absolute inset-0 flex items-center">
        <div className="container mx-auto px-5 pt-16 sm:px-8 lg:px-10">
          <div className="flex items-center gap-8 lg:gap-16">
            <div className={cn(
              'max-w-2xl flex-1 transition-all duration-500',
              isTransitioning ? 'translate-y-5 opacity-0' : 'translate-y-0 opacity-100'
            )}>
              <div className="mb-4 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60 sm:text-xs">
                <span className="h-px w-8 bg-white/60" />
                <span>Featured selection</span>
              </div>

              <div className="mb-4 flex flex-wrap items-center gap-2 md:gap-3">
                <span className="border border-white/40 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-black shadow-lg">
                  {mediaType === 'tv' ? 'TV Series' : 'Movie'}
                </span>
                <div className="flex items-center gap-1.5 border border-white/20 bg-black/40 px-2 py-1 text-white backdrop-blur-sm">
                  <svg className="h-3.5 w-3.5 fill-white text-white" viewBox="0 0 24 24">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  <span className="text-xs font-semibold">{rating}</span>
                </div>
                <span className="border border-white/20 bg-black/40 px-2 py-1 text-xs text-white/70 backdrop-blur-sm">
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

              <p className="mb-6 max-w-xl text-sm leading-relaxed text-white/65 sm:text-base md:mb-7 md:line-clamp-none">
                {overview}
              </p>

              <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                <Button
                  size="default"
                  className="h-10 rounded-none border border-white bg-white px-4 text-sm font-bold uppercase tracking-[0.08em] text-black shadow-[0_8px_30px_rgba(0,0,0,0.35)] hover:bg-zinc-200 md:h-12 md:px-6 md:text-base"
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
                    className="h-10 rounded-none border-white/35 bg-black/25 px-4 text-sm font-semibold uppercase tracking-[0.08em] text-white backdrop-blur-sm hover:bg-white hover:text-black md:h-12 md:px-6 md:text-base"
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
                  className="h-10 rounded-none border border-white/20 bg-white/[0.08] px-4 text-sm font-semibold uppercase tracking-[0.08em] text-white backdrop-blur-sm hover:bg-white/15 md:h-12 md:px-6 md:text-base"
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
              'hidden md:block flex-shrink-0 transition-all duration-500',
              isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
            )}>
              {posterUrl && (
                <div className="group relative border border-white/25 bg-black/70 p-2 shadow-[0_24px_70px_rgba(0,0,0,0.65)]">
                  <img
                    src={posterUrl}
                    alt={title}
                    className="w-40 lg:w-52"
                  />
                  <div className="pointer-events-none absolute inset-2 bg-gradient-to-t from-black/55 via-transparent to-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="absolute -bottom-3 -left-3 border border-white/25 bg-black px-2 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-white/70">
                    Classic pick
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {featuredMovies.length > 1 && (
        <div className="absolute bottom-6 left-5 right-5 z-10 flex items-center justify-between gap-4 sm:left-8 sm:right-8 lg:left-10 lg:right-10">
          <div className="flex items-center gap-2 border border-white/20 bg-black/45 p-1.5 backdrop-blur-md">
            <button
              type="button"
              aria-label="Previous featured title"
              onClick={() => goToSlide((currentIndex - 1 + featuredMovies.length) % featuredMovies.length, 'previous')}
              className="flex h-8 w-8 items-center justify-center text-white/70 transition-colors hover:bg-white hover:text-black disabled:opacity-30"
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
                      ? 'w-9 bg-white'
                      : 'w-1.5 bg-white/35 hover:bg-white/75'
                  )}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Next featured title"
              onClick={() => goToSlide((currentIndex + 1) % featuredMovies.length, 'next')}
              className="flex h-8 w-8 items-center justify-center text-white/70 transition-colors hover:bg-white hover:text-black disabled:opacity-30"
              disabled={isTransitioning}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={isPaused ? 'Resume automatic slides' : 'Pause automatic slides'}
              onClick={() => setIsPaused((paused) => !paused)}
              className="flex h-9 w-9 items-center justify-center border border-white/20 bg-black/45 text-white/75 backdrop-blur-md transition-colors hover:bg-white hover:text-black"
            >
              {isPaused ? <Play className="h-3.5 w-3.5 fill-current" /> : <Pause className="h-3.5 w-3.5" />}
            </button>
            {currentTrailer?.key && (
              <div className="hidden items-center gap-2 border border-white/20 bg-black/45 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.16em] text-white/70 backdrop-blur-md sm:flex">
                <VolumeX className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                Muted scene
              </div>
            )}
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
        @keyframes hero-scene-drift {
          0% { transform: scale(1.28) translate3d(0, 0, 0); }
          100% { transform: scale(1.36) translate3d(-1.5%, -0.5%, 0); }
        }

        .hero-slide > img,
        .hero-slide > iframe {
          animation: hero-scene-drift 18s ease-in-out alternate infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-slide > img,
          .hero-slide > iframe {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
};

export default HeroBanner;

