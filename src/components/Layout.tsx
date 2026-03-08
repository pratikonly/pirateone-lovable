import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import WelcomeNotification from './WelcomeNotification';
import BackdropLayer from './BackdropLayer';
import AIChatbot from './AIChatbot';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Global Blurred Backdrop Background - Fixed, not scrollable */}
      <BackdropLayer />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

      <main className="lg:ml-60 pt-0 min-h-screen relative z-10">
        <Outlet />
      </main>

      <WelcomeNotification />
      <AIChatbot />
    </div>
  );
};

export default Layout;
