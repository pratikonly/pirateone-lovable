import { useEffect, useState, useRef, useCallback } from 'react';
import { searchMultiPaginated, searchMulti, getBackdropUrl, Movie } from '@/lib/tmdb';
import MovieCard from '@/components/MovieCard';
import { useSetBackdropUrl } from '@/contexts/BackdropContext';
import DisclaimerFooter from '@/components/DisclaimerFooter';
import { Loader2, Search, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

const ANIME_QUERIES = ['anime', 'one piece', 'naruto', 'demon slayer', 'attack on titan', 'jujutsu kaisen'];

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

const Anime = () => {
  const [animeList, setAnimeList]       = useState<Movie[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [currentPage, setCurrentPage]   = useState(1);
  const [hasMore, setHasMore]           = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [searchQuery, setSearchQuery]     = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 350);

  const currentIndexRef = useRef(0);
  const observerRef     = useRef<HTMLDivElement>(null);
  const seenIdsRef      = useRef<Set<number>>(new Set());
  const setBackdropUrl  = useSetBackdropUrl();

  useEffect(() => {
    (async () => {
      try {
        const searches = await Promise.all(ANIME_QUERIES.map(q => searchMultiPaginated(q, 1)));
        const unique: Movie[] = [];
        searches.flatMap(s => s.results).forEach(item => {
          if (!seenIdsRef.current.has(item.id)) { seenIdsRef.current.add(item.id); unique.push(item); }
        });
        setAnimeList(unique);
      } catch (e) { console.error(e); } finally { setIsLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (animeList.length === 0) return;
    const update = () => {
      const a = animeList[currentIndexRef.current];
      if (a?.backdrop_path) setBackdropUrl(getBackdropUrl(a.backdrop_path, 'original'));
      currentIndexRef.current = (currentIndexRef.current + 1) % Math.min(animeList.length, 10);
    };
    update(); const iv = setInterval(update, 8000); return () => clearInterval(iv);
  }, [animeList.length, setBackdropUrl]);
  useEffect(() => () => setBackdropUrl(null), [setBackdropUrl]);

  // TMDB search – anime keyword prepended
  useEffect(() => {
    if (debouncedQuery.length < 2) { setSearchResults([]); setSearchLoading(false); return; }
    let cancelled = false;
    setSearchLoading(true);
    searchMulti(`${debouncedQuery} anime`).then(results => {
      if (!cancelled) { setSearchResults(results); setSearchLoading(false); }
    }).catch(() => { if (!cancelled) setSearchLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const searches = await Promise.all(ANIME_QUERIES.map(q => searchMultiPaginated(q, nextPage)));
      const unique: Movie[] = [];
      searches.flatMap(s => s.results).forEach(item => {
        if (!seenIdsRef.current.has(item.id)) { seenIdsRef.current.add(item.id); unique.push(item); }
      });
      if (unique.length === 0) setHasMore(false);
      else { setAnimeList(prev => [...prev, ...unique]); setCurrentPage(nextPage); }
    } catch (e) { console.error(e); } finally { setIsLoadingMore(false); }
  }, [isLoadingMore, hasMore, currentPage]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && hasMore && !isLoadingMore && !searchQuery) loadMore(); },
      { threshold: 0.1 }
    );
    const ref = observerRef.current;
    if (ref) obs.observe(ref);
    return () => { if (ref) obs.unobserve(ref); };
  }, [hasMore, isLoadingMore, searchQuery, loadMore]);

  const isSearching = searchQuery.length >= 2;

  return (
    <div className="p-4 lg:p-6 pt-20">
      <h1 className="font-display text-3xl lg:text-4xl mb-4">Anime</h1>

      <div className={`flex items-center gap-2 border rounded-xl px-3 py-2 mb-4 transition-all duration-300 bg-zinc-900/80 backdrop-blur-sm ${searchFocused || searchQuery ? 'border-primary/60 max-w-md shadow-[0_0_12px_rgba(99,102,241,0.25)]' : 'border-zinc-700/50 max-w-xs hover:border-zinc-500'}`}>
        {searchLoading ? <Loader2 className="w-4 h-4 shrink-0 text-primary animate-spin" /> : <Search className={`w-4 h-4 shrink-0 ${searchFocused || searchQuery ? 'text-primary' : 'text-zinc-500'}`} />}
        <input type="text" placeholder="Search anime on TMDB…"
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
            {searchLoading ? 'Searching…' : `${searchResults.length} results for "${searchQuery}"`}
          </p>
          {searchLoading ? <SkeletonGrid /> : searchResults.length > 0
            ? <AutoGrid>{searchResults.map((a, i) => <MovieCard key={a.id} movie={a} index={i} className="w-full" />)}</AutoGrid>
            : <div className="text-center py-16 text-zinc-500">No anime found for "{searchQuery}"</div>}
        </>
      ) : (
        <>
          <p className="text-muted-foreground text-sm mb-6">Popular anime series and movies</p>
          {isLoading ? <SkeletonGrid /> : (
            <>
              <AutoGrid>
                {animeList.map((a, i) => <MovieCard key={`${a.id}-${i}`} movie={a} index={i} className="w-full" />)}
              </AutoGrid>
              <div ref={observerRef} className="py-8 flex justify-center">
                {isLoadingMore && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
                {!hasMore && animeList.length > 0 && <p className="text-muted-foreground text-sm">No more content to load</p>}
              </div>
            </>
          )}
        </>
      )}
      <DisclaimerFooter />
    </div>
  );
};

export default Anime;
