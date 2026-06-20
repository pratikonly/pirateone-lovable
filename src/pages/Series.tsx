import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { getPopularTV, getTopRatedTV, getBackdropUrl, searchMulti, Movie } from '@/lib/tmdb';
import MovieCard from '@/components/MovieCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSetBackdropUrl } from '@/contexts/BackdropContext';
import DisclaimerFooter from '@/components/DisclaimerFooter';
import { Loader2, Search, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

const AutoGrid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
    {children}
  </div>
);

const SkeletonGrid = () => (
  <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
    {[...Array(20)].map((_, i) => (
      <div key={i} className="space-y-2">
        <div className="aspect-[2/3] bg-muted rounded-lg animate-pulse" />
        <div className="h-3 bg-muted rounded animate-pulse" />
        <div className="h-2.5 w-12 bg-muted rounded animate-pulse" />
      </div>
    ))}
  </div>
);

const Series = () => {
  const [popularTV, setPopularTV]   = useState<Movie[]>([]);
  const [topRatedTV, setTopRatedTV] = useState<Movie[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [activeTab, setActiveTab]   = useState('popular');

  const [popularPage, setPopularPage]       = useState(1);
  const [topRatedPage, setTopRatedPage]     = useState(1);
  const [hasMorePopular, setHasMorePopular]   = useState(true);
  const [hasMoreTopRated, setHasMoreTopRated] = useState(true);
  const [isLoadingMore, setIsLoadingMore]   = useState(false);

  const [searchQuery, setSearchQuery]     = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 350);

  const currentIndexRef = useRef(0);
  const observerRef     = useRef<HTMLDivElement>(null);
  const setBackdropUrl  = useSetBackdropUrl();

  useEffect(() => {
    (async () => {
      try {
        const [popular, topRated] = await Promise.all([getPopularTV(1), getTopRatedTV(1)]);
        setPopularTV(popular.results); setTopRatedTV(topRated.results);
        setHasMorePopular(1 < popular.totalPages); setHasMoreTopRated(1 < topRated.totalPages);
      } catch (e) { console.error(e); } finally { setIsLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (popularTV.length === 0) return;
    const update = () => {
      const s = popularTV[currentIndexRef.current];
      if (s?.backdrop_path) setBackdropUrl(getBackdropUrl(s.backdrop_path, 'original'));
      currentIndexRef.current = (currentIndexRef.current + 1) % Math.min(popularTV.length, 10);
    };
    update(); const iv = setInterval(update, 8000); return () => clearInterval(iv);
  }, [popularTV.length, setBackdropUrl]);
  useEffect(() => () => setBackdropUrl(null), [setBackdropUrl]);

  // TMDB search – TV only
  useEffect(() => {
    if (debouncedQuery.length < 2) { setSearchResults([]); setSearchLoading(false); return; }
    let cancelled = false;
    setSearchLoading(true);
    searchMulti(debouncedQuery).then(results => {
      if (!cancelled) {
        setSearchResults(results.filter(r => r.media_type === 'tv'));
        setSearchLoading(false);
      }
    }).catch(() => { if (!cancelled) setSearchLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const loadMore = useCallback(async (tab: string) => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      if (tab === 'popular' && hasMorePopular) {
        const p = popularPage + 1; const d = await getPopularTV(p);
        setPopularTV(prev => [...prev, ...d.results]); setPopularPage(p);
        if (p >= d.totalPages) setHasMorePopular(false);
      } else if (tab === 'top-rated' && hasMoreTopRated) {
        const p = topRatedPage + 1; const d = await getTopRatedTV(p);
        setTopRatedTV(prev => [...prev, ...d.results]); setTopRatedPage(p);
        if (p >= d.totalPages) setHasMoreTopRated(false);
      }
    } catch (e) { console.error(e); } finally { setIsLoadingMore(false); }
  }, [isLoadingMore, hasMorePopular, hasMoreTopRated, popularPage, topRatedPage]);

  useEffect(() => {
    const target = observerRef.current;
    if (!target) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !isLoadingMore && !searchQuery) loadMore(activeTab);
    }, { threshold: 0.1, rootMargin: '200px' });
    obs.observe(target);
    return () => obs.disconnect();
  }, [activeTab, isLoadingMore, searchQuery, loadMore]);

  const activeShows  = activeTab === 'top-rated' ? topRatedTV : popularTV;
  const activeHasMore = activeTab === 'top-rated' ? hasMoreTopRated : hasMorePopular;

  const isSearching   = searchQuery.length >= 2;
  const displayShows  = isSearching ? searchResults : activeShows;

  return (
    <div className="p-4 lg:p-6 pt-20">
      <h1 className="font-display text-3xl lg:text-4xl mb-4">Web Series</h1>

      <div className={`flex items-center gap-2 border rounded-xl px-3 py-2 mb-5 transition-all duration-300 bg-zinc-900/80 backdrop-blur-sm ${searchFocused || searchQuery ? 'border-primary/60 max-w-md shadow-[0_0_12px_rgba(99,102,241,0.25)]' : 'border-zinc-700/50 max-w-xs hover:border-zinc-500'}`}>
        {searchLoading ? <Loader2 className="w-4 h-4 shrink-0 text-primary animate-spin" /> : <Search className={`w-4 h-4 shrink-0 ${searchFocused || searchQuery ? 'text-primary' : 'text-zinc-500'}`} />}
        <input type="text" placeholder="Search all TV shows on TMDB…"
          value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
          className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none min-w-0" />
        {searchQuery && (
          <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="text-zinc-500 hover:text-white transition-colors shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isSearching ? (
        <>
          <p className="text-sm text-zinc-400 mb-4">
            {searchLoading ? 'Searching…' : `${searchResults.length} TV shows found for "${searchQuery}"`}
          </p>
          {searchLoading ? <SkeletonGrid /> : searchResults.length > 0
            ? <AutoGrid>{searchResults.map((s, i) => <MovieCard key={s.id} movie={{ ...s, media_type: 'tv' }} index={i} className="w-full" />)}</AutoGrid>
            : !searchLoading && <div className="text-center py-16 text-zinc-500">No TV shows found for "{searchQuery}"</div>}
        </>
      ) : (
        <Tabs defaultValue="popular" className="w-full" onValueChange={v => { setActiveTab(v); setSearchQuery(''); }}>
          <TabsList className="mb-6 bg-muted/50">
            <TabsTrigger value="popular" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Popular</TabsTrigger>
            <TabsTrigger value="top-rated" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Top Rated</TabsTrigger>
          </TabsList>
          {['popular', 'top-rated'].map(tab => (
            <TabsContent key={tab} value={tab}>
              {isLoading ? <SkeletonGrid /> : <AutoGrid>{displayShows.map((s, i) => <MovieCard key={s.id} movie={{ ...s, media_type: 'tv' }} index={i} className="w-full" />)}</AutoGrid>}
            </TabsContent>
          ))}
          {!isLoading && (
            <div ref={observerRef} className="py-8 flex justify-center">
              {isLoadingMore && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
              {!isLoadingMore && !activeHasMore && activeShows.length > 0 && <p className="text-muted-foreground text-sm">No more content to load</p>}
            </div>
          )}
        </Tabs>
      )}
      <DisclaimerFooter />
    </div>
  );
};

export default Series;
