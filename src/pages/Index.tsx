import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getTrending,
  getPopularMovies,
  getTopRatedMovies,
  getNowPlayingMovies,
  getPopularTV,
  getTopRatedTV,
  searchMulti,
} from '@/lib/tmdb';
import { getAllWatchProgress, getProgressPercentage } from '@/lib/watchProgress';
import HeroBanner from '@/components/HeroBanner';
import MovieRow from '@/components/MovieRow';
import ContinueWatching from '@/components/ContinueWatching';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const HOME_STALE_TIME = 5 * 60 * 1000;

const getHomeCatalog = async () => {
  const [
    popularMoviesData,
    topRatedMoviesData,
    nowPlayingData,
    popularTVData,
    topRatedTVData,
    animeSearches,
  ] = await Promise.all([
    getPopularMovies(),
    getTopRatedMovies(),
    getNowPlayingMovies(),
    getPopularTV(),
    getTopRatedTV(),
    Promise.all([
      searchMulti('demon slayer'),
      searchMulti('jujutsu kaisen'),
      searchMulti('one piece anime'),
      searchMulti('attack on titan'),
    ]),
  ]);

  const allAnime = animeSearches.flat();
  const uniqueAnime = allAnime.filter((item, index, self) =>
    index === self.findIndex(candidate => candidate.id === item.id)
  );

  return {
    popularMovies: popularMoviesData.results,
    topRatedMovies: topRatedMoviesData.results,
    nowPlaying: nowPlayingData.results,
    popularTV: popularTVData.results,
    topRatedTV: topRatedTVData.results,
    anime: uniqueAnime.slice(0, 20),
  };
};

const Index = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [heroArtworkUrl, setHeroArtworkUrl] = useState<string | null>(null);
  const handleHeroArtworkChange = useCallback((artworkUrl: string | null) => {
    setHeroArtworkUrl(artworkUrl);
  }, []);
  const {
    data: trending = [],
    isLoading: isHeroLoading,
    isError: isTrendingError,
    error: trendingError,
  } = useQuery({
    queryKey: ['home', 'trending'],
    queryFn: () => getTrending('all', 'week'),
    staleTime: HOME_STALE_TIME,
    refetchOnMount: 'always',
  });
  const {
    data: catalog,
    isLoading,
    isError: isCatalogError,
    error: catalogError,
  } = useQuery({
    queryKey: ['home', 'catalog'],
    queryFn: getHomeCatalog,
    staleTime: HOME_STALE_TIME,
    refetchOnMount: 'always',
  });
  const {
    data: watchProgress = [],
    isError: isWatchProgressError,
    error: watchProgressError,
  } = useQuery({
    queryKey: ['watch-progress', user?.id ?? null],
    enabled: Boolean(user),
    queryFn: async () => {
      const progress = await getAllWatchProgress();
      return progress
        .filter(item => !item.completed && getProgressPercentage(item) < 90)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 10);
    },
    staleTime: HOME_STALE_TIME,
    refetchOnMount: 'always',
  });

  useEffect(() => {
    if (!isTrendingError) return;
    console.error('Failed to fetch featured content:', trendingError);
    toast({
      title: 'Error loading featured content',
      description: 'Please check your TMDb API key in settings.',
      variant: 'destructive',
    });
  }, [isTrendingError, toast, trendingError]);

  useEffect(() => {
    if (!isCatalogError) return;
    console.error('Failed to fetch movies:', catalogError);
    toast({
      title: 'Error loading content',
      description: 'Please check your TMDb API key in settings.',
      variant: 'destructive',
    });
  }, [catalogError, isCatalogError, toast]);

  useEffect(() => {
    if (isWatchProgressError) {
      console.error('Failed to load watch progress:', watchProgressError);
    }
  }, [isWatchProgressError, watchProgressError]);

  return (
    <div className="relative isolate overflow-hidden bg-background">
      {heroArtworkUrl && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[170svh] max-h-[1400px] overflow-hidden" aria-hidden="true">
          <img
            src={heroArtworkUrl}
            alt=""
            className="h-full w-full scale-110 object-cover object-top opacity-35 blur-3xl"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to bottom, transparent 0%, hsl(var(--background) / 0.08) 35%, hsl(var(--background) / 0.55) 68%, hsl(var(--background)) 96%, hsl(var(--background)) 100%)',
            }}
          />
        </div>
      )}

      <div className="relative z-10">
        <HeroBanner
          movies={trending}
          isLoading={isHeroLoading}
          onArtworkChange={handleHeroArtworkChange}
        />

        {/* Soft shadow straddling the hero/content joint to hide any seam (net layout height 0) */}
        <div
          aria-hidden="true"
          className="pointer-events-none relative z-20 -mb-12 -mt-28 h-40"
          style={{
            background:
              'linear-gradient(to bottom, transparent 0%, hsl(var(--background) / 0.35) 50%, transparent 100%)',
          }}
        />

        {/* Continue Watching Section */}
        {user && watchProgress.length > 0 && (
          <div className="px-4 lg:px-6">
            <ContinueWatching progress={watchProgress} />
          </div>
        )}

        <div className="space-y-2 px-4 lg:px-6">
          <MovieRow 
            title="Trending Now" 
            movies={trending} 
            isLoading={isHeroLoading} 
            animateCards
          />
          <MovieRow 
            title="Now Playing" 
            movies={catalog?.nowPlaying ?? []}
            isLoading={isLoading} 
            animateCards
          />
          <MovieRow 
            title="Top Rated Movies" 
            movies={catalog?.topRatedMovies ?? []}
            isLoading={isLoading} 
            animateCards
          />
          <MovieRow 
            title="Popular TV Shows" 
            movies={catalog?.popularTV ?? []}
            isLoading={isLoading} 
            animateCards
          />
          <MovieRow 
            title="Top Rated TV Shows" 
            movies={catalog?.topRatedTV ?? []}
            isLoading={isLoading} 
            animateCards
          />
          <MovieRow 
            title="Anime" 
            movies={catalog?.anime ?? []}
            isLoading={isLoading} 
            animateCards
          />
          <MovieRow 
            title="Popular Movies" 
            movies={catalog?.popularMovies ?? []}
            isLoading={isLoading} 
            animateCards
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
