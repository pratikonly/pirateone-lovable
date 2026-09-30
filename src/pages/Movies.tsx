import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPopularMovies, getTopRatedMovies, getNowPlayingMovies, getBackdropUrl, Movie } from '@/lib/tmdb';
import MovieCard from '@/components/MovieCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSetBackdropUrl } from '@/contexts/BackdropContext';
import { Loader2 } from 'lucide-react';

const AutoGrid = ({ movies }: { movies: Movie[] }) => (
  <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
    {movies.map((movie, i) => (
      <MovieCard key={movie.id} movie={movie} index={i} className="w-full" />
    ))}
  </div>
);

const SkeletonGrid = () => (
  <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
    {[...Array(24)].map((_, i) => (
      <div key={i} className="space-y-2">
        <div className="aspect-[2/3] bg-muted rounded-lg animate-pulse" />
        <div className="h-3 bg-muted rounded animate-pulse" />
        <div className="h-2.5 w-10 bg-muted rounded animate-pulse" />
      </div>
    ))}
  </div>
);

const getInitialMoviesCatalog = async () => {
  const [pop1, pop2, top1, top2, play1, play2] = await Promise.all([
    getPopularMovies(1), getPopularMovies(2),
    getTopRatedMovies(1), getTopRatedMovies(2),
    getNowPlayingMovies(1), getNowPlayingMovies(2),
  ]);

  return {
    popular: [...pop1.results, ...pop2.results],
    topRated: [...top1.results, ...top2.results],
    nowPlaying: [...play1.results, ...play2.results],
    hasMorePopular: 2 < pop1.totalPages,
    hasMoreTopRated: 2 < top1.totalPages,
    hasMoreNowPlaying: 2 < play1.totalPages,
  };
};

