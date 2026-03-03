import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Globe, Shield, MousePointerClick } from 'lucide-react';

const NOTIFICATION_KEY = 'pirateone_welcome_shown';
const NOTIFICATION_VERSION = '3';

const WelcomeNotification = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const shownVersion = localStorage.getItem(NOTIFICATION_KEY);
    if (shownVersion !== NOTIFICATION_VERSION) {
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(NOTIFICATION_KEY, NOTIFICATION_VERSION);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-2xl lg:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="w-5 h-5 text-primary" />
            Important Notice
          </DialogTitle>
          <DialogDescription className="text-base">
            Please read these instructions for the best experience
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* 3 columns on md+, stacked on mobile — same layout as original */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Card 1 — Click Twice */}
            <div className="flex flex-col gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <div className="flex items-center gap-3 md:flex-col md:items-start">
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                  <MousePointerClick className="w-5 h-5 text-yellow-400" />
                </div>
                <h4 className="font-semibold text-sm text-yellow-300 md:mt-2">Click Twice to Interact</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                The video player may need{' '}
                <span className="text-foreground font-medium">two clicks</span> — the first
                activates it, the second performs your action (play, pause, fullscreen, etc).
              </p>
            </div>

            {/* Card 2 — Ad Protection */}
            <div className="flex flex-col gap-3 p-4 rounded-lg bg-muted/50 border border-border/50">
              <div className="flex items-center gap-3 md:flex-col md:items-start">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <h4 className="font-semibold text-sm md:mt-2">Ad Protection Active</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                PirateOne automatically blocks ad redirects and popups. Your data is stored{' '}
                <span className="text-foreground font-medium">privately on your device</span> — no tracking.
              </p>
            </div>

            {/* Card 3 — VPN */}
            <div className="flex flex-col gap-3 p-4 rounded-lg bg-muted/50 border border-border/50">
              <div className="flex items-center gap-3 md:flex-col md:items-start">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Globe className="w-5 h-5 text-primary" />
                </div>
                <h4 className="font-semibold text-sm md:mt-2">Content Not Loading?</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                If nothing loads or content fails to play, try using a{' '}
                <span className="text-foreground font-medium">VPN</span>. Some content may be
                geo-restricted in your region.
              </p>
            </div>

          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleClose} className="w-full">
            Got it, let's watch!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeNotification;
