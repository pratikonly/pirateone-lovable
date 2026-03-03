import { useState, useRef } from 'react';
import emailjs from '@emailjs/browser';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Star, Send, MessageSquare, HelpCircle, Lightbulb, CheckCircle,
  Sparkles, Loader2, Shield, HardDrive, Server, Download,
  ChevronDown, ChevronUp, Anchor, Tv, Film, Zap, Globe,
  BookMarked, History, Library, User, Camera, Search, TrendingUp,
  Award, ThumbsUp, Shuffle
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
    if (rating === 0) {
      toast({ title: 'Rating Required', description: 'Please select a rating before submitting.', variant: 'destructive' });
      return;
    }
    if (!feedback.trim()) {
      toast({ title: 'Feedback Required', description: 'Please write your feedback before submitting.', variant: 'destructive' });
      return;
    }
    if (!email.trim()) {
      toast({ title: 'Email Required', description: 'Please provide your email address.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    if (EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY) {
      try {
        const ratingText = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][rating];
        await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          {
            from_name: name || 'Anonymous',
            from_email: email,
            rating: `${rating}/5 (${ratingText})`,
            message: feedback,
            to_name: 'PirateOne Team',
          },
          EMAILJS_PUBLIC_KEY
        );
        toast({ title: 'Thank You! ✨', description: 'Your feedback has been sent successfully!' });
        setRating(0); setFeedback(''); setEmail(''); setName('');
      } catch (error) {
        console.error('EmailJS error:', error);
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
    {
      question: 'Why do I need to click twice on the video player?',
      answer: 'The first click activates the player and our ad protection layer. The second click performs your intended action (play, pause, fullscreen, etc). This is by design to block ad redirects.'
    },
    {
      question: 'Why is nothing loading on the website?',
      answer: "If content isn't loading, try using a VPN. Some content may be geo-restricted in your region. A VPN will help bypass these restrictions."
    },
    {
      question: 'How do I add movies to my watchlist?',
      answer: 'Click on any movie or series, then click the bookmark icon to add it to your watchlist. You can access your watchlist from the sidebar.'
    },
    {
      question: 'Why is the video quality low?',
      answer: 'Video quality depends on the source and your internet connection. Try switching to a different server in the Server selector on the watch page.'
    },
    {
      question: 'Can I download movies for offline viewing?',
      answer: 'Yes! Use the Download button on the watch page to grab content for offline viewing. Quality options are available before downloading.'
    },
    {
      question: 'Is my watchlist saved across devices?',
      answer: 'If you create an account and sign in, your watchlist syncs to the cloud. As a guest, data is stored locally in your browser only.'
    },
  ];

  const featureGroups = [
    {
      label: 'Streaming',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/30',
      features: [
        { icon: <Film className="w-4 h-4" />, name: 'Movies Streaming', desc: 'Thousands of movies in HD quality' },
        { icon: <Tv className="w-4 h-4" />, name: 'TV Series Streaming', desc: 'Complete series with all seasons & episodes' },
        { icon: <Sparkles className="w-4 h-4" />, name: 'Anime Streaming', desc: 'Subbed & dubbed options available' },
        { icon: <Zap className="w-4 h-4" />, name: 'HD Quality', desc: 'Stream up to 1080p HD quality' },
        { icon: <Film className="w-4 h-4" />, name: 'Trailer Previews', desc: 'Watch official trailers before streaming' },
      ]
    },
    {
      label: 'Privacy & Security',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      features: [
        { icon: <Shield className="w-4 h-4" />, name: 'Ad Redirect Blocking', desc: 'Blocks popups & new-tab ad redirects automatically' },
        { icon: <HardDrive className="w-4 h-4" />, name: 'Local Data Storage', desc: 'Your data stays on your device — no tracking' },
        { icon: <User className="w-4 h-4" />, name: 'No Account Required', desc: 'Browse & watch without signing up' },
      ]
    },
    {
      label: 'User Features',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      features: [
        { icon: <History className="w-4 h-4" />, name: 'Watch History', desc: 'Track watched content, syncs to cloud when signed in' },
        { icon: <BookMarked className="w-4 h-4" />, name: 'Watchlist', desc: 'Save movies & shows to watch later' },
        { icon: <Library className="w-4 h-4" />, name: 'Library Tracking', desc: 'Mark as Watching, Completed, or Dropped' },
        { icon: <Anchor className="w-4 h-4" />, name: 'Pirate Identity', desc: 'Fun randomized pirate persona — regenerate anytime' },
        { icon: <Camera className="w-4 h-4" />, name: 'Profile Picture', desc: 'Upload your own profile picture from Settings' },
      ]
    },
    {
      label: 'Discovery',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      features: [
        { icon: <Search className="w-4 h-4" />, name: 'Search', desc: 'Find any movie, TV show, or anime by title' },
        { icon: <TrendingUp className="w-4 h-4" />, name: 'Trending Content', desc: "Discover what's hot this week" },
        { icon: <Award className="w-4 h-4" />, name: 'Top Rated & Popular', desc: 'Browse highest rated and most popular titles' },
        { icon: <ThumbsUp className="w-4 h-4" />, name: 'Recommendations', desc: 'Similar content suggestions on every watch page' },
      ]
    },
  ];

  const tips = [
    'Click once to activate the player, then click again to play/pause',
    'Use a VPN if content doesn\'t load in your region',
    'Try switching servers if one doesn\'t work — each has different content availability',
    'Check your internet connection if videos buffer frequently',
    'Sign in to sync your watchlist and library across devices',
  ];

  return (
    <div className="min-h-screen p-4 pt-20 pb-12 max-w-5xl mx-auto space-y-8">

      {/* ── HERO HEADER ── */}
      <div className="relative rounded-2xl overflow-hidden border border-border/40 bg-gradient-to-br from-card via-card/80 to-primary/5 p-8 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 mb-2">
            <Anchor className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Help & Feedback</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Everything you need to sail smoothly on PirateOne
          </p>
        </div>
      </div>

      {/* ── HERO FEATURE CARDS: Servers + Downloads ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 17 Servers */}
        <div className="relative rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-6 overflow-hidden group hover:border-primary/60 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-10 translate-x-10 pointer-events-none" />
          <div className="flex items-start gap-4 relative z-10">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center">
              <Server className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-foreground">17 Streaming Servers</h3>
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold border border-primary/30">NEW</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Switch between 17 different servers instantly on the watch page. If one server is slow or broken, another has you covered.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {Array.from({ length: 17 }, (_, i) => (
                  <span key={i} className="text-xs bg-background/60 border border-border/50 text-muted-foreground px-2 py-0.5 rounded-md font-mono">
                    S{i + 1}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Downloads */}
        <div className="relative rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-6 overflow-hidden group hover:border-emerald-500/60 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -translate-y-10 translate-x-10 pointer-events-none" />
          <div className="flex items-start gap-4 relative z-10">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <Download className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-foreground">Download Any Show</h3>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-semibold border border-emerald-500/30">NEW</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Download movies and episodes for offline viewing directly from the watch page. Choose your quality before downloading.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {['480p', '720p', '1080p', '4K'].map(q => (
                  <span key={q} className="text-xs bg-background/60 border border-border/50 text-emerald-400 px-2 py-0.5 rounded-md font-mono">
                    {q}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ALL FEATURES GRID ── */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          All Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {featureGroups.map((group) => (
            <div key={group.label} className={cn('rounded-2xl border p-5 space-y-4', group.bgColor, group.borderColor)}>
              <h3 className={cn('text-sm font-bold uppercase tracking-widest', group.color)}>{group.label}</h3>
              <div className="space-y-3">
                {group.features.map((f) => (
                  <div key={f.name} className="flex items-start gap-3">
                    <div className={cn('flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-background/40 border border-border/30', group.color)}>
                      {f.icon}
                    </div>
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
        </div>
      </div>

      {/* ── TIPS ── */}
      <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-6 space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          Quick Tips
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-3 bg-background/40 rounded-xl p-3 border border-border/30">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 flex items-center justify-center text-xs font-bold">
                {i + 1}
              </span>
              <p className="text-sm text-muted-foreground">{tip}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── FAQ ACCORDION ── */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          Frequently Asked Questions
        </h2>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="rounded-xl border border-border/40 bg-card/50 overflow-hidden transition-all duration-200"
            >
              <button
                className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-muted/20 transition-colors"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span className="font-medium text-foreground text-sm">{faq.question}</span>
                {openFaq === i
                  ? <ChevronUp className="w-4 h-4 text-primary flex-shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                }
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 text-sm text-muted-foreground border-t border-border/30 pt-3 bg-muted/10">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── FEEDBACK CARD ── */}
      <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 to-transparent p-6 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Rate & Share Feedback</h2>
              <p className="text-sm text-muted-foreground">Your feedback helps us improve PirateOne</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Stars */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">How would you rate your experience?</Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-0.5 transition-transform hover:scale-110 active:scale-95"
                >
                  <Star className={cn(
                    'w-9 h-9 transition-all duration-150',
                    (hoverRating || rating) >= star
                      ? 'fill-yellow-500 text-yellow-500 drop-shadow-[0_0_6px_rgba(234,179,8,0.5)]'
                      : 'text-muted-foreground/40'
                  )} />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm font-medium text-yellow-500">
                  {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][rating]}
                </span>
              )}
            </div>
          </div>

          {/* Name + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm">Name <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="name" type="text" placeholder="Your name"
                value={name} onChange={(e) => setName(e.target.value)}
                className="bg-background/50 border-border/50 focus:border-primary/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm">Email <span className="text-destructive">*</span></Label>
              <Input
                id="email" type="email" placeholder="your@email.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="bg-background/50 border-border/50 focus:border-primary/50"
              />
            </div>
          </div>

          {/* Feedback textarea */}
          <div className="space-y-1.5">
            <Label htmlFor="feedback" className="text-sm">Your Feedback</Label>
            <Textarea
              id="feedback"
              placeholder="Tell us what you think about PirateOne. What do you love? What can we improve?"
              value={feedback} onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              className="bg-background/50 border-border/50 focus:border-primary/50 resize-none"
            />
          </div>

          <Button
            onClick={handleSubmitFeedback}
            disabled={isSubmitting}
            className="w-full h-11 font-semibold"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
            ) : (
              <><Send className="w-4 h-4 mr-2" />Submit Feedback</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Help;
