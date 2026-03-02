import { supabase } from '@/integrations/supabase/client';
import { Movie } from './tmdb';

export type ShowStatusType = 'watching' | 'completed' | 'dropped';

export interface ShowStatusEntry {
  id: string;
  tmdb_id: number;
  media_type: string;
  status: ShowStatusType;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string | null;
  vote_average: number | null;
  last_season: number | null;
  last_episode: number | null;
  updated_at: string;
  created_at: string;
}

export const setShowStatus = async (
  movie: Movie,
  status: ShowStatusType,
  lastSeason?: number,
  lastEpisode?: number,
): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('show_status').upsert({
    user_id: user.id,
    tmdb_id: movie.id,
    media_type: movie.media_type || 'movie',
    status,
    title: movie.title || movie.name || 'Unknown',
    poster_path: movie.poster_path,
    backdrop_path: movie.backdrop_path,
    overview: movie.overview,
    vote_average: movie.vote_average,
    last_season: lastSeason || null,
    last_episode: lastEpisode || null,
  }, { onConflict: 'user_id,tmdb_id,media_type' });

  if (error) throw error;
};

export const getShowStatus = async (tmdbId: number, mediaType: string): Promise<ShowStatusEntry | null> => {
  const { data, error } = await supabase
    .from('show_status')
    .select('*')
    .eq('tmdb_id', tmdbId)
    .eq('media_type', mediaType)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as ShowStatusEntry | null;
};

export const getShowsByStatus = async (status: ShowStatusType): Promise<ShowStatusEntry[]> => {
  const { data, error } = await supabase
    .from('show_status')
    .select('*')
    .eq('status', status)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data || []) as ShowStatusEntry[];
};

export const getAllShowStatuses = async (): Promise<ShowStatusEntry[]> => {
  const { data, error } = await supabase
    .from('show_status')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data || []) as ShowStatusEntry[];
};

export const removeShowStatus = async (tmdbId: number, mediaType: string): Promise<void> => {
  const { error } = await supabase
    .from('show_status')
    .delete()
    .eq('tmdb_id', tmdbId)
    .eq('media_type', mediaType);

  if (error) throw error;
};
