import { useState } from 'react';
import emailjs from '@emailjs/browser';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Star, Send, HelpCircle, Lightbulb, CheckCircle,
  Sparkles, Loader2, Shield, Database, Server, Download,
  ChevronDown, ChevronUp, Anchor, Tv, Film, Zap,
  BookMarked, History, Library, User, Camera, Search, TrendingUp,
  Award, ThumbsUp, MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

const Help = () => {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleSubmitFeedback = async () => {
    if (rating === 0) { toast({ title: 'Rating Required', description: 'Please select a rating before submitting.', variant: 'destructive' }); return; }
    if (!feedback.trim()) { toast({ title: 'Feedback Required', description: 'Please write your feedback before submitting.', variant: 'destructive' }); return; }
    if (!email.trim()) { toast({ title: 'Email Required', description: 'Please provide your email address.', variant: 'destructive' }); return; }
    setIsSubmitting(true);
    if (EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY) {
      try {
        const ratingText = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][rating];
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, { from_name: name || 'Anonymous', from_email: email, rating: `${rating}/5 (${ratingText})`, message: feedback, to_name: 'PirateOne Team' }, EMAILJS_PUBLIC_KEY);
        toast({ title: 'Thank You! ✨', description: 'Your feedback has been sent successfully!' });
        setRating(0); setFeedback(''); setEmail(''); setName('');
      } catch {
        toast({ title: 'Sending Failed', description: 'Could not send feedback. Saved locally instead.', variant: 'destructive' });
        saveToLocalStorage();
      }
    } else {
      saveToLocalStorage();
      toast({ title: 'Thank You!', description: 'Your feedback has been saved locally.' });
    }
    setIsSubmitting(false);
  };

  const saveToLocalStorage = () => {
    const stored = JSON.parse(localStorage.getItem('pirateone_feedback') || '[]');
    stored.push({ name: name || 'Anonymous', rating, feedback: feedback.trim(), email: email.trim(), createdAt: new Date().toISOString() });
    localStorage.setItem('pirateone_feedback', JSON.stringify(stored));
    setRating(0); setFeedback(''); setEmail(''); setName('');
  };

  const faqs = [
    { question: 'Why do I need to click twice on the video player?', answer: 'The first click activates the player and our ad protection layer. The second click performs your intended action (play, pause, fullscreen, etc). This is by design to block ad redirects.' },
    { question: 'Why is nothing loading on the website?', answer: "If content isn't loading, try using a VPN. Some content may be geo-restricted in your region. A VPN will help bypass these restrictions." },
    { question: 'How do I add movies to my watchlist?', answer: 'Click on any movie or series, then click the bookmark icon to add it to your watchlist. You can access your watchlist from the sidebar.' },
    { question: 'Why is the video quality low?', answer: 'Video quality depends on the source and your internet connection. Try switching to a different server in the Server selector on the watch page.' },
    { question: 'Can I download movies for offline viewing?', answer: 'Yes! Use the Download button on the watch page to grab content for offline viewing. Quality options are available before downloading.' },
    { question: 'Is my watchlist saved across devices?', answer: 'If you create an account and sign in, your watchlist syncs to the cloud. As a guest, data is stored locally in your browser only.' },
  ];

  const tips = [
    'Click once to activate the player, then click again to play/pause',
    "Use a VPN if content doesn't load in your region",
    "Try switching servers if one doesn't work — each has different content availability",
    'Check your internet connection if videos buffer frequently',
    'Sign in to sync your watchlist and library across devices',
  ];

  return (
    <div className="min-h-screen px-4 pt-20 pb-16 max-w-4xl mx-auto">

      {/* PAGE TITLE */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-1">
          <Anchor className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Help & Feedback</h1>
        </div>
        <p className="text-muted-foreground pl-10">Everything you need to sail smoothly on PirateOne</p>
      </div>

      {/* ─── SECTION 1: FEEDBACK FORM ─── */}
      <section className="mb-14">
        <div className="flex items-center gap-2 mb-7">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Rate & Share Feedback</h2>
        </div>

        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-3">How would you rate your experience?</p>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} onClick={() => setRating(star)} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} className="transition-transform hover:scale-110 active:scale-95">
                <Star className={cn('w-10 h-10 transition-all duration-150', (hoverRating || rating) >= star ? 'fill-yellow-500 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]' : 'text-muted-foreground/30')} />
              </button>
            ))}
            {rating > 0 && <span className="ml-3 text-sm font-semibold text-yellow-500">{['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][rating]}</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Name <span className="text-muted-foreground/50">(optional)</span></Label>
            <Input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="bg-background/60 border-border/40 focus:border-primary/60 h-11" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Email <span className="text-destructive">*</span></Label>
            <Input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-background/60 border-border/40 focus:border-primary/60 h-11" />
          </div>
        </div>

        <div className="mb-5 space-y-1.5">
          <Label className="text-sm text-muted-foreground">Your Feedback</Label>
          <Textarea placeholder="Tell us what you think about PirateOne. What do you love? What can we improve?" value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={4} className="bg-background/60 border-border/40 focus:border-primary/60 resize-none" />
        </div>

        <Button onClick={handleSubmitFeedback} disabled={isSubmitting} className="h-11 px-8 font-semibold">
          {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : <><Send className="w-4 h-4 mr-2" />Submit Feedback</>}
        </Button>
      </section>

      <div className="border-t border-border/30 mb-14" />

      {/* ─── SECTION 2: HERO FEATURES ─── */}
      <section className="mb-14">
        <div className="flex items-center gap-2 mb-8">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">What's On Board</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
                <Server className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-foreground">17 Streaming Servers</h3>
                  <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full font-semibold border border-primary/20">NEW</span>
                </div>
                <p className="text-xs text-muted-foreground">Switch instantly if one goes down</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-3 pl-12">Every watch page lets you switch between 17 different servers on the fly. If one is slow or broken, another always has you covered.</p>
            <div className="pl-12 flex flex-wrap gap-1.5">
              {Array.from({ length: 17 }, (_, i) => (
                <span key={i} className="text-xs bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-md font-mono">S{i + 1}</span>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center flex-shrink-0">
                <Download className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-foreground">Download Any Show</h3>
                  <span className="text-xs bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-semibold border border-emerald-500/20">NEW</span>
                </div>
                <p className="text-xs text-muted-foreground">Offline viewing, your quality</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-3 pl-12">Download movies and episodes directly from the watch page. Pick your preferred quality before downloading — no subscription needed.</p>
            <div className="pl-12 flex flex-wrap gap-1.5">
              {['480p', '720p', '1080p', '4K'].map(q => (
                <span key={q} className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md font-mono">{q}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-border/30 mb-14" />

      {/* ─── SECTION 3: ALL FEATURES ─── */}
      <section className="mb-14">
        <div className="flex items-center gap-2 mb-8">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">All Features</h2>
        </div>

        {[
          {
            label: 'Streaming', color: 'text-primary', iconBg: 'bg-primary/10', iconBorder: 'border-primary/20', iconColor: 'text-primary',
            features: [
              { icon: <Film className="w-4 h-4" />, name: 'Movies Streaming', desc: 'Thousands of movies in HD quality' },
              { icon: <Tv className="w-4 h-4" />, name: 'TV Series Streaming', desc: 'Complete series with all seasons & episodes' },
              { icon: <Sparkles className="w-4 h-4" />, name: 'Anime Streaming', desc: 'Subbed & dubbed options available' },
              { icon: <Zap className="w-4 h-4" />, name: 'HD Quality', desc: 'Stream up to 1080p HD' },
              { icon: <Film className="w-4 h-4" />, name: 'Trailer Previews', desc: 'Watch official trailers before streaming' },
            ]
          },
          {
            label: 'Privacy & Security', color: 'text-emerald-400', iconBg: 'bg-emerald-500/10', iconBorder: 'border-emerald-500/20', iconColor: 'text-emerald-400',
            features: [
              { icon: <Shield className="w-4 h-4" />, name: 'Ad Redirect Blocking', desc: 'Blocks popups & new-tab ad redirects automatically while you watch' },
              { icon: <Database className="w-4 h-4" />, name: 'Data Stored Securely', desc: 'Your watchlist, history & preferences are encrypted and stored securely — no tracking, no data sold' },
              { icon: <User className="w-4 h-4" />, name: 'Browse Without or With Account', desc: 'Watch freely as a guest, or sign in to sync everything across all your devices' },
            ]
          },
          {
            label: 'User Features', color: 'text-blue-400', iconBg: 'bg-blue-500/10', iconBorder: 'border-blue-500/20', iconColor: 'text-blue-400',
            features: [
              { icon: <History className="w-4 h-4" />, name: 'Watch History', desc: 'Track watched content, syncs to cloud when signed in' },
              { icon: <BookMarked className="w-4 h-4" />, name: 'Watchlist', desc: 'Save movies & shows to watch later' },
              { icon: <Library className="w-4 h-4" />, name: 'Library Tracking', desc: 'Mark as Watching, Completed, or Dropped' },
              { icon: <Anchor className="w-4 h-4" />, name: 'Pirate Identity', desc: 'Fun randomized pirate persona — regenerate anytime' },
              { icon: <Camera className="w-4 h-4" />, name: 'Profile Picture', desc: 'Upload your own profile picture from Settings' },
            ]
          },
          {
            label: 'Discovery', color: 'text-purple-400', iconBg: 'bg-purple-500/10', iconBorder: 'border-purple-500/20', iconColor: 'text-purple-400',
            features: [
              { icon: <Search className="w-4 h-4" />, name: 'Search', desc: 'Find any movie, TV show, or anime by title' },
              { icon: <TrendingUp className="w-4 h-4" />, name: 'Trending Content', desc: "Discover what's hot this week" },
              { icon: <Award className="w-4 h-4" />, name: 'Top Rated & Popular', desc: 'Browse highest rated and most popular titles' },
              { icon: <ThumbsUp className="w-4 h-4" />, name: 'Recommendations', desc: 'Similar content suggestions on every watch page' },
              { icon: <MessageSquare className="w-4 h-4" />, name: 'Community Reviews', desc: 'Real audience reviews powered by TMDB shown on every movie and show page' },
            ]
          },
        ].map((group) => (
          <div key={group.label} className="mb-10 last:mb-0">
            <p className={cn('text-xs font-bold uppercase tracking-widest mb-5', group.color)}>{group.label}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-10">
              {group.features.map(f => (
                <div key={f.name} className="flex items-start gap-3">
                  <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border', group.iconBg, group.iconBorder, group.iconColor)}>{f.icon}</div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground">{f.name}</span>
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <div className="border-t border-border/30 mb-14" />

      {/* ─── SECTION 4: TIPS ─── */}
      <section className="mb-14">
        <div className="flex items-center gap-2 mb-6">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          <h2 className="text-xl font-bold text-foreground">Quick Tips</h2>
        </div>
        <div className="space-y-4">
          {tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-4">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-500/15 text-yellow-500 border border-yellow-500/25 flex items-center justify-center text-xs font-bold mt-0.5">{i + 1}</span>
              <p className="text-sm text-muted-foreground leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-border/30 mb-14" />

      {/* ─── SECTION 5: FAQ ─── */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <HelpCircle className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Frequently Asked Questions</h2>
        </div>
        <div className="divide-y divide-border/30">
          {faqs.map((faq, i) => (
            <div key={i}>
              <button className="w-full flex items-center justify-between gap-4 py-4 text-left group" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <span className={cn('text-sm font-medium transition-colors', openFaq === i ? 'text-primary' : 'text-foreground group-hover:text-foreground/80')}>{faq.question}</span>
                {openFaq === i ? <ChevronUp className="w-4 h-4 text-primary flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
              </button>
              {openFaq === i && <p className="text-sm text-muted-foreground pb-4 leading-relaxed max-w-2xl">{faq.answer}</p>}
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};

export default Help;