const Movies = () => {
  const { data: initialCatalog, isLoading, isError, error } = useQuery({
    queryKey: ['catalog', 'movies'],
    queryFn: getInitialMoviesCatalog,
  });
  const [extraPopular, setExtraPopular] = useState<Movie[]>([]);
  const [extraTopRated, setExtraTopRated] = useState<Movie[]>([]);
  const [extraNowPlaying, setExtraNowPlaying] = useState<Movie[]>([]);
  const [activeTab,       setActiveTab]       = useState('popular');
  const [isLoadingMore,   setIsLoadingMore]   = useState(false);

  const [popularPage,     setPopularPage]     = useState(2);
  const [topRatedPage,    setTopRatedPage]    = useState(2);
  const [nowPlayingPage,  setNowPlayingPage]  = useState(2);
  const [hasMorePopularOverride, setHasMorePopularOverride] = useState<boolean | null>(null);
  const [hasMoreTopRatedOverride, setHasMoreTopRatedOverride] = useState<boolean | null>(null);
  const [hasMoreNowPlayingOverride, setHasMoreNowPlayingOverride] = useState<boolean | null>(null);

  const currentIndexRef = useRef(0);
  const observerRef     = useRef<HTMLDivElement>(null);
  const setBackdropUrl  = useSetBackdropUrl();
  const popularMovies = useMemo(
    () => [...(initialCatalog?.popular ?? []), ...extraPopular],
    [extraPopular, initialCatalog?.popular],
  );
  const topRatedMovies = useMemo(
    () => [...(initialCatalog?.topRated ?? []), ...extraTopRated],
    [extraTopRated, initialCatalog?.topRated],
  );
  const nowPlaying = useMemo(
    () => [...(initialCatalog?.nowPlaying ?? []), ...extraNowPlaying],
    [extraNowPlaying, initialCatalog?.nowPlaying],
  );
  const hasMorePopular = hasMorePopularOverride ?? initialCatalog?.hasMorePopular ?? true;
  const hasMoreTopRated = hasMoreTopRatedOverride ?? initialCatalog?.hasMoreTopRated ?? true;
  const hasMoreNowPlaying = hasMoreNowPlayingOverride ?? initialCatalog?.hasMoreNowPlaying ?? true;

  useEffect(() => {
    if (isError) console.error('Failed to load movies catalog:', error);
  }, [error, isError]);

  useEffect(() => {
    if (popularMovies.length === 0) return;
    const update = () => {
      const m = popularMovies[currentIndexRef.current];
      if (m?.backdrop_path) setBackdropUrl(getBackdropUrl(m.backdrop_path, 'original'));
      currentIndexRef.current = (currentIndexRef.current + 1) % Math.min(popularMovies.length, 10);
    };
    update();
    const iv = setInterval(update, 8000);
    return () => clearInterval(iv);
  }, [popularMovies.length, setBackdropUrl]);
  useEffect(() => () => setBackdropUrl(null), [setBackdropUrl]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || isLoading || !initialCatalog) return;
    setIsLoadingMore(true);
    try {
      if (activeTab === 'popular' && hasMorePopular) {
        const next = popularPage + 1;
        const d = await getPopularMovies(next);
        if (d.results.length) { setExtraPopular(p => [...p, ...d.results]); setPopularPage(next); }
        setHasMorePopularOverride(next < d.totalPages);
      } else if (activeTab === 'now-playing' && hasMoreNowPlaying) {
        const next = nowPlayingPage + 1;
        const d = await getNowPlayingMovies(next);
        if (d.results.length) { setExtraNowPlaying(p => [...p, ...d.results]); setNowPlayingPage(next); }
        setHasMoreNowPlayingOverride(next < d.totalPages);
      } else if (activeTab === 'top-rated' && hasMoreTopRated) {
        const next = topRatedPage + 1;
        const d = await getTopRatedMovies(next);
        if (d.results.length) { setExtraTopRated(p => [...p, ...d.results]); setTopRatedPage(next); }
        setHasMoreTopRatedOverride(next < d.totalPages);
      }
    } catch (e) { console.error(e); } finally { setIsLoadingMore(false); }
  }, [activeTab, hasMorePopular, hasMoreNowPlaying, hasMoreTopRated, initialCatalog, isLoading, isLoadingMore, popularPage, nowPlayingPage, topRatedPage]);

  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { rootMargin: '400px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  const { movies, hasMore } = useMemo(() => {
    if (activeTab === 'now-playing') return { movies: nowPlaying,     hasMore: hasMoreNowPlaying };
    if (activeTab === 'top-rated')   return { movies: topRatedMovies, hasMore: hasMoreTopRated };
    return                                  { movies: popularMovies,  hasMore: hasMorePopular };
  }, [activeTab, nowPlaying, popularMovies, topRatedMovies, hasMoreNowPlaying, hasMorePopular, hasMoreTopRated]);

  return (
    <div className="p-4 lg:p-6 pt-4 lg:pt-6 pb-0">
      <h1 className="font-display text-3xl lg:text-4xl mb-6">Movies</h1>

      <Tabs defaultValue="popular" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="mb-6 bg-muted/50">
          <TabsTrigger value="popular"    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Popular</TabsTrigger>
          <TabsTrigger value="now-playing" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Now Playing</TabsTrigger>
          <TabsTrigger value="top-rated"  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Top Rated</TabsTrigger>
        </TabsList>

        <TabsContent value="popular">
          {isLoading ? <SkeletonGrid /> : <AutoGrid movies={popularMovies} />}
        </TabsContent>
        <TabsContent value="now-playing">
          {isLoading ? <SkeletonGrid /> : <AutoGrid movies={nowPlaying} />}
        </TabsContent>
        <TabsContent value="top-rated">
          {isLoading ? <SkeletonGrid /> : <AutoGrid movies={topRatedMovies} />}
        </TabsContent>
      </Tabs>

      {/* Infinite scroll sentinel — always mounted so observer fires */}
      <div ref={observerRef} className="py-6 flex justify-center">
        {isLoadingMore && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
        {!isLoading && !isLoadingMore && !hasMore && movies.length > 0 && (
          <p className="text-muted-foreground text-sm">You've reached the end</p>
        )}
      </div>
    </div>
  );
};

export default Movies;
