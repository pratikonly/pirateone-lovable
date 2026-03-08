import { useState, useEffect } from 'react';
import { TrendingUp, Film, Tv, Clock, Calendar, Flame, BarChart3, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import DisclaimerFooter from '@/components/DisclaimerFooter';

interface StatsData {
  totalMovies: number;
  totalEpisodes: number;
  totalWatchTime: number;
  thisWeek: number;
  thisMonth: number;
  topGenres: string[];
  streak: number;
  recentDays: boolean[];
}

const Stats = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) { setLoading(false); return; }
      try {
        const { data: progress } = await supabase
          .from('watch_progress')
          .select('*')
          .eq('user_id', user.id);

        const { data: history } = await supabase
          .from('watch_history')
          .select('*')
          .eq('user_id', user.id)
          .order('watched_at', { ascending: false });

        const now = Date.now();
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
        const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

        let totalMovies = 0, totalEpisodes = 0, totalWatchTime = 0, thisWeek = 0, thisMonth = 0;

        (progress || []).forEach((p: any) => {
          if (p.media_type === 'movie') totalMovies++;
          else totalEpisodes++;
          totalWatchTime += Number(p.duration || 0);
          const t = new Date(p.updated_at).getTime();
          if (t > weekAgo) thisWeek++;
          if (t > monthAgo) thisMonth++;
        });

        // Calculate streak
        const daySet = new Set<string>();
        (history || []).forEach((h: any) => {
          daySet.add(new Date(h.watched_at).toDateString());
        });

        let streak = 0;
        const today = new Date();
        for (let i = 0; i < 365; i++) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          if (daySet.has(d.toDateString())) streak++;
          else if (i > 0) break;
        }

        // Recent 14 days activity
        const recentDays = Array.from({ length: 14 }, (_, i) => {
          const d = new Date(today);
          d.setDate(d.getDate() - (13 - i));
          return daySet.has(d.toDateString());
        });

        setStats({
          totalMovies, totalEpisodes, totalWatchTime, thisWeek, thisMonth,
          topGenres: [], streak, recentDays,
        });
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <BarChart3 className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-lg mb-2">Sign in to see your stats</p>
        <button onClick={() => navigate('/auth')} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium">Sign In</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { icon: <Film className="w-5 h-5" />, label: 'Movies Watched', value: stats.totalMovies, color: 'from-purple-500/20 to-purple-600/5 border-purple-500/20' },
    { icon: <Tv className="w-5 h-5" />, label: 'Episodes Watched', value: stats.totalEpisodes, color: 'from-teal-500/20 to-teal-600/5 border-teal-500/20' },
    { icon: <Clock className="w-5 h-5" />, label: 'Total Watch Time', value: formatTime(stats.totalWatchTime), color: 'from-blue-500/20 to-blue-600/5 border-blue-500/20' },
    { icon: <Flame className="w-5 h-5" />, label: 'Current Streak', value: `${stats.streak} days`, color: 'from-orange-500/20 to-orange-600/5 border-orange-500/20' },
    { icon: <Calendar className="w-5 h-5" />, label: 'This Week', value: stats.thisWeek, color: 'from-yellow-500/20 to-yellow-600/5 border-yellow-500/20' },
    { icon: <TrendingUp className="w-5 h-5" />, label: 'This Month', value: stats.thisMonth, color: 'from-pink-500/20 to-pink-600/5 border-pink-500/20' },
  ];

  return (
    <div className="min-h-screen p-4 lg:p-8 pt-20">
      <h1 className="font-display text-3xl lg:text-4xl mb-8">Your Stats</h1>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl">
        {statCards.map(card => (
          <div key={card.label} className={`bg-gradient-to-br ${card.color} border rounded-xl p-5`}>
            <div className="text-muted-foreground mb-2">{card.icon}</div>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Activity heatmap */}
      <div className="mt-8 max-w-3xl">
        <h2 className="text-lg font-semibold text-foreground mb-3">Recent Activity</h2>
        <div className="flex gap-1.5">
          {stats.recentDays.map((active, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-md ${active ? 'bg-primary/60' : 'bg-muted/50'} transition-colors`} />
              <span className="text-[10px] text-muted-foreground">
                {new Date(Date.now() - (13 - i) * 86400000).toLocaleDateString('en', { weekday: 'narrow' })}
              </span>
            </div>
          ))}
        </div>
      </div>

      <DisclaimerFooter />
    </div>
  );
};

export default Stats;
