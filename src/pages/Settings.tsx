import { useState, useEffect, useRef } from 'react';
import {
  Bell, Eye, EyeOff, Trash2, User, RefreshCw, Upload,
  Camera, Pencil, Check, X, Shield, Zap, ChevronRight,
  AlertTriangle
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

/* ── Confirm Dialog ── */
const ConfirmDialog = ({
  open, title, description, onConfirm, onCancel,
}: { open: boolean; title: string; description: string; onConfirm: () => void; onCancel: () => void }) => {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div style={{
        background: '#111', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px', padding: '28px 24px', maxWidth: '380px', width: '100%',
        boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={18} style={{ color: '#ef4444' }} />
          </div>
          <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', margin: 0 }}>{title}</h3>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginBottom: '24px', lineHeight: 1.5 }}>{description}</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onCancel} style={{ flex: 1, height: 40, borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{ flex: 1, height: 40, borderRadius: '8px', background: '#ef4444', border: 'none', color: '#fff', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}>
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Section wrapper ── */
const Section = ({ children }: { children: React.ReactNode }) => (
  <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '32px', marginBottom: '32px' }}>
    {children}
  </div>
);

/* ── Section label ── */
const SectionLabel = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
    <span style={{ color: 'rgba(255,255,255,0.3)' }}>{icon}</span>
    <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>{label}</span>
    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)', marginLeft: '8px' }} />
  </div>
);

