import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Check, Star, Calendar, Clock, Users, Film, Server, ChevronDown, Download, ExternalLink, MousePointerClick, Play } from 'lucide-react';
import { z } from 'zod';
import {
  getMovieDetails,
  getTVDetails,
  getSeasonDetails,
  getMovieImages,
  getTVImages,
  getLogoUrl,
  MovieDetails,
  SeasonDetails,
  getImageUrl,
  getBackdropUrl,
  ServerType,
  ANIME_SERVERS,
  MOVIE_TV_SERVERS,
} from '@/lib/tmdb';
import { addToWatchlist, isInWatchlist, removeFromWatchlist } from '@/lib/watchlist';
import { saveWatchHistory } from '@/lib/watchHistory';
import { getWatchProgress, getProgressPercentage } from '@/lib/watchProgress';
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

const watchParamsSchema = z.object({
  type: z.enum(['movie', 'tv']),
  id: z.coerce.number().int().positive(),
});

// Download via vidsrc.vip
const getDownloadUrl = (
  id: number,
  type: 'movie' | 'tv',
  season?: number,
  episode?: number
) => {
  if (type === 'movie') return `https://dl.vidsrc.vip/movie/${id}`;
  return `https://dl.vidsrc.vip/tv/${id}/${season || 1}/${episode || 1}`;
};

