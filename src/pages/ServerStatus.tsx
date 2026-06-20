import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, CheckCircle2, XCircle, Clock, Wifi } from 'lucide-react';
import { ANIME_SERVERS, MOVIE_TV_SERVERS, getPlayerUrl } from '@/lib/tmdb';

const TEST_ID = 68726; // Pacific Rim — reliable test movie

interface ServerHealth {
  id: string;
  name: string;
  number: number;
  category: 'anime' | 'movie-tv';
  url: string;
  status: 'checking' | 'online' | 'offline' | 'timeout';
  ms: number | null;
}

async function checkServer(url: string): Promise<{ status: 'online' | 'offline' | 'timeout'; ms: number }> {
  const start = Date.now();
  try {
    await fetch(url, {
      mode: 'no-cors',
      signal: AbortSignal.timeout(6000),
      cache: 'no-store',
    });
    return { status: 'online', ms: Date.now() - start };
  } catch (e: any) {
    const ms = Date.now() - start;
    if (e?.name === 'TimeoutError' || ms >= 5900) return { status: 'timeout', ms };
    return { status: 'offline', ms };
  }
}

const StatusBadge = ({ status, ms }: { status: ServerHealth['status']; ms: number | null }) => {
  if (status === 'checking') {
    return (
      <div className="flex items-center gap-2 text-zinc-400">
        <div className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse" />
        <span className="text-xs font-medium">Checking…</span>
      </div>
    );
  }
  if (status === 'online') {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
        <span className="text-xs font-semibold text-emerald-400">Online</span>
        {ms !== null && <span className="text-xs text-zinc-500">{ms}ms</span>}
      </div>
    );
  }
  if (status === 'timeout') {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-yellow-400" />
        <span className="text-xs font-semibold text-yellow-400">Timeout</span>
        {ms !== null && <span className="text-xs text-zinc-500">{ms}ms</span>}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-red-500" />
      <span className="text-xs font-semibold text-red-400">Offline</span>
    </div>
  );
};

const ServerStatus = () => {
  const [servers, setServers] = useState<ServerHealth[]>([]);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const buildServerList = useCallback((): ServerHealth[] => {
    const animeList = ANIME_SERVERS.map((s, i) => ({
      id: s.id,
      name: s.name,
      number: i + 1,
      category: 'anime' as const,
      url: getPlayerUrl(TEST_ID, 'movie', s.id),
      status: 'checking' as const,
      ms: null,
    }));
    const movieList = MOVIE_TV_SERVERS.map((s, i) => ({
      id: s.id,
      name: s.name,
      number: ANIME_SERVERS.length + i + 1,
      category: 'movie-tv' as const,
      url: getPlayerUrl(TEST_ID, 'movie', s.id),
      status: 'checking' as const,
      ms: null,
    }));
    return [...animeList, ...movieList];
  }, []);

  const runChecks = useCallback(async () => {
    setIsRefreshing(true);
    const list = buildServerList();
    setServers(list);

    await Promise.all(
      list.map(async (srv) => {
        const result = await checkServer(srv.url);
        setServers(prev =>
          prev.map(s => s.id === srv.id ? { ...s, ...result } : s)
        );
      })
    );

    setLastChecked(new Date());
    setIsRefreshing(false);
  }, [buildServerList]);

  useEffect(() => { runChecks(); }, [runChecks]);

  const online  = servers.filter(s => s.status === 'online').length;
  const offline = servers.filter(s => s.status === 'offline' || s.status === 'timeout').length;
  const total   = servers.length;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Wifi className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold tracking-tight">Server Health Monitor</h1>
          </div>
          <div className="flex items-center gap-6">
            {lastChecked && (
              <span className="text-xs text-zinc-500 hidden sm:block">
                Last checked {lastChecked.toLocaleTimeString()}
              </span>
            )}
            {total > 0 && (
              <div className="flex items-center gap-4 text-xs font-medium">
                <span className="text-emerald-400">{online} online</span>
                <span className="text-red-400">{offline} offline</span>
              </div>
            )}
            <button
              onClick={runChecks}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-white">{total}</p>
            <p className="text-xs text-zinc-500 mt-1">Total Servers</p>
          </div>
          <div className="bg-zinc-900 border border-emerald-900/50 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-emerald-400">{online}</p>
            <p className="text-xs text-zinc-500 mt-1">Online</p>
          </div>
          <div className="bg-zinc-900 border border-red-900/50 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-red-400">{offline}</p>
            <p className="text-xs text-zinc-500 mt-1">Offline / Timeout</p>
          </div>
        </div>

        {/* Anime + Full Support servers */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <h2 className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Anime + Movies + TV</h2>
          </div>
          <div className="space-y-2">
            {servers.filter(s => s.category === 'anime').map(srv => (
              <div key={srv.id}
                className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-3.5 hover:border-zinc-700 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-zinc-300">{srv.number}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{srv.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{new URL(srv.url).hostname}</p>
                </div>
                <StatusBadge status={srv.status} ms={srv.ms} />
                {srv.status === 'online' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                )}
                {(srv.status === 'offline' || srv.status === 'timeout') && (
                  <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                )}
                {srv.status === 'checking' && (
                  <Clock className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Movie + TV servers */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <h2 className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Movies + TV Only</h2>
          </div>
          <div className="space-y-2">
            {servers.filter(s => s.category === 'movie-tv').map(srv => (
              <div key={srv.id}
                className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-3.5 hover:border-zinc-700 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-zinc-300">{srv.number}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{srv.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{new URL(srv.url).hostname}</p>
                </div>
                <StatusBadge status={srv.status} ms={srv.ms} />
                {srv.status === 'online' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                )}
                {(srv.status === 'offline' || srv.status === 'timeout') && (
                  <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                )}
                {srv.status === 'checking' && (
                  <Clock className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </section>

        <p className="text-center text-xs text-zinc-600 pb-4">
          Health checks run against a live test request. Results may vary by region and network.
        </p>
      </div>
    </div>
  );
};

export default ServerStatus;
