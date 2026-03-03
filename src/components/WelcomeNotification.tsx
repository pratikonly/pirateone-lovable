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
const NOTIFICATION_VERSION = '2'; // bumped so existing users see updated notice

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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="w-5 h-5 text-primary" />
            Welcome to PirateOne
          </DialogTitle>
          <DialogDescription className="text-base">
            A few things to know before you start watching
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          {/* Click twice tip */}
          <div className="flex flex-col gap-2 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <MousePointerClick className="w-4 h-4 text-yellow-400" />
              </div>
              <h4 className="font-semibold text-sm text-yellow-300">Click Twice to Interact</h4>
            </div>
            <p className="text-sm text-muted-foreground pl-12">
              The video player may require{' '}
              <span className="text-foreground font-medium">two clicks</span> — the first
              activates it, the second performs the action (play, pause, fullscreen, etc).
            </p>
          </div>

          {/* Ad blocking tip */}
          <div className="flex flex-col gap-2 p-4 rounded-lg bg-muted/50 border border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <h4 className="font-semibold text-sm">Ad Protection Active</h4>
            </div>
            <p className="text-sm text-muted-foreground pl-12">
              PirateOne automatically blocks ad redirects and popups. Your data is stored{' '}
              <span className="text-foreground font-medium">privately on your device</span> — no tracking.
            </p>
          </div>

          {/* VPN tip */}
          <div className="flex flex-col gap-2 p-4 rounded-lg bg-muted/50 border border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Globe className="w-4 h-4 text-primary" />
              </div>
              <h4 className="font-semibold text-sm">Content Not Loading?</h4>
            </div>
            <p className="text-sm text-muted-foreground pl-12">
              If content fails to load, try using a{' '}
              <span className="text-foreground font-medium">VPN</span>. Some content may be
              geo-restricted in your region.
            </p>
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
