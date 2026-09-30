import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import WelcomeNotification from './WelcomeNotification';
import BackdropLayer from './BackdropLayer';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

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
      <Button
        onClick={toggleDesktop}
        aria-label={desktopCollapsed ? 'Open sidebar' : 'Close sidebar'}
        title={desktopCollapsed ? 'Open sidebar' : 'Close sidebar'}
        variant="outline"
        size="icon"
        className={cn(
          'group hidden lg:flex fixed top-1/2 -translate-y-1/2 z-[60] h-10 w-10 rounded-full',
          'bg-card/95 border-border shadow-lg backdrop-blur-md text-muted-foreground hover:text-foreground hover:bg-accent',
          'focus-visible:ring-2 focus-visible:ring-ring transition-[left,background-color,color,transform] duration-300',
          desktopCollapsed ? 'left-3' : 'left-[220px]'
        )}
      >
        {desktopCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          {desktopCollapsed ? 'Open sidebar' : 'Close sidebar'}
        </span>
      </Button>

      <main className={cn('pt-0 min-h-screen relative z-10 transition-[margin] duration-300', desktopCollapsed ? 'lg:ml-0' : 'lg:ml-60')}>
        <Outlet />
      </main>


      <WelcomeNotification />
    </div>
  );
};

export default Layout;
