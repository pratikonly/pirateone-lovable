import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, CheckCircle2, XCircle, Play, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getImageUrl } from '@/lib/tmdb';
import { getAllShowStatuses, removeShowStatus, type ShowStatusEntry, type ShowStatusType } from '@/lib/showStatus';
import { getAllWatchProgress, getProgressPercentage } from '@/lib/watchProgress';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const statusConfig: Record<ShowStatusType, { label: string; icon: React.ReactNode; color: string }> = {
  watching: { label: 'Watching', icon: <Eye className="w-4 h-4" />, color: 'text-blue-400' },
  completed: { label: 'Completed', icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-green-400' },
  dropped: { label: 'Dropped', icon: <XCircle className="w-4 h-4" />, color: 'text-red-400' },
};

const Library = () => {
  const [shows, setShows] = useState<ShowStatusEntry[]>([]);
  const [progressData, setProgressData] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('watching');
  const navigate = useNavigate();
  const { user } = useAuth();

  // Feature D fix: wrap in useCallback so useEffect dep is stable
  const loadShows = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getAllShowStatuses();
      setShows(data);

      // Load watch progress data
      const progress = await getAllWatchProgress();
      const progressMap = new Map<string, number>();
      progress.forEach(p => {
        const key = `${p.tmdb_id}-${p.media_type}-${p.season || 'movie'}-${p.episode || 0}`;
        progressMap.set(key, getProgressPercentage(p));
      });
      setProgressData(progressMap);
    } catch (err) {
      console.error('Failed to load library:', err);
      toast.error('Failed to load library');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadShows();
  }, [loadShows]);

  const handleRemove = async (tmdbId: number, mediaType: string) => {
    try {
      await removeShowStatus(tmdbId, mediaType);
      setShows(prev => prev.filter(s => !(s.tmdb_id === tmdbId && s.media_type === mediaType)));
      toast.success('Removed from library');
    } catch {
      toast.error('Failed to remove');
    }
  };

  const handleContinue = (show: ShowStatusEntry) => {
    const type = show.media_type === 'movie' ? 'movie' : 'tv';
    if (show.last_season && show.last_episode) {
      navigate(`/watch/${type}/${show.tmdb_id}?s=${show.last_season}&e=${show.last_episode}`);
    } else {
      navigate(`/watch/${type}/${show.tmdb_id}`);
    }
  };

  if (!user) {
    return (
      <div className="p-8 pt-20 text-center">
        <h1 className="text-4xl font-bold mb-4">My Library</h1>
        <p className="text-muted-foreground">Sign in to track your shows</p>
        <Button onClick={() => navigate('/auth')} className="mt-4">Sign In</Button>
      </div>
    );
  }

  const filtered = shows.filter(s => s.status === activeTab);

  return (
    <div className="p-4 lg:p-8 pt-20">
      <h1 className="text-3xl lg:text-4xl font-bold mb-6">My Library</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border mb-6">
          {(Object.entries(statusConfig) as [ShowStatusType, typeof statusConfig[ShowStatusType]][]).map(([key, cfg]) => {
            const count = shows.filter(s => s.status === key).length;
            return (
              <TabsTrigger
                key={key}
                value={key}
                className="flex items-center gap-1.5 data-[state=active]:bg-primary/15"
              >
                <span className={cfg.color}>{cfg.icon}</span>
                <span>{cfg.label}</span>
                {count > 0 && (
                  <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">{count}</span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {Object.keys(statusConfig).map(status => (
          <TabsContent key={status} value={status}>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 bg-card rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-lg">
                  No {statusConfig[status as ShowStatusType].label.toLowerCase()} shows yet
                </p>
                <p className="text-muted-foreground text-sm mt-2">
                  Go to any movie or show and mark it as {status}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(show => {
                  const progressKey = `${show.tmdb_id}-${show.media_type}-${show.last_season || 'movie'}-${show.last_episode || 0}`;
                  const progress = progressData.get(progressKey) || 0;

                  return (
                    <div
                      key={`${show.tmdb_id}-${show.media_type}`}
                      className="bg-card border border-border rounded-lg overflow-hidden flex group hover:border-primary/30 transition-colors"
                    >
                      {/* Poster */}
                      <div className="w-24 flex-shrink-0 relative">
                        {show.poster_path ? (
                          <img
                            src={getImageUrl(show.poster_path, 'w200') || ''}
                            alt={show.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-xs p-2 text-center">
                            No Poster
                          </div>
                        )}
                        {/* Progress indicator */}
                        {progress > 0 && progress < 95 && (
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent">
                            <div className="h-1 bg-primary/30">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-sm text-foreground truncate flex-1">{show.title}</h3>
                            {progress > 0 && progress < 95 && (
                              <div className="flex items-center gap-1 text-xs text-primary flex-shrink-0">
                                <Clock className="w-3 h-3" />
                                <span>{Math.round(progress)}%</span>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 capitalize">{show.media_type}</p>
                          {show.last_season && show.last_episode && (
                            <p className="text-xs text-primary mt-1">
                              S{show.last_season} E{show.last_episode}
                            </p>
                          )}
                          {show.vote_average && (
                            <p className="text-xs text-muted-foreground mt-1">
                              ⭐ {Number(show.vote_average).toFixed(1)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {(status === 'watching' || status === 'dropped') && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              onClick={() => handleContinue(show)}
                            >
                              <Play className="w-3 h-3" />
                              {status === 'dropped' ? 'Resume' : 'Continue from here'}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            onClick={() => handleRemove(show.tmdb_id, show.media_type)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default Library;
