import { useState, useEffect, useRef } from 'react';
import { Bell, Eye, EyeOff, Trash2, User, RefreshCw, Upload, Camera, Pencil, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/pirateIdentity';
import { usePirateIdentity } from '@/contexts/PirateIdentityContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const Settings = () => {
  const { toast } = useToast();
  const { identity, isRegenerating, regenerateIdentity } = usePirateIdentity();
  const { user } = useAuth();

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Name editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Settings state
  const [showWelcomeNotification, setShowWelcomeNotification] = useState(true);
  const [autoplay, setAutoplay] = useState(true);
  const [defaultQuality, setDefaultQuality] = useState('auto');
  const [saveWatchHistory, setSaveWatchHistory] = useState(true);

  // Load existing custom avatar from profiles table
  useEffect(() => {
    const loadAvatar = async () => {
      if (!user) return;
      try {
      const { data, error } = await supabase
          .from('profiles')
          .select('custom_avatar_url, pirate_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error loading avatar:', error);
          return;
        }
        if (data?.custom_avatar_url) {
          setAvatarUrl(data.custom_avatar_url);
        }
        if (data?.pirate_name) {
          setEditName(data.pirate_name);
        }
      } catch (err) {
        console.error('Failed to load avatar:', err);
      }
    };
    loadAvatar();
  }, [user]);

  // Load local settings
  useEffect(() => {
    const savedWelcome = localStorage.getItem('pirateone_welcome_shown');
    setShowWelcomeNotification(!savedWelcome);

    const savedAutoplay = localStorage.getItem('pirateone_autoplay');
    if (savedAutoplay !== null) setAutoplay(savedAutoplay === 'true');

    const savedQuality = localStorage.getItem('pirateone_quality');
    if (savedQuality) setDefaultQuality(savedQuality);

    const savedHistory = localStorage.getItem('pirateone_save_history');
    if (savedHistory !== null) setSaveWatchHistory(savedHistory === 'true');
  }, []);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please select an image file', variant: 'destructive' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Image must be under 5MB', variant: 'destructive' });
      return;
    }

    setAvatarUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `${user.id}/avatar.${ext}`;

      // Upload to Supabase storage bucket "avatars"
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Save to profiles table using correct column: custom_avatar_url
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ custom_avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (dbError) throw dbError;

      setAvatarUrl(publicUrl);
      toast({ title: 'Profile picture updated!' });
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      toast({
        title: 'Upload failed',
        description: err.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Feature fix: use fresh identity from context after regeneration
  const handleRegenerateIdentity = async () => {
    try {
      await regenerateIdentity();
      toast({ title: 'New pirate identity assigned!' });
    } catch {
      toast({ title: 'Failed to get new identity', variant: 'destructive' });
    }
  };

  const handleResetWelcomeNotification = () => {
    localStorage.removeItem('pirateone_welcome_shown');
    setShowWelcomeNotification(true);
    toast({ title: 'Welcome notification reset', description: 'You will see it on next visit' });
  };

  const handleAutoplayChange = (enabled: boolean) => {
    setAutoplay(enabled);
    localStorage.setItem('pirateone_autoplay', String(enabled));
    toast({ title: 'Autoplay updated' });
  };

  const handleQualityChange = (quality: string) => {
    setDefaultQuality(quality);
    localStorage.setItem('pirateone_quality', quality);
    toast({ title: 'Default quality updated' });
  };

  const handleHistoryChange = (enabled: boolean) => {
    setSaveWatchHistory(enabled);
    localStorage.setItem('pirateone_save_history', String(enabled));
    toast({ title: enabled ? 'Watch history enabled' : 'Watch history disabled' });
  };

  const handleClearWatchlist = () => {
    localStorage.removeItem('pirateone_watchlist');
    toast({ title: 'Watchlist cleared', description: 'Your watchlist has been cleared' });
  };

  const handleClearAllData = () => {
    const keysToKeep = ['supabase.auth.token'];
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      if (!keysToKeep.some(k => key.includes(k))) {
        localStorage.removeItem(key);
      }
    });
    toast({ title: 'All data cleared', description: 'All local data has been cleared (except login)' });
  };

  // Display priority: uploaded custom avatar > pirate identity image > initials
  const displayAvatarUrl = avatarUrl || identity?.imagePath || null;
  const displayName = identity?.name || 'Guest Pirate';

  return (
    <div className="p-4 lg:p-8 pt-20 max-w-2xl">
      <h1 className="text-3xl lg:text-4xl font-bold mb-8">Settings</h1>

      <div className="space-y-6">

        {/* Profile Picture — only shown when signed in */}
        {user && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                Profile Picture
              </CardTitle>
              <CardDescription>Upload a custom profile picture</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {/* Clickable avatar with hover overlay */}
                <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                  <Avatar className="w-20 h-20 border-2 border-primary/50">
                    {displayAvatarUrl ? (
                      <AvatarImage src={displayAvatarUrl} alt={displayName} className="object-cover" />
                    ) : null}
                    <AvatarFallback className="bg-muted text-muted-foreground text-xl">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <Upload className="w-5 h-5 text-white" />
                  </div>

                  {/* Upload spinner */}
                  {avatarUploading && (
                    <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0"
                        disabled={savingName || !editName.trim()}
                        onClick={async () => {
                          if (!user || !editName.trim()) return;
                          setSavingName(true);
                          try {
                            const { error } = await supabase
                              .from('profiles')
                              .update({ pirate_name: editName.trim() })
                              .eq('user_id', user.id);
                            if (error) throw error;
                            toast({ title: 'Name updated!' });
                            setIsEditingName(false);
                          } catch {
                            toast({ title: 'Failed to update name', variant: 'destructive' });
                          } finally {
                            setSavingName(false);
                          }
                        }}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setIsEditingName(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate">{editName || displayName}</p>
                      <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => setIsEditingName(true)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click avatar to upload · Max 5MB · JPG, PNG, WebP
                  </p>
                </div>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarChange}
              />

              <Button
                variant="outline"
                size="sm"
                onClick={handleAvatarClick}
                disabled={avatarUploading}
                className="w-full"
              >
                {avatarUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Profile Picture
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pirate Identity */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Pirate Identity
            </CardTitle>
            <CardDescription>Your guest identity on PirateOne</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 border-2 border-primary/50">
                {identity?.imagePath ? (
                  <AvatarImage src={identity.imagePath} alt={identity.name} className="object-cover" />
                ) : null}
                <AvatarFallback className="bg-muted text-muted-foreground text-lg">
                  {identity ? getInitials(identity.name) : 'GP'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium text-foreground text-lg">{identity?.name || 'Guest Pirate'}</p>
                <p className="text-sm text-muted-foreground">{identity?.role || 'Pirate'}</p>
                {identity?.bounty && (
                  <p className="text-sm text-primary font-medium mt-1">💰 {identity.bounty}</p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerateIdentity}
              disabled={isRegenerating}
              className="w-full"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
              {isRegenerating ? 'Getting new identity...' : 'Get New Pirate Identity'}
            </Button>
          </CardContent>
        </Card>

        {/* Playback */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Playback
            </CardTitle>
            <CardDescription>Configure video playback settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Autoplay next episode</Label>
                <p className="text-xs text-muted-foreground">Automatically play the next episode</p>
              </div>
              <Switch checked={autoplay} onCheckedChange={handleAutoplayChange} />
            </div>
            <div className="space-y-2">
              <Label>Default Quality</Label>
              <Select value={defaultQuality} onValueChange={handleQualityChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="1080p">1080p</SelectItem>
                  <SelectItem value="720p">720p</SelectItem>
                  <SelectItem value="480p">480p</SelectItem>
                  <SelectItem value="360p">360p</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notifications
            </CardTitle>
            <CardDescription>Manage notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Welcome notification</Label>
                <p className="text-xs text-muted-foreground">
                  {showWelcomeNotification ? 'Will show on next visit' : 'Already dismissed'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetWelcomeNotification}
                disabled={showWelcomeNotification}
              >
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <EyeOff className="w-5 h-5 text-primary" />
              Privacy
            </CardTitle>
            <CardDescription>Manage your data and privacy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Save watch history</Label>
                <p className="text-xs text-muted-foreground">Remember what you watch</p>
              </div>
              <Switch checked={saveWatchHistory} onCheckedChange={handleHistoryChange} />
            </div>
            <div className="pt-4 border-t border-border space-y-2">
              <Button variant="outline" size="sm" className="w-full" onClick={handleClearWatchlist}>
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Watchlist
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-destructive hover:text-destructive"
                onClick={handleClearAllData}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All Local Data
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default Settings;




