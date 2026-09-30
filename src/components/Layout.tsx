import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import WelcomeNotification from './WelcomeNotification';
import BackdropLayer from './BackdropLayer';

const Layout = () => {
  const navigate = useNavigate();

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

      <Sidebar />
      <Header />

      <main className="pt-0 min-h-screen relative z-10 lg:ml-60">
        <Outlet />
      </main>


      <WelcomeNotification />
    </div>
  );
};

export default Layout;
