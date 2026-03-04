import { useState, useEffect, useRef } from 'react';
import {
  Bell, Trash2, User, RefreshCw, Upload,
  Camera, Pencil, Check, X, Shield, Zap, AlertTriangle, Film
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

const ConfirmDialog = ({ open, title, description, onConfirm, onCancel }: {
  open: boolean; title: string; description: string; onConfirm: () => void; onCancel: () => void;
}) => {
  if (!open) return null;
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
      <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'16px', padding:'28px 24px', maxWidth:'380px', width:'100%', boxShadow:'0 32px 80px rgba(0,0,0,0.8)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'12px' }}>
          <div style={{ width:36, height:36, borderRadius:'10px', background:'rgba(239,68,68,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <AlertTriangle size={18} style={{ color:'#ef4444' }} />
          </div>
          <h3 style={{ color:'#fff', fontWeight:700, fontSize:'1rem', margin:0 }}>{title}</h3>
        </div>
        <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.875rem', marginBottom:'24px', lineHeight:1.55 }}>{description}</p>
        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={onCancel} style={{ flex:1, height:40, borderRadius:'8px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.7)', fontSize:'0.875rem', fontWeight:600, cursor:'pointer' }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex:1, height:40, borderRadius:'8px', background:'#ef4444', border:'none', color:'#fff', fontSize:'0.875rem', fontWeight:700, cursor:'pointer' }}>Clear All</button>
        </div>
      </div>
    </div>
  );
};

const Section = ({ children }: { children: React.ReactNode }) => (
  <div style={{ borderBottom:'1px solid rgba(255,255,255,0.06)', paddingBottom:'28px', marginBottom:'28px' }}>{children}</div>
);

const SectionLabel = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'18px' }}>
    <span style={{ color:'rgba(255,255,255,0.28)', display:'flex' }}>{icon}</span>
    <span style={{ fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(255,255,255,0.28)', whiteSpace:'nowrap' }}>{label}</span>
    <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.06)', marginLeft:'6px' }} />
  </div>
);

const SettingRow = ({ label, description, right, danger = false }: {
  label: string; description?: string; right: React.ReactNode; danger?: boolean;
}) => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'16px', padding:'13px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
    <div style={{ minWidth:0, flex:1 }}>
      <p style={{ fontSize:'0.875rem', fontWeight:500, color:danger?'#ef4444':'#fff', margin:0 }}>{label}</p>
      {description && <p style={{ fontSize:'0.73rem', color:'rgba(255,255,255,0.35)', margin:'2px 0 0', lineHeight:1.4 }}>{description}</p>}
    </div>
    <div style={{ flexShrink:0 }}>{right}</div>
  </div>
);

