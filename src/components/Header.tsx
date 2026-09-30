import { Settings, RefreshCw, LogOut, Search, X, Loader2, UserRound, Home, Clapperboard, Tv, Sparkles, Radio } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { getInitials } from '@/lib/pirateIdentity';
import { usePirateIdentity } from '@/contexts/PirateIdentityContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { searchMulti, Movie, getImageUrl } from '@/lib/tmdb';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import pirateOneLogo from '@/assets/pirateone-logo.png';

const Header = () => {
  const [scrollMode, setScrollMode] = useState<'top' | 'floating'>(
    () => (typeof window !== 'undefined' && window.scrollY > 1 ? 'floating' : 'top')
  );
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);

  // Global search overlay
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { identity, isLoading, isRegenerating, regenerateIdentity } = usePirateIdentity();
  const { user, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrollMode(window.scrollY > 1 ? 'floating' : 'top');
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
  const navItems = [
    { label: 'Home', path: '/', Icon: Home },
    { label: 'Movies', path: '/movies', Icon: Clapperboard },
    { label: 'Series', path: '/series', Icon: Tv },
    { label: 'Anime', path: '/anime', Icon: Sparkles },
  ];

  const displayName = profileName || identity?.name || 'Guest Pirate';
  const displayAvatarUrl = profileAvatarUrl || identity?.imagePath || null;

  return (
    <>
      <header className={cn(
        'site-header z-[60] flex w-full items-center justify-between transition-all duration-300 ease-out',
        scrollMode === 'floating'
          ? 'fixed inset-x-3 top-3 mx-auto h-14 w-[calc(100%-1.5rem)] max-w-6xl border border-amber-100/20 bg-zinc-950/95 px-3 shadow-[0_10px_34px_rgba(0,0,0,0.55)] sm:inset-x-4 sm:w-[calc(100%-2rem)] sm:px-5'
          : 'relative h-20 border-b border-white/10 bg-zinc-950 px-3 sm:h-[92px] sm:px-8'
      )}>
        <NavLink to="/" aria-label="PirateOne home" className="flex h-full shrink-0 items-center">
          {scrollMode === 'floating' ? (
            <img src="/favicon.svg" alt="PirateOne" className="h-8 w-8 object-contain brightness-0 invert" />
          ) : (
            <img
              src={pirateOneLogo}
              alt="PirateOne"
              className="h-auto max-h-[4.5rem] w-[min(46vw,13rem)] object-contain brightness-0 invert"
            />
          )}
        </NavLink>

        <nav aria-label="Main navigation" className="mx-5 hidden min-w-0 flex-1 items-center justify-center gap-3 md:flex lg:gap-5">
          {navItems.map((item) => {
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
            const Icon = item.Icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'inline-flex items-center justify-center gap-2 border-b-2 border-transparent px-1 py-3 text-[10px] font-semibold uppercase tracking-[0.09em] transition-colors duration-200 lg:text-[11px]',
                  isActive
                    ? 'border-amber-300 text-amber-100'
                    : 'text-zinc-400 hover:border-amber-300/60 hover:text-white'
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </NavLink>
            );
          })}
          <button
            type="button"
            onClick={() => toast.info('The Live section is not available yet.')}
            title="Live"
            className="flex shrink-0 items-center gap-2 border-b-2 border-transparent px-1 py-3 text-[10px] font-semibold uppercase tracking-[0.09em] text-zinc-400 transition-colors duration-200 hover:border-amber-300/60 hover:text-white lg:text-[11px]"
          >
            <Radio className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
            Live
          </button>
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            onClick={openSearch}
            className="flex h-9 w-9 items-center justify-center rounded-sm border border-white/15 bg-white/[0.03] text-zinc-300 transition-colors duration-200 hover:border-amber-200/50 hover:bg-white/[0.06] hover:text-amber-100 sm:h-10 sm:w-10"
            aria-label="Search"
          >
            <Search className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
          </button>

          {!user ? (
            <button
              type="button"
              onClick={() => navigate('/auth?mode=signup')}
              aria-label="Create an account"
              title="Sign up"
              className="flex h-9 w-9 items-center justify-center rounded-sm border border-amber-100/45 bg-amber-100 text-zinc-950 transition-colors duration-200 hover:bg-white sm:h-10 sm:w-10"
            >
              <UserRound className="h-[18px] w-[18px]" />
            </button>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                aria-label="Open profile menu"
                aria-expanded={userDropdownOpen}
                className="overflow-hidden rounded-sm border border-white/20 transition-colors duration-200 hover:border-amber-200/60"
              >
                <Avatar className="h-8 w-8 rounded-sm sm:h-10 sm:w-10">
                  {displayAvatarUrl ? <AvatarImage src={displayAvatarUrl} alt={displayName} className="object-cover" /> : null}
                  <AvatarFallback className="rounded-sm bg-zinc-800 text-zinc-100 text-xs">
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
      {scrollMode === 'floating' && <div className="site-header-spacer h-20 sm:h-[92px]" aria-hidden="true" />}

      <nav
        aria-label="Mobile main navigation"
        className="mobile-bottom-nav fixed inset-x-2 bottom-2 z-[65] mx-auto grid max-w-md grid-cols-5 gap-1 rounded-md border border-white/60 bg-[#f5f0e6]/95 p-1.5 text-zinc-600 shadow-[0_12px_40px_rgba(0,0,0,0.42)] backdrop-blur-2xl md:hidden"
      >
        {navItems.map(({ label, path, Icon }) => {
          const isActive = path === '/'
            ? location.pathname === '/'
            : location.pathname === path || location.pathname.startsWith(`${path}/`);
          return (
            <NavLink
              key={path}
              to={path}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-sm py-1.5 text-[9px] font-medium transition-colors',
                isActive
                  ? 'bg-[#e8ddca] text-[#382b1b] shadow-sm'
                  : 'text-[#756b5e] hover:bg-black/[0.04] hover:text-[#2f261c]'
              )}
            >
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          );
        })}
        <button
          type="button"
          onClick={() => toast.info('The Live section is not available yet.')}
          aria-label="Live"
          className="flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-sm py-1.5 text-[9px] font-medium text-[#756b5e] transition-colors hover:bg-black/[0.04] hover:text-[#2f261c]"
        >
          <Radio className="h-[18px] w-[18px]" aria-hidden="true" />
          <span>Live</span>
        </button>
      </nav>

      {/* ── Global Search Overlay ── */}
      {searchOpen && (
        <div className="fixed inset-0 z-[80] flex flex-col items-center" style={{ paddingTop: '18vh' }}>
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
