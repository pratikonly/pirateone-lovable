import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Check, Star, Calendar, Clock,
  Users, Film, Server, ChevronDown, Download,
  ExternalLink, MousePointerClick, Play, FolderPlus, List, Loader2,
} from 'lucide-react';
import { z } from 'zod';
import {
  getMovieDetails, getTVDetails, getSeasonDetails,
  getMovieImages, getTVImages, getLogoUrl,
  MovieDetails, SeasonDetails,
  getImageUrl, getBackdropUrl,
  ServerType, ANIME_SERVERS, MOVIE_TV_SERVERS,
} from '@/lib/tmdb';
import { addToWatchlist, isInWatchlist, removeFromWatchlist } from '@/lib/watchlist';
import { addToWatchlistDb, isInWatchlistDb, removeFromWatchlistDb } from '@/lib/watchlistDb';
import { saveWatchHistory } from '@/lib/watchHistory';
import { getWatchProgress, saveWatchProgress, getProgressPercentage } from '@/lib/watchProgress';
import { getShowStatus, setShowStatus } from '@/lib/showStatus';
import VideoPlayer from '@/components/VideoPlayer';
import RecommendedContent from '@/components/RecommendedContent';
import CollectionInfo from '@/components/CollectionInfo';
import TMDBReviews from '@/components/TMDBReviews';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useSetBackdropUrl } from '@/contexts/BackdropContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const watchParamsSchema = z.object({
  type: z.enum(['movie', 'tv']),
  id: z.coerce.number().int().positive(),
});

const getDownloadUrl = (id: number, type: 'movie' | 'tv', season?: number, episode?: number) =>
  type === 'movie'
    ? `https://dl.vidsrc.vip/movie/${id}`
    : `https://dl.vidsrc.vip/tv/${id}/${season || 1}/${episode || 1}`;

const BUNNY_DOWNLOAD_URL = 'https://bunnyddl.termsandconditionshere.workers.dev/';

const DownloadMenu = ({ primaryUrl }: { primaryUrl: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <Button variant="outline" size="sm"
        className="h-9 px-3 border-zinc-700 hover:bg-zinc-800 flex items-center gap-2"
        onClick={() => setOpen(o => !o)}>
        <Download className="w-4 h-4" />Download
        <ChevronDown className={cn('w-3.5 h-3.5 ml-1 transition-transform', open && 'rotate-180')} />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-56 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-xl shadow-2xl z-50 py-1 animate-in fade-in-60 zoom-in-95 duration-150">
            <a href={primaryUrl} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}
              className="w-full px-3 py-2.5 text-sm text-left hover:bg-zinc-800/60 flex items-center justify-between transition-colors text-white">
              <span className="font-medium">VidSrc Download</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </a>
            <a href={BUNNY_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}
              className="w-full px-3 py-2.5 text-sm text-left hover:bg-zinc-800/60 flex items-center justify-between transition-colors text-white">
              <span className="font-medium">BunnyDDL</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </a>
          </div>
        </>
      )}
    </div>
  );
};