/* ── Row: toggle or action row ── */
const SettingRow = ({
  label, description, right, danger = false,
}: { label: string; description?: string; right: React.ReactNode; danger?: boolean }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: '16px', padding: '14px 0',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  }}>
    <div style={{ minWidth: 0 }}>
      <p style={{ fontSize: '0.9rem', fontWeight: 500, color: danger ? '#ef4444' : '#fff', margin: 0 }}>{label}</p>
      {description && <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{description}</p>}
    </div>
    <div style={{ flexShrink: 0 }}>{right}</div>
  </div>
);

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
    const loadAvatar = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('custom_avatar_url, pirate_name')
          .eq('user_id', user.id)
          .maybeSingle();
        if (error) return;
        if (data?.custom_avatar_url) setAvatarUrl(data.custom_avatar_url);
        if (data?.pirate_name) setEditName(data.pirate_name);
      } catch {}
    };
    loadAvatar();
  }, [user]);

  useEffect(() => {
    try {
      const savedWelcome = localStorage.getItem('pirateone_welcome_shown');
      setShowWelcomeNotification(!savedWelcome);
      const savedAutoplay = localStorage.getItem('pirateone_autoplay');
      if (savedAutoplay !== null) setAutoplay(savedAutoplay === 'true');
      const savedQuality = localStorage.getItem('pirateone_quality');
      if (savedQuality) setDefaultQuality(savedQuality);
      const savedHistory = localStorage.getItem('pirateone_save_history');
      if (savedHistory !== null) setSaveWatchHistory(savedHistory === 'true');
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
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;
      const { error: dbError } = await supabase.from('profiles').update({ custom_avatar_url: publicUrl, updated_at: new Date().toISOString() }).eq('user_id', user.id);
      if (dbError) throw dbError;
      setAvatarUrl(publicUrl);
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
    } catch {
      toast({ title: 'Failed to update name', variant: 'destructive' });
    } finally {
      setSavingName(false);
    }
  };

  const handleRegenerateIdentity = async () => {
    try { await regenerateIdentity(); toast({ title: 'New pirate identity assigned!' }); }
    catch { toast({ title: 'Failed to get new identity', variant: 'destructive' }); }
  };

  const handleAutoplayChange = (v: boolean) => { setAutoplay(v); try { localStorage.setItem('pirateone_autoplay', String(v)); } catch {} toast({ title: v ? 'Autoplay enabled' : 'Autoplay disabled' }); };
  const handleQualityChange = (v: string) => { setDefaultQuality(v); try { localStorage.setItem('pirateone_quality', v); } catch {} toast({ title: 'Default quality updated' }); };
  const handleHistoryChange = (v: boolean) => { setSaveWatchHistory(v); try { localStorage.setItem('pirateone_save_history', String(v)); } catch {} toast({ title: v ? 'Watch history enabled' : 'Watch history disabled' }); };
  const handleResetWelcome = () => { try { localStorage.removeItem('pirateone_welcome_shown'); } catch {} setShowWelcomeNotification(true); toast({ title: 'Welcome notification reset' }); };
  const handleClearWatchlist = () => { try { localStorage.removeItem('pirateone_watchlist'); } catch {} toast({ title: 'Watchlist cleared' }); };
  const handleClearAllData = () => {
    try {
      Object.keys(localStorage).forEach(key => { if (!key.includes('supabase.auth.token')) localStorage.removeItem(key); });
    } catch {}
    setConfirmClearAll(false);
    toast({ title: 'All local data cleared' });
  };

  const displayAvatarUrl = avatarUrl || identity?.imagePath || null;
  const displayName = editName || identity?.name || 'Guest Pirate';

  return (
    <>
      <style>{`
        .settings-avatar-wrap { position: relative; cursor: pointer; }
        .settings-avatar-overlay {
          position: absolute; inset: 0; border-radius: 9999px;
          background: rgba(0,0,0,0.55);
          display: flex; align-items: center; justify-content: center;
          opacity: 0; transition: opacity 0.2s;
        }
        .settings-avatar-wrap:hover .settings-avatar-overlay { opacity: 1; }

        .outline-btn {
          height: 36px; padding: 0 16px; border-radius: 8px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.7);
          font-size: 0.8rem; font-weight: 600;
          cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
          transition: background 0.2s, border-color 0.2s, color 0.2s;
          white-space: nowrap;
        }
        .outline-btn:hover { background: rgba(255,255,255,0.09); color: #fff; border-color: rgba(255,255,255,0.2); }
        .outline-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .danger-btn {
          height: 36px; padding: 0 16px; border-radius: 8px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          color: #ef4444;
          font-size: 0.8rem; font-weight: 600;
          cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
          transition: background 0.2s, border-color 0.2s;
          white-space: nowrap;
        }
        .danger-btn:hover { background: rgba(239,68,68,0.14); border-color: rgba(239,68,68,0.4); }

        .pirate-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          padding: 16px;
          display: flex; align-items: center; gap: 14px;
        }

        .ghost-input {
          background: rgba(255,255,255,0.06) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          color: #fff !important;
          height: 34px; font-size: 0.875rem;
          border-radius: 8px;
        }
        .ghost-input:focus { border-color: rgba(255,255,255,0.25) !important; }

        .icon-btn {
          width: 30px; height: 30px; border-radius: 7px;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.6); cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center;
          transition: background 0.15s, color 0.15s; flex-shrink: 0;
        }
        .icon-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
        .icon-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        @keyframes settingsFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .s-fu { animation: settingsFadeUp 0.5s ease both; }
      `}</style>

      <ConfirmDialog
        open={confirmClearAll}
        title="Clear All Local Data?"
        description="This will remove your watchlist, history, preferences, and all other local data. Your account and cloud data remain safe."
        onConfirm={handleClearAllData}
        onCancel={() => setConfirmClearAll(false)}
      />

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleAvatarChange} />

      <div style={{
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '88px 16px 64px',
      }}>
        {/* Page header */}
        <div className="s-fu" style={{ width: '100%', maxWidth: '600px', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', margin: 0 }}>Settings</h1>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>Manage your account, playback and preferences</p>
        </div>

        {/* Main content */}
        <div className="s-fu" style={{ width: '100%', maxWidth: '600px' }}>

          {/* ── PROFILE ── */}
          {user && (
            <Section>
              <SectionLabel icon={<Camera size={13} />} label="Profile" />

              {/* Avatar + name row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div className="settings-avatar-wrap" onClick={() => fileInputRef.current?.click()}>
                  <Avatar style={{ width: 72, height: 72, border: '2px solid rgba(255,255,255,0.12)' }}>
                    {displayAvatarUrl && <AvatarImage src={displayAvatarUrl} alt={displayName} style={{ objectFit: 'cover' }} />}
                    <AvatarFallback style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: '1.2rem' }}>
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="settings-avatar-overlay">
                    {avatarUploading
                      ? <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                      : <Upload size={16} color="#fff" />
                    }
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {isEditingName ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="ghost-input"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setIsEditingName(false); }}
                      />
                      <button className="icon-btn" onClick={handleSaveName} disabled={savingName || !editName.trim()}>
                        <Check size={13} />
                      </button>
                      <button className="icon-btn" onClick={() => setIsEditingName(false)}>
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '1rem', color: '#fff' }}>{displayName}</span>
                      <button className="icon-btn" onClick={() => setIsEditingName(true)} style={{ width: 24, height: 24 }}>
                        <Pencil size={11} />
                      </button>
                    </div>
                  )}
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.38)', marginTop: '3px' }}>{user.email}</p>
                  <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.22)', marginTop: '2px' }}>
                    Click avatar to upload · Max 5MB · JPG, PNG, WebP
                  </p>
                </div>

                <button className="outline-btn" onClick={() => fileInputRef.current?.click()} disabled={avatarUploading}>
                  {avatarUploading ? <><div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'rgba(255,255,255,0.7)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Uploading</> : <><Upload size={13} />Upload</>}
                </button>
              </div>
            </Section>
          )}

          {/* ── PIRATE IDENTITY ── */}
          <Section>
            <SectionLabel icon={<User size={13} />} label="Pirate Identity" />
            {!user && (
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginBottom: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '10px 14px' }}>
                Sign in to save your identity across devices
              </p>
            )}
            <div className="pirate-card" style={{ marginBottom: '14px' }}>
              <Avatar style={{ width: 52, height: 52, flexShrink: 0, border: '2px solid rgba(255,255,255,0.1)' }}>
                {identity?.imagePath && <AvatarImage src={identity.imagePath} alt={identity.name} style={{ objectFit: 'cover' }} />}
                <AvatarFallback style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
                  {identity ? getInitials(identity.name) : 'GP'}
                </AvatarFallback>
              </Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', margin: 0 }}>{identity?.name || 'Guest Pirate'}</p>
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{identity?.role || 'Pirate'}</p>
                {identity?.bounty && <p style={{ fontSize: '0.75rem', color: 'var(--primary, #a78bfa)', fontWeight: 600, marginTop: '4px' }}>💰 {identity.bounty}</p>}
              </div>
              <button className="outline-btn" onClick={handleRegenerateIdentity} disabled={isRegenerating}>
                <RefreshCw size={13} style={{ animation: isRegenerating ? 'spin 1s linear infinite' : 'none' }} />
                {isRegenerating ? 'Getting...' : 'Randomize'}
              </button>
            </div>
          </Section>

          {/* ── PLAYBACK ── */}
          <Section>
            <SectionLabel icon={<Zap size={13} />} label="Playback" />
            <SettingRow
              label="Autoplay next episode"
              description="Automatically start the next episode when one ends"
              right={<Switch checked={autoplay} onCheckedChange={handleAutoplayChange} />}
            />
            <div style={{ padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div>
                  <p style={{ fontSize: '0.9rem', fontWeight: 500, color: '#fff', margin: 0 }}>Default Quality</p>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>Preferred streaming resolution</p>
                </div>
                <Select value={defaultQuality} onValueChange={handleQualityChange}>
                  <SelectTrigger style={{ width: 110, height: 36, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['auto', '1080p', '720p', '480p', '360p'].map(q => (
                      <SelectItem key={q} value={q}>{q === 'auto' ? 'Auto' : q}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Section>

          {/* ── NOTIFICATIONS ── */}
          <Section>
            <SectionLabel icon={<Bell size={13} />} label="Notifications" />
            <SettingRow
              label="Welcome notification"
              description={showWelcomeNotification ? 'Will show on your next visit' : 'Already dismissed — click Reset to show again'}
              right={
                <button className="outline-btn" onClick={handleResetWelcome} disabled={showWelcomeNotification}>
                  Reset
                </button>
              }
            />
          </Section>

          {/* ── PRIVACY ── */}
          <Section>
            <SectionLabel icon={<Shield size={13} />} label="Privacy & Data" />
            <SettingRow
              label="Save watch history"
              description="Track what you've watched for resume & recommendations"
              right={<Switch checked={saveWatchHistory} onCheckedChange={handleHistoryChange} />}
            />
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button className="outline-btn" onClick={handleClearWatchlist} style={{ width: '100%', justifyContent: 'center', height: 40 }}>
                <Trash2 size={14} />
                Clear Watchlist
              </button>
              <button className="danger-btn" onClick={() => setConfirmClearAll(true)} style={{ width: '100%', justifyContent: 'center', height: 40 }}>
                <Trash2 size={14} />
                Clear All Local Data
              </button>
            </div>
          </Section>

          {/* Footer note */}
          <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'rgba(255,255,255,0.18)', letterSpacing: '0.04em' }}>
            ⚓ PirateOne · Your data stays yours
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
};

export default Settings;
