import { useState, useEffect } from 'react';
import { FolderPlus, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AddToCollectionProps {
  tmdbId: number;
  mediaType: string;
  title: string;
  posterPath: string | null;
  backdropPath?: string | null;
  voteAverage?: number | null;
}

const AddToCollection = ({ tmdbId, mediaType, title, posterPath, backdropPath, voteAverage }: AddToCollectionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<{ id: string; name: string; hasItem: boolean }[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCollections = async () => {
    if (!user) return;
    setLoading(true);
    const { data: cols } = await supabase.from('collections').select('id, name').eq('user_id', user.id);
    if (cols) {
      const enriched = await Promise.all(cols.map(async (c: any) => {
        const { count } = await supabase.from('collection_items').select('*', { count: 'exact', head: true }).eq('collection_id', c.id).eq('tmdb_id', tmdbId).eq('media_type', mediaType);
        return { ...c, hasItem: (count || 0) > 0 };
      }));
      setCollections(enriched);
    }
    setLoading(false);
  };

  useEffect(() => { if (open) loadCollections(); }, [open]);

  const toggleItem = async (collectionId: string, hasItem: boolean) => {
    try {
      if (hasItem) {
        await supabase.from('collection_items').delete().eq('collection_id', collectionId).eq('tmdb_id', tmdbId).eq('media_type', mediaType);
      } else {
        await supabase.from('collection_items').insert({
          collection_id: collectionId, tmdb_id: tmdbId, media_type: mediaType,
          title, poster_path: posterPath, backdrop_path: backdropPath, vote_average: voteAverage,
        });
      }
      await loadCollections();
      toast({ title: hasItem ? 'Removed from collection' : 'Added to collection' });
    } catch {
      toast({ title: 'Failed to update collection', variant: 'destructive' });
    }
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <FolderPlus className="w-4 h-4" /> Add to Collection
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-56 bg-popover border border-border rounded-lg shadow-lg z-50 py-2">
            {loading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
            ) : collections.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">No collections yet. Create one first.</p>
            ) : (
              collections.map(c => (
                <button key={c.id} onClick={() => toggleItem(c.id, c.hasItem)} className="w-full px-3 py-2 text-sm text-left hover:bg-muted/50 flex items-center justify-between transition-colors">
                  <span className="text-foreground truncate">{c.name}</span>
                  {c.hasItem && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AddToCollection;
