import { Button } from './ui/button';
import { Menu, Settings, RefreshCw, LogIn, LogOut, Eye } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { getInitials } from '@/lib/pirateIdentity';
import { usePirateIdentity } from '@/contexts/PirateIdentityContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface HeaderProps {
  onMenuToggle: () => void;
}

const Header = ({ onMenuToggle }: HeaderProps) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [visitorCount, setVisitorCount] = useState<number>(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { identity, isLoading, isRegenerating, regenerateIdentity } = usePirateIdentity();
  const { user, signOut } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setProfileAvatarUrl(null);
        setProfileName(null);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('custom_avatar_url, pirate_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Failed to load profile for header:', error);
        return;
      }

      setProfileAvatarUrl(data?.custom_avatar_url || null);
      setProfileName(data?.pirate_name || null);
    };

    loadProfile();
  }, [user, userDropdownOpen]);

  // Track and load global visitor count
  useEffect(() => {
    if (!user) return;
    const trackVisit = async () => {
      // Increment this user's count
      const { data: existing } = await supabase
        .from('visitor_count')
        .select('count')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('visitor_count')
          .update({ count: (existing.count || 0) + 1, last_visited_at: new Date().toISOString() })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('visitor_count')
          .insert({ user_id: user.id, count: 1 });
      }

      // Fetch global total across all users
      const { data: allCounts } = await supabase
        .from('visitor_count')
        .select('count');
      const total = (allCounts || []).reduce((sum, row) => sum + (row.count || 0), 0);
      setVisitorCount(total);
    };
    trackVisit();
  }, [user]);

  const handleSettingsClick = () => {
    setUserDropdownOpen(false);
    navigate('/settings');
  };

  const handleRegenerateIdentity = async () => {
    try {
      await regenerateIdentity();
    } catch (error) {
      console.error('Failed to regenerate identity:', error);
    }
  };

  const handleSignOut = async () => {
    setUserDropdownOpen(false);
    await signOut();
    navigate('/');
  };

  const displayName = profileName || identity?.name || 'Guest Pirate';
  const displayAvatarUrl = profileAvatarUrl || identity?.imagePath || null;

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-60 h-14 z-40 flex items-center justify-between px-4 lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9" onClick={onMenuToggle}>
        <Menu className="w-5 h-5" />
      </Button>
      <div className="hidden lg:block flex-1" />
      <div className="lg:hidden flex-1" />

      <div className="flex items-center gap-2 sm:gap-3">
        {!user ? (
          <Button variant="outline" size="sm" onClick={() => navigate('/auth')} className="gap-1.5">
            <LogIn className="w-4 h-4" />
            Sign In
          </Button>
        ) : (
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 border border-border text-xs text-muted-foreground">
                <Eye className="w-3 h-3" />
                <span>{visitorCount}</span>
              </div>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="rounded-full border-2 border-primary/50 hover:border-primary transition-colors overflow-hidden"
              >
                <Avatar className="w-9 h-9">
                  {displayAvatarUrl ? (
                    <AvatarImage src={displayAvatarUrl} alt={displayName} className="object-cover" />
                  ) : null}
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                    {isLoading ? '...' : getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </div>

            {userDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-popover border border-border rounded-lg shadow-lg z-50 py-2">
                <div className="px-3 py-2 border-b border-border">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      {displayAvatarUrl ? (
                        <AvatarImage src={displayAvatarUrl} alt={displayName} className="object-cover" />
                      ) : null}
                      <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                        {getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                  {identity?.bounty && (
                    <p className="text-xs text-primary mt-2 font-medium">💰 {identity.bounty}</p>
                  )}
                </div>

                <button
                  onClick={handleRegenerateIdentity}
                  disabled={isRegenerating}
                  className="w-full px-3 py-2 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                  <span>{isRegenerating ? 'Getting new identity...' : 'Get New Identity'}</span>
                </button>

                <button
                  onClick={handleSettingsClick}
                  className="w-full px-3 py-2 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>

                <button
                  onClick={handleSignOut}
                  className="w-full px-3 py-2 flex items-center gap-2 text-sm text-destructive hover:bg-muted/50 transition-colors border-t border-border mt-1 pt-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;

