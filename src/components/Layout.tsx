import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import WelcomeNotification from './WelcomeNotification';
import BackdropLayer from './BackdropLayer';

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

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <BackdropLayer />

      <main className={`relative z-10 min-h-screen ${location.pathname === '/' ? 'pt-0' : 'pt-6 sm:pt-8'}`}>
        <div key={`${location.pathname}${location.search}`} className="page-transition">
          <Outlet />
        </div>
      </main>


      <WelcomeNotification />
    </div>
  );
};

export default Layout;
