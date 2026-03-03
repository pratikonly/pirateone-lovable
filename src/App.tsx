import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import Library from "./pages/Library";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import Watch from "./pages/Watch";
import Sports from "./pages/Sports";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import PirateCorner from "./components/PirateBrawl";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <BackdropProvider>
          <PirateIdentityProvider>
            <Toaster />
            <Sonner />
            <PirateCorner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route element={<Layout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/movies" element={<Movies />} />
                  <Route path="/series" element={<Series />} />
                  <Route path="/anime" element={<Anime />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/watchlist" element={<Watchlist />} />
                  <Route path="/library" element={<Library />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/help" element={<Help />} />
                  <Route path="/sports" element={<Sports />} />
                  <Route path="/watch/:type/:id" element={<Watch />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </PirateIdentityProvider>
        </BackdropProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
