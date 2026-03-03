import { useState, useRef } from 'react';
import emailjs from '@emailjs/browser';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Star, Send, MessageSquare, HelpCircle, Lightbulb, CheckCircle, Sparkles, Circle, Loader2, Shield, HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

const Help = () => {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      answer: 'If content isn\'t loading, try using a VPN. Some content may be geo-restricted in your region. A VPN will help bypass these restrictions.'
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
      answer: 'Currently, offline downloads are not supported. You need an active internet connection to stream content.'
    },
    {
      question: 'Is my watchlist saved across devices?',
      answer: 'If you create an account and sign in, your watchlist syncs to the cloud. As a guest, data is stored locally in your browser only.'
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
    <div className="p-6 pt-20 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
          <HelpCircle className="w-8 h-8 text-primary" />
          Help & Feedback
        </h1>
        <p className="text-muted-foreground">Get help, share your feedback, and rate your experience</p>
      </div>

      {/* Rating & Feedback Card */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Rate & Share Feedback
          </CardTitle>
          <CardDescription>Your feedback helps us improve PirateOne</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>How would you rate your experience?</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star className={cn('w-8 h-8 transition-colors', (hoverRating || rating) >= star ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground')} />
                </button>
              ))}
              <span className="ml-3 text-sm text-muted-foreground">
                {rating === 1 && 'Poor'}{rating === 2 && 'Fair'}{rating === 3 && 'Good'}{rating === 4 && 'Great'}{rating === 5 && 'Excellent!'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name (optional)</Label>
            <Input id="name" type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="bg-background/50" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
            <Input id="email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-background/50" required />
            <p className="text-xs text-muted-foreground">We'll use this to follow up if needed</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback">Your Feedback</Label>
            <Textarea id="feedback" placeholder="Tell us what you think about PirateOne. What do you love? What can we improve?" value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={5} className="bg-background/50 resize-none" />
          </div>

          <Button onClick={handleSubmitFeedback} disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
            ) : (
              <><Send className="w-4 h-4 mr-2" />Submit Feedback</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Quick Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">{index + 1}</span>
                <span className="text-muted-foreground">{tip}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Website Features Table */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Website Features
          </CardTitle>
          <CardDescription>Complete list of all features available on PirateOne</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-foreground font-semibold">Feature</TableHead>
                  <TableHead className="text-foreground font-semibold">Description</TableHead>
                  <TableHead className="text-foreground font-semibold text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Streaming */}
                <TableRow className="border-border/30 bg-primary/5">
                  <TableCell colSpan={3} className="font-semibold text-primary"><Circle className="w-3 h-3 inline mr-2 fill-primary" />Streaming</TableCell>
                </TableRow>
                <TableRow className="border-border/30">
                  <TableCell className="font-medium">Movies Streaming</TableCell>
                  <TableCell className="text-muted-foreground">Watch thousands of movies in HD quality</TableCell>
                  <TableCell className="text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></TableCell>
                </TableRow>
                <TableRow className="border-border/30">
                  <TableCell className="font-medium">TV Series Streaming</TableCell>
                  <TableCell className="text-muted-foreground">Stream complete TV series with all seasons and episodes</TableCell>
                  <TableCell className="text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></TableCell>
                </TableRow>
                <TableRow className="border-border/30">
                  <TableCell className="font-medium">Anime Streaming</TableCell>
                  <TableCell className="text-muted-foreground">Watch popular anime series with subbed/dubbed options</TableCell>
                  <TableCell className="text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></TableCell>
                </TableRow>
                <TableRow className="border-border/30">
                  <TableCell className="font-medium">16 Streaming Servers</TableCell>
                  <TableCell className="text-muted-foreground">Switch between 16 different servers if one doesn't work</TableCell>
                  <TableCell className="text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></TableCell>
                </TableRow>
                <TableRow className="border-border/30">
                  <TableCell className="font-medium">HD Quality</TableCell>
                  <TableCell className="text-muted-foreground">Stream content in up to 1080p HD quality</TableCell>
                  <TableCell className="text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></TableCell>
                </TableRow>
                <TableRow className="border-border/30">
                  <TableCell className="font-medium">Trailer Previews</TableCell>
                  <TableCell className="text-muted-foreground">Watch official YouTube trailers before streaming</TableCell>
                  <TableCell className="text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></TableCell>
                </TableRow>

                {/* Privacy & Security — NEW SECTION */}
                <TableRow className="border-border/30 bg-emerald-500/5">
                  <TableCell colSpan={3} className="font-semibold text-emerald-400"><Circle className="w-3 h-3 inline mr-2 fill-emerald-400" />Privacy & Security</TableCell>
                </TableRow>
                <TableRow className="border-border/30">
                  <TableCell className="font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    Ad Redirect Blocking
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    Automatically blocks popup ads and new-tab redirects from video embeds.
                    <span className="block text-xs text-emerald-400 mt-0.5">No ads can open new tabs while you're watching.</span>
                  </TableCell>
                  <TableCell className="text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></TableCell>
                </TableRow>
                <TableRow className="border-border/30">
                  <TableCell className="font-medium flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-emerald-400" />
                    Local Data Storage
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    Your watchlist, history, and preferences are stored{' '}
                    <span className="text-foreground font-medium">privately on your device</span>.
                    <span className="block text-xs text-emerald-400 mt-0.5">No tracking. No data sold. Sign in to sync to cloud.</span>
                  </TableCell>
                  <TableCell className="text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></TableCell>
                </TableRow>
                <TableRow className="border-border/30">
                  <TableCell className="font-medium">No Account Required</TableCell>
                  <TableCell className="text-muted-foreground">Browse and watch content without creating an account. Sign in only to sync across devices.</TableCell>
                  <TableCell className="text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></TableCell>
                </TableRow>

                {/* User Features */}
                <TableRow className="border-border/30 bg-primary/5">
                  <TableCell colSpan={3} className="font-semibold text-primary"><Circle className="w-3 h-3 inline mr-2 fill-primary" />User Features</TableCell>
                </TableRow>
                <TableRow className="border-border/30">
                  <TableCell className="font-medium">Watch History</TableCell>
                  <TableCell className="text-muted-foreground">Track your watched content — syncs to cloud when signed in</TableCell>
                  <TableCell className="text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></TableCell>
                </TableRow>
                <TableRow className="border-border/30">
                  <TableCell className="font-medium">Watchlist</TableCell>
                  <TableCell className="text-muted-foreground">Save movies and shows to watch later — syncs to cloud when signed in</TableCell>
                  <TableCell className="text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></TableCell>
                </TableRow>
                <TableRow className="border-border/30">
                  <TableCell className="font-medium">Library Tracking</TableCell>
                  <TableCell className="text-muted-foreground">Mark shows as Watching, Completed, or Dropped and track progress</TableCell>
                  <TableCell className="text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></TableCell>
                </TableRow>
                <TableRow className="border-border/30">
                  <TableCell className="font-medium">Pirate Identity</TableCell>
                  <TableCell className="text-muted-foreground">Get a fun randomized pirate persona — regenerate anytime in Settings</TableCell>
                  <TableCell className="text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></TableCell>
                </TableRow>
                <TableRow className="border-border/30">
                  <TableCell className="font-medium">Profile Picture</TableCell>
                  <TableCell className="text-muted-foreground">Upload your own profile picture from Settings</TableCell>
                  <TableCell className="text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></TableCell>
                </TableRow>

                {/* Discovery */}
                <TableRow className="border-border/30 bg-primary/5">
                  <TableCell colSpan={3} className="font-semibold text-primary"><Circle className="w-3 h-3 inline mr-2 fill-primary" />Discovery</TableCell>
                </TableRow>
                <TableRow className="border-border/30">
                  <TableCell className="font-medium">Search</TableCell>
                  <TableCell className="text-muted-foreground">Search for any movie, TV show, or anime by title</TableCell>
                  <TableCell className="text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></TableCell>
                </TableRow>
                <TableRow className="border-border/30">
                  <TableCell className="font-medium">Trending Content</TableCell>
                  <TableCell className="text-muted-foreground">Discover what's trending this week</TableCell>
                  <TableCell className="text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></TableCell>
                </TableRow>
                <TableRow className="border-border/30">
                  <TableCell className="font-medium">Top Rated & Popular</TableCell>
                  <TableCell className="text-muted-foreground">Browse highest rated and most popular movies and shows</TableCell>
                  <TableCell className="text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></TableCell>
                </TableRow>
                <TableRow className="border-border/30">
                  <TableCell className="font-medium">Recommendations</TableCell>
                  <TableCell className="text-muted-foreground">Get similar content recommendations on every watch page</TableCell>
                  <TableCell className="text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="p-4 rounded-lg bg-muted/30 border border-border/30">
                <h3 className="font-medium text-foreground mb-2">{faq.question}</h3>
                <p className="text-sm text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Help;
