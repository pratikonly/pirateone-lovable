import { useState, useEffect } from 'react';
import { Plus, Trash2, FolderOpen, Loader2, Lock, Globe, X, Film } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { getImageUrl } from '@/lib/tmdb';
import DisclaimerFooter from '@/components/DisclaimerFooter';

interface Collection {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  item_count?: number;
  preview_posters?: (string | null)[];
}

interface CollectionItem {
  id: string;
  tmdb_id: number;
  media_type: string;
  title: string;
  poster_path: string | null;
  vote_average: number | null;
}

const Collections = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPublic, setNewPublic] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadCollections = async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('collections')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      // Load item counts and previews
      const enriched = await Promise.all(data.map(async (c: any) => {
        const { data: items } = await supabase
          .from('collection_items')
          .select('poster_path')
          .eq('collection_id', c.id)
          .limit(4);
        return {
          ...c,
          item_count: items?.length || 0,
          preview_posters: items?.map((i: any) => i.poster_path) || [],
        };
      }));
      setCollections(enriched);
    }
    setLoading(false);
  };

  const loadItems = async (collectionId: string) => {
    const { data } = await supabase
      .from('collection_items')
      .select('*')
      .eq('collection_id', collectionId)
      .order('added_at', { ascending: false });
    setItems((data as CollectionItem[]) || []);
  };

  useEffect(() => { loadCollections(); }, [user]);
  useEffect(() => { if (selectedId) loadItems(selectedId); }, [selectedId]);

  const handleCreate = async () => {
    if (!user || !newName.trim()) return;
    setCreating(true);
    try {
      const { error } = await supabase.from('collections').insert({
        user_id: user.id,
        name: newName.trim(),
        description: newDesc.trim() || null,
        is_public: newPublic,
      });
      if (error) throw error;
      setNewName(''); setNewDesc(''); setNewPublic(false); setShowCreate(false);
      toast({ title: 'Collection created!' });
      await loadCollections();
    } catch {
      toast({ title: 'Failed to create collection', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCollection = async (id: string) => {
    try {
      await supabase.from('collections').delete().eq('id', id);
      if (selectedId === id) { setSelectedId(null); setItems([]); }
      toast({ title: 'Collection deleted' });
      await loadCollections();
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await supabase.from('collection_items').delete().eq('id', itemId);
      if (selectedId) await loadItems(selectedId);
      await loadCollections();
    } catch {
      toast({ title: 'Failed to remove item', variant: 'destructive' });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <FolderOpen className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-lg mb-2">Sign in to create collections</p>
        <button onClick={() => navigate('/auth')} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium">
          Sign In
        </button>
      </div>
    );
  }

  const selectedCollection = collections.find(c => c.id === selectedId);

  return (
    <div className="min-h-screen p-4 lg:p-8 pt-20">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl lg:text-4xl">Collections</h1>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> New
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">New Collection</h2>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Collection name..." className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground mb-3 focus:outline-none focus:border-primary" />
            <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)..." className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground mb-3 resize-none min-h-[60px] focus:outline-none focus:border-primary" />
            <label className="flex items-center gap-2 text-sm text-muted-foreground mb-4 cursor-pointer">
              <input type="checkbox" checked={newPublic} onChange={e => setNewPublic(e.target.checked)} className="rounded" />
              {newPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {newPublic ? 'Public collection' : 'Private collection'}
            </label>
            <button onClick={handleCreate} disabled={creating || !newName.trim()} className="w-full bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity">
              {creating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Create Collection'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : selectedId && selectedCollection ? (
        /* Collection detail view */
        <div>
          <button onClick={() => { setSelectedId(null); setItems([]); }} className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1">
            ← Back to collections
          </button>
          <h2 className="text-xl font-semibold text-foreground mb-1">{selectedCollection.name}</h2>
          {selectedCollection.description && <p className="text-sm text-muted-foreground mb-4">{selectedCollection.description}</p>}
          {items.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">No items yet. Add movies or shows from their watch page.</p>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {items.map(item => (
                <div key={item.id} className="group relative">
                  <button onClick={() => navigate(`/watch/${item.media_type}/${item.tmdb_id}`)} className="w-full">
                    {item.poster_path ? (
                      <img src={getImageUrl(item.poster_path, 'w300')!} alt={item.title} className="w-full aspect-[2/3] object-cover rounded-lg" />
                    ) : (
                      <div className="w-full aspect-[2/3] bg-muted rounded-lg flex items-center justify-center"><Film className="w-6 h-6 text-muted-foreground" /></div>
                    )}
                    <p className="text-xs text-foreground mt-1 truncate">{item.title}</p>
                  </button>
                  <button onClick={() => handleRemoveItem(item.id)} className="absolute top-1 right-1 bg-background/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3 text-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : collections.length === 0 ? (
        <div className="text-center py-20">
          <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg mb-2">No collections yet</p>
          <p className="text-muted-foreground text-sm">Create one to organize your favorite movies & shows</p>
        </div>
      ) : (
        /* Collections grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map(col => (
            <div key={col.id} className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors cursor-pointer group" onClick={() => setSelectedId(col.id)}>
              <div className="h-28 bg-muted/30 flex gap-0.5 overflow-hidden">
                {col.preview_posters && col.preview_posters.length > 0 ? (
                  col.preview_posters.slice(0, 4).map((p, i) => (
                    p ? <img key={i} src={getImageUrl(p, 'w200')!} className="h-full flex-1 object-cover" alt="" />
                      : <div key={i} className="h-full flex-1 bg-muted" />
                  ))
                ) : (
                  <div className="flex-1 flex items-center justify-center"><FolderOpen className="w-8 h-8 text-muted-foreground/30" /></div>
                )}
              </div>
              <div className="p-4 flex items-start justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-foreground truncate">{col.name}</h3>
                    {col.is_public ? <Globe className="w-3 h-3 text-muted-foreground" /> : <Lock className="w-3 h-3 text-muted-foreground" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{col.item_count || 0} items</p>
                </div>
                <button onClick={e => { e.stopPropagation(); handleDeleteCollection(col.id); }} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <DisclaimerFooter />
    </div>
  );
};

export default Collections;
