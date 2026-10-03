const BASE = 'https://streamed.pk';

export interface SportCategory { id: string; name: string }
export interface MatchTeam { name: string; badge?: string }
export interface SportMatch {
  id: string;
  title: string;
  category: string;
  date: number;
  poster?: string;
  popular?: boolean;
  teams?: { home?: MatchTeam; away?: MatchTeam } | null;
  sources: { source: string; id: string }[];
}
export interface MatchStream {
  id: string;
  streamNo: number;
  language: string;
  hd: boolean;
  embedUrl: string;
  source: string;
}

const get = async <T,>(path: string, signal?: AbortSignal): Promise<T> => {
  const res = await fetch(`${BASE}${path}`, { signal });
  if (!res.ok) throw new Error(`Sports request failed (${res.status})`);
  return res.json();
};

export const fetchSports = (signal?: AbortSignal) => get<SportCategory[]>('/api/sports', signal);
export const fetchLiveMatches = (signal?: AbortSignal) => get<SportMatch[]>('/api/matches/live', signal);
export const fetchStreams = (source: string, id: string, signal?: AbortSignal) =>
  get<MatchStream[]>(`/api/stream/${encodeURIComponent(source)}/${encodeURIComponent(id)}`, signal);

export const posterUrl = (m: SportMatch) => (m.poster ? `${BASE}${m.poster}` : null);
export const badgeUrl = (badge?: string) => (badge ? `${BASE}/api/images/badge/${badge}.webp` : null);
