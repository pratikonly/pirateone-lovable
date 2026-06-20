import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { getPopularTV, getTopRatedTV, getBackdropUrl, Movie } from '@/lib/tmdb';
import MovieCard from '@/components/MovieCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSetBackdropUrl } from '@/contexts/BackdropContext';
import DisclaimerFooter from '@/components/DisclaimerFooter';
import { Loader2, Search, X } from 'lucide-react';

const Series = () => {
  const [popularTV, setPopularTV] = useState<Movie[]>([]);
  const [topRatedTV, setTopRatedTV] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const [popularPage, setPopularPage] = useState(1);
  const [topRatedPage, setTopRatedPage] = useState(1);
  const [hasMorePopular, setHasMorePopular] = useState(true);
  const [hasMoreTopRated, setHasMoreTopRated] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const currentIndexRef = useRef(0);
  const observerRef = useRef<HTMLDivElement>(null);
  const setBackdropUrl = useSetBackdropUrl();

  useEffect(() => {
    const fetchTV = async () => {
      try {
        const [popular, topRated] = await Promise.all([getPopularTV(1), getTopRatedTV(1)]);
        setPopularTV(popular.results);
        setTopRatedTV(topRated.results);
        setHasMorePopular(1 < popular.totalPages);
        setHasMoreTopRated(1 < topRated.totalPages);
      } catch (error) {
        console.error('Failed to fetch TV shows:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTV();
  }, []);

  useEffect(() => {
    if (popularTV.length === 0) return;
    const updateBackdrop = () => {
      const show = popularTV[currentIndexRef.current];
      if (show?.backdrop_path) setBackdropUrl(getBackdropUrl(show.backdrop_path, 'original'));
      currentIndexRef.current = (currentIndexRef.current + 1) % Math.min(popularTV.length, 10);
    };
    updateBackdrop();
    const interval = setInterval(updateBackdrop, 8000);
    return () => clearInterval(interval);
  }, [popularTV.length, setBackdropUrl]);

  useEffect(() => { return () => setBackdropUrl(null); }, [setBackdropUrl]);

  const loadMorePopular = useCallback(async () => {
    if (isLoadingMore || !hasMorePopular) return;
    setIsLoadingMore(true);
    try {
      const nextPage = popularPage + 1;
      const data = await getPopularTV(nextPage);
      if (data.results.length === 0) { setHasMorePopular(false); return; }
      setPopularTV(prev => [...prev, ...data.results]);
      setPopularPage(nextPage);
      if (nextPage >= data.totalPages) setHasMorePopular(false);
    } catch (e) { console.error(e); } finally { setIsLoadingMore(false); }
  }, [hasMorePopular, isLoadingMore, popularPage]);

  const loadMoreTopRated = useCallback(async () => {
    if (isLoadingMore || !hasMoreTopRated) return;
    setIsLoadingMore(true);
    try {
      const nextPage = topRatedPage + 1;
      const data = await getTopRatedTV(nextPage);
      if (data.results.length === 0) { setHasMoreTopRated(false); return; }
      setTopRatedTV(prev => [...prev, ...data.results]);
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
        if (activeTab === 'top-rated' && hasMoreTopRated) loadMoreTopRated();
      },
      { threshold: 0.1, rootMargin: '200px' }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [activeTab, hasMorePopular, hasMoreTopRated, isLoadingMore, loadMorePopular, loadMoreTopRated]);

  const { activeShows, activeHasMore } = useMemo(() => {
    if (activeTab === 'top-rated') return { activeShows: topRatedTV, activeHasMore: hasMoreTopRated };
    return { activeShows: popularTV, activeHasMore: hasMorePopular };
  }, [activeTab, hasMorePopular, hasMoreTopRated, popularTV, topRatedTV]);

  const filteredShows = useMemo(() => {
    if (!searchQuery.trim()) return activeShows;
    const q = searchQuery.toLowerCase();
    return activeShows.filter(s => (s.title || s.name || '').toLowerCase().includes(q));
  }, [activeShows, searchQuery]);

  const MovieGrid = ({ shows }: { shows: Movie[] }) => (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 lg:gap-3">
      {shows.map((show, index) => (
        <MovieCard key={show.id} movie={{ ...show, media_type: 'tv' }} index={index} className="w-full" />
      ))}
    </div>
  );

  const LoadingSkeleton = () => (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 lg:gap-3">
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
      {/* Header + Search */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-3xl lg:text-4xl shrink-0">Web Series</h1>

        <div className={`flex items-center gap-2 border rounded-xl px-3 py-2 transition-all duration-300 bg-zinc-900/80 backdrop-blur-sm ${searchFocused || searchQuery ? 'border-primary/60 w-full max-w-sm shadow-[0_0_12px_rgba(var(--primary-rgb),0.2)]' : 'border-zinc-700/50 w-44 hover:border-zinc-500'}`}>
          <Search className={`w-4 h-4 shrink-0 transition-colors ${searchFocused || searchQuery ? 'text-primary' : 'text-zinc-500'}`} />
          <input
            type="text"
            placeholder="Search TV shows…"
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
      </div>

      <Tabs defaultValue="popular" className="w-full" onValueChange={v => { setActiveTab(v); setSearchQuery(''); }}>
        <TabsList className="mb-6 bg-muted/50">
          <TabsTrigger value="popular" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Popular</TabsTrigger>
          <TabsTrigger value="top-rated" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Top Rated</TabsTrigger>
        </TabsList>

        {['popular', 'top-rated'].map(tab => (
          <TabsContent key={tab} value={tab}>
            {isLoading ? <LoadingSkeleton /> : (
              <>
                {searchQuery && (
                  <p className="text-sm text-zinc-400 mb-3">
                    {filteredShows.length} result{filteredShows.length !== 1 ? 's' : ''} for "{searchQuery}"
                  </p>
                )}
                {filteredShows.length > 0
                  ? <MovieGrid shows={filteredShows} />
                  : searchQuery
                    ? <div className="text-center py-16 text-zinc-500">No TV shows matching "{searchQuery}"</div>
                    : <MovieGrid shows={activeShows} />}
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {!isLoading && !searchQuery && (
        <div ref={observerRef} className="py-8 flex justify-center">
          {isLoadingMore && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
          {!isLoadingMore && !activeHasMore && activeShows.length > 0 && (
            <p className="text-muted-foreground text-sm">No more content to load</p>
          )}
        </div>
      )}
      <DisclaimerFooter />
    </div>
  );
};

export default Series;
