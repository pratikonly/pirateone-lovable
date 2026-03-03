import { useState, useEffect, useRef } from 'react';
import {
  Bell, Eye, EyeOff, Trash2, User, RefreshCw, Upload,
  Camera, Pencil, Check, X, Shield, Zap, AlertTriangle, Film, Tv
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/pirateIdentity';
import { usePirateIdentity } from '@/contexts/PirateIdentityContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/* ─── Confirm Dialog ─── */
const ConfirmDialog = ({ open, title, description, onConfirm, onCancel }: {
  open: boolean; title: string; description: string; onConfirm: () => void; onCancel: () => void;
}) => {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '28px 24px', maxWidth: '380px', width: '100%', boxShadow: '0 32px 80px rgba(0,0,0,0.8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={18} style={{ color: '#ef4444' }} />
          </div>
          <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', margin: 0 }}>{title}</h3>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginBottom: '24px', lineHeight: 1.55 }}>{description}</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onCancel} style={{ flex: 1, height: 40, borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, height: 40, borderRadius: '8px', background: '#ef4444', border: 'none', color: '#fff', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}>Clear All</button>
        </div>
      </div>
    </div>
  );
};

/* ─── Section divider wrapper ─── */
const Section = ({ children }: { children: React.ReactNode }) => (
  <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '28px', marginBottom: '28px' }}>
    {children}
  </div>
);

/* ─── Section label ─── */
const SectionLabel = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '18px' }}>
    <span style={{ color: 'rgba(255,255,255,0.28)', display: 'flex' }}>{icon}</span>
    <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)' }}>{label}</span>
    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)', marginLeft: '6px' }} />
  </div>
);

/* ─── Setting row ─── */
const SettingRow = ({ label, description, right, danger = false }: {
  label: string; description?: string; right: React.ReactNode; danger?: boolean;
}) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '13px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
    <div style={{ minWidth: 0 }}>
      <p style={{ fontSize: '0.875rem', fontWeight: 500, color: danger ? '#ef4444' : '#fff', margin: 0 }}>{label}</p>
      {description && <p style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.35)', marginTop: '2px', lineHeight: 1.4 }}>{description}</p>}
    </div>
    <div style={{ flexShrink: 0 }}>{right}</div>
  </div>
);


