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
  season: number | null;
  episode: number | null;
  duration: number | null;
  progress_time: number;
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
  title?: string,
  posterPath?: string | null,
  backdropPath?: string | null,
  overview?: string | null,
  voteAverage?: number | null,
): Promise<void> => {
  const userId = await getUserId();
  if (!userId) return;

  const completed = duration > 0 && currentTime >= duration * 0.9;

  // IMPORTANT: Pass null (not undefined) for season/episode on movies
  // The unique index uses COALESCE(season, -1) so NULL is fine,
  // but undefined would be omitted from the payload entirely
  const seasonVal  = (mediaType === 'tv' && season  != null) ? season  : null;
  const episodeVal = (mediaType === 'tv' && episode != null) ? episode : null;

  const { error } = await supabase.from('watch_progress').upsert(
    {
      user_id:       userId,
      tmdb_id:       tmdbId,
      media_type:    mediaType,
      season:        seasonVal,
      episode:       episodeVal,
      duration,
      progress_time: currentTime,
      completed,
      server,
      title:         title        ?? '',
      poster_path:   posterPath   ?? null,
      backdrop_path: backdropPath ?? null,
      overview:      overview     ?? null,
      vote_average:  voteAverage  ?? null,
    },
    {
      // Must exactly match the index columns:
      // watch_progress_unique ON (user_id, tmdb_id, media_type, server, COALESCE(season,-1), COALESCE(episode,-1))
      // PostgREST accepts the index name when it's a unique index (not just a constraint)
      onConflict: 'user_id,tmdb_id,media_type,server,season,episode',
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
