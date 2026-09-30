import { Suspense, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import WelcomeNotification from './WelcomeNotification';
import BackdropLayer from './BackdropLayer';
import DisclaimerFooter from './DisclaimerFooter';

const PageLoadingFallback = () => (
  <section className="min-h-[40vh] px-4 py-8 lg:px-6" role="status" aria-label="Loading page content">
    <div className="mx-auto max-w-7xl animate-pulse">
      <div className="h-8 w-48 rounded bg-muted/60" />
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index} className="space-y-2">
            <div className="aspect-[2/3] rounded-lg bg-muted/50" />
            <div className="h-3 rounded bg-muted/50" />
            <div className="h-2.5 w-2/3 rounded bg-muted/40" />
          </div>
        ))}
      </div>
    </div>
    <span className="sr-only">Loading page content…</span>
  </section>
);

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();

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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const pathname = location.pathname;
  const isHome = pathname === '/';
  const hasSharedPageLayout = [
    '/',
    '/movies',
    '/series',
    '/anime',
    '/search',
    '/watchlist',
    '/settings',
    '/help',
    '/live',
    '/sports',
  ].includes(pathname) || /^\/(watch\/[^/]+\/[^/]+|live\/[^/]+)$/.test(pathname);
  const showDisclaimerFooter = ['/', '/movies', '/series', '/anime'].includes(pathname);
  const footerSpacing = isHome ? 'pb-6' : 'pb-4 lg:pb-6';

  return (
    <div className={`relative overflow-x-hidden ${hasSharedPageLayout ? 'min-h-screen bg-background' : ''}`}>
      {hasSharedPageLayout && <BackdropLayer />}

      <main className={`relative z-10 ${hasSharedPageLayout ? `min-h-screen ${isHome ? 'pt-0' : 'pt-6 sm:pt-8'}` : ''}`}>
        <div key={pathname} className={`page-transition ${isHome ? 'home-page-transition' : ''}`}>
          <Suspense fallback={<PageLoadingFallback />}>
            <Outlet />
          </Suspense>
        </div>
        <div className={showDisclaimerFooter ? footerSpacing : 'hidden'} aria-hidden={!showDisclaimerFooter}>
          <DisclaimerFooter />
        </div>
      </main>

      {hasSharedPageLayout && <WelcomeNotification />}
    </div>
  );
};

export default Layout;
