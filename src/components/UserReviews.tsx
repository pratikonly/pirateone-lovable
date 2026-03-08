import { useState, useEffect } from 'react';
import { Star, Send, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface UserReviewsProps {
  tmdbId: number;
  mediaType: string;
  title: string;
}

interface Review {
  id: string;
  user_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  profiles?: { pirate_name: string; custom_avatar_url: string | null } | null;
}

const StarRating = ({ rating, onRate, size = 'md' }: { rating: number; onRate?: (r: number) => void; size?: 'sm' | 'md' }) => {
  const [hover, setHover] = useState(0);
  const sz = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onRate?.(i)}
          onMouseEnter={() => onRate && setHover(i)}
          onMouseLeave={() => setHover(0)}
          className={`${onRate ? 'cursor-pointer' : 'cursor-default'} transition-colors`}
          disabled={!onRate}
        >
          <Star className={`${sz} ${i <= (hover || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
        </button>
      ))}
    </div>
  );
};

const UserReviews = ({ tmdbId, mediaType, title }: UserReviewsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myRating, setMyRating] = useState(0);
  const [myReview, setMyReview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [avgRating, setAvgRating] = useState(0);

  const loadReviews = async () => {
    const { data } = await supabase
      .from('user_reviews')
      .select('*')
      .eq('tmdb_id', tmdbId)
      .eq('media_type', mediaType)
      .order('created_at', { ascending: false });

    if (data) {
      setReviews(data as Review[]);
      if (data.length > 0) {
        const avg = data.reduce((sum, r) => sum + (r.rating || 0), 0) / data.length;
        setAvgRating(Math.round(avg * 10) / 10);
      }
      // Load user's existing review
      if (user) {
        const mine = data.find(r => r.user_id === user.id);
        if (mine) {
          setMyRating(mine.rating || 0);
          setMyReview(mine.review_text || '');
        }
      }
    }
  };

  useEffect(() => { loadReviews(); }, [tmdbId, mediaType, user]);

  const handleSubmit = async () => {
    if (!user || myRating === 0) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('user_reviews').upsert({
        user_id: user.id,
        tmdb_id: tmdbId,
        media_type: mediaType,
        rating: myRating,
        review_text: myReview.trim() || null,
        title,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,tmdb_id,media_type' });
      if (error) throw error;
      toast({ title: 'Review saved!' });
      await loadReviews();
    } catch {
      toast({ title: 'Failed to save review', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    try {
      await supabase.from('user_reviews').delete().eq('user_id', user.id).eq('tmdb_id', tmdbId).eq('media_type', mediaType);
      setMyRating(0);
      setMyReview('');
      toast({ title: 'Review deleted' });
      await loadReviews();
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">User Reviews</h3>
        {avgRating > 0 && (
          <div className="flex items-center gap-1.5 text-sm">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-foreground font-medium">{avgRating}</span>
            <span className="text-muted-foreground">({reviews.length})</span>
          </div>
        )}
      </div>

      {/* Write review */}
      {user && (
        <div className="bg-muted/30 border border-border rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm text-muted-foreground">Your rating:</span>
            <StarRating rating={myRating} onRate={setMyRating} />
          </div>
          <textarea
            value={myReview}
            onChange={e => setMyReview(e.target.value)}
            placeholder="Write a review (optional)..."
            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none min-h-[60px]"
          />
          <div className="flex justify-between mt-2">
            {reviews.some(r => r.user_id === user.id) && (
              <button onClick={handleDelete} className="text-xs text-destructive flex items-center gap-1 hover:opacity-80">
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting || myRating === 0}
              className="ml-auto flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {reviews.some(r => r.user_id === user.id) ? 'Update' : 'Submit'}
            </button>
          </div>
        </div>
      )}

      {/* Reviews list */}
      {reviews.filter(r => r.review_text).length === 0 && (
        <p className="text-muted-foreground text-sm text-center py-4">No reviews yet. Be the first!</p>
      )}
      <div className="space-y-3">
        {reviews.filter(r => r.review_text).map(review => (
          <div key={review.id} className="bg-muted/20 border border-border/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <StarRating rating={review.rating || 0} size="sm" />
              <span className="text-xs text-muted-foreground">
                {new Date(review.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm text-foreground/80">{review.review_text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserReviews;
