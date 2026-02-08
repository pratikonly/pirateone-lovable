import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Check, Star, Calendar, Clock, Users, Film, Server, ChevronDown } from 'lucide-react';
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
import VideoPlayer from '@/components/VideoPlayer';
import RecommendedContent from '@/components/RecommendedContent';
import CollectionInfo from '@/components/CollectionInfo';
import TMDBReviews from '@/components/TMDBReviews';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useSetBackdropUrl } from '@/contexts/BackdropContext';

const watchParamsSchema = z.object({
  type: z.enum(['movie', 'tv']),
  id: z.coerce.number().int().positive(),
});

const Watch = () => {
  const { type, id } = useParams<{ type?: string; id?: string }>();
  const navigate = useNavigate();
  const setBackdropUrl = useSetBackdropUrl();
  const parsed = useMemo(() => watchParamsSchema.safeParse({ type, id }), [type, id]);
  const mediaType = parsed.success ? parsed.data.type : 'movie';
  const movieId = parsed.success ? parsed.data.id : 0;

  const [details, setDetails] = useState<MovieDetails | null>(null);
  const [seasonDetails, setSeasonDetails] = useState<SeasonDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [selectedServer, setSelectedServer] = useState<ServerType>('vidnest');
  const [serverOpen, setServerOpen] = useState(false);
  const [openDirection, setOpenDirection] = useState<'up' | 'down'>('down');
  const serverButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!movieId) {
        setIsLoading(false);
        return;
      }
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

        const title = data.title || data.name || 'Unknown';
        saveWatchHistory({
          mediaId: movieId,
          mediaType,
          mediaTitle: title,
          posterPath: data.poster_path || null,
          season: mediaType === 'tv' ? season : undefined,
          episode: mediaType === 'tv' ? episode : undefined,
        });
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
  }, [movieId, mediaType, setBackdropUrl, season, episode]);

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

  const animeServers = ANIME_SERVERS.filter((server) => {
    if (mediaType === 'tv') return server.supportsTV;
    return server.supportsMovies;
  });

  const movieTvServers = MOVIE_TV_SERVERS.filter((server) => {
    if (mediaType === 'tv') return server.supportsTV;
    return server.supportsMovies;
  });

  // Get current server number
  const allServers = [...animeServers, ...movieTvServers];
  const currentServerIndex = allServers.findIndex(s => s.id === selectedServer);
  const currentServerNumber = currentServerIndex >= 0 ? currentServerIndex + 1 : 1;

  // Smart open direction detection
  const handleServerToggle = () => {
    if (!serverOpen && serverButtonRef.current) {
      const rect = serverButtonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // If more space above or less than 250px below, open upward
      if (spaceBelow < 250 && spaceAbove > spaceBelow) {
        setOpenDirection('up');
      } else {
        setOpenDirection('down');
      }
    }
    setServerOpen(!serverOpen);
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="aspect-video bg-muted rounded-lg animate-pulse mb-8" />
        <div className="space-y-4">
          <div className="h-8 w-64 bg-muted rounded animate-pulse" />
          <div className="h-4 w-full max-w-2xl bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Content not found</p>
        <Button onClick={() => navigate('/')} className="mt-4">
          Go Home
        </Button>
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

  // Note: Anime content uses the /anime route, not /watch

  return (
    <div className="min-h-screen text-white bg-transparent">
      <div className="p-4 md:p-8">
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

            {/* Left column - Video + content */}
            <div className="space-y-6">

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
                            episode === i + 1
                              ? "bg-white/10 text-white"
                              : "bg-zinc-900/50 hover:bg-zinc-800"
                          )}
                        >
                          <div className="font-medium">Episode {i + 1}</div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
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

              {/* Title (LEFT) + Buttons (RIGHT) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h1 className="font-display text-2xl md:text-3xl font-bold order-1">
                  {title}
                </h1>

                <div className="flex items-center gap-3 order-2 flex-wrap gap-y-2">
                  {/* Add to List */}
                  <Button
                    variant={inWatchlist ? 'default' : 'outline'}
                    onClick={handleWatchlistToggle}
                    size="sm"
                    className={cn(
                      "min-w-[130px] border-zinc-700 hover:bg-zinc-800",
                      inWatchlist && "bg-white text-black hover:bg-gray-200"
                    )}
                  >
                    {inWatchlist ? (
                      <>
                        <Check className="w-4 h-4 mr-1.5" />
                        In List
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-1.5" />
                        Add to List
                      </>
                    )}
                  </Button>

                  {/* Server selector */}
                  <div className="relative inline-block">
                    <Button
                      ref={serverButtonRef}
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-9 px-3 text-sm font-medium border-zinc-700 hover:bg-zinc-800 transition-colors",
                        "min-w-[110px]",
                        "flex items-center gap-2"
                      )}
                      onClick={handleServerToggle}
                    >
                      <Server className="w-4 h-4" />
                      <span className="font-medium">Server {currentServerNumber}</span>
                      <ChevronDown className={cn(
                        "w-4 h-4 ml-auto transition-transform duration-200",
                        serverOpen && "rotate-180"
                      )} />
                    </Button>

                    {serverOpen && (
                      <>
                        {/* Backdrop */}
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setServerOpen(false)}
                        />
                        
                        {/* Dropdown - centered on mobile, right-aligned on desktop */}
                        <div
                          className={cn(
                            "z-50 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-xl shadow-2xl",
                            "w-[300px] sm:w-[340px]",
                            // Mobile: fixed center of screen
                            "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
                            // Desktop: absolute positioned
                            "sm:absolute sm:left-auto sm:top-auto sm:translate-x-0 sm:translate-y-0",
                            "sm:right-0",
                            openDirection === 'up' ? "sm:bottom-full sm:mb-2" : "sm:top-full sm:mt-2",
                            "animate-in fade-in-60 zoom-in-95 duration-150"
                          )}
                        >
                          {/* Anime Servers Section */}
                          <div className="p-3 border-b border-zinc-800">
                            <div className="flex items-center gap-2 mb-2.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide">
                                Anime + Movies + TV
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              {animeServers.map((server, index) => {
                                const isSelected = selectedServer === server.id;
                                const serverNum = index + 1;
                                return (
                                  <button
                                    key={server.id}
                                    onClick={() => {
                                      setSelectedServer(server.id);
                                      setServerOpen(false);
                                    }}
                                    className={cn(
                                      "px-2 py-2 rounded-lg text-xs font-medium transition-all duration-200 border text-center",
                                      isSelected
                                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                                        : "bg-zinc-900/50 border-zinc-700/50 text-zinc-300 hover:border-emerald-500/50 hover:bg-emerald-950/30 active:scale-95"
                                    )}
                                  >
                                    Server {serverNum}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Movie & TV Servers Section */}
                          <div className="p-3">
                            <div className="flex items-center gap-2 mb-2.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wide">
                                Movies + TV Only
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              {movieTvServers.map((server, index) => {
                                const isSelected = selectedServer === server.id;
                                const serverNum = animeServers.length + index + 1;
                                return (
                                  <button
                                    key={server.id}
                                    onClick={() => {
                                      setSelectedServer(server.id);
                                      setServerOpen(false);
                                    }}
                                    className={cn(
                                      "px-2 py-2 rounded-lg text-xs font-medium transition-all duration-200 border text-center",
                                      isSelected
                                        ? "bg-blue-500/20 border-blue-500 text-blue-300"
                                        : "bg-zinc-900/50 border-zinc-700/50 text-zinc-300 hover:border-blue-500/50 hover:bg-blue-950/30 active:scale-95"
                                    )}
                                  >
                                    Server {serverNum}
                                  </button>
                                );
                              })}
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
              {/* Title Logo */}
              <div className="p-4 flex items-center justify-center min-h-[80px]">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={title}
                    className="max-h-16 max-w-full object-contain"
                  />
                ) : (
                  <h2 className="font-display text-xl font-bold text-white text-center">
                    {title}
                  </h2>
                )}
              </div>

              {/* Poster + Quick Info */}
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

              {/* Details Card */}
              <div className="bg-zinc-950/70 backdrop-blur-sm rounded-lg p-4 border border-zinc-800 space-y-4 text-zinc-300">
                <h3 className="font-display text-lg text-white">Details</h3>
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
                          <span
                            key={genre.id}
                            className="px-2 py-0.5 bg-zinc-900 rounded-full text-xs border border-zinc-800"
                          >
                            {genre.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Cast */}
              {cast.length > 0 && (
                <div className="bg-zinc-950/70 backdrop-blur-sm rounded-lg p-4 border border-zinc-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-zinc-300" />
                    <h3 className="font-display text-lg text-white">Cast</h3>
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
                              <img
                                src={getImageUrl(member.profile_path, 'w200') || ''}
                                alt={member.name}
                                className="w-full h-full object-cover"
                              />
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

              {/* Production Companies */}
              {details.production_companies && details.production_companies.length > 0 && (
                <div className="bg-zinc-950/70 backdrop-blur-sm rounded-lg p-4 border border-zinc-800">
                  <h3 className="font-display text-sm mb-2 text-zinc-400">Production</h3>
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
