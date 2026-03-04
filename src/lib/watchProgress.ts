import { supabase } from '@/integrations/supabase/client';

export interface WatchProgressEntry {
  id: string;
  user_id: string;
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string | null;
  vote_average: number | null;
  season?: number | null;
  episode?: number | null;
  duration?: number | null;
  progress_time: number;  // DB column is progress_time (was current_time before migration)
  completed: boolean;
  server: string;
  updated_at: string;
  created_at: string;
}

const getUserId = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
};

export const saveWatchProgress = async (
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  currentTime: number,
  duration: number,
  server: string,
  season?: number,
  episode?: number,
  // Metadata — required by DB schema (NOT NULL for title)
  title?: string,
  posterPath?: string | null,
  backdropPath?: string | null,
  overview?: string | null,
  voteAverage?: number | null,
): Promise<void> => {
  const userId = await getUserId();
  if (!userId) return;

  const completed = duration > 0 && currentTime >= duration * 0.9;

  // For movies: season=null, episode=null  → matches watch_progress_movie_unique index
  // For TV:     season=N,    episode=N     → matches watch_progress_tv_unique index
  // We pick the onConflict columns to match the correct partial index.
  const isMovie = mediaType === 'movie' || season == null || episode == null;

  const { error } = await supabase.from('watch_progress').upsert(
    {
      user_id:       userId,
      tmdb_id:       tmdbId,
      media_type:    mediaType,
      season:        isMovie ? null : season,
      episode:       isMovie ? null : episode,
      duration,
      progress_time: currentTime,    // ← correct column name after migration
      completed,
      server,
      title:         title        ?? '',
      poster_path:   posterPath   ?? null,
      backdrop_path: backdropPath ?? null,
      overview:      overview     ?? null,
      vote_average:  voteAverage  ?? null,
    },
    {
      // Must match the partial unique index columns exactly
      onConflict: isMovie
        ? 'user_id,tmdb_id,media_type,server'
        : 'user_id,tmdb_id,media_type,season,episode,server',
    }
  );

  if (error) {
    console.error('[watchProgress] save failed:', error.message, error.details);
  }
};

export const getWatchProgress = async (
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  season?: number,
  episode?: number,
): Promise<WatchProgressEntry | null> => {
  const userId = await getUserId();
  if (!userId) return null;

  // For TV try to load the specific episode; fall back to most-recent entry
  let query = supabase
    .from('watch_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('tmdb_id', tmdbId)
    .eq('media_type', mediaType)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (mediaType === 'tv' && season != null && episode != null) {
    query = supabase
      .from('watch_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('tmdb_id', tmdbId)
      .eq('media_type', mediaType)
      .eq('season', season)
      .eq('episode', episode)
      .order('updated_at', { ascending: false })
      .limit(1);
  }

  const { data, error } = await query.maybeSingle();
  if (error) { console.error('[watchProgress] get failed:', error); return null; }
  return data as WatchProgressEntry | null;
};

export const getAllWatchProgress = async (): Promise<WatchProgressEntry[]> => {
  const userId = await getUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('watch_progress')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) { console.error('[watchProgress] getAll failed:', error); return []; }
  return (data || []) as WatchProgressEntry[];
};

export const deleteWatchProgress = async (
  tmdbId: number,
  mediaType: 'movie' | 'tv'
): Promise<void> => {
  const userId = await getUserId();
  if (!userId) return;

  const { error } = await supabase
    .from('watch_progress')
    .delete()
    .eq('user_id', userId)
    .eq('tmdb_id', tmdbId)
    .eq('media_type', mediaType);

  if (error) { console.error('[watchProgress] delete failed:', error); }
};

export const getProgressPercentage = (progress: WatchProgressEntry): number => {
  if (!progress.duration || progress.duration <= 0) return 0;
  return Math.min(100, (progress.progress_time / progress.duration) * 100);
};
