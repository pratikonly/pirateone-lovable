import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { Movie, getBackdropUrl, getImageUrl, getMovieImages, getTVImages, getLogoUrl, getMovieVideos, getTVVideos, Video } from '@/lib/tmdb';
import { addToWatchlist, isInWatchlist } from '@/lib/watchlist';
import { addToWatchlistDb, isInWatchlistDb } from '@/lib/watchlistDb';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import TrailerModal from './TrailerModal';
import { useSetBackdropUrl } from '@/contexts/BackdropContext';

interface HeroBannerProps {
  movies: Movie[];
}

const HeroBanner = ({ movies }: HeroBannerProps) => {
  const navigate = useNavigate();
  const setBackdropUrl = useSetBackdropUrl();
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [logos, setLogos] = useState<Record<string, string | null>>({});
  const [trailers, setTrailers] = useState<Record<string, Video | null>>({});
  const [trailerOpen, setTrailerOpen] = useState(false);

  const featuredMovies = movies.slice(0, 5);
  const currentMovie = featuredMovies[currentIndex];

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
        if (logos[key] !== undefined) return;

        try {
          const mediaType = movie.media_type || 'movie';
          const images = mediaType === 'tv'
            ? await getTVImages(movie.id)
            : await getMovieImages(movie.id);

          const englishLogos = images.logos
            .filter(l => l.iso_639_1 === 'en' || l.iso_639_1 === null)
            .sort((a, b) => b.width - a.width);

          const logoPath = englishLogos[0]?.file_path || null;
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
        if (trailers[key] !== undefined) return;

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

  useEffect(() => {
    if (featuredMovies.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % featuredMovies.length);
        setIsTransitioning(false);
      }, 500);
    }, 8000);

    return () => clearInterval(interval);
  }, [featuredMovies.length, isPaused]);

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

  if (!currentMovie) return null;

  const backdropUrl = getBackdropUrl(currentMovie.backdrop_path, 'original');
  const posterUrl = getImageUrl(currentMovie.poster_path, 'w300');
  const title = currentMovie.title || currentMovie.name || 'Untitled';
  const overview = currentMovie.overview?.slice(0, 200) + (currentMovie.overview?.length > 200 ? '...' : '');
  const rating = currentMovie.vote_average?.toFixed(1) || 'N/A';
  const year = (currentMovie.release_date || currentMovie.first_air_date)?.split('-')[0] || '';
  const mediaType = currentMovie.media_type || 'movie';

  const logoKey = `${mediaType}-${currentMovie.id}`;
  const logoPath = logos[logoKey];
  const logoUrl = logoPath ? getLogoUrl(logoPath, 'w500') : null;

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
      className="relative h-[60vh] md:h-[70vh] min-h-[400px] max-h-[600px] -mt-14 mb-8 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="absolute inset-0">
        {featuredMovies.map((movie, index) => {
          const url = getBackdropUrl(movie.backdrop_path, 'original');
          return (
            <div
              key={movie.id}
              className={cn(
                'absolute inset-0 transition-all duration-700 ease-out',
                index === currentIndex
                  ? 'opacity-100 scale-100'
                  : 'opacity-0 scale-105'
              )}
              style={{
                animation: index === currentIndex ? 'kenburns 3s ease-out forwards' : 'none'
              }}
            >
              {url && (
                <img
                  src={url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-background/60" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
      <div className="absolute inset-0 shadow-[inset_0_0_150px_60px_hsl(var(--background))]" />

      <div className="absolute inset-0 flex items-center">
        <div className="container mx-auto px-4 lg:px-6 pt-14">
          <div className="flex items-center gap-6 lg:gap-10">
            <div className={cn(
              'flex-1 max-w-2xl transition-all duration-500',
              isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
            )}>
              <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3 md:mb-4">
                <span className="bg-white text-black px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide shadow-lg">
                  {mediaType === 'tv' ? 'TV Series' : 'Movie'}
                </span>
                <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-2 py-1 rounded-full">
                  <svg className="w-4 h-4 text-yellow-400 fill-yellow-400" viewBox="0 0 24 24">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  <span className="font-semibold text-sm">{rating}</span>
                </div>
                <span className="text-muted-foreground text-sm bg-background/30 backdrop-blur-sm px-2 py-1 rounded-full">
                  {year}
                </span>
              </div>

              {logoUrl ? (
                <div className="mb-3 md:mb-4">
                  <img
                    src={logoUrl}
                    alt={title}
                    className="max-h-20 sm:max-h-24 md:max-h-28 lg:max-h-32 w-auto object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] filter brightness-110"
                    loading="eager"
                  />
                </div>
              ) : (
                <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-3 md:mb-4 leading-tight tracking-wider text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] [text-shadow:_0_0_40px_hsl(var(--primary)/0.4),_0_4px_12px_rgba(0,0,0,0.95)]">
                  {title}
                </h1>
              )}

              <p className="text-muted-foreground text-sm md:text-base leading-relaxed mb-5 md:mb-6 max-w-xl line-clamp-3 md:line-clamp-none">
                {overview}
              </p>

              <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                <Button
                  size="default"
                  className="bg-white text-black hover:bg-gray-200 shadow-lg text-sm md:text-base px-3 md:px-6 h-9 md:h-11"
                  onClick={handlePlay}
                >
                  <svg className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2 fill-current" viewBox="0 0 24 24">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  Watch
                </Button>
                {currentTrailer && (
                  <Button
                    size="default"
                    variant="outline"
                    onClick={handleTrailerClick}
                    className="backdrop-blur-sm border-white/50 hover:bg-white/20 text-foreground text-sm md:text-base px-3 md:px-6 h-9 md:h-11"
                  >
                    <Play className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2" />
                    Trailer
                  </Button>
                )}
                <Button
                  size="default"
                  variant="secondary"
                  onClick={handleAddToList}
                  disabled={inWatchlist}
                  className="backdrop-blur-sm bg-secondary/80 hover:bg-secondary text-sm md:text-base px-3 md:px-6 h-9 md:h-11"
                >
                  {inWatchlist ? (
                    <svg className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
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
                <div className="relative group">
                  <img
                    src={posterUrl}
                    alt={title}
                    className="w-40 lg:w-48 rounded-lg shadow-2xl ring-1 ring-border/50"
                  />
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {featuredMovies.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {featuredMovies.map((_, index) => (
            <div
              key={index}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                index === currentIndex
                  ? 'w-6 bg-primary'
                  : 'w-2 bg-white/40'
              )}
              
            />
          ))}
        </div>
      )}

      <TrailerModal
        isOpen={trailerOpen}
        onClose={() => setTrailerOpen(false)}
        videoKey={currentTrailer?.key || null}
        title={title}
      />

      <style>{`
        @keyframes kenburns {
          0% { transform: scale(1); }
          100% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};

export default HeroBanner;