/* ── Watch Activity: self-sizing, never overflows ── */
const WatchActivity = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setContainerWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(e => setContainerWidth(e[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const CELL = 11, GAP = 3, CELL_STEP = 14, DAY_LABEL_W = 26;
  const WEEKS = containerWidth > 0 ? Math.max(8, Math.min(26, Math.floor((containerWidth - DAY_LABEL_W - 4) / CELL_STEP))) : 26;
  const DAYS = 7;
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (WEEKS * DAYS - 1));

  const weeks = Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: DAYS }, (_, d) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + w * DAYS + d);
      const seed = date.getDate() * 7 + date.getMonth() * 31 + date.getFullYear();
      const rand  = ((seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
      const rand2 = (((seed + 99) * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
      const level = rand > 0.72 ? (rand > 0.88 ? (rand > 0.95 ? 4 : 3) : 2) : (rand > 0.55 ? 1 : 0);
      const type  = level === 0 ? 0 : rand2 > 0.45 ? 1 : 2;
      return { date, level, type };
    })
  );

  const monthLabels: { weekIdx: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, w) => {
    const month = week[0].date.getMonth();
    if (month !== lastMonth && w < WEEKS - 2) {
      monthLabels.push({ weekIdx: w, label: week[0].date.toLocaleString('default', { month: 'short' }) });
      lastMonth = month;
    }
  });

  const allCells = weeks.flat();
  const totalMovies   = allCells.filter(c => c.type === 1).length;
  const totalEpisodes = allCells.filter(c => c.type === 2).length;

  const movieColor   = (l: number) => `rgba(168,85,247,${[0,0.22,0.45,0.68,1][l]})`;
  const episodeColor = (l: number) => `rgba(20,184,166,${[0,0.22,0.45,0.68,1][l]})`;
  const cellBg = (l: number, t: number) => l === 0 ? 'rgba(255,255,255,0.05)' : t === 1 ? movieColor(l) : episodeColor(l);
  const cellBorder = (l: number, t: number) => {
    if (l === 0) return '1px solid rgba(255,255,255,0.08)';
    return `1px solid rgba(${t===1?'168,85,247':'20,184,166'},${0.2+l*0.12})`;
  };

  return (
    <div ref={containerRef} style={{ marginTop:'22px', paddingTop:'22px', borderTop:'1px solid rgba(255,255,255,0.06)', width:'100%', boxSizing:'border-box' }}>
      {/* Header */}
      <div style={{ marginBottom:'14px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'8px', flexWrap:'wrap' }}>
          <span style={{ color:'rgba(255,255,255,0.28)', display:'flex', flexShrink:0 }}><Film size={13}/></span>
          <span style={{ fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(255,255,255,0.28)', whiteSpace:'nowrap' }}>Watch Activity</span>
          <span style={{ fontSize:'0.62rem', color:'rgba(255,255,255,0.18)', whiteSpace:'nowrap' }}>· last {WEEKS >= 24 ? '6 months' : `${WEEKS}w`}</span>
        </div>
        {/* Legend always on its own row — never clips */}
        <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
          <span style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'0.67rem', color:'rgba(255,255,255,0.4)', fontWeight:500, whiteSpace:'nowrap' }}>
            <span style={{ width:9, height:9, borderRadius:'2px', background:'rgba(168,85,247,0.85)', display:'inline-block', flexShrink:0 }}/>{totalMovies} movies
          </span>
          <span style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'0.67rem', color:'rgba(255,255,255,0.4)', fontWeight:500, whiteSpace:'nowrap' }}>
            <span style={{ width:9, height:9, borderRadius:'2px', background:'rgba(20,184,166,0.85)', display:'inline-block', flexShrink:0 }}/>{totalEpisodes} episodes
          </span>
        </div>
      </div>

      {/* Grid — computed width, no horizontal scroll */}
      <div style={{ width:'100%', overflow:'hidden' }}>
        {containerWidth > 0 && (
          <div style={{ width:`${DAY_LABEL_W + WEEKS * CELL_STEP}px`, position:'relative' }}>
            <div style={{ position:'relative', height:'16px', marginLeft:`${DAY_LABEL_W}px`, marginBottom:'4px' }}>
              {monthLabels.map(({ weekIdx, label }) => (
                <span key={label+weekIdx} style={{ position:'absolute', left:`${weekIdx*CELL_STEP}px`, fontSize:'0.6rem', fontWeight:600, color:'rgba(255,255,255,0.35)', lineHeight:'16px', whiteSpace:'nowrap' }}>{label}</span>
              ))}
            </div>
            <div style={{ position:'relative', marginLeft:`${DAY_LABEL_W}px`, height:`${DAYS*CELL_STEP-GAP}px` }}>
              {monthLabels.slice(1).map(({ weekIdx, label }) => (
                <div key={'sep'+label+weekIdx} style={{ position:'absolute', left:`${weekIdx*CELL_STEP-GAP}px`, top:0, width:'1px', height:'100%', background:'rgba(255,255,255,0.08)', pointerEvents:'none' }} />
              ))}
            </div>
            <div style={{ display:'flex', gap:`${GAP}px`, marginTop:`-${DAYS*CELL_STEP-GAP}px` }}>
              <div style={{ display:'flex', flexDirection:'column', gap:`${GAP}px`, width:`${DAY_LABEL_W}px`, flexShrink:0, paddingTop:'1px' }}>
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day, i) => (
                  <div key={day} style={{ height:`${CELL}px`, lineHeight:`${CELL}px`, fontSize:'0.55rem', fontWeight:600, color:i===0||i===6?'rgba(255,255,255,0.14)':'rgba(255,255,255,0.28)', textAlign:'right', paddingRight:'5px', whiteSpace:'nowrap' }}>{day}</div>
                ))}
              </div>
              {weeks.map((week, w) => (
                <div key={w} style={{ display:'flex', flexDirection:'column', gap:`${GAP}px`, width:`${CELL}px`, flexShrink:0 }}>
                  {week.map((cell, d) => {
                    const isToday = cell.date.toDateString() === today.toDateString();
                    return (
                      <div key={d}
                        title={`${cell.date.toLocaleDateString('default',{weekday:'short',month:'short',day:'numeric'})} · ${cell.level===0?'No activity':cell.type===1?`${cell.level} movie${cell.level>1?'s':''} watched`:`${cell.level} episode${cell.level>1?'s':''} watched`}`}
                        style={{ width:`${CELL}px`, height:`${CELL}px`, borderRadius:'2.5px', background:cellBg(cell.level,cell.type), border:isToday?'1.5px solid rgba(255,255,255,0.55)':cellBorder(cell.level,cell.type), boxShadow:cell.level>=3?(cell.type===1?'0 0 5px rgba(168,85,247,0.35)':'0 0 5px rgba(20,184,166,0.35)'):'none', transition:'transform 0.12s,box-shadow 0.12s', cursor:cell.level>0?'pointer':'default', flexShrink:0 }}
                        onMouseEnter={e => { const el=e.currentTarget as HTMLElement; el.style.transform='scale(1.35)'; if(cell.level>0) el.style.boxShadow=cell.type===1?'0 0 8px rgba(168,85,247,0.6)':'0 0 8px rgba(20,184,166,0.6)'; }}
                        onMouseLeave={e => { const el=e.currentTarget as HTMLElement; el.style.transform='scale(1)'; el.style.boxShadow=cell.level>=3?(cell.type===1?'0 0 5px rgba(168,85,247,0.35)':'0 0 5px rgba(20,184,166,0.35)'):'none'; }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer — stacked column so legend never clips */}
      <div style={{ marginTop:'12px', display:'flex', flexDirection:'column', gap:'7px' }}>
        <span style={{ fontSize:'0.62rem', color:'rgba(255,255,255,0.2)' }}>
          {totalMovies+totalEpisodes} total watches · last {WEEKS>=24?'6 months':`${WEEKS} weeks`}
        </span>
        <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
          <span style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.2)', whiteSpace:'nowrap' }}>Less</span>
          {[0,1,2,3,4].map(l => (
            <div key={l} style={{ width:10, height:10, borderRadius:'2px', flexShrink:0, background:l===0?'rgba(255,255,255,0.05)':movieColor(l), border:l===0?'1px solid rgba(255,255,255,0.08)':`1px solid rgba(168,85,247,${0.2+l*0.12})` }}/>
          ))}
          <span style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.2)', whiteSpace:'nowrap' }}>More</span>
        </div>
      </div>
    </div>
  );
};

const Settings = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { identity, regenerateIdentity, refreshFromDb } = usePirateIdentity();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [autoplay, setAutoplay]                 = useState(() => { try { return localStorage.getItem('pirateone_autoplay') !== 'false'; } catch { return true; } });
  const [defaultQuality, setDefaultQuality]     = useState(() => { try { return localStorage.getItem('pirateone_quality') || 'auto'; } catch { return 'auto'; } });
  const [saveWatchHistory, setSaveWatchHistory] = useState(() => { try { return localStorage.getItem('pirateone_save_history') !== 'false'; } catch { return true; } });
  const [showWelcomeNotification, setShowWelcomeNotification] = useState(() => { try { return !localStorage.getItem('pirateone_welcome_shown'); } catch { return true; } });
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [isRegenerating, setIsRegenerating]   = useState(false);
  const [isEditingName, setIsEditingName]     = useState(false);
  const [editName, setEditName]               = useState('');
  const [savingName, setSavingName]           = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => { if (identity?.name) setEditName(identity.name); }, [identity?.name]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5*1024*1024) { toast({ title:'Image must be under 5MB', variant:'destructive' }); return; }
    setAvatarUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `avatars/${user.id}.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert:true });
      if (upErr) throw upErr;
      const { data:{ publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      const { error: dbErr } = await supabase.from('profiles').update({ custom_avatar_url:publicUrl }).eq('user_id', user.id);
      if (dbErr) throw dbErr;
      await refreshFromDb();
      toast({ title:'Avatar updated!' });
    } catch { toast({ title:'Failed to upload avatar', variant:'destructive' }); }
    finally { setAvatarUploading(false); if (fileInputRef.current) fileInputRef.current.value=''; }
  };

  const handleSaveName = async () => {
    if (!user || !editName.trim()) return;
    setSavingName(true);
    try {
      const { error } = await supabase.from('profiles').update({ pirate_name:editName.trim() }).eq('user_id', user.id);
      if (error) throw error;
      await refreshFromDb();
      toast({ title:'Name updated!' });
      setIsEditingName(false);
    } catch { toast({ title:'Failed to update name', variant:'destructive' }); }
    finally { setSavingName(false); }
  };

  const handleRegenerateIdentity = async () => {
    setIsRegenerating(true);
    try { await regenerateIdentity(); toast({ title:'New pirate identity assigned!' }); }
    catch { toast({ title:'Failed to get new identity', variant:'destructive' }); }
    finally { setIsRegenerating(false); }
  };

  const ls = (key: string, val: string) => { try { localStorage.setItem(key, val); } catch {} };
  const displayAvatarUrl = identity?.imagePath || null;
  const displayName = editName || identity?.name || 'Guest Pirate';

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes sfadeup { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .s-fu { animation: sfadeup 0.45s ease both; }

        .sav-wrap { position:relative; cursor:pointer; display:inline-block; flex-shrink:0; }
        .sav-overlay { position:absolute; inset:0; border-radius:9999px; background:rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s; }
        .sav-wrap:hover .sav-overlay { opacity:1; }
        @media (hover:none) { .sav-overlay { opacity:0.65; } }

        .s-btn { height:36px; padding:0 14px; border-radius:8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.65); font-size:0.8rem; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:background 0.2s,color 0.2s,border-color 0.2s; white-space:nowrap; -webkit-tap-highlight-color:transparent; }
        .s-btn:hover { background:rgba(255,255,255,0.09); color:#fff; border-color:rgba(255,255,255,0.18); }
        .s-btn:active { background:rgba(255,255,255,0.13); }
        .s-btn:disabled { opacity:0.38; cursor:not-allowed; }
        .s-btn-full { width:100%; justify-content:center; height:40px; }

        .s-dbtn { height:40px; padding:0 14px; border-radius:8px; width:100%; justify-content:center; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); color:#ef4444; font-size:0.8rem; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:6px; transition:background 0.2s,border-color 0.2s; -webkit-tap-highlight-color:transparent; }
        .s-dbtn:hover { background:rgba(239,68,68,0.14); border-color:rgba(239,68,68,0.35); }
        .s-dbtn:active { background:rgba(239,68,68,0.2); }

        .s-ico { width:28px; height:28px; border-radius:7px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); color:rgba(255,255,255,0.55); cursor:pointer; flex-shrink:0; display:inline-flex; align-items:center; justify-content:center; transition:background 0.15s,color 0.15s; -webkit-tap-highlight-color:transparent; }
        .s-ico:hover { background:rgba(255,255,255,0.12); color:#fff; }
        .s-ico:active { background:rgba(255,255,255,0.18); }
        .s-ico:disabled { opacity:0.3; cursor:not-allowed; }

        @media (max-width:640px) {
          .s-btn { height:44px; font-size:0.85rem; }
          .s-btn-full { height:48px; }
          .s-dbtn { height:48px; font-size:0.85rem; }
          .s-ico { width:36px; height:36px; border-radius:9px; }
        }

        .ghost-inp { background:rgba(255,255,255,0.06) !important; border:1px solid rgba(255,255,255,0.1) !important; color:#fff !important; height:34px; font-size:0.875rem; border-radius:8px; min-width:0; flex:1; }
        .ghost-inp:focus { border-color:rgba(255,255,255,0.25) !important; outline:none; }
        @media (max-width:640px) { .ghost-inp { height:44px; font-size:1rem; } }

        .pirate-tile { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:12px; padding:14px 16px; display:flex; align-items:center; gap:14px; margin-bottom:14px; }

        .settings-grid { display:grid; grid-template-columns:1fr 1fr; gap:0 48px; align-items:start; width:100%; max-width:900px; }
        .settings-grid > div { min-width:0; }
        @media (max-width:720px) { .settings-grid { grid-template-columns:1fr; gap:0; } }

        .settings-col-right { border-left:1px solid rgba(255,255,255,0.06); padding-left:48px; }
        @media (max-width:720px) { .settings-col-right { border-left:none; padding-left:0; border-top:1px solid rgba(255,255,255,0.08); padding-top:28px; margin-top:4px; } }

        .quality-row { display:flex; align-items:center; justify-content:space-between; gap:16px; }
        @media (max-width:420px) { .quality-row { flex-direction:column; align-items:stretch; gap:10px; } .quality-select { width:100% !important; } }

        .settings-pad { padding:88px 24px 72px; }
        @media (max-width:640px) { .settings-pad { padding:60px 16px 88px; } }
        @media (max-width:380px) { .settings-pad { padding:52px 12px 88px; } }

        .settings-h1 { font-size:2rem; font-weight:800; color:#fff; letter-spacing:-0.03em; margin:0; }
        @media (max-width:640px) { .settings-h1 { font-size:1.55rem; } }

        .settings-bg { position:fixed; inset:0; z-index:0; pointer-events:none; overflow:hidden; }
        .settings-bg::before { content:''; position:absolute; top:-10%; left:50%; transform:translateX(-50%); width:70%; height:55%; background:radial-gradient(ellipse at center,rgba(139,92,246,0.13) 0%,rgba(109,40,217,0.06) 45%,transparent 75%); filter:blur(40px); }
        .settings-bg::after  { content:''; position:absolute; bottom:-5%; right:5%; width:45%; height:40%; background:radial-gradient(ellipse at center,rgba(168,85,247,0.09) 0%,transparent 70%); filter:blur(50px); }
        .settings-grain { position:fixed; inset:0; z-index:1; pointer-events:none; opacity:0.038; background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E"); background-repeat:repeat; background-size:180px; mix-blend-mode:overlay; }
        .settings-outer { position:relative; z-index:2; min-height:100vh; }
        .settings-footer { width:100%; max-width:900px; margin-top:56px; padding-top:28px; border-top:1px solid rgba(255,255,255,0.06); text-align:center; }
        @media (max-width:640px) { .settings-footer { margin-top:36px; } }
      `}</style>

      <ConfirmDialog open={confirmClearAll} title="Clear All Data?" description="This will remove your watchlist, history, preferences, and all other local data. Your account and cloud data remain safe."
        onConfirm={() => { try { Object.keys(localStorage).forEach(k => { if (!k.includes('supabase.auth.token')) localStorage.removeItem(k); }); } catch {} setConfirmClearAll(false); toast({ title:'All data cleared' }); }}
        onCancel={() => setConfirmClearAll(false)} />
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleAvatarChange} />

      <div className="settings-bg" aria-hidden="true"/>
      <div className="settings-grain" aria-hidden="true"/>

      <div className="settings-outer">
        <div className="settings-pad" style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>

          <div className="s-fu" style={{ width:'100%', maxWidth:'900px', marginBottom:'40px', textAlign:'center' }}>
            <h1 className="settings-h1">Settings</h1>
            <p style={{ fontSize:'0.875rem', color:'rgba(255,255,255,0.35)', margin:'6px 0 0' }}>Manage your account, playback and preferences</p>
          </div>

          <div className="s-fu settings-grid">

            {/* LEFT */}
            <div>
              {user && (
                <Section>
                  <SectionLabel icon={<Camera size={13}/>} label="Profile" />
                  <div style={{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'16px', minWidth:0 }}>
                    <div className="sav-wrap" onClick={() => fileInputRef.current?.click()}>
                      <Avatar style={{ width:64, height:64, border:'2px solid rgba(255,255,255,0.12)', display:'block' }}>
                        {displayAvatarUrl && <AvatarImage src={displayAvatarUrl} alt={displayName} style={{ objectFit:'cover' }}/>}
                        <AvatarFallback style={{ background:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.55)', fontSize:'1.1rem' }}>{getInitials(displayName)}</AvatarFallback>
                      </Avatar>
                      <div className="sav-overlay">
                        {avatarUploading ? <div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.7s linear infinite' }}/> : <Upload size={15} color="#fff"/>}
                      </div>
                    </div>
                    <div style={{ flex:1, minWidth:0, overflow:'hidden' }}>
                      {isEditingName ? (
                        <div style={{ display:'flex', alignItems:'center', gap:'5px', width:'100%', minWidth:0 }}>
                          <Input value={editName} onChange={e => setEditName(e.target.value)} className="ghost-inp" autoFocus onKeyDown={e => { if(e.key==='Enter') handleSaveName(); if(e.key==='Escape') setIsEditingName(false); }}/>
                          <button className="s-ico" onClick={handleSaveName} disabled={savingName||!editName.trim()}><Check size={12}/></button>
                          <button className="s-ico" onClick={() => setIsEditingName(false)}><X size={12}/></button>
                        </div>
                      ) : (
                        <div style={{ display:'flex', alignItems:'center', gap:'6px', minWidth:0, overflow:'hidden' }}>
                          <span style={{ fontWeight:600, fontSize:'0.95rem', color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, minWidth:0 }}>{displayName}</span>
                          <button className="s-ico" onClick={() => setIsEditingName(true)} style={{ width:22, height:22, flexShrink:0 }}><Pencil size={10}/></button>
                        </div>
                      )}
                      <p style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.36)', marginTop:'3px', marginBottom:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.email}</p>
                      <p style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.2)', marginTop:'2px', marginBottom:0 }}>Tap avatar to upload · Max 5MB</p>
                    </div>
                  </div>
                  <button className="s-btn s-btn-full" onClick={() => fileInputRef.current?.click()} disabled={avatarUploading}>
                    {avatarUploading ? <><div style={{ width:12, height:12, border:'2px solid rgba(255,255,255,0.2)', borderTopColor:'rgba(255,255,255,0.7)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }}/>Uploading…</> : <><Upload size={13}/>Upload Profile Picture</>}
                  </button>
                </Section>
              )}

              <Section>
                <SectionLabel icon={<User size={13}/>} label="Pirate Identity" />
                {!user && <p style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.3)', marginBottom:'14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', padding:'10px 14px', lineHeight:1.5 }}>Sign in to save your identity across devices</p>}
                <div className="pirate-tile">
                  <Avatar style={{ width:50, height:50, flexShrink:0, border:'2px solid rgba(255,255,255,0.1)' }}>
                    {identity?.imagePath && <AvatarImage src={identity.imagePath} alt={identity.name} style={{ objectFit:'cover' }}/>}
                    <AvatarFallback style={{ background:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.55)' }}>{identity?getInitials(identity.name):'GP'}</AvatarFallback>
                  </Avatar>
                  <div style={{ flex:1, minWidth:0, overflow:'hidden' }}>
                    <p style={{ fontWeight:700, fontSize:'0.9rem', color:'#fff', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{identity?.name||'Guest Pirate'}</p>
                    <p style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.38)', marginTop:'2px', marginBottom:0 }}>{identity?.role||'Pirate'}</p>
                    {identity?.bounty && <p style={{ fontSize:'0.72rem', color:'var(--primary,#a78bfa)', fontWeight:600, marginTop:'3px', marginBottom:0 }}>💰 {identity.bounty}</p>}
                  </div>
                </div>
                <button className="s-btn s-btn-full" onClick={handleRegenerateIdentity} disabled={isRegenerating}>
                  <RefreshCw size={13} style={{ animation:isRegenerating?'spin 1s linear infinite':'none', flexShrink:0 }}/>
                  {isRegenerating?'Getting new identity…':'Get New Pirate Identity'}
                </button>
                <WatchActivity />
              </Section>
            </div>

            {/* RIGHT */}
            <div className="settings-col-right">
              <Section>
                <SectionLabel icon={<Zap size={13}/>} label="Playback" />
                <SettingRow label="Autoplay next episode" description="Automatically start the next episode when one ends"
                  right={<Switch checked={autoplay} onCheckedChange={v => { setAutoplay(v); ls('pirateone_autoplay',String(v)); toast({ title:v?'Autoplay enabled':'Autoplay disabled' }); }}/>} />
                <div style={{ padding:'13px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                  <div className="quality-row">
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:'0.875rem', fontWeight:500, color:'#fff', margin:0 }}>Default Quality</p>
                      <p style={{ fontSize:'0.73rem', color:'rgba(255,255,255,0.35)', marginTop:'2px', marginBottom:0 }}>Preferred streaming resolution</p>
                    </div>
                    <Select value={defaultQuality} onValueChange={v => { setDefaultQuality(v); ls('pirateone_quality',v); toast({ title:'Default quality updated' }); }}>
                      <SelectTrigger className="quality-select" style={{ width:108, height:36, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', color:'#fff', fontSize:'0.84rem', flexShrink:0 }}>
                        <SelectValue/>
                      </SelectTrigger>
                      <SelectContent>
                        {['auto','1080p','720p','480p','360p'].map(q => <SelectItem key={q} value={q}>{q==='auto'?'Auto':q}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Section>

              <Section>
                <SectionLabel icon={<Bell size={13}/>} label="Notifications" />
                <SettingRow label="Welcome notification"
                  description={showWelcomeNotification?'Will show on your next visit':'Already dismissed — click Reset to show again'}
                  right={<button className="s-btn" onClick={() => { try { localStorage.removeItem('pirateone_welcome_shown'); } catch {} setShowWelcomeNotification(true); toast({ title:'Welcome notification reset' }); }} disabled={showWelcomeNotification}>Reset</button>} />
              </Section>

              <Section>
                <SectionLabel icon={<Shield size={13}/>} label="Privacy & Data" />
                <SettingRow label="Save watch history" description="Track what you've watched for resume & recommendations"
                  right={<Switch checked={saveWatchHistory} onCheckedChange={v => { setSaveWatchHistory(v); ls('pirateone_save_history',String(v)); toast({ title:v?'Watch history enabled':'Watch history disabled' }); }}/>} />
                <div style={{ marginTop:'18px', display:'flex', flexDirection:'column', gap:'8px' }}>
                  <button className="s-btn s-btn-full" onClick={() => { try { localStorage.removeItem('pirateone_watchlist'); } catch {} toast({ title:'Watchlist cleared' }); }}><Trash2 size={13}/>Clear Watchlist</button>
                  <button className="s-dbtn" onClick={() => setConfirmClearAll(true)}><Trash2 size={13}/>Clear All Data</button>
                </div>
              </Section>
            </div>
          </div>

          <div className="settings-footer">
            <p style={{ fontSize:'0.85rem', color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', fontWeight:500, margin:0 }}>⚓ &nbsp;PirateOne · Your data stays yours</p>
          </div>

        </div>
      </div>
    </>
  );
};

export default Settings;
