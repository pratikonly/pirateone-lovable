import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import WelcomeNotification from './WelcomeNotification';
import BackdropLayer from './BackdropLayer';
import { cn } from '@/lib/utils';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('sidebar_collapsed') === '1'; } catch { return false; }
  });
  const navigate = useNavigate();

  const toggleDesktop = () => {
    setDesktopCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('sidebar_collapsed', next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  };


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isEditable =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        (e.target as HTMLElement)?.isContentEditable;
      if (isEditable) return;

      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        navigate('/search');
      }
      if (e.key === 'Escape') {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <BackdropLayer />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} desktopCollapsed={desktopCollapsed} />
      <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} sidebarCollapsed={desktopCollapsed} />

      {/* Desktop sidebar collapse toggle */}
      <button
        onClick={toggleDesktop}
        aria-label={desktopCollapsed ? 'Open sidebar' : 'Close sidebar'}
        className={cn(
          'hidden lg:flex fixed top-1/2 -translate-y-1/2 z-50 items-center justify-center w-7 h-16 rounded-r-lg',
          'bg-zinc-900/80 border border-l-0 border-border backdrop-blur-sm text-muted-foreground hover:text-primary transition-all duration-300',
          desktopCollapsed ? 'left-0' : 'left-60'
        )}
      >
        {desktopCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
      </button>

      <main className={cn('pt-0 min-h-screen relative z-10 transition-[margin] duration-300', desktopCollapsed ? 'lg:ml-0' : 'lg:ml-60')}>
        <Outlet />
      </main>


      <WelcomeNotification />
    </div>
  );
};

export default Layout;
