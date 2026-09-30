import { useEffect, useState } from 'react';
import {
  getTrending,
  getPopularMovies,
  getTopRatedMovies,
  getNowPlayingMovies,
  getPopularTV,
  getTopRatedTV,
  searchMulti,
  Movie
} from '@/lib/tmdb';
import { getAllWatchProgress, getProgressPercentage, WatchProgressEntry } from '@/lib/watchProgress';
import HeroBanner from '@/components/HeroBanner';
import MovieRow from '@/components/MovieRow';
import ContinueWatching from '@/components/ContinueWatching';
import DisclaimerFooter from '@/components/DisclaimerFooter';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [trending, setTrending] = useState<Movie[]>([]);
  const [watchProgress, setWatchProgress] = useState<WatchProgressEntry[]>([]);
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<Movie[]>([]);
  const [nowPlaying, setNowPlaying] = useState<Movie[]>([]);
  const [popularTV, setPopularTV] = useState<Movie[]>([]);
  const [topRatedTV, setTopRatedTV] = useState<Movie[]>([]);
  const [anime, setAnime] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHeroLoading, setIsHeroLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      const trendingPromise = getTrending('all', 'week')
        .then(data => {
          if (!cancelled) {
            setTrending(data);
            setIsHeroLoading(false);
          }
        })
        .catch(error => {
          console.error('Failed to fetch featured content:', error);
          if (!cancelled) {
            setIsHeroLoading(false);
            toast({
              title: 'Error loading featured content',
              description: 'Please check your TMDb API key in settings.',
              variant: 'destructive',
            });
          }
        });

      try {
        // Load watch progress if user is logged in
        if (user) {
          try {
            const progress = await getAllWatchProgress();
            // Filter to only show incomplete items (< 90% complete)
            const incompleteProgress = progress
              .filter(p => !p.completed && getProgressPercentage(p) < 90)
              .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
              .slice(0, 10); // Limit to 10 items
            setWatchProgress(incompleteProgress);
          } catch (error) {
            console.error('Failed to load watch progress:', error);
          }
        }

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

        // Combine and dedupe anime results
        const allAnime = animeSearches.flat();
        const uniqueAnime = allAnime.filter((item, index, self) => 
          index === self.findIndex(t => t.id === item.id)
        );

        if (!cancelled) {
          setPopularMovies(popularMoviesData.results);
          setTopRatedMovies(topRatedMoviesData.results);
          setNowPlaying(nowPlayingData.results);
          setPopularTV(popularTVData.results);
          setTopRatedTV(topRatedTVData.results);
          setAnime(uniqueAnime.slice(0, 20));
        }
      } catch (error) {
        console.error('Failed to fetch movies:', error);
        if (!cancelled) {
          toast({
            title: 'Error loading content',
            description: 'Please check your TMDb API key in settings.',
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }

      await trendingPromise;
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [toast, user]);

  return (
    <div className="pb-6">
      <HeroBanner movies={trending} isLoading={isHeroLoading} />

      {/* Continue Watching Section */}
      {user && watchProgress.length > 0 && (
        <div className="px-4 lg:px-6">
          <ContinueWatching progress={watchProgress} />
        </div>
      )}

      <div className="px-4 lg:px-6 space-y-2">
        <MovieRow 
          title="Trending Now" 
          movies={trending} 
          isLoading={isLoading} 
        />
        <MovieRow 
          title="Now Playing" 
          movies={nowPlaying} 
          isLoading={isLoading} 
        />
        <MovieRow 
          title="Top Rated Movies" 
          movies={topRatedMovies} 
          isLoading={isLoading} 
        />
        <MovieRow 
          title="Popular TV Shows" 
          movies={popularTV} 
          isLoading={isLoading} 
        />
        <MovieRow 
          title="Top Rated TV Shows" 
          movies={topRatedTV} 
          isLoading={isLoading} 
        />
        <MovieRow 
          title="Anime" 
          movies={anime} 
          isLoading={isLoading} 
        />
        <MovieRow 
          title="Popular Movies" 
          movies={popularMovies} 
          isLoading={isLoading} 
        />
      </div>
      <DisclaimerFooter />
    </div>
  );
};

export default Index;