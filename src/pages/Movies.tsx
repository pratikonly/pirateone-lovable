import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { getPopularMovies, getTopRatedMovies, getNowPlayingMovies, getBackdropUrl, Movie } from '@/lib/tmdb';
import MovieCard from '@/components/MovieCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSetBackdropUrl } from '@/contexts/BackdropContext';
import DisclaimerFooter from '@/components/DisclaimerFooter';
import { Loader2, Search, X } from 'lucide-react';

const Movies = () => {
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<Movie[]>([]);
  const [nowPlaying, setNowPlaying] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const [popularPage, setPopularPage] = useState(1);
  const [topRatedPage, setTopRatedPage] = useState(1);
  const [nowPlayingPage, setNowPlayingPage] = useState(1);
  const [hasMorePopular, setHasMorePopular] = useState(true);
  const [hasMoreTopRated, setHasMoreTopRated] = useState(true);
  const [hasMoreNowPlaying, setHasMoreNowPlaying] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const currentIndexRef = useRef(0);
  const observerRef = useRef<HTMLDivElement>(null);
  const setBackdropUrl = useSetBackdropUrl();

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const [popular, topRated, playing] = await Promise.all([
          getPopularMovies(1),
          getTopRatedMovies(1),
          getNowPlayingMovies(1),
        ]);
        setPopularMovies(popular.results);
        setTopRatedMovies(topRated.results);
        setNowPlaying(playing.results);
        setHasMorePopular(1 < popular.totalPages);
        setHasMoreTopRated(1 < topRated.totalPages);
        setHasMoreNowPlaying(1 < playing.totalPages);
      } catch (error) {
        console.error('Failed to fetch movies:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMovies();
  }, []);

  useEffect(() => {
    if (popularMovies.length === 0) return;
    const updateBackdrop = () => {
      const movie = popularMovies[currentIndexRef.current];
      if (movie?.backdrop_path) setBackdropUrl(getBackdropUrl(movie.backdrop_path, 'original'));
      currentIndexRef.current = (currentIndexRef.current + 1) % Math.min(popularMovies.length, 10);
    };
    updateBackdrop();
    const interval = setInterval(updateBackdrop, 8000);
    return () => clearInterval(interval);
  }, [popularMovies.length, setBackdropUrl]);

  useEffect(() => { return () => setBackdropUrl(null); }, [setBackdropUrl]);

  const loadMorePopular = useCallback(async () => {
    if (isLoadingMore || !hasMorePopular) return;
    setIsLoadingMore(true);
    try {
      const nextPage = popularPage + 1;
      const data = await getPopularMovies(nextPage);
      if (data.results.length === 0) { setHasMorePopular(false); return; }
      setPopularMovies(prev => [...prev, ...data.results]);
      setPopularPage(nextPage);
      if (nextPage >= data.totalPages) setHasMorePopular(false);
    } catch (e) { console.error(e); } finally { setIsLoadingMore(false); }
  }, [hasMorePopular, isLoadingMore, popularPage]);

  const loadMoreNowPlaying = useCallback(async () => {
    if (isLoadingMore || !hasMoreNowPlaying) return;
    setIsLoadingMore(true);
    try {
      const nextPage = nowPlayingPage + 1;
      const data = await getNowPlayingMovies(nextPage);
      if (data.results.length === 0) { setHasMoreNowPlaying(false); return; }
      setNowPlaying(prev => [...prev, ...data.results]);
      setNowPlayingPage(nextPage);
      if (nextPage >= data.totalPages) setHasMoreNowPlaying(false);
    } catch (e) { console.error(e); } finally { setIsLoadingMore(false); }
  }, [hasMoreNowPlaying, isLoadingMore, nowPlayingPage]);

  const loadMoreTopRated = useCallback(async () => {
    if (isLoadingMore || !hasMoreTopRated) return;
    setIsLoadingMore(true);
    try {
      const nextPage = topRatedPage + 1;
      const data = await getTopRatedMovies(nextPage);
      if (data.results.length === 0) { setHasMoreTopRated(false); return; }
      setTopRatedMovies(prev => [...prev, ...data.results]);
      setTopRatedPage(nextPage);
      if (nextPage >= data.totalPages) setHasMoreTopRated(false);
    } catch (e) { console.error(e); } finally { setIsLoadingMore(false); }
  }, [hasMoreTopRated, isLoadingMore, topRatedPage]);

  useEffect(() => {
    const target = observerRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || isLoadingMore) return;
        if (activeTab === 'popular' && hasMorePopular) loadMorePopular();
        if (activeTab === 'now-playing' && hasMoreNowPlaying) loadMoreNowPlaying();
        if (activeTab === 'top-rated' && hasMoreTopRated) loadMoreTopRated();
      },
      { threshold: 0.1, rootMargin: '200px' }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [activeTab, hasMoreNowPlaying, hasMorePopular, hasMoreTopRated, isLoadingMore, loadMoreNowPlaying, loadMorePopular, loadMoreTopRated]);

  const { activeMovies, activeHasMore } = useMemo(() => {
    if (activeTab === 'now-playing') return { activeMovies: nowPlaying, activeHasMore: hasMoreNowPlaying };
    if (activeTab === 'top-rated') return { activeMovies: topRatedMovies, activeHasMore: hasMoreTopRated };
    return { activeMovies: popularMovies, activeHasMore: hasMorePopular };
  }, [activeTab, hasMoreNowPlaying, hasMorePopular, hasMoreTopRated, nowPlaying, popularMovies, topRatedMovies]);

  const filteredMovies = useMemo(() => {
    if (!searchQuery.trim()) return activeMovies;
    const q = searchQuery.toLowerCase();
    return activeMovies.filter(m => (m.title || m.name || '').toLowerCase().includes(q));
  }, [activeMovies, searchQuery]);

  const MovieGrid = ({ movies }: { movies: Movie[] }) => (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 lg:gap-3">
      {movies.map((movie, index) => (
        <MovieCard key={movie.id} movie={movie} index={index} className="w-full" />
      ))}
    </div>
  );

  const LoadingSkeleton = () => (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 lg:gap-3">
      {[...Array(18)].map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="aspect-[2/3] bg-muted rounded-lg animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-3 bg-muted rounded animate-pulse" />
            <div className="h-2.5 w-12 bg-muted rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-4 lg:p-6 pt-20">
      <h1 className="font-display text-3xl lg:text-4xl mb-4">Movies</h1>

      {/* Search bar — below title, above tabs */}
      <div className={`flex items-center gap-2 border rounded-xl px-3 py-2 mb-5 transition-all duration-300 bg-zinc-900/80 backdrop-blur-sm ${searchFocused || searchQuery ? 'border-primary/60 max-w-md shadow-[0_0_12px_rgba(99,102,241,0.25)]' : 'border-zinc-700/50 max-w-xs hover:border-zinc-500'}`}>
        <Search className={`w-4 h-4 shrink-0 transition-colors ${searchFocused || searchQuery ? 'text-primary' : 'text-zinc-500'}`} />
        <input
          type="text"
          placeholder="Search movies…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none min-w-0"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-zinc-500 hover:text-white transition-colors shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <Tabs defaultValue="popular" className="w-full" onValueChange={v => { setActiveTab(v); setSearchQuery(''); }}>
        <TabsList className="mb-6 bg-muted/50">
          <TabsTrigger value="popular" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Popular</TabsTrigger>
          <TabsTrigger value="now-playing" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Now Playing</TabsTrigger>
          <TabsTrigger value="top-rated" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Top Rated</TabsTrigger>
        </TabsList>

        {['popular', 'now-playing', 'top-rated'].map(tab => (
          <TabsContent key={tab} value={tab}>
            {isLoading ? <LoadingSkeleton /> : (
              <>
                {searchQuery && (
                  <p className="text-sm text-zinc-400 mb-3">
                    {filteredMovies.length} result{filteredMovies.length !== 1 ? 's' : ''} for "{searchQuery}"
                  </p>
                )}
                {filteredMovies.length > 0
                  ? <MovieGrid movies={filteredMovies} />
                  : searchQuery
                    ? <div className="text-center py-16 text-zinc-500">No movies matching "{searchQuery}"</div>
                    : <MovieGrid movies={activeMovies} />}
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {!isLoading && !searchQuery && (
        <div ref={observerRef} className="py-8 flex justify-center">
          {isLoadingMore && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
          {!isLoadingMore && !activeHasMore && activeMovies.length > 0 && (
            <p className="text-muted-foreground text-sm">No more content to load</p>
          )}
        </div>
      )}
      <DisclaimerFooter />
    </div>
  );
};

export default Movies;