/* ── Smart Add to List Dropdown ── */
const SmartAddToList = ({ tmdbId, mediaType, title, posterPath, backdropPath, voteAverage, details, inWatchlist, onWatchlistToggle }: {
  tmdbId: number; mediaType: string; title: string; posterPath: string | null;
  backdropPath?: string | null; voteAverage?: number | null;
  details: MovieDetails | null; inWatchlist: boolean; onWatchlistToggle: () => void;
}) => {
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

  const toggleCollectionItem = async (collectionId: string, hasItem: boolean) => {
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

  return (
    <div className="relative inline-block">
      <Button
        variant={inWatchlist ? 'default' : 'outline'}
        size="sm"
        className={cn('min-w-[130px] border-zinc-700 hover:bg-zinc-800 flex items-center gap-1.5', inWatchlist && 'bg-white text-black hover:bg-gray-200')}
        onClick={() => setOpen(!open)}
      >
        {inWatchlist ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        Add to List
        <ChevronDown className={cn('w-3.5 h-3.5 ml-1 transition-transform', open && 'rotate-180')} />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-64 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-xl shadow-2xl z-50 py-1 animate-in fade-in-60 zoom-in-95 duration-150">
            {/* Watchlist option */}
            <button
              onClick={() => { onWatchlistToggle(); }}
              className="w-full px-3 py-2.5 text-sm text-left hover:bg-zinc-800/60 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <List className="w-4 h-4 text-zinc-400" />
                <span className="text-white font-medium">Watchlist</span>
              </div>
              {inWatchlist && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
            </button>

            {/* Divider */}
            {user && (
              <>
                <div className="border-t border-zinc-800 my-1" />
                <div className="px-3 py-1.5">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Collections</span>
                </div>
                {loading ? (
                  <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-zinc-500" /></div>
                ) : collections.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-3 px-3">No collections yet. Create one in your Watchlist page.</p>
                ) : (
                  collections.map(c => (
                    <button key={c.id} onClick={() => toggleCollectionItem(c.id, c.hasItem)}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-zinc-800/60 flex items-center justify-between transition-colors">
                      <div className="flex items-center gap-2">
                        <FolderPlus className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-zinc-200 truncate">{c.name}</span>
                      </div>
                      {c.hasItem && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                    </button>
                  ))
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const Watch = () => {
  const { type, id } = useParams<{ type?: string; id?: string }>();
  const navigate       = useNavigate();
  const setBackdropUrl = useSetBackdropUrl();
  const { user }       = useAuth();

  const parsed    = useMemo(() => watchParamsSchema.safeParse({ type, id }), [type, id]);
  const mediaType = parsed.success ? parsed.data.type : 'movie';
  const movieId   = parsed.success ? parsed.data.id   : 0;

  const [details, setDetails]               = useState<MovieDetails | null>(null);
  const [seasonDetails, setSeasonDetails]   = useState<SeasonDetails | null>(null);
  const [isLoading, setIsLoading]           = useState(true);
  const [inWatchlist, setInWatchlist]       = useState(false);
  const [season, setSeason]                 = useState(1);
  const [episode, setEpisode]               = useState(1);
  const [logoUrl, setLogoUrl]               = useState<string | null>(null);
  const [selectedServer, setSelectedServer] = useState<ServerType>('videasy');
  const [serverOpen, setServerOpen]         = useState(false);
  const [openDirection, setOpenDirection]   = useState<'up' | 'down'>('down');
  const [noteDismissed, setNoteDismissed]   = useState(false);
  const serverButtonRef = useRef<HTMLButtonElement>(null);

  const [watchProgress, setWatchProgress] = useState<{
    currentTime: number; duration: number; percentage: number;
  } | null>(null);

  const movieIdRef        = useRef(movieId);
  const mediaTypeRef      = useRef(mediaType);
  const seasonRef         = useRef(season);
  const episodeRef        = useRef(episode);
  const selectedServerRef = useRef(selectedServer);
  const userRef           = useRef(user);
  const detailsRef        = useRef<MovieDetails | null>(null);
  const lastSaveRef       = useRef(0);
  const handlerRegistered = useRef(false);

  useEffect(() => { movieIdRef.current        = movieId;        }, [movieId]);
  useEffect(() => { mediaTypeRef.current      = mediaType;      }, [mediaType]);
  useEffect(() => { seasonRef.current         = season;         }, [season]);
  useEffect(() => { episodeRef.current        = episode;        }, [episode]);
  useEffect(() => { selectedServerRef.current = selectedServer; }, [selectedServer]);
  useEffect(() => { userRef.current           = user;           }, [user]);
  useEffect(() => { detailsRef.current        = details;        }, [details]);

  useEffect(() => {
    if (!movieId) { setIsLoading(false); return; }
    setIsLoading(true);
    const run = async () => {
      try {
        const data = mediaType === 'movie'
          ? await getMovieDetails(movieId)
          : await getTVDetails(movieId);
        setDetails(data);
        if (data.backdrop_path) setBackdropUrl(getBackdropUrl(data.backdrop_path, 'original'));
        try {
          const images = mediaType === 'movie' ? await getMovieImages(movieId) : await getTVImages(movieId);
          const logo = images.logos?.find((l: any) => l.iso_639_1 === 'en') ?? images.logos?.[0];
          if (logo) setLogoUrl(getLogoUrl(logo.file_path, 'w500'));
        } catch { /* logo optional */ }
        setInWatchlist(user ? await isInWatchlistDb(movieId, mediaType) : isInWatchlist(movieId, mediaType));
      } catch (e) { console.error('fetchDetails failed:', e); }
      finally { setIsLoading(false); }
    };
    run();
    return () => { setBackdropUrl(null); };
  }, [movieId, mediaType, setBackdropUrl, user]);

  const savedHistoryKey = useRef('');
  useEffect(() => {
    const d = detailsRef.current;
    if (!d || !movieId) return;
    const key = `${movieId}-${mediaType}-${season}-${episode}`;
    if (savedHistoryKey.current === key) return;
    savedHistoryKey.current = key;
    saveWatchHistory({
      mediaId: movieId, mediaType,
      mediaTitle: d.title || d.name || 'Unknown',
      posterPath: d.poster_path ?? null,
      season:  mediaType === 'tv' ? season  : undefined,
      episode: mediaType === 'tv' ? episode : undefined,
    });
  }, [movieId, mediaType, season, episode]);

  useEffect(() => {
    if (mediaType !== 'tv' || !movieId) return;
    getSeasonDetails(movieId, season).then(setSeasonDetails).catch(console.error);
  }, [movieId, mediaType, season]);

  useEffect(() => {
    if (!user) { setWatchProgress(null); return; }
    let cancelled = false;
    const run = async () => {
      try {
        const p = await getWatchProgress(movieId, mediaType,
          mediaType === 'tv' ? season  : undefined,
          mediaType === 'tv' ? episode : undefined,
          selectedServerRef.current);
        if (cancelled) return;
        if (p && p.progress_time > 0) {
          setWatchProgress({ currentTime: p.progress_time, duration: p.duration ?? 0, percentage: getProgressPercentage(p) });
        } else { setWatchProgress(null); }
      } catch { if (!cancelled) setWatchProgress(null); }
    };
    run();
    return () => { cancelled = true; };
  }, [movieId, mediaType, season, episode, user, selectedServer]);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    if (handlerRegistered.current) return;
    handlerRegistered.current = true;

    const handleMessage = async (event: MessageEvent) => {
      if (document.hidden) return;
      if (!userRef.current) return;
      if (event.origin !== 'https://player.videasy.net') return;

      try {
        const msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!msg || msg.type !== 'PLAYER_EVENT') return;
        const payload = msg.data;
        if (!payload || payload.event !== 'timeupdate') return;

        const currentTime: number = payload.currentTime;
        const duration: number    = payload.duration;
        if (typeof currentTime !== 'number' || typeof duration !== 'number' || duration <= 0) return;

        const pct = (currentTime / duration) * 100;
        const now = Date.now();
        if (pct < 90 && now - lastSaveRef.current < 10000) return;
        lastSaveRef.current = now;

        setWatchProgress({ currentTime, duration, percentage: Math.min(100, pct) });

        const d   = detailsRef.current;
        const mid = movieIdRef.current;
        const mt  = mediaTypeRef.current;
        const s   = seasonRef.current;
        const ep  = episodeRef.current;
        const srv = selectedServerRef.current;

        await saveWatchProgress(
          mid, mt, currentTime, duration, srv,
          mt === 'tv' ? s  : undefined,
          mt === 'tv' ? ep : undefined,
          d?.title || d?.name,
          d?.poster_path ?? null, d?.backdrop_path ?? null,
          d?.overview ?? null, d?.vote_average ?? null,
        );

        if (d && userRef.current) {
          try {
            const existing = await getShowStatus(mid, mt);
            if (existing) {
              await setShowStatus(
                { id: mid, title: d.title, name: d.name, poster_path: d.poster_path,
                  backdrop_path: d.backdrop_path, overview: d.overview,
                  vote_average: d.vote_average, media_type: mt } as any,
                existing.status,
                mt === 'tv' ? s  : undefined,
                mt === 'tv' ? ep : undefined,
              );
            } else {
              await setShowStatus(
                { id: mid, title: d.title, name: d.name, poster_path: d.poster_path,
                  backdrop_path: d.backdrop_path, overview: d.overview,
                  vote_average: d.vote_average, media_type: mt } as any,
                'watching',
                mt === 'tv' ? s  : undefined,
                mt === 'tv' ? ep : undefined,
              );
            }
          } catch { /* best effort */ }
        }
      } catch { /* ignore non-JSON */ }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      handlerRegistered.current = false;
    };
  }, [userId]);

  const handleWatchlistToggle = async () => {
    if (!details) return;
    const item = {
      id: movieId, title: details.title, name: details.name,
      poster_path: details.poster_path, backdrop_path: details.backdrop_path,
      overview: details.overview, vote_average: details.vote_average,
      release_date: details.release_date, first_air_date: details.first_air_date,
      media_type: mediaType,
    };
    try {
      if (inWatchlist) {
        user ? await removeFromWatchlistDb(movieId, mediaType) : removeFromWatchlist(movieId, mediaType);
        setInWatchlist(false);
      } else {
        user ? await addToWatchlistDb(item) : addToWatchlist(item);
        setInWatchlist(true);
      }
    } catch (e) { console.error('Watchlist toggle failed:', e); }
  };

  const animeServers   = ANIME_SERVERS.filter(s => mediaType === 'tv' ? s.supportsTV : s.supportsMovies);
  const movieTvServers = MOVIE_TV_SERVERS.filter(s => mediaType === 'tv' ? s.supportsTV : s.supportsMovies);
  const allServers     = [...animeServers, ...movieTvServers];
  const currentServerNumber = (allServers.findIndex(s => s.id === selectedServer) + 1) || 1;

  const handleServerToggle = () => {
    if (!serverOpen && serverButtonRef.current) {
      const r = serverButtonRef.current.getBoundingClientRect();
      setOpenDirection(window.innerHeight - r.bottom < 250 && r.top > window.innerHeight - r.bottom ? 'up' : 'down');
    }
    setServerOpen(v => !v);
  };

  if (isLoading) return (
    <div className="p-8 pt-20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6">
        <div className="space-y-4">
          <div className="aspect-video bg-zinc-900 rounded-lg animate-pulse" />
          <div className="h-8 w-64 bg-zinc-900 rounded animate-pulse" />
          <div className="h-4 w-full bg-zinc-900 rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-zinc-900 rounded animate-pulse" />
        </div>
        <div className="space-y-4 hidden lg:block">
          <div className="h-48 bg-zinc-900 rounded-lg animate-pulse" />
          <div className="h-32 bg-zinc-900 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );

  if (!details) return (
    <div className="p-8 text-center">
      <p className="text-muted-foreground">Content not found</p>
      <Button onClick={() => navigate('/')} className="mt-4">Go Home</Button>
    </div>
  );

  const title       = details.title || details.name || 'Untitled';
  const year        = (details.release_date || details.first_air_date)?.split('-')[0] || '';
  const rating      = details.vote_average?.toFixed(1) || 'N/A';
  const runtime     = details.runtime ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m` : null;
  const seasons     = details.number_of_seasons || 0;
  const posterUrl   = getImageUrl(details.poster_path, 'w500');
  const cast        = details.credits?.cast?.slice(0, 10) || [];
  const director    = details.credits?.crew?.find((c: any) => c.job === 'Director');
  const downloadUrl = getDownloadUrl(movieId, mediaType, mediaType === 'tv' ? season : undefined, mediaType === 'tv' ? episode : undefined);

  return (
    <div className="min-h-screen text-white bg-transparent">
      <div className="p-4 md:p-8 pt-20">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 text-white hover:bg-white/10">
          <ArrowLeft className="w-4 h-4 mr-2" />Back
        </Button>

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6">
            <div className="space-y-4">

              {mediaType === 'tv' && seasons > 0 && (
                <div className="bg-zinc-950/70 backdrop-blur-sm rounded-lg p-4 border border-zinc-800">
                  <div className="flex flex-wrap items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-400">Season:</span>
                      <Select value={String(season)} onValueChange={v => { setSeason(parseInt(v)); setEpisode(1); }}>
                        <SelectTrigger className="w-32 bg-zinc-900 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                          {details.seasons?.filter((s: any) => s.season_number > 0).map((s: any) => (
                            <SelectItem key={s.season_number} value={String(s.season_number)}>Season {s.season_number}</SelectItem>
                          )) || [...Array(seasons)].map((_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>Season {i + 1}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="text-sm text-zinc-400">{seasonDetails?.episodes?.length || 0} Episodes</div>
                  </div>
                  <ScrollArea className="h-32">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {(seasonDetails?.episodes ?? [...Array(20)].map((_, i) => ({ id: i, episode_number: i + 1, name: '' }))).map((ep: any) => (
                        <button key={ep.id} onClick={() => setEpisode(ep.episode_number)}
                          className={cn('p-2 rounded-md text-left transition-colors text-sm',
                            episode === ep.episode_number ? 'bg-white/10 text-white' : 'bg-zinc-900/50 hover:bg-zinc-800')}>
                          <div className="font-medium">Ep {ep.episode_number}</div>
                          {ep.name && <div className="text-xs truncate opacity-70">{ep.name}</div>}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {!noteDismissed && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-yellow-500/10 border border-yellow-500/30">
                  <MousePointerClick className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-300/90 leading-relaxed flex-1">
                    <span className="font-semibold text-yellow-300">Tip:</span> Sometimes you may need to{' '}
                    <span className="font-semibold">click twice</span> to interact with the video player.
                  </p>
                  <button onClick={() => setNoteDismissed(true)} aria-label="Dismiss"
                    className="flex-shrink-0 text-yellow-500/60 hover:text-yellow-400 ml-1 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              )}

              <div className="w-full max-w-4xl mx-auto">
                <VideoPlayer
                  id={movieId} type={mediaType} title={title}
                  season={mediaType === 'tv' ? season   : undefined}
                  episode={mediaType === 'tv' ? episode : undefined}
                  server={selectedServer}
                  progressSeconds={watchProgress?.currentTime}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <SmartAddToList
                    tmdbId={movieId}
                    mediaType={mediaType}
                    title={title}
                    posterPath={details?.poster_path || null}
                    backdropPath={details?.backdrop_path}
                    voteAverage={details?.vote_average}
                    details={details}
                    inWatchlist={inWatchlist}
                    onWatchlistToggle={handleWatchlistToggle}
                  />

                  <DownloadMenu primaryUrl={downloadUrl} />


                  <div className="relative inline-block">
                    <Button ref={serverButtonRef} variant="outline" size="sm"
                      className={cn('h-9 px-3 hover:bg-zinc-800 flex items-center gap-2 min-w-[110px]',
                        selectedServer === 'autoembed' ? 'bg-primary text-primary-foreground' : 'border-zinc-700')}
                      onClick={handleServerToggle}>
                      <Server className="w-4 h-4" />
                      <span className="font-medium">Server {currentServerNumber}</span>
                      <ChevronDown className={cn('w-4 h-4 ml-auto transition-transform duration-200', serverOpen && 'rotate-180')} />
                    </Button>

                    {serverOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setServerOpen(false)} />
                        <div className={cn(
                          'z-50 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-xl shadow-2xl w-[300px] sm:w-[340px]',
                          'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
                          'sm:absolute sm:left-auto sm:top-auto sm:translate-x-0 sm:translate-y-0 sm:right-0',
                          openDirection === 'up' ? 'sm:bottom-full sm:mb-2' : 'sm:top-full sm:mt-2',
                          'animate-in fade-in-60 zoom-in-95 duration-150')}>
                          <div className="p-3 border-b border-zinc-800">
                            <div className="flex items-center gap-2 mb-2.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide">Anime + Movies + TV</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              {animeServers.map((srv, i) => (
                                <button key={srv.id} onClick={() => { setSelectedServer(srv.id); setServerOpen(false); }}
                                  className={cn('px-2 py-2 rounded-lg text-xs font-medium transition-all duration-200 border text-center',
                                    selectedServer === srv.id
                                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                      : 'bg-zinc-900/50 border-zinc-700/50 text-zinc-300 hover:border-emerald-500/50 hover:bg-emerald-950/30 active:scale-95')}>
                                  Server {i + 1}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="p-3">
                            <div className="flex items-center gap-2 mb-2.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wide">Movies + TV Only</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              {movieTvServers.map((srv, i) => (
                                <button key={srv.id} onClick={() => { setSelectedServer(srv.id); setServerOpen(false); }}
                                  className={cn('px-2 py-2 rounded-lg text-xs font-medium transition-all duration-200 border text-center',
                                    selectedServer === srv.id
                                      ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                                      : 'bg-zinc-900/50 border-zinc-700/50 text-zinc-300 hover:border-blue-500/50 hover:bg-blue-950/30 active:scale-95')}>
                                  Server {animeServers.length + i + 1}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-300">
                <div className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /><span className="font-medium">{rating}</span></div>
                {year    && <div className="flex items-center gap-1"><Calendar className="w-4 h-4 text-zinc-400" /><span>{year}</span></div>}
                {runtime && <div className="flex items-center gap-1"><Clock    className="w-4 h-4 text-zinc-400" /><span>{runtime}</span></div>}
                <span className="bg-zinc-800 px-2 py-0.5 rounded text-xs font-medium uppercase">{mediaType === 'tv' ? 'TV Series' : 'Movie'}</span>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed">{details.overview || 'No overview available.'}</p>
              {mediaType === 'movie' && details.belongs_to_collection && (
                <div className="mt-4"><CollectionInfo collectionId={details.belongs_to_collection.id} currentMovieId={movieId} /></div>
              )}
            </div>

            {/* Right sidebar */}
            <div className="space-y-4">
              <div className="p-4 flex items-center justify-center min-h-[80px]">
                {logoUrl ? <img src={logoUrl} alt={title} className="max-h-16 max-w-full object-contain" />
                  : <h2 className="text-xl font-bold text-center">{title}</h2>}
              </div>
              <div className="bg-zinc-950/70 backdrop-blur-sm rounded-lg p-3 border border-zinc-800">
                <div className="flex gap-3">
                  {posterUrl && <div className="flex-shrink-0 w-20 rounded-md overflow-hidden border border-zinc-800"><img src={posterUrl} alt={title} className="w-full h-auto" /></div>}
                  <div className="flex-1 space-y-2 text-sm text-zinc-300">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-zinc-800 px-2 py-1 rounded"><Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /><span className="font-bold">{rating}</span></div>
                      <span className="text-xs text-zinc-500">/10</span>
                    </div>
                    {year    && <div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-zinc-400" /><span>{year}</span></div>}
                    {runtime && <div className="flex items-center gap-1"><Clock    className="w-3.5 h-3.5 text-zinc-400" /><span>{runtime}</span></div>}
                    <span className="inline-block bg-zinc-800 px-2 py-0.5 rounded text-xs font-medium uppercase">{mediaType === 'tv' ? 'TV Series' : 'Movie'}</span>
                  </div>
                </div>
              </div>
              <div className="bg-zinc-950/70 backdrop-blur-sm rounded-lg p-4 border border-zinc-800 space-y-3 text-sm text-zinc-300">
                <h3 className="text-lg font-bold text-white">Details</h3>
                {details.tagline && <div><span className="text-zinc-500 block">Tagline</span><p className="italic">"{details.tagline}"</p></div>}
                <div><span className="text-zinc-500 block">Release</span><p>{details.release_date || details.first_air_date || 'Unknown'}</p></div>
                <div><span className="text-zinc-500 block">Status</span><p>{details.status}</p></div>
                {mediaType === 'tv' && <><div><span className="text-zinc-500 block">Seasons</span><p>{details.number_of_seasons}</p></div><div><span className="text-zinc-500 block">Episodes</span><p>{details.number_of_episodes}</p></div></>}
                {details.genres?.length > 0 && (
                  <div><span className="text-zinc-500 block">Genres</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {details.genres.map((g: any) => <span key={g.id} className="px-2 py-0.5 bg-zinc-900 rounded-full text-xs border border-zinc-800">{g.name}</span>)}
                    </div>
                  </div>
                )}
              </div>
              {cast.length > 0 && (
                <div className="bg-zinc-950/70 backdrop-blur-sm rounded-lg p-4 border border-zinc-800">
                  <div className="flex items-center gap-2 mb-3"><Users className="w-4 h-4 text-zinc-300" /><h3 className="text-lg font-bold text-white">Cast</h3></div>
                  {director && (
                    <div className="mb-3 pb-3 border-b border-zinc-800">
                      <div className="flex items-center gap-1 text-xs text-zinc-500"><Film className="w-3.5 h-3.5" />Director</div>
                      <p className="text-sm font-medium text-white">{(director as any).name}</p>
                    </div>
                  )}
                  <ScrollArea className="h-48">
                    <div className="space-y-3">
                      {cast.map((member: any) => (
                        <div key={member.id} className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-900 flex-shrink-0 border border-zinc-800">
                            {member.profile_path ? <img src={getImageUrl(member.profile_path, 'w200') || ''} alt={member.name} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs">{member.name.charAt(0)}</div>}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{member.name}</p>
                            <p className="text-xs text-zinc-500 truncate">{member.character}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
              {details.production_companies?.length > 0 && (
                <div className="bg-zinc-950/70 backdrop-blur-sm rounded-lg p-4 border border-zinc-800">
                  <h3 className="text-sm font-bold mb-2 text-zinc-400">Production</h3>
                  <div className="flex flex-wrap gap-2">
                    {details.production_companies.slice(0, 3).map((c: any) => <span key={c.id} className="text-xs bg-zinc-900 px-2 py-1 rounded border border-zinc-800">{c.name}</span>)}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="mt-12"><RecommendedContent mediaId={movieId} mediaType={mediaType} /></div>
          <div className="mt-8 mb-12"><TMDBReviews mediaId={movieId} mediaType={mediaType} /></div>
        </div>
      </div>
    </div>
  );
};

export default Watch;