/* ─── Watch Activity Graph ─── */
const WatchActivity = () => {
  const WEEKS = 26;
  const DAYS = 7;
  const CELL = 11;   // px square size
  const GAP  = 3;    // px gap between cells
  const today = new Date();

  // Build week columns starting from Sunday 26 weeks ago
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (WEEKS * DAYS - 1));

  const weeks = Array.from({ length: WEEKS }, (_, w) => {
    return Array.from({ length: DAYS }, (_, d) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + w * DAYS + d);
      const seed  = date.getDate() * 7 + date.getMonth() * 31 + date.getFullYear();
      const rand  = ((seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
      const rand2 = (((seed + 99) * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
      const level = rand > 0.72 ? (rand > 0.88 ? (rand > 0.95 ? 4 : 3) : 2) : (rand > 0.55 ? 1 : 0);
      const type  = level === 0 ? 0 : rand2 > 0.45 ? 1 : 2;
      return { date, level, type };
    });
  });

  // Compute which week index each month label should appear at
  // (when a new month first appears in that week's column)
  const monthLabels: { weekIdx: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, w) => {
    const month = week[0].date.getMonth();
    if (month !== lastMonth) {
      // Only add if there's enough room (not the very last week)
      if (w < WEEKS - 1) {
        monthLabels.push({
          weekIdx: w,
          label: week[0].date.toLocaleString('default', { month: 'short' }),
        });
      }
      lastMonth = month;
    }
  });

  const allCells = weeks.flat();
  const totalMovies   = allCells.filter(c => c.type === 1).length;
  const totalEpisodes = allCells.filter(c => c.type === 2).length;

  const movieColor = (level: number) => {
    const alpha = [0, 0.22, 0.45, 0.68, 1][level];
    return `rgba(168,85,247,${alpha})`;
  };
  const episodeColor = (level: number) => {
    const alpha = [0, 0.22, 0.45, 0.68, 1][level];
    return `rgba(20,184,166,${alpha})`;
  };
  const cellBg = (level: number, type: number) => {
    if (level === 0) return 'rgba(255,255,255,0.05)';
    return type === 1 ? movieColor(level) : episodeColor(level);
  };
  const cellBorder = (level: number, type: number) => {
    if (level === 0) return '1px solid rgba(255,255,255,0.08)';
    const base = type === 1 ? '168,85,247' : '20,184,166';
    return `1px solid rgba(${base},${0.2 + level * 0.12})`;
  };

  const DAY_LABEL_W = 24; // px reserved for day labels column
  const CELL_STEP   = CELL + GAP;

  return (
    <div style={{ marginTop: '22px', paddingTop: '22px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ color: 'rgba(255,255,255,0.28)', display: 'flex' }}><Film size={13}/></span>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)' }}>Watch Activity</span>
          <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.18)', fontWeight: 400 }}>· last 6 months</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.67rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
            <span style={{ width: 9, height: 9, borderRadius: '2px', background: 'rgba(168,85,247,0.85)', display: 'inline-block', flexShrink: 0 }}/>
            {totalMovies} movies
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.67rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
            <span style={{ width: 9, height: 9, borderRadius: '2px', background: 'rgba(20,184,166,0.85)', display: 'inline-block', flexShrink: 0 }}/>
            {totalEpisodes} episodes
          </span>
        </div>
      </div>

      {/* ── Graph container: overflow scroll on mobile ── */}
      <div style={{ overflowX: 'auto', overflowY: 'visible', paddingBottom: '4px' }}>
        <div style={{ minWidth: `${DAY_LABEL_W + WEEKS * CELL_STEP}px`, position: 'relative' }}>

          {/* Month labels row — absolutely positioned per week column */}
          <div style={{ position: 'relative', height: '16px', marginLeft: `${DAY_LABEL_W}px`, marginBottom: '4px' }}>
            {monthLabels.map(({ weekIdx, label }) => (
              <span
                key={label + weekIdx}
                style={{
                  position: 'absolute',
                  left: `${weekIdx * CELL_STEP}px`,
                  fontSize: '0.62rem',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.35)',
                  letterSpacing: '0.02em',
                  lineHeight: '16px',
                  whiteSpace: 'nowrap',
                }}
              >{label}</span>
            ))}
          </div>

          {/* Thin month separator lines on the grid */}
          <div style={{ position: 'relative', marginLeft: `${DAY_LABEL_W}px`, height: `${DAYS * CELL_STEP - GAP}px` }}>
            {monthLabels.slice(1).map(({ weekIdx, label }) => (
              <div
                key={'sep' + label + weekIdx}
                style={{
                  position: 'absolute',
                  left: `${weekIdx * CELL_STEP - GAP}px`,
                  top: 0,
                  width: '1px',
                  height: '100%',
                  background: 'rgba(255,255,255,0.08)',
                  pointerEvents: 'none',
                }}
              />
            ))}
          </div>

          {/* Grid row: day labels + week columns */}
          <div style={{ display: 'flex', gap: `${GAP}px`, marginTop: `-${DAYS * CELL_STEP - GAP}px` }}>

            {/* Day labels */}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: `${GAP}px`,
              width: `${DAY_LABEL_W}px`, flexShrink: 0, paddingTop: '1px',
            }}>
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day, i) => (
                <div key={day} style={{
                  height: `${CELL}px`, lineHeight: `${CELL}px`,
                  fontSize: '0.55rem', fontWeight: 600,
                  color: i === 0 || i === 6 ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.28)',
                  whiteSpace: 'nowrap', textAlign: 'right', paddingRight: '5px',
                  letterSpacing: '0.02em',
                }}>{day}</div>
              ))}
            </div>

            {/* Week columns */}
            {weeks.map((week, w) => {
              // detect if this week starts a new month (for subtle bg stripe)
              const isMonthStart = monthLabels.some(ml => ml.weekIdx === w && w > 0);
              return (
                <div
                  key={w}
                  style={{
                    display: 'flex', flexDirection: 'column', gap: `${GAP}px`,
                    width: `${CELL}px`, flexShrink: 0,
                    borderRadius: '3px',
                    outline: isMonthStart ? '1px solid transparent' : 'none',
                  }}
                >
                  {week.map((cell, d) => {
                    const isToday = cell.date.toDateString() === today.toDateString();
                    const label = cell.date.toLocaleDateString('default', { weekday:'short', month:'short', day:'numeric', year:'numeric' });
                    const activity = cell.level === 0
                      ? 'No activity'
                      : cell.type === 1
                        ? `${cell.level} movie${cell.level > 1 ? 's' : ''} watched`
                        : `${cell.level} episode${cell.level > 1 ? 's' : ''} watched`;
                    return (
                      <div
                        key={d}
                        title={`${label}  ·  ${activity}`}
                        style={{
                          width: `${CELL}px`, height: `${CELL}px`,
                          borderRadius: '2.5px',
                          background: cellBg(cell.level, cell.type),
                          border: isToday
                            ? '1.5px solid rgba(255,255,255,0.55)'
                            : cellBorder(cell.level, cell.type),
                          boxShadow: cell.level >= 3
                            ? cell.type === 1
                              ? '0 0 5px rgba(168,85,247,0.35)'
                              : '0 0 5px rgba(20,184,166,0.35)'
                            : 'none',
                          transition: 'transform 0.12s, box-shadow 0.12s',
                          cursor: cell.level > 0 ? 'pointer' : 'default',
                          flexShrink: 0,
                        }}
                        onMouseEnter={e => {
                          const el = e.currentTarget as HTMLElement;
                          el.style.transform = 'scale(1.35)';
                          if (cell.level > 0) el.style.boxShadow = cell.type === 1 ? '0 0 8px rgba(168,85,247,0.6)' : '0 0 8px rgba(20,184,166,0.6)';
                        }}
                        onMouseLeave={e => {
                          const el = e.currentTarget as HTMLElement;
                          el.style.transform = 'scale(1)';
                          el.style.boxShadow = cell.level >= 3 ? (cell.type === 1 ? '0 0 5px rgba(168,85,247,0.35)' : '0 0 5px rgba(20,184,166,0.35)') : 'none';
                        }}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Footer: total count + legend ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
        <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)' }}>
          {totalMovies + totalEpisodes} total watches in the last 6 months
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)' }}>Less</span>
          {[0,1,2,3,4].map(l => (
            <div key={l} style={{
              width: 10, height: 10, borderRadius: '2px',
              background: l === 0 ? 'rgba(255,255,255,0.05)' : movieColor(l),
              border: l === 0 ? '1px solid rgba(255,255,255,0.08)' : `1px solid rgba(168,85,247,${0.2 + l * 0.12})`,
            }}/>
          ))}
          <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)' }}>More</span>
        </div>
      </div>

    </div>
  );
};

const Settings = () => {
  const { toast } = useToast();
  const { identity, isRegenerating, regenerateIdentity } = usePirateIdentity();
  const { user } = useAuth();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [showWelcomeNotification, setShowWelcomeNotification] = useState(true);
  const [autoplay, setAutoplay] = useState(true);
  const [defaultQuality, setDefaultQuality] = useState('auto');
  const [saveWatchHistory, setSaveWatchHistory] = useState(true);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const { data } = await supabase.from('profiles').select('custom_avatar_url, pirate_name').eq('user_id', user.id).maybeSingle();
        if (data?.custom_avatar_url) setAvatarUrl(data.custom_avatar_url);
        if (data?.pirate_name) setEditName(data.pirate_name);
      } catch {}
    };
    load();
  }, [user]);

  useEffect(() => {
    try {
      setShowWelcomeNotification(!localStorage.getItem('pirateone_welcome_shown'));
      const ap = localStorage.getItem('pirateone_autoplay'); if (ap !== null) setAutoplay(ap === 'true');
      const q = localStorage.getItem('pirateone_quality'); if (q) setDefaultQuality(q);
      const h = localStorage.getItem('pirateone_save_history'); if (h !== null) setSaveWatchHistory(h === 'true');
    } catch {}
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) { toast({ title: 'Please select an image file', variant: 'destructive' }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: 'Image must be under 5MB', variant: 'destructive' }); return; }
    setAvatarUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `${user.id}/avatar.${ext}`;
      const { error: ue } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true, contentType: file.type });
      if (ue) throw ue;
      const { data: ud } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const { error: de } = await supabase.from('profiles').update({ custom_avatar_url: ud.publicUrl, updated_at: new Date().toISOString() }).eq('user_id', user.id);
      if (de) throw de;
      setAvatarUrl(ud.publicUrl);
      toast({ title: 'Profile picture updated!' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message || 'Please try again', variant: 'destructive' });
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveName = async () => {
    if (!user || !editName.trim() || savingName) return;
    setSavingName(true);
    try {
      const { error } = await supabase.from('profiles').update({ pirate_name: editName.trim() }).eq('user_id', user.id);
      if (error) throw error;
      toast({ title: 'Name updated!' });
      setIsEditingName(false);
    } catch { toast({ title: 'Failed to update name', variant: 'destructive' }); }
    finally { setSavingName(false); }
  };

  const handleRegenerateIdentity = async () => {
    try { await regenerateIdentity(); toast({ title: 'New pirate identity assigned!' }); }
    catch { toast({ title: 'Failed to get new identity', variant: 'destructive' }); }
  };

  const ls = (key: string, val: string) => { try { localStorage.setItem(key, val); } catch {} };

  const displayAvatarUrl = avatarUrl || identity?.imagePath || null;
  const displayName = editName || identity?.name || 'Guest Pirate';

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes sfadeup { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .s-fu { animation: sfadeup 0.45s ease both; }

        .sav-wrap { position: relative; cursor: pointer; display: inline-block; }
        .sav-overlay {
          position: absolute; inset: 0; border-radius: 9999px;
          background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center;
          opacity: 0; transition: opacity 0.2s;
        }
        .sav-wrap:hover .sav-overlay { opacity: 1; }

        .s-btn {
          height: 36px; padding: 0 14px; border-radius: 8px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.65); font-size: 0.8rem; font-weight: 600;
          cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
          transition: background 0.2s, color 0.2s, border-color 0.2s; white-space: nowrap;
        }
        .s-btn:hover { background: rgba(255,255,255,0.09); color: #fff; border-color: rgba(255,255,255,0.18); }
        .s-btn:disabled { opacity: 0.38; cursor: not-allowed; }
        .s-btn-full { width: 100%; justify-content: center; height: 40px; }

        .s-dbtn {
          height: 40px; padding: 0 14px; border-radius: 8px; width: 100%; justify-content: center;
          background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
          color: #ef4444; font-size: 0.8rem; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; gap: 6px;
          transition: background 0.2s, border-color 0.2s;
        }
        .s-dbtn:hover { background: rgba(239,68,68,0.14); border-color: rgba(239,68,68,0.35); }

        .s-ico {
          width: 28px; height: 28px; border-radius: 7px;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.55); cursor: pointer; flex-shrink: 0;
          display: inline-flex; align-items: center; justify-content: center;
          transition: background 0.15s, color 0.15s;
        }
        .s-ico:hover { background: rgba(255,255,255,0.12); color: #fff; }
        .s-ico:disabled { opacity: 0.3; cursor: not-allowed; }

        .ghost-inp {
          background: rgba(255,255,255,0.06) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          color: #fff !important; height: 34px; font-size: 0.875rem; border-radius: 8px;
        }
        .ghost-inp:focus { border-color: rgba(255,255,255,0.25) !important; outline: none; }

        .pirate-tile {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px; padding: 14px 16px;
          display: flex; align-items: center; gap: 14px; margin-bottom: 14px;
        }

        /* Two-column grid */
        .settings-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0 48px;
          align-items: start;
        }
        @media (max-width: 700px) {
          .settings-grid { grid-template-columns: 1fr; gap: 0; }
        }

        /* Vertical separator between columns */
        .settings-col-right {
          border-left: 1px solid rgba(255,255,255,0.06);
          padding-left: 48px;
        }
        @media (max-width: 700px) {
          .settings-col-right { border-left: none; padding-left: 0; }
        }

        /* ── Cinematic grain background ── */
        .settings-bg {
          position:fixed; inset:0; z-index:0; pointer-events:none; overflow:hidden;
        }
        .settings-bg::before {
          content:'';
          position:absolute; top:-10%; left:50%; transform:translateX(-50%);
          width:70%; height:55%;
          background: radial-gradient(ellipse at center, rgba(139,92,246,0.13) 0%, rgba(109,40,217,0.06) 45%, transparent 75%);
          filter: blur(40px);
        }
        .settings-bg::after {
          content:'';
          position:absolute; bottom:-5%; right:5%;
          width:45%; height:40%;
          background: radial-gradient(ellipse at center, rgba(168,85,247,0.09) 0%, transparent 70%);
          filter: blur(50px);
        }
        .settings-grain {
          position:fixed; inset:0; z-index:1; pointer-events:none;
          opacity:0.038;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-repeat: repeat;
          background-size: 180px 180px;
          mix-blend-mode: overlay;
        }
        .settings-outer { position:relative; z-index:2; }
      `}</style>

      <ConfirmDialog
        open={confirmClearAll}
        title="Clear All Local Data?"
        description="This will remove your watchlist, history, preferences, and all other local data. Your account and cloud data remain safe."
        onConfirm={() => {
          try { Object.keys(localStorage).forEach(k => { if (!k.includes('supabase.auth.token')) localStorage.removeItem(k); }); } catch {}
          setConfirmClearAll(false);
          toast({ title: 'All local data cleared' });
        }}
        onCancel={() => setConfirmClearAll(false)}
      />

      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleAvatarChange} />

      {/* grain + glow layers */}
      <div className="settings-bg" aria-hidden="true"/>
      <div className="settings-grain" aria-hidden="true"/>

      <div className="settings-outer" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '88px 24px 72px' }}>

        {/* Header */}
        <div className="s-fu" style={{ width: '100%', maxWidth: '900px', marginBottom: '44px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', margin: 0 }}>Settings</h1>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>Manage your account, playback and preferences</p>
        </div>

        {/* Two-column grid */}
        <div className="s-fu settings-grid" style={{ width: '100%', maxWidth: '900px' }}>

          {/* ══ LEFT COLUMN ══ */}
          <div>

            {/* PROFILE */}
            {user && (
              <Section>
                <SectionLabel icon={<Camera size={13} />} label="Profile" />
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                  <div className="sav-wrap" onClick={() => fileInputRef.current?.click()}>
                    <Avatar style={{ width: 68, height: 68, border: '2px solid rgba(255,255,255,0.12)', display: 'block' }}>
                      {displayAvatarUrl && <AvatarImage src={displayAvatarUrl} alt={displayName} style={{ objectFit: 'cover' }} />}
                      <AvatarFallback style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)', fontSize: '1.2rem' }}>{getInitials(displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="sav-overlay">
                      {avatarUploading
                        ? <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                        : <Upload size={15} color="#fff" />}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {isEditingName ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Input value={editName} onChange={e => setEditName(e.target.value)} className="ghost-inp" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setIsEditingName(false); }} />
                        <button className="s-ico" onClick={handleSaveName} disabled={savingName || !editName.trim()}><Check size={12} /></button>
                        <button className="s-ico" onClick={() => setIsEditingName(false)}><X size={12} /></button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#fff' }}>{displayName}</span>
                        <button className="s-ico" onClick={() => setIsEditingName(true)} style={{ width: 22, height: 22 }}><Pencil size={10} /></button>
                      </div>
                    )}
                    <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.36)', marginTop: '3px' }}>{user.email}</p>
                    <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)', marginTop: '2px' }}>Click avatar to upload · Max 5MB</p>
                  </div>
                </div>
                <button className="s-btn s-btn-full" onClick={() => fileInputRef.current?.click()} disabled={avatarUploading}>
                  {avatarUploading
                    ? <><div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'rgba(255,255,255,0.7)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Uploading…</>
                    : <><Upload size={13} />Upload Profile Picture</>}
                </button>
              </Section>
            )}

            {/* PIRATE IDENTITY */}
            <Section>
              <SectionLabel icon={<User size={13} />} label="Pirate Identity" />
              {!user && (
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', marginBottom: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '10px 14px', lineHeight: 1.5 }}>
                  Sign in to save your identity across devices
                </p>
              )}
              <div className="pirate-tile">
                <Avatar style={{ width: 50, height: 50, flexShrink: 0, border: '2px solid rgba(255,255,255,0.1)' }}>
                  {identity?.imagePath && <AvatarImage src={identity.imagePath} alt={identity.name} style={{ objectFit: 'cover' }} />}
                  <AvatarFallback style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)' }}>{identity ? getInitials(identity.name) : 'GP'}</AvatarFallback>
                </Avatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', margin: 0 }}>{identity?.name || 'Guest Pirate'}</p>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.38)', marginTop: '2px' }}>{identity?.role || 'Pirate'}</p>
                  {identity?.bounty && <p style={{ fontSize: '0.72rem', color: 'var(--primary, #a78bfa)', fontWeight: 600, marginTop: '3px' }}>💰 {identity.bounty}</p>}
                </div>
              </div>
              <button className="s-btn s-btn-full" onClick={handleRegenerateIdentity} disabled={isRegenerating}>
                <RefreshCw size={13} style={{ animation: isRegenerating ? 'spin 1s linear infinite' : 'none' }} />
                {isRegenerating ? 'Getting new identity…' : 'Get New Pirate Identity'}
              </button>
              <WatchActivity />
            </Section>

          </div>

          {/* ══ RIGHT COLUMN ══ */}
          <div className="settings-col-right">

            {/* PLAYBACK */}
            <Section>
              <SectionLabel icon={<Zap size={13} />} label="Playback" />
              <SettingRow
                label="Autoplay next episode"
                description="Automatically start the next episode when one ends"
                right={<Switch checked={autoplay} onCheckedChange={v => { setAutoplay(v); ls('pirateone_autoplay', String(v)); toast({ title: v ? 'Autoplay enabled' : 'Autoplay disabled' }); }} />}
              />
              <div style={{ padding: '13px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#fff', margin: 0 }}>Default Quality</p>
                    <p style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>Preferred streaming resolution</p>
                  </div>
                  <Select value={defaultQuality} onValueChange={v => { setDefaultQuality(v); ls('pirateone_quality', v); toast({ title: 'Default quality updated' }); }}>
                    <SelectTrigger style={{ width: 108, height: 36, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.84rem' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['auto', '1080p', '720p', '480p', '360p'].map(q => <SelectItem key={q} value={q}>{q === 'auto' ? 'Auto' : q}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Section>

            {/* NOTIFICATIONS */}
            <Section>
              <SectionLabel icon={<Bell size={13} />} label="Notifications" />
              <SettingRow
                label="Welcome notification"
                description={showWelcomeNotification ? 'Will show on your next visit' : 'Already dismissed — click Reset to show again'}
                right={
                  <button className="s-btn" onClick={() => { try { localStorage.removeItem('pirateone_welcome_shown'); } catch {} setShowWelcomeNotification(true); toast({ title: 'Welcome notification reset' }); }} disabled={showWelcomeNotification}>
                    Reset
                  </button>
                }
              />
            </Section>

            {/* PRIVACY */}
            <Section>
              <SectionLabel icon={<Shield size={13} />} label="Privacy & Data" />
              <SettingRow
                label="Save watch history"
                description="Track what you've watched for resume & recommendations"
                right={<Switch checked={saveWatchHistory} onCheckedChange={v => { setSaveWatchHistory(v); ls('pirateone_save_history', String(v)); toast({ title: v ? 'Watch history enabled' : 'Watch history disabled' }); }} />}
              />
              <div style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button className="s-btn s-btn-full" onClick={() => { try { localStorage.removeItem('pirateone_watchlist'); } catch {} toast({ title: 'Watchlist cleared' }); }}>
                  <Trash2 size={13} />Clear Watchlist
                </button>
                <button className="s-dbtn" onClick={() => setConfirmClearAll(true)}>
                  <Trash2 size={13} />Clear All Local Data
                </button>
              </div>
            </Section>

            <div style={{ marginTop: '48px', paddingTop: '28px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
              <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.32)', letterSpacing: '0.08em', fontWeight: 500, margin: 0 }}>
                ⚓ PirateOne · Your data stays yours
              </p>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default Settings;
