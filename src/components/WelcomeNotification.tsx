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
import { AlertTriangle, Globe, MousePointerClick } from 'lucide-react';

const NOTIFICATION_KEY = 'pirateone_welcome_shown';
const NOTIFICATION_VERSION = '5';

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
      <DialogContent className="sm:max-w-xl">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Card — Ads & Redirects */}
            <div className="flex flex-col gap-3 p-4 rounded-lg bg-muted/50 border border-border/50">
              <div className="flex items-center gap-3 md:flex-col md:items-start">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <MousePointerClick className="w-5 h-5 text-primary" />
                </div>
                <h4 className="font-semibold text-sm md:mt-2">Ads & Redirects</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                While watching or tapping on the video player, a new tab or ad may open. Just{' '}
                <span className="text-foreground font-medium">close it and come back</span> to
                PirateOne to continue watching.
              </p>
            </div>


            {/* Card — VPN */}
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
