import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchMultiPaginated, getBackdropUrl, Movie } from '@/lib/tmdb';
import MovieCard from '@/components/MovieCard';
import { useSetBackdropUrl } from '@/contexts/BackdropContext';
import { Loader2 } from 'lucide-react';

const ANIME_QUERIES = ['anime', 'one piece', 'naruto', 'demon slayer', 'attack on titan', 'jujutsu kaisen'];

const getUniqueAnime = (items: Movie[]) => {
  const seenIds = new Set<number>();
  return items.filter(item => {
    if (seenIds.has(item.id)) return false;
    seenIds.add(item.id);
    return true;
  });
};

const getInitialAnime = async () => {
  const [pageOneSearches, pageTwoSearches] = await Promise.all([
    Promise.all(ANIME_QUERIES.map(query => searchMultiPaginated(query, 1))),
    Promise.all(ANIME_QUERIES.map(query => searchMultiPaginated(query, 2))),
  ]);

  return getUniqueAnime([
    ...pageOneSearches.flatMap(search => search.results),
    ...pageTwoSearches.flatMap(search => search.results),
  ]);
};

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

const Anime = () => {
  const {
    data: initialAnime = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['catalog', 'anime'],
    queryFn: getInitialAnime,
  });
  const [extraAnime, setExtraAnime] = useState<Movie[]>([]);
  const [currentPage,   setCurrentPage]   = useState(2);
  const [hasMore,       setHasMore]       = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const currentIndexRef = useRef(0);
  const observerRef     = useRef<HTMLDivElement>(null);
  const setBackdropUrl  = useSetBackdropUrl();
  const animeList = useMemo(
    () => getUniqueAnime([...initialAnime, ...extraAnime]),
    [extraAnime, initialAnime],
  );

  useEffect(() => {
    if (isError) console.error('Failed to load anime catalog:', error);
  }, [error, isError]);

  useEffect(() => {
    if (animeList.length === 0) return;
    const update = () => {
      const a = animeList[currentIndexRef.current];
      if (a?.backdrop_path) setBackdropUrl(getBackdropUrl(a.backdrop_path, 'original'));
      currentIndexRef.current = (currentIndexRef.current + 1) % Math.min(animeList.length, 10);
    };
    update();
    const iv = setInterval(update, 8000);
    return () => clearInterval(iv);
  }, [animeList.length, setBackdropUrl]);
  useEffect(() => () => setBackdropUrl(null), [setBackdropUrl]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || isLoading || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const next = currentPage + 1;
      const searches = await Promise.all(ANIME_QUERIES.map(q => searchMultiPaginated(q, next)));
      const newItems = searches.flatMap(s => s.results);
      const existingIds = new Set(animeList.map(item => item.id));
      const uniqueNewItems = newItems.filter(item => {
        if (existingIds.has(item.id)) return false;
        existingIds.add(item.id);
        return true;
      });
      if (uniqueNewItems.length === 0) setHasMore(false);
      setExtraAnime(previous => [...previous, ...uniqueNewItems]);
      setCurrentPage(next);
    } catch (e) { console.error(e); } finally { setIsLoadingMore(false); }
  }, [animeList, currentPage, hasMore, isLoading, isLoadingMore]);

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

  return (
    <div className="p-4 lg:p-6 pt-4 lg:pt-6 pb-0">
      <h1 className="font-display text-3xl lg:text-4xl mb-2">Anime</h1>
      <p className="text-muted-foreground text-sm mb-6">Popular anime series and movies</p>

      {isLoading ? <SkeletonGrid /> : (
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
          {animeList.map((a, i) => (
            <MovieCard key={`${a.id}-${i}`} movie={a} index={i} className="w-full" />
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={observerRef} className="py-6 flex justify-center">
        {isLoadingMore && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
        {!isLoading && !isLoadingMore && !hasMore && animeList.length > 0 && (
          <p className="text-muted-foreground text-sm">You've reached the end</p>
        )}
      </div>
    </div>
  );
};

export default Anime;
