import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Wifi } from 'lucide-react';
import { ANIME_SERVERS, MOVIE_TV_SERVERS, getPlayerUrl } from '@/lib/tmdb';

const TEST_ID = 68726;

type Status = 'checking' | 'online' | 'offline';

interface ServerHealth {
  id: string;
  name: string;
  number: number;
  category: 'anime' | 'movie-tv';
  domain: string;
  status: Status;
  ms: number | null;
}

// A CORS error (TypeError) means the server responded but blocked cross-origin — it IS online.
// Only a network failure (no response at all) or explicit timeout means offline.
async function checkServer(url: string): Promise<{ status: Status; ms: number }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    await fetch(url, { mode: 'no-cors', signal: controller.signal, cache: 'no-store' });
    clearTimeout(timer);
    return { status: 'online', ms: Date.now() - start };
  } catch (e: any) {
    const ms = Date.now() - start;
    // TypeError = CORS blocked = server IS up; AbortError = timed out = offline
    if (e?.name === 'TypeError') return { status: 'online', ms };
    return { status: 'offline', ms };
  }
}

const Dot = ({ status }: { status: Status }) => {
  if (status === 'checking') return <span className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse inline-block" />;
  if (status === 'online')   return <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_5px_#34d399] inline-block" />;
  return <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />;
};

const ServerStatus = () => {
  const [servers, setServers] = useState<ServerHealth[]>([]);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [running, setRunning] = useState(false);

  const buildList = useCallback((): ServerHealth[] => [
    ...ANIME_SERVERS.map((s, i) => ({
      id: s.id, name: s.name, number: i + 1, category: 'anime' as const,
      domain: new URL(getPlayerUrl(TEST_ID, 'movie', s.id)).hostname,
      status: 'checking' as Status, ms: null,
    })),
    ...MOVIE_TV_SERVERS.map((s, i) => ({
      id: s.id, name: s.name, number: ANIME_SERVERS.length + i + 1, category: 'movie-tv' as const,
      domain: new URL(getPlayerUrl(TEST_ID, 'movie', s.id)).hostname,
      status: 'checking' as Status, ms: null,
    })),
  ], []);

  const runChecks = useCallback(async () => {
    setRunning(true);
    const list = buildList();
    setServers(list);
    await Promise.all(list.map(async (srv) => {
      const url = getPlayerUrl(TEST_ID, 'movie', srv.id as any);
      const result = await checkServer(url);
      setServers(prev => prev.map(s => s.id === srv.id ? { ...s, ...result } : s));
    }));
    setLastChecked(new Date());
    setRunning(false);
  }, [buildList]);

  useEffect(() => { runChecks(); }, [runChecks]);

  const online  = servers.filter(s => s.status === 'online').length;
  const offline = servers.filter(s => s.status === 'offline').length;
  const anime   = servers.filter(s => s.category === 'anime');
  const movieTv = servers.filter(s => s.category === 'movie-tv');

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header bar */}
      <div className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Wifi className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm tracking-tight">Server Health</span>
            <span className="text-zinc-600 text-xs">— pirateone</span>
          </div>
          <div className="flex items-center gap-5 text-xs">
            <span className="text-zinc-500">{servers.length} servers</span>
            <span className="text-emerald-400 font-semibold">{online} online</span>
            <span className="text-red-400 font-semibold">{offline} offline</span>
            {lastChecked && (
              <span className="text-zinc-600 hidden sm:block">checked {lastChecked.toLocaleTimeString()}</span>
            )}
            <button
              onClick={runChecks}
              disabled={running}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-medium transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-3 h-3 ${running ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-6xl mx-auto px-5 py-4 w-full">
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Total', value: servers.length, color: 'text-white' },
            { label: 'Online',  value: online,  color: 'text-emerald-400' },
            { label: 'Offline', value: offline, color: 'text-red-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-zinc-500 text-xs mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Two-column grid: Anime section left, Movie+TV section right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Anime + Movies + TV */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Anime + Movies + TV</span>
            </div>
            <div className="space-y-1.5">
              {anime.map(srv => (
                <div key={srv.id}
                  className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 hover:border-zinc-700 transition-colors">
                  <span className="w-6 h-6 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-400 flex-shrink-0">
                    {srv.number}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-white">{srv.name}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 truncate block">{srv.domain}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Dot status={srv.status} />
                    <span className={`text-xs font-medium ${srv.status === 'online' ? 'text-emerald-400' : srv.status === 'offline' ? 'text-red-400' : 'text-zinc-500'}`}>
                      {srv.status === 'checking' ? '…' : srv.status}
                    </span>
                    {srv.ms !== null && srv.status === 'online' && (
                      <span className="text-[10px] text-zinc-600">{srv.ms}ms</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Movies + TV Only */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Movies + TV Only</span>
            </div>
            <div className="space-y-1.5">
              {movieTv.map(srv => (
                <div key={srv.id}
                  className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 hover:border-zinc-700 transition-colors">
                  <span className="w-6 h-6 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-400 flex-shrink-0">
                    {srv.number}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-white">{srv.name}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 truncate block">{srv.domain}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Dot status={srv.status} />
                    <span className={`text-xs font-medium ${srv.status === 'online' ? 'text-emerald-400' : srv.status === 'offline' ? 'text-red-400' : 'text-zinc-500'}`}>
                      {srv.status === 'checking' ? '…' : srv.status}
                    </span>
                    {srv.ms !== null && srv.status === 'online' && (
                      <span className="text-[10px] text-zinc-600">{srv.ms}ms</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-zinc-700 mt-4">
          CORS errors are treated as online — results may vary by region.
        </p>
      </div>
    </div>
  );
};

export default ServerStatus;
