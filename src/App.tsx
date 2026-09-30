import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { BackdropProvider } from "./contexts/BackdropContext";
import { PirateIdentityProvider } from "./contexts/PirateIdentityContext";
import { AuthProvider } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import Movies from "./pages/Movies";
import Series from "./pages/Series";
import Anime from "./pages/Anime";
import Search from "./pages/Search";
import Watchlist from "./pages/Watchlist";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import Watch from "./pages/Watch";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import ServerStatus from "./pages/ServerStatus";
import ShortcutLoadingOverlay from "./components/ShortcutLoadingOverlay";
import FloatingQuickActions from "./components/FloatingQuickActions";
import Sports from "./pages/Sports";
import Header from "./components/Header";
import BrandFooter from "./components/BrandFooter";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <BackdropProvider>
            <PirateIdentityProvider>
              <Toaster />
              <Sonner />
              <SpeedInsights />
               <ShortcutLoadingOverlay />
              <BrowserRouter>
                <Header />
                <FloatingQuickActions />
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route element={<Layout />}>
                    <Route path="/" element={<Index />} />
                    <Route path="/movies" element={<Movies />} />
                    <Route path="/series" element={<Series />} />
                    <Route path="/anime" element={<Anime />} />
                    <Route path="/search" element={<Search />} />
                    <Route path="/watchlist" element={<Watchlist />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/help" element={<Help />} />
                    <Route path="/sports" element={<Sports />} />
                    <Route path="/watch/:type/:id" element={<Watch />} />
                  </Route>
                  <Route path="/server" element={<ServerStatus />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <BrandFooter />
              </BrowserRouter>
            </PirateIdentityProvider>
        </BackdropProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
