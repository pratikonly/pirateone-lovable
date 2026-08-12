import { Button } from './ui/button';
import { Menu, Settings, RefreshCw, LogIn, LogOut, Search, X, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { getInitials } from '@/lib/pirateIdentity';
import { usePirateIdentity } from '@/contexts/PirateIdentityContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { searchMulti, Movie, getImageUrl } from '@/lib/tmdb';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onMenuToggle: () => void;
  sidebarCollapsed?: boolean;
}

const Header = ({ onMenuToggle, sidebarCollapsed = false }: HeaderProps) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [visitorCount, setVisitorCount] = useState<number>(0);
  const [showVisitorCount, setShowVisitorCount] = useState(false);
  const [secretInput, setSecretInput] = useState('');
  const [isListeningForCode, setIsListeningForCode] = useState(false);

  // Global search overlay
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(searchQuery, 300);

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
      if (!user) { setProfileAvatarUrl(null); setProfileName(null); return; }
      const { data, error } = await supabase
        .from('profiles').select('custom_avatar_url, pirate_name').eq('user_id', user.id).maybeSingle();
      if (error) { console.error('Failed to load profile for header:', error); return; }
      setProfileAvatarUrl(data?.custom_avatar_url || null);
      setProfileName(data?.pirate_name || null);
    };
    loadProfile();
  }, [user, userDropdownOpen]);

  useEffect(() => {
    const trackVisit = async () => {
      try { await supabase.rpc('increment_site_visits'); } catch (e) { console.error(e); }
      const { data } = await supabase.from('site_visits').select('total_count').eq('id', 1).maybeSingle();
      setVisitorCount(data?.total_count || 0);
    };
    trackVisit();
  }, []);

  useEffect(() => {
    if (!isListeningForCode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const newInput = secretInput + e.key;
      if ('12418'.startsWith(newInput)) {
        setSecretInput(newInput);
        if (newInput === '12418') { setShowVisitorCount(true); setIsListeningForCode(false); setSecretInput(''); }
      } else { setSecretInput(''); setIsListeningForCode(false); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isListeningForCode, secretInput]);

  // Global search fetch
  useEffect(() => {
    if (!searchOpen) return;
    if (debouncedSearch.length < 2) { setSearchResults([]); return; }
    let cancelled = false;
    setSearchLoading(true);
    searchMulti(debouncedSearch).then(results => {
      if (!cancelled) { setSearchResults(results); setSearchLoading(false); }
    }).catch(() => { if (!cancelled) setSearchLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedSearch, searchOpen]);

  // Open search overlay
  const openSearch = useCallback(() => {
    setSearchOpen(true);
    setSearchQuery('');
    setSearchResults([]);
    setTimeout(() => searchInputRef.current?.focus(), 80);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable;
      if (e.key === 'Escape') { closeSearch(); }
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !isEditable && !searchOpen) {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeSearch, openSearch, searchOpen]);

  const handleSettingsClick = () => { setUserDropdownOpen(false); navigate('/settings'); };
  const handleRegenerateIdentity = async () => { try { await regenerateIdentity(); } catch (e) { console.error(e); } };
  const handleSignOut = async () => { setUserDropdownOpen(false); await signOut(); navigate('/'); };

  const displayName = profileName || identity?.name || 'Guest Pirate';
  const displayAvatarUrl = profileAvatarUrl || identity?.imagePath || null;

  return (
    <>
      <header className={cn('fixed top-0 right-0 left-0 h-14 z-40 flex items-center justify-between px-4 lg:px-6 transition-[left] duration-300', sidebarCollapsed ? 'lg:left-8' : 'lg:left-60')}>
        <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9" onClick={onMenuToggle}>
          <Menu className="w-5 h-5" />
        </Button>
        <div className="hidden lg:block flex-1" />
        <div className="lg:hidden flex-1" />

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Global search icon — LEFT of visitor count */}
          <button
            onClick={openSearch}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-muted/50 border border-border hover:bg-muted hover:border-primary/40 transition-all duration-200 text-muted-foreground hover:text-foreground"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {showVisitorCount && (
            <div className="px-2 py-1 rounded-full bg-muted/50 border border-border text-xs text-muted-foreground select-none">
              <span>{visitorCount} visits</span>
            </div>
          )}
          {!showVisitorCount && (
            <div
              className="px-2 py-1 rounded-full bg-muted/50 border border-border text-xs text-muted-foreground select-none cursor-default"
              onClick={() => { if (!showVisitorCount) setIsListeningForCode(true); }}
            >
              <span>{visitorCount} visits</span>
            </div>
          )}

          {!user ? (
            <Button variant="outline" size="sm" onClick={() => navigate('/auth')} className="gap-1.5">
              <LogIn className="w-4 h-4" />
              Sign In
            </Button>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="rounded-full border-2 border-primary/50 hover:border-primary transition-colors overflow-hidden"
              >
                <Avatar className="w-9 h-9">
                  {displayAvatarUrl ? <AvatarImage src={displayAvatarUrl} alt={displayName} className="object-cover" /> : null}
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                    {isLoading ? '...' : getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-popover border border-border rounded-lg shadow-lg z-50 py-2">
                  <div className="px-3 py-2 border-b border-border">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        {displayAvatarUrl ? <AvatarImage src={displayAvatarUrl} alt={displayName} className="object-cover" /> : null}
                        <AvatarFallback className="bg-muted text-muted-foreground text-sm">{getInitials(displayName)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                    {identity?.bounty && <p className="text-xs text-primary mt-2 font-medium">💰 {identity.bounty}</p>}
                  </div>
                  <button onClick={handleRegenerateIdentity} disabled={isRegenerating}
                    className="w-full px-3 py-2 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50">
                    <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                    <span>{isRegenerating ? 'Getting new identity...' : 'Get New Identity'}</span>
                  </button>
                  <button onClick={handleSettingsClick}
                    className="w-full px-3 py-2 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                  <button onClick={handleSignOut}
                    className="w-full px-3 py-2 flex items-center gap-2 text-sm text-destructive hover:bg-muted/50 transition-colors border-t border-border mt-1 pt-2">
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Global Search Overlay ── */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center" style={{ paddingTop: '18vh' }}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={closeSearch} />

          {/* Search panel */}
          <div className="relative w-full max-w-2xl mx-4 animate-in fade-in-0 zoom-in-95 duration-200">
            {/* Input row */}
            <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-3 shadow-2xl ring-1 ring-primary/30">
              {searchLoading
                ? <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
                : <Search className="w-5 h-5 text-zinc-400 shrink-0" />}
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search movies, TV shows, anime…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-base text-white placeholder:text-zinc-500 outline-none"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearchResults([]); searchInputRef.current?.focus(); }}
                  className="text-zinc-500 hover:text-white transition-colors shrink-0">
                  <X className="w-4 h-4" />
                </button>
              )}
              <button onClick={closeSearch} className="text-zinc-500 hover:text-white transition-colors shrink-0 ml-1">
                <span className="text-xs font-medium px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-600">Esc</span>
              </button>
            </div>

            {/* Hint */}
            {!searchQuery && (
              <p className="text-center text-xs text-zinc-600 mt-3">Type to search · Press <kbd className="bg-zinc-800 px-1 rounded">Esc</kbd> to close</p>
            )}

            {/* Results */}
            {searchQuery.length >= 2 && (
              <div className="mt-3 bg-zinc-900/95 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl max-h-[52vh] overflow-y-auto">
                {searchLoading && searchResults.length === 0 ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="py-10 text-center text-zinc-500 text-sm">No results for "{searchQuery}"</div>
                ) : (
                  <div className="p-3">
                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2 px-1">{searchResults.length} results</p>
                    <div className="grid gap-1">
                      {searchResults.slice(0, 8).map(item => {
                        const title = item.title || item.name || 'Untitled';
                        const year = (item.release_date || item.first_air_date)?.split('-')[0] || '';
                        const type = item.media_type === 'tv' ? 'TV' : 'Movie';
                        const poster = item.poster_path ? getImageUrl(item.poster_path, 'w200') : null;
                        return (
                          <button
                            key={item.id}
                            onClick={() => { navigate(`/watch/${item.media_type || 'movie'}/${item.id}`); closeSearch(); }}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-800 transition-colors text-left group w-full"
                          >
                            <div className="w-9 h-[54px] rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                              {poster
                                ? <img src={poster} alt={title} className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center text-[8px] text-zinc-600">N/A</div>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate group-hover:text-primary transition-colors">{title}</p>
                              <p className="text-xs text-zinc-500">{type}{year ? ` · ${year}` : ''}</p>
                            </div>
                            <span className="text-[10px] text-zinc-600 shrink-0">
                              {item.vote_average?.toFixed(1)} ★
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {searchResults.length > 8 && (
                      <button
                        onClick={() => { navigate(`/search?q=${encodeURIComponent(searchQuery)}`); closeSearch(); }}
                        className="w-full mt-2 py-2 text-xs text-primary hover:text-primary/80 transition-colors text-center"
                      >
                        See all {searchResults.length} results →
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
