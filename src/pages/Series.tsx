import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPopularTV, getTopRatedTV, getBackdropUrl, Movie } from '@/lib/tmdb';
import MovieCard from '@/components/MovieCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSetBackdropUrl } from '@/contexts/BackdropContext';
import { Loader2 } from 'lucide-react';

const AutoGrid = ({ shows }: { shows: Movie[] }) => (
  <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
    {shows.map((s, i) => (
      <MovieCard key={s.id} movie={{ ...s, media_type: 'tv' }} index={i} className="w-full" />
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

const getInitialSeriesCatalog = async () => {
  const [pop1, pop2, top1, top2] = await Promise.all([
    getPopularTV(1), getPopularTV(2),
    getTopRatedTV(1), getTopRatedTV(2),
  ]);

  return {
    popular: [...pop1.results, ...pop2.results],
    topRated: [...top1.results, ...top2.results],
    hasMorePopular: 2 < pop1.totalPages,
    hasMoreTopRated: 2 < top1.totalPages,
  };
};

const Series = () => {
  const { data: initialCatalog, isLoading, isError, error } = useQuery({
    queryKey: ['catalog', 'series'],
    queryFn: getInitialSeriesCatalog,
  });
  const [extraPopular, setExtraPopular] = useState<Movie[]>([]);
  const [extraTopRated, setExtraTopRated] = useState<Movie[]>([]);
  const [activeTab,  setActiveTab]  = useState('popular');
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [popularPage,  setPopularPage]  = useState(2);
  const [topRatedPage, setTopRatedPage] = useState(2);
  const [hasMorePopularOverride, setHasMorePopularOverride] = useState<boolean | null>(null);
  const [hasMoreTopRatedOverride, setHasMoreTopRatedOverride] = useState<boolean | null>(null);

  const currentIndexRef = useRef(0);
  const observerRef     = useRef<HTMLDivElement>(null);
  const setBackdropUrl  = useSetBackdropUrl();

  const popularTV = useMemo(
    () => [...(initialCatalog?.popular ?? []), ...extraPopular],
    [extraPopular, initialCatalog?.popular],
  );
  const topRatedTV = useMemo(
    () => [...(initialCatalog?.topRated ?? []), ...extraTopRated],
    [extraTopRated, initialCatalog?.topRated],
  );
  const hasMorePopular = hasMorePopularOverride ?? initialCatalog?.hasMorePopular ?? true;
  const hasMoreTopRated = hasMoreTopRatedOverride ?? initialCatalog?.hasMoreTopRated ?? true;

  useEffect(() => {
    if (isError) console.error('Failed to load series catalog:', error);
  }, [error, isError]);

  useEffect(() => {
    if (popularTV.length === 0) return;
    const update = () => {
      const s = popularTV[currentIndexRef.current];
      if (s?.backdrop_path) setBackdropUrl(getBackdropUrl(s.backdrop_path, 'original'));
      currentIndexRef.current = (currentIndexRef.current + 1) % Math.min(popularTV.length, 10);
    };
    update();
    const iv = setInterval(update, 8000);
    return () => clearInterval(iv);
  }, [popularTV.length, setBackdropUrl]);
  useEffect(() => () => setBackdropUrl(null), [setBackdropUrl]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || isLoading || !initialCatalog) return;
    setIsLoadingMore(true);
    try {
      if (activeTab === 'popular' && hasMorePopular) {
        const next = popularPage + 1;
        const d = await getPopularTV(next);
        if (d.results.length) { setExtraPopular(p => [...p, ...d.results]); setPopularPage(next); }
        setHasMorePopularOverride(next < d.totalPages);
      } else if (activeTab === 'top-rated' && hasMoreTopRated) {
        const next = topRatedPage + 1;
        const d = await getTopRatedTV(next);
        if (d.results.length) { setExtraTopRated(p => [...p, ...d.results]); setTopRatedPage(next); }
        setHasMoreTopRatedOverride(next < d.totalPages);
      }
    } catch (e) { console.error(e); } finally { setIsLoadingMore(false); }
  }, [activeTab, hasMorePopular, hasMoreTopRated, initialCatalog, isLoading, isLoadingMore, popularPage, topRatedPage]);

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

  const { shows, hasMore } = useMemo(() => {
    if (activeTab === 'top-rated') return { shows: topRatedTV, hasMore: hasMoreTopRated };
    return                                { shows: popularTV,  hasMore: hasMorePopular };
  }, [activeTab, popularTV, topRatedTV, hasMorePopular, hasMoreTopRated]);

  return (
    <div className="p-4 lg:p-6 pt-4 lg:pt-6 pb-0">
      <h1 className="font-display text-3xl lg:text-4xl mb-6">Web Series</h1>

      <Tabs defaultValue="popular" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="mb-6 bg-muted/50">
          <TabsTrigger value="popular"   className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Popular</TabsTrigger>
          <TabsTrigger value="top-rated" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Top Rated</TabsTrigger>
        </TabsList>

        <TabsContent value="popular">
          {isLoading ? <SkeletonGrid /> : <AutoGrid shows={popularTV} />}
        </TabsContent>
        <TabsContent value="top-rated">
          {isLoading ? <SkeletonGrid /> : <AutoGrid shows={topRatedTV} />}
        </TabsContent>
      </Tabs>

      {/* Infinite scroll sentinel */}
      <div ref={observerRef} className="py-6 flex justify-center">
        {isLoadingMore && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
        {!isLoading && !isLoadingMore && !hasMore && shows.length > 0 && (
          <p className="text-muted-foreground text-sm">You've reached the end</p>
        )}
      </div>
    </div>
  );
};

export default Series;
