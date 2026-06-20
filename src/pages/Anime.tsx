import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { searchMultiPaginated, getBackdropUrl, Movie } from '@/lib/tmdb';
import MovieCard from '@/components/MovieCard';
import { useSetBackdropUrl } from '@/contexts/BackdropContext';
import DisclaimerFooter from '@/components/DisclaimerFooter';
import { Loader2, Search, X } from 'lucide-react';

const ANIME_QUERIES = ['anime', 'one piece', 'naruto', 'demon slayer', 'attack on titan', 'jujutsu kaisen'];

const Anime = () => {
  const [animeList, setAnimeList] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const currentIndexRef = useRef(0);
  const observerRef = useRef<HTMLDivElement>(null);
  const seenIdsRef = useRef<Set<number>>(new Set());
  const setBackdropUrl = useSetBackdropUrl();

  useEffect(() => {
    const fetchAnime = async () => {
      try {
        const searches = await Promise.all(ANIME_QUERIES.map(q => searchMultiPaginated(q, 1)));
        const allResults = searches.flatMap(s => s.results);
        const uniqueResults: Movie[] = [];
        allResults.forEach(item => {
          if (!seenIdsRef.current.has(item.id)) {
            seenIdsRef.current.add(item.id);
            uniqueResults.push(item);
          }
        });
        setAnimeList(uniqueResults);
      } catch (error) {
        console.error('Failed to fetch anime:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnime();
  }, []);

  useEffect(() => {
    if (animeList.length === 0) return;
    const updateBackdrop = () => {
      const anime = animeList[currentIndexRef.current];
      if (anime?.backdrop_path) setBackdropUrl(getBackdropUrl(anime.backdrop_path, 'original'));
      currentIndexRef.current = (currentIndexRef.current + 1) % Math.min(animeList.length, 10);
    };
    updateBackdrop();
    const interval = setInterval(updateBackdrop, 8000);
    return () => clearInterval(interval);
  }, [animeList.length, setBackdropUrl]);

  useEffect(() => { return () => setBackdropUrl(null); }, [setBackdropUrl]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const searches = await Promise.all(ANIME_QUERIES.map(q => searchMultiPaginated(q, nextPage)));
      const allResults = searches.flatMap(s => s.results);
      const uniqueResults: Movie[] = [];
      allResults.forEach(item => {
        if (!seenIdsRef.current.has(item.id)) {
          seenIdsRef.current.add(item.id);
          uniqueResults.push(item);
        }
      });
      if (uniqueResults.length === 0) {
        setHasMore(false);
      } else {
        setAnimeList(prev => [...prev, ...uniqueResults]);
        setCurrentPage(nextPage);
      }
    } catch (error) {
      console.error('Failed to load more anime:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, currentPage]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasMore && !isLoadingMore) loadMore(); },
      { threshold: 0.1 }
    );
    const currentRef = observerRef.current;
    if (currentRef) observer.observe(currentRef);
    return () => { if (currentRef) observer.unobserve(currentRef); };
  }, [hasMore, isLoadingMore, loadMore]);

  const filteredAnime = useMemo(() => {
    if (!searchQuery.trim()) return animeList;
    const q = searchQuery.toLowerCase();
    return animeList.filter(a => (a.title || a.name || '').toLowerCase().includes(q));
  }, [animeList, searchQuery]);

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
      <h1 className="font-display text-3xl lg:text-4xl mb-4">Anime</h1>

      {/* Search bar — below title, above description */}
      <div className={`flex items-center gap-2 border rounded-xl px-3 py-2 mb-4 transition-all duration-300 bg-zinc-900/80 backdrop-blur-sm ${searchFocused || searchQuery ? 'border-primary/60 max-w-md shadow-[0_0_12px_rgba(99,102,241,0.25)]' : 'border-zinc-700/50 max-w-xs hover:border-zinc-500'}`}>
        <Search className={`w-4 h-4 shrink-0 transition-colors ${searchFocused || searchQuery ? 'text-primary' : 'text-zinc-500'}`} />
        <input
          type="text"
          placeholder="Search anime…"
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

      {!searchQuery && (
        <p className="text-muted-foreground text-sm mb-6">Popular anime series and movies</p>
      )}
      {searchQuery && (
        <p className="text-sm text-zinc-400 mb-4">
          {filteredAnime.length} result{filteredAnime.length !== 1 ? 's' : ''} for "{searchQuery}"
        </p>
      )}

      {isLoading ? (
        <LoadingSkeleton />
      ) : filteredAnime.length > 0 ? (
        <>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 lg:gap-3">
            {filteredAnime.map((item, index) => (
              <MovieCard key={`${item.id}-${index}`} movie={item} index={index} className="w-full" />
            ))}
          </div>
          {!searchQuery && (
            <div ref={observerRef} className="py-8 flex justify-center">
              {isLoadingMore && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
              {!hasMore && animeList.length > 0 && (
                <p className="text-muted-foreground text-sm">No more content to load</p>
              )}
            </div>
          )}
        </>
      ) : searchQuery ? (
        <div className="text-center py-16 text-zinc-500">No anime matching "{searchQuery}"</div>
      ) : null}

      <DisclaimerFooter />
    </div>
  );
};

export default Anime;
