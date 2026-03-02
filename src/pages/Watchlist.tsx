import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, List, HardDrive, Cloud } from 'lucide-react';
import { Movie, getBackdropUrl } from '@/lib/tmdb';
import { getWatchlist as getLocalWatchlist, removeFromWatchlist as removeLocal, clearWatchlist as clearLocal } from '@/lib/watchlist';
import { getWatchlistDb, removeFromWatchlistDb, clearWatchlistDb } from '@/lib/watchlistDb';
import MovieCard from '@/components/MovieCard';
import { Button } from '@/components/ui/button';
import { useSetBackdropUrl } from '@/contexts/BackdropContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const Watchlist = () => {
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const currentIndexRef = useRef(0);
  const setBackdropUrl = useSetBackdropUrl();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Feature E fix: useCallback so useEffect dep is stable
  const loadWatchlist = useCallback(async () => {
    setLoading(true);
    try {
      if (user) {
        const data = await getWatchlistDb();
        setWatchlist(data);
      } else {
        setWatchlist(getLocalWatchlist());
      }
    } catch (err) {
      console.error('Failed to load watchlist:', err);
      // Fallback to local storage
      setWatchlist(getLocalWatchlist());
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadWatchlist();
  }, [loadWatchlist]);

  // Auto-rotate backdrop
  useEffect(() => {
    if (watchlist.length === 0) {
      setBackdropUrl(null);
      return;
    }
    const updateBackdrop = () => {
      const movie = watchlist[currentIndexRef.current % watchlist.length];
      if (movie?.backdrop_path) setBackdropUrl(getBackdropUrl(movie.backdrop_path, 'original'));
    };
    updateBackdrop();
    const interval = setInterval(() => {
      currentIndexRef.current = (currentIndexRef.current + 1) % watchlist.length;
      updateBackdrop();
    }, 8000);
    return () => {
      clearInterval(interval);
      setBackdropUrl(null);
    };
  }, [watchlist, setBackdropUrl]);

  // Feature E fix: proper type narrowing for mediaType
  const handleRemove = async (id: number, mediaType: string) => {
    const safeType = (mediaType === 'tv' ? 'tv' : 'movie') as 'movie' | 'tv';
    try {
      if (user) {
        await removeFromWatchlistDb(id, safeType);
      } else {
        removeLocal(id, safeType);
      }
      // Update local state immediately without full reload
      setWatchlist(prev => prev.filter(m => !(m.id === id && m.media_type === mediaType)));
      toast.success('Removed from watchlist');
    } catch (err) {
      console.error('Remove failed:', err);
      toast.error('Failed to remove');
    }
  };

  const handleClearAll = async () => {
    try {
      if (user) {
        await clearWatchlistDb();
      } else {
        clearLocal();
      }
      setWatchlist([]);
      toast.success('Watchlist cleared');
    } catch {
      toast.error('Failed to clear');
    }
  };

  if (loading) {
    return (
      <div className="p-8 pt-20">
        <h1 className="text-4xl font-bold mb-8">My Watchlist</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="aspect-[2/3] bg-card rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (watchlist.length === 0) {
    return (
      <div className="p-8 pt-20">
        <h1 className="text-4xl font-bold mb-8">My Watchlist</h1>
        <div className="text-center py-16">
          <List className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">Your watchlist is empty</p>
          <p className="text-muted-foreground mt-2">Add movies and shows to watch later</p>
          {!user && (
            <Button onClick={() => navigate('/auth')} variant="outline" className="mt-4">
              Sign in to sync across devices
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 pt-20">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold">My Watchlist</h1>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            {user ? <Cloud className="w-4 h-4" /> : <HardDrive className="w-4 h-4" />}
            {user ? 'Synced' : 'Saved locally'}
          </span>
        </div>
        <Button variant="destructive" onClick={handleClearAll}>
          <Trash2 className="w-4 h-4 mr-2" />
          Clear All
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {watchlist.map((movie, index) => (
          <div key={`${movie.id}-${movie.media_type}`} className="relative group">
            <MovieCard movie={movie} index={index} />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(movie.id, movie.media_type || 'movie');
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Watchlist;