const Watch = () => {
  const { type, id } = useParams<{ type?: string; id?: string }>();
  const navigate = useNavigate();
  const setBackdropUrl = useSetBackdropUrl();
  const { user } = useAuth();
  const parsed = useMemo(() => watchParamsSchema.safeParse({ type, id }), [type, id]);
  const mediaType = parsed.success ? parsed.data.type : 'movie';
  const movieId = parsed.success ? parsed.data.id : 0;

  const [details, setDetails] = useState<MovieDetails | null>(null);
  const [seasonDetails, setSeasonDetails] = useState<SeasonDetails | null>(null);
  // FIX: separate loading states — initial load vs episode change
  const [isLoading, setIsLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [selectedServer, setSelectedServer] = useState<ServerType>('videasy');
  const [serverOpen, setServerOpen] = useState(false);
  const [openDirection, setOpenDirection] = useState<'up' | 'down'>('down');
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloadDirection, setDownloadDirection] = useState<'up' | 'down'>('down');
  const serverButtonRef = useRef<HTMLButtonElement>(null);
  const downloadButtonRef = useRef<HTMLButtonElement>(null);
  // Note is dismissed per page load only — reappears on refresh (no localStorage)
  const [noteDismissed, setNoteDismissed] = useState(false);
  // Watch progress state
  const [watchProgress, setWatchProgress] = useState<{ currentTime: number; duration: number; percentage: number } | null>(null);

  // FIX: fetchDetails no longer depends on season/episode
  // Those are only used for saveWatchHistory which runs separately
  useEffect(() => {
    const fetchDetails = async () => {
      if (!movieId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const data = mediaType === 'movie'
          ? await getMovieDetails(movieId)
          : await getTVDetails(movieId);
        setDetails(data);

        if (data.backdrop_path) {
          setBackdropUrl(getBackdropUrl(data.backdrop_path, 'original'));
        }

        try {
          const images = mediaType === 'movie'
            ? await getMovieImages(movieId)
            : await getTVImages(movieId);
          if (images.logos && images.logos.length > 0) {
            const englishLogo = images.logos.find(l => l.iso_639_1 === 'en') || images.logos[0];
            setLogoUrl(getLogoUrl(englishLogo.file_path, 'w500'));
          }
        } catch (e) {
          console.error('Failed to fetch logo:', e);
        }

        setInWatchlist(isInWatchlist(movieId, mediaType));
      } catch (error) {
        console.error('Failed to fetch details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();

    return () => {
      setBackdropUrl(null);
    };
  // FIX: removed season and episode from deps — only re-fetch when movie/type changes
  }, [movieId, mediaType, setBackdropUrl]);

  // FIX: save watch history separately when season/episode changes, without re-fetching details
  useEffect(() => {
    if (!details || !movieId) return;
    const title = details.title || details.name || 'Unknown';
    saveWatchHistory({
      mediaId: movieId,
      mediaType,
      mediaTitle: title,
      posterPath: details.poster_path || null,
      season: mediaType === 'tv' ? season : undefined,
      episode: mediaType === 'tv' ? episode : undefined,
    });
  }, [movieId, mediaType, season, episode, details]);

  useEffect(() => {
    const fetchSeasonDetails = async () => {
      if (mediaType !== 'tv' || !movieId) return;
      try {
        const data = await getSeasonDetails(movieId, season);
        setSeasonDetails(data);
      } catch (error) {
        console.error('Failed to fetch season details:', error);
      }
    };
    fetchSeasonDetails();
  }, [movieId, mediaType, season]);

  // Load watch progress for autoembed server
  useEffect(() => {
    if (!user || selectedServer !== 'autoembed') {
      setWatchProgress(null);
      return;
    }

    const loadProgress = async () => {
      try {
        const progress = await getWatchProgress(
          movieId,
          mediaType,
          mediaType === 'tv' ? season : undefined,
          mediaType === 'tv' ? episode : undefined
        );
        if (progress && progress.current_time > 0) {
          const percentage = getProgressPercentage(progress);
          setWatchProgress({
            currentTime: progress.current_time,
            duration: progress.duration || 0,
            percentage
          });
        } else {
          setWatchProgress(null);
        }
      } catch (error) {
        console.error('Failed to load watch progress:', error);
        setWatchProgress(null);
      }
    };

    loadProgress();
  }, [movieId, mediaType, season, episode, selectedServer, user]);

  const handleWatchlistToggle = () => {
    if (!details) return;
    if (inWatchlist) {
      removeFromWatchlist(movieId, mediaType);
      setInWatchlist(false);
    } else {
      addToWatchlist({
        id: movieId,
        title: details.title,
        name: details.name,
        poster_path: details.poster_path,
        backdrop_path: details.backdrop_path,
        overview: details.overview,
        vote_average: details.vote_average,
        release_date: details.release_date,
        first_air_date: details.first_air_date,
        media_type: mediaType,
      });
      setInWatchlist(true);
    }
  };

  const animeServers = ANIME_SERVERS.filter((server) =>
    mediaType === 'tv' ? server.supportsTV : server.supportsMovies
  );
  const movieTvServers = MOVIE_TV_SERVERS.filter((server) =>
    mediaType === 'tv' ? server.supportsTV : server.supportsMovies
  );
  const allServers = [...animeServers, ...movieTvServers];
  const currentServerIndex = allServers.findIndex(s => s.id === selectedServer);
  const currentServerNumber = currentServerIndex >= 0 ? currentServerIndex + 1 : 1;

  const handleServerToggle = () => {
    if (!serverOpen && serverButtonRef.current) {
      const rect = serverButtonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenDirection(spaceBelow < 250 && spaceAbove > spaceBelow ? 'up' : 'down');
    }
    setServerOpen(!serverOpen);
  };

  const handleDownloadToggle = () => {
    if (!downloadOpen && downloadButtonRef.current) {
      const rect = downloadButtonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setDownloadDirection(spaceBelow < 220 && spaceAbove > spaceBelow ? 'up' : 'down');
    }
    setDownloadOpen(!downloadOpen);
  };

  if (isLoading) {
    return (
      <div className="p-8 pt-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6">
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
      </div>
    );
  }

  if (!details) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Content not found</p>
        <Button onClick={() => navigate('/')} className="mt-4">Go Home</Button>
      </div>
    );
  }

  const title = details.title || details.name || 'Untitled';
  const year = (details.release_date || details.first_air_date)?.split('-')[0] || '';
  const rating = details.vote_average?.toFixed(1) || 'N/A';
  const runtime = details.runtime ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m` : null;
  const seasons = details.number_of_seasons || 0;
  const posterUrl = getImageUrl(details.poster_path, 'w500');
  const cast = details.credits?.cast?.slice(0, 10) || [];
  const director = details.credits?.crew?.find(c => c.job === 'Director');

  return (
    <div className="min-h-screen text-white bg-transparent">
      <div className="p-4 md:p-8 pt-20">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4 text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6">

            {/* Left column */}
            <div className="space-y-4">

              {/* TV Season/Episode Selector */}
              {mediaType === 'tv' && seasons > 0 && (
                <div className="bg-zinc-950/70 backdrop-blur-sm rounded-lg p-4 border border-zinc-800">
                  <div className="flex flex-wrap items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-400">Season:</span>
                      <Select value={String(season)} onValueChange={(v) => { setSeason(parseInt(v)); setEpisode(1); }}>
                        <SelectTrigger className="w-32 bg-zinc-900 border-zinc-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                          {details.seasons?.filter(s => s.season_number > 0).map((s) => (
                            <SelectItem key={s.season_number} value={String(s.season_number)}>
                              Season {s.season_number}
                            </SelectItem>
                          )) || [...Array(seasons)].map((_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>
                              Season {i + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="text-sm text-zinc-400">
                      {seasonDetails?.episodes?.length || 0} Episodes
                    </div>
                  </div>

                  <ScrollArea className="h-32">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {seasonDetails?.episodes?.map((ep) => (
                        <button
                          key={ep.id}
                          onClick={() => setEpisode(ep.episode_number)}
                          className={cn(
                            "p-2 rounded-md text-left transition-colors text-sm",
                            episode === ep.episode_number
                              ? "bg-white/10 text-white"
                              : "bg-zinc-900/50 hover:bg-zinc-800"
                          )}
                        >
                          <div className="font-medium">Ep {ep.episode_number}</div>
                          <div className="text-xs truncate opacity-70">{ep.name}</div>
                        </button>
                      )) || [...Array(20)].map((_, i) => (
                        <button
                          key={i + 1}
                          onClick={() => setEpisode(i + 1)}
                          className={cn(
                            "p-2 rounded-md text-left transition-colors text-sm",
                            episode === i + 1 ? "bg-white/10 text-white" : "bg-zinc-900/50 hover:bg-zinc-800"
                          )}
                        >
                          <div className="font-medium">Episode {i + 1}</div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Yellow click tip — dismissible, reappears on every page refresh */}
              {!noteDismissed && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-yellow-500/10 border border-yellow-500/30">
                  <MousePointerClick className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-300/90 leading-relaxed flex-1">
                    <span className="font-semibold text-yellow-300">Tip:</span> Sometimes you may need to{' '}
                    <span className="font-semibold">click twice</span> to interact with the video player —
                    the first click activates it, the second performs the action.
                  </p>
                  <button
                    onClick={() => setNoteDismissed(true)}
                    className="flex-shrink-0 text-yellow-500/60 hover:text-yellow-400 transition-colors ml-1 mt-0.5"
                    aria-label="Dismiss tip"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              )}

              {/* Watch progress indicator for autoembed */}
              {watchProgress && watchProgress.percentage > 0 && watchProgress.percentage < 95 && (
                <div className="w-full max-w-4xl mx-auto mb-4">
                  <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Play className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Continue watching</p>
                        <p className="text-xs text-muted-foreground">
                          {Math.round(watchProgress.percentage)}% complete
                        </p>
                      </div>
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="h-2 bg-primary/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${watchProgress.percentage}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {watchProgress.duration > 0
                        ? `${Math.floor((watchProgress.duration - watchProgress.currentTime) / 60)}m remaining`
                        : 'Resume'}
                    </p>
                  </div>
                </div>
              )}

              {/* Video Player */}
              <div className="w-full max-w-4xl mx-auto">
                <VideoPlayer
                  id={movieId}
                  type={mediaType}
                  title={title}
                  season={mediaType === 'tv' ? season : undefined}
                  episode={mediaType === 'tv' ? episode : undefined}
                  server={selectedServer}
                />
              </div>

              {/* Title + Buttons row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Add to List */}
                  <Button
                    variant={inWatchlist ? 'default' : 'outline'}
                    onClick={handleWatchlistToggle}
                    size="sm"
                    className={cn(
                      "min-w-[120px] border-zinc-700 hover:bg-zinc-800",
                      inWatchlist && "bg-white text-black hover:bg-gray-200"
                    )}
                  >
                    {inWatchlist ? (
                      <><Check className="w-4 h-4 mr-1.5" />In List</>
                    ) : (
                      <><Plus className="w-4 h-4 mr-1.5" />Add to List</>
                    )}
                  </Button>

                  {/* Download button — smart positioned */}
                  <div className="relative inline-block">
                    <Button
                      ref={downloadButtonRef}
                      variant="outline"
                      size="sm"
                      className="h-9 px-3 border-zinc-700 hover:bg-zinc-800 flex items-center gap-2"
                      onClick={handleDownloadToggle}
                    >
                      <Download className="w-4 h-4" />
                      <span className="font-medium">Download</span>
                      <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", downloadOpen && "rotate-180")} />
                    </Button>

                    {downloadOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setDownloadOpen(false)} />
                        <div
                          className={cn(
                            "absolute z-50 w-72 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-xl shadow-2xl",
                            "animate-in fade-in-60 zoom-in-95 duration-150",
                            // Smart positioning — same logic as server selector
                            "right-0",
                            downloadDirection === 'up' ? "bottom-full mb-2" : "top-full mt-2"
                          )}
                        >
                          <div className="p-4">
                            <div className="flex items-center gap-2 mb-1">
                              <Download className="w-4 h-4 text-primary" />
                              <p className="text-sm font-semibold text-white">Download</p>
                            </div>
                            <p className="text-xs text-zinc-500 mb-4">
                              {mediaType === 'tv'
                                ? `Season ${season}, Episode ${episode}`
                                : 'Full Movie'}
                            </p>
                            <a
                              href={getDownloadUrl(movieId, mediaType, mediaType === 'tv' ? season : undefined, mediaType === 'tv' ? episode : undefined)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => setDownloadOpen(false)}
                              className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium text-sm"
                            >
                              <span>Download via VidSrc</span>
                              <ExternalLink className="w-4 h-4 flex-shrink-0" />
                            </a>
                            <p className="text-[10px] text-zinc-600 mt-3 leading-relaxed">
                              Opens dl.vidsrc.vip in a new tab. We don't host any files.
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Server selector */}
                  <div className="relative inline-block">
                    <Button
                      ref={serverButtonRef}
                      variant={selectedServer === 'autoembed' ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        "h-9 px-3 hover:bg-zinc-800 flex items-center gap-2 min-w-[110px]",
                        selectedServer === 'autoembed' ? "bg-primary text-primary-foreground" : "border-zinc-700",
                        selectedServer !== 'autoembed' && "hover:bg-zinc-800"
                      )}
                      onClick={handleServerToggle}
                    >
                      <Server className="w-4 h-4" />
                      <span className="font-medium">Server {currentServerNumber}</span>
                      <ChevronDown className={cn("w-4 h-4 ml-auto transition-transform duration-200", serverOpen && "rotate-180")} />
                    </Button>

                    {serverOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setServerOpen(false)} />
                        <div
                          className={cn(
                            "z-50 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-xl shadow-2xl",
                            "w-[300px] sm:w-[340px]",
                            "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
                            "sm:absolute sm:left-auto sm:top-auto sm:translate-x-0 sm:translate-y-0",
                            "sm:right-0",
                            openDirection === 'up' ? "sm:bottom-full sm:mb-2" : "sm:top-full sm:mt-2",
                            "animate-in fade-in-60 zoom-in-95 duration-150"
                          )}
                        >
                          <div className="p-3 border-b border-zinc-800">
                            <div className="flex items-center gap-2 mb-2.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide">
                                Anime + Movies + TV
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              {animeServers.map((server, index) => (
                                <button
                                  key={server.id}
                                  onClick={() => { setSelectedServer(server.id); setServerOpen(false); }}
                                  className={cn(
                                    "px-2 py-2 rounded-lg text-xs font-medium transition-all duration-200 border text-center",
                                    selectedServer === server.id
                                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                                      : "bg-zinc-900/50 border-zinc-700/50 text-zinc-300 hover:border-emerald-500/50 hover:bg-emerald-950/30 active:scale-95"
                                  )}
                                >
                                  {server.id === 'autoembed' ? (
                                    <span className="flex items-center gap-1 justify-center">
                                      Server 1
                                      <span className="text-[9px] bg-primary/30 px-1 rounded text-primary-foreground">Progress</span>
                                    </span>
                                  ) : (
                                    `Server ${index + 1}`
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="p-3">
                            <div className="flex items-center gap-2 mb-2.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wide">
                                Movies + TV Only
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              {movieTvServers.map((server, index) => (
                                <button
                                  key={server.id}
                                  onClick={() => { setSelectedServer(server.id); setServerOpen(false); }}
                                  className={cn(
                                    "px-2 py-2 rounded-lg text-xs font-medium transition-all duration-200 border text-center",
                                    selectedServer === server.id
                                      ? "bg-blue-500/20 border-blue-500 text-blue-300"
                                      : "bg-zinc-900/50 border-zinc-700/50 text-zinc-300 hover:border-blue-500/50 hover:bg-blue-950/30 active:scale-95"
                                  )}
                                >
                                  Server {animeServers.length + index + 1}
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

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-300">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="font-medium">{rating}</span>
                </div>
                {year && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-zinc-400" />
                    <span>{year}</span>
                  </div>
                )}
                {runtime && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-zinc-400" />
                    <span>{runtime}</span>
                  </div>
                )}
                <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded text-xs font-medium uppercase">
                  {mediaType === 'tv' ? 'TV Series' : 'Movie'}
                </span>
              </div>

              <p className="text-zinc-400 text-sm leading-relaxed">
                {details.overview || 'No overview available.'}
              </p>

              {mediaType === 'movie' && details.belongs_to_collection && (
                <div className="mt-4">
                  <CollectionInfo
                    collectionId={details.belongs_to_collection.id}
                    currentMovieId={movieId}
                  />
                </div>
              )}
            </div>

            {/* Right sidebar */}
            <div className="space-y-4">
              <div className="p-4 flex items-center justify-center min-h-[80px]">
                {logoUrl ? (
                  <img src={logoUrl} alt={title} className="max-h-16 max-w-full object-contain" />
                ) : (
                  <h2 className="text-xl font-bold text-white text-center">{title}</h2>
                )}
              </div>

              <div className="bg-zinc-950/70 backdrop-blur-sm rounded-lg p-3 border border-zinc-800">
                <div className="flex gap-3">
                  {posterUrl && (
                    <div className="flex-shrink-0 w-20 rounded-md overflow-hidden border border-zinc-800">
                      <img src={posterUrl} alt={title} className="w-full h-auto" />
                    </div>
                  )}
                  <div className="flex-1 space-y-2 text-sm text-zinc-300">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-zinc-800 px-2 py-1 rounded">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="font-bold">{rating}</span>
                      </div>
                      <span className="text-xs text-zinc-500">/10</span>
                    </div>
                    {year && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{year}</span>
                      </div>
                    )}
                    {runtime && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{runtime}</span>
                      </div>
                    )}
                    <span className="inline-block bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded text-xs font-medium uppercase">
                      {mediaType === 'tv' ? 'TV Series' : 'Movie'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-950/70 backdrop-blur-sm rounded-lg p-4 border border-zinc-800 space-y-4 text-zinc-300">
                <h3 className="text-lg font-bold text-white">Details</h3>
                <div className="space-y-3 text-sm">
                  {details.tagline && (
                    <div>
                      <span className="text-zinc-500">Tagline</span>
                      <p className="italic">"{details.tagline}"</p>
                    </div>
                  )}
                  <div>
                    <span className="text-zinc-500">Release Date</span>
                    <p>{details.release_date || details.first_air_date || 'Unknown'}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500">Status</span>
                    <p>{details.status}</p>
                  </div>
                  {mediaType === 'tv' && (
                    <>
                      <div><span className="text-zinc-500">Seasons</span><p>{details.number_of_seasons}</p></div>
                      <div><span className="text-zinc-500">Episodes</span><p>{details.number_of_episodes}</p></div>
                    </>
                  )}
                  {details.genres && details.genres.length > 0 && (
                    <div>
                      <span className="text-zinc-500">Genres</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {details.genres.map((genre) => (
                          <span key={genre.id} className="px-2 py-0.5 bg-zinc-900 rounded-full text-xs border border-zinc-800">
                            {genre.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {cast.length > 0 && (
                <div className="bg-zinc-950/70 backdrop-blur-sm rounded-lg p-4 border border-zinc-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-zinc-300" />
                    <h3 className="text-lg font-bold text-white">Cast</h3>
                  </div>
                  {director && (
                    <div className="mb-3 pb-3 border-b border-zinc-800">
                      <div className="flex items-center gap-2">
                        <Film className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="text-xs text-zinc-500">Director</span>
                      </div>
                      <p className="text-sm font-medium text-white">{director.name}</p>
                    </div>
                  )}
                  <ScrollArea className="h-48">
                    <div className="space-y-3">
                      {cast.map((member) => (
                        <div key={member.id} className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-900 flex-shrink-0 border border-zinc-800">
                            {member.profile_path ? (
                              <img src={getImageUrl(member.profile_path, 'w200') || ''} alt={member.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs">
                                {member.name.charAt(0)}
                              </div>
                            )}
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

              {details.production_companies && details.production_companies.length > 0 && (
                <div className="bg-zinc-950/70 backdrop-blur-sm rounded-lg p-4 border border-zinc-800">
                  <h3 className="text-sm font-bold mb-2 text-zinc-400">Production</h3>
                  <div className="flex flex-wrap gap-2">
                    {details.production_companies.slice(0, 3).map((company) => (
                      <span key={company.id} className="text-xs bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                        {company.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-12">
            <RecommendedContent mediaId={movieId} mediaType={mediaType} />
          </div>

          <div className="mt-12 mb-12">
            <TMDBReviews mediaId={movieId} mediaType={mediaType} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Watch;
