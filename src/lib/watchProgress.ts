import { supabase } from '@/integrations/supabase/client';
import { Movie } from './tmdb';

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
  season?: number;
  episode?: number;
  duration?: number;
  current_time: number;
  completed: boolean;
  server: string;
  updated_at: string;
  created_at: string;
}

export const saveWatchProgress = async (
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  currentTime: number,
  duration: number,
  server: string,
  season?: number,
  episode?: number
): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const completed = duration > 0 && currentTime >= duration * 0.9; // Mark as completed at 90%

  const { error } = await supabase.from('watch_progress').upsert({
    user_id: user.id,
    tmdb_id: tmdbId,
    media_type: mediaType,
    season: season || null,
    episode: episode || null,
    duration,
    current_time: currentTime,
    completed,
    server,
  }, {
    onConflict: 'user_id,tmdb_id,media_type,season,episode,server'
  });

  if (error) {
    console.error('Failed to save watch progress:', error);
  }
};

export const getWatchProgress = async (
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  season?: number,
  episode?: number,
  server?: string
): Promise<WatchProgressEntry | null> => {
  const { data, error } = await supabase
    .from('watch_progress')
    .select('*')
    .eq('tmdb_id', tmdbId)
    .eq('media_type', mediaType)
    .maybeSingle();

  if (error) {
    console.error('Failed to get watch progress:', error);
    return null;
  }

  return data as WatchProgressEntry | null;
};

export const getAllWatchProgress = async (): Promise<WatchProgressEntry[]> => {
  const { data, error } = await supabase
    .from('watch_progress')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Failed to get all watch progress:', error);
    return [];
  }

  return (data || []) as WatchProgressEntry[];
};

export const deleteWatchProgress = async (
  tmdbId: number,
  mediaType: 'movie' | 'tv'
): Promise<void> => {
  const { error } = await supabase
    .from('watch_progress')
    .delete()
    .eq('tmdb_id', tmdbId)
    .eq('media_type', mediaType);

  if (error) {
    console.error('Failed to delete watch progress:', error);
  }
};

export const getProgressPercentage = (progress: WatchProgressEntry): number => {
  if (!progress.duration || progress.duration <= 0) return 0;
  return Math.min(100, (progress.current_time / progress.duration) * 100);
};
