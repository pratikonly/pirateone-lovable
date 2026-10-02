import { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { getAnimeList, searchAnime, AnimeSort } from '@/lib/anilist';
import { getBackdropUrl, Movie } from '@/lib/tmdb';
import MovieCard from '@/components/MovieCard';
import { useSetBackdropUrl } from '@/contexts/BackdropContext';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

const SORTS: { id: AnimeSort; label: string }[] = [
  { id: 'TRENDING_DESC', label: 'Trending' },
  { id: 'POPULARITY_DESC', label: 'Popular' },
  { id: 'SCORE_DESC', label: 'Top Rated' },
];

const getUniqueAnime = (items: Movie[]) => {
  const seenIds = new Set<number>();
  return items.filter(item => {
    if (seenIds.has(item.id)) return false;
    seenIds.add(item.id);
    return true;
  });
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
  const [sort, setSort] = useState<AnimeSort>('TRENDING_DESC');
  const [searchInput, setSearchInput] = useState('');
  const searchTerm = useDebounce(searchInput.trim(), 400);

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['catalog', 'anime', searchTerm ? 'search' : sort, searchTerm],
    queryFn: ({ pageParam }) =>
      searchTerm ? searchAnime(searchTerm, pageParam) : getAnimeList(sort, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => (lastPage.hasNextPage ? allPages.length + 1 : undefined),
  });

  const observerRef = useRef<HTMLDivElement>(null);
  const currentIndexRef = useRef(0);
  const setBackdropUrl = useSetBackdropUrl();

  const animeList = useMemo(
    () => getUniqueAnime((data?.pages ?? []).flatMap(page => page.results)),
    [data],
  );

  useEffect(() => {
    if (isError) console.error('Failed to load anime catalog:', error);
  }, [error, isError]);

  // Rotate the page backdrop through the first few results
  const backdropKey = animeList.slice(0, 10).map(a => a.id).join(',');
  useEffect(() => {
    if (animeList.length === 0) return;
    currentIndexRef.current = 0;
    const update = () => {
      const a = animeList[currentIndexRef.current];
      if (a?.backdrop_path) setBackdropUrl(getBackdropUrl(a.backdrop_path, 'original'));
      currentIndexRef.current = (currentIndexRef.current + 1) % Math.min(animeList.length, 10);
    };
    update();
    const iv = setInterval(update, 8000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backdropKey, setBackdropUrl]);
  useEffect(() => () => setBackdropUrl(null), [setBackdropUrl]);

  // Infinite scroll
  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: '400px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div className="p-4 lg:p-6 pt-4 lg:pt-6 pb-0">
      <h1 className="font-display text-3xl lg:text-4xl mb-2">Anime</h1>
      <p className="text-muted-foreground text-sm mb-4">Popular anime series and movies</p>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {SORTS.map(option => (
          <button
            key={option.id}
            onClick={() => {
              setSearchInput('');
              setSort(option.id);
            }}
            className={cn(
              'rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition-colors',
              !searchTerm && sort === option.id
                ? 'border-white bg-white text-black'
                : 'border-white/20 bg-white/[0.06] text-white/80 hover:bg-white/15',
            )}
          >
            {option.label}
          </button>
        ))}
        <input
          value={searchInput}
          onChange={event => setSearchInput(event.target.value)}
          placeholder="Search anime..."
          aria-label="Search anime"
          className="h-8 w-full max-w-xs rounded-full border border-white/20 bg-white/[0.06] px-4 text-sm text-white outline-none placeholder:text-muted-foreground focus:border-white/50 sm:ml-2"
        />
      </div>

      {isLoading ? (
        <SkeletonGrid />
      ) : isError ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Couldn't load anime right now. Please try again in a moment.
        </p>
      ) : animeList.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No anime found.</p>
      ) : (
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
          {animeList.map((a, i) => (
            <MovieCard key={a.id} movie={a} index={i} className="w-full" />
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={observerRef} className="py-6 flex justify-center">
        {isFetchingNextPage && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
        {!isLoading && !isFetchingNextPage && !hasNextPage && animeList.length > 0 && (
          <p className="text-muted-foreground text-sm">You've reached the end</p>
        )}
      </div>
    </div>
  );
};

export default Anime;