import { useState, useRef } from 'react';
import emailjs from '@emailjs/browser';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Star, Send, MessageSquare, HelpCircle, Lightbulb, CheckCircle, Sparkles, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// EmailJS configuration - these are public keys, safe to expose
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
      toast({
        title: "Rating Required",
        description: "Please select a rating before submitting.",
        variant: "destructive"
      });
      return;
    }

    if (!feedback.trim()) {
      toast({
        title: "Feedback Required",
        description: "Please write your feedback before submitting.",
        variant: "destructive"
      });
      return;
    }

    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please provide your email address.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    // Check if EmailJS is configured
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

        toast({
          title: "Thank You! ✨",
          description: "Your feedback has been sent successfully!",
        });

        // Reset form
        setRating(0);
        setFeedback('');
        setEmail('');
        setName('');
      } catch (error) {
        console.error('EmailJS error:', error);
        toast({
          title: "Sending Failed",
          description: "Could not send feedback. Saved locally instead.",
          variant: "destructive"
        });
        
        // Fallback to localStorage
        saveToLocalStorage();
      }
    } else {
      // Fallback to localStorage if EmailJS not configured
      saveToLocalStorage();
      toast({
        title: "Thank You!",
        description: "Your feedback has been saved locally.",
      });
    }

    setIsSubmitting(false);
  };

  const saveToLocalStorage = () => {
    const storedFeedback = JSON.parse(localStorage.getItem('pirateone_feedback') || '[]');
    storedFeedback.push({
      name: name || 'Anonymous',
      rating,
      feedback: feedback.trim(),
      email: email.trim(),
      createdAt: new Date().toISOString()
    });
    localStorage.setItem('pirateone_feedback', JSON.stringify(storedFeedback));
    
    // Reset form
    setRating(0);
    setFeedback('');
    setEmail('');
    setName('');
  };

  const faqs = [
    {
      question: "Why am I being redirected to a new tab?",
      answer: "Some video sources use ads that open new tabs. Simply close the new tab and click back to continue watching. This is normal behavior."
    },
    {
      question: "Why is nothing loading on the website?",
      answer: "If content isn't loading, try using a VPN. Some content may be geo-restricted in your region. A VPN will help bypass these restrictions."
    },
    {
      question: "How do I add movies to my watchlist?",
      answer: "Click on any movie or series, then click the bookmark icon to add it to your watchlist. You can access your watchlist from the sidebar."
    },
    {
      question: "Why is the video quality low?",
      answer: "Video quality depends on the source and your internet connection. Try selecting a different quality option in the player settings if available."
    },
    {
      question: "Can I download movies for offline viewing?",
      answer: "Currently, offline downloads are not supported. You need an active internet connection to stream content."
    },
    {
      question: "Is my watchlist saved across devices?",
      answer: "Your watchlist is stored locally in your browser. It will persist on the same device/browser but won't sync across devices."
    }
  ];

  const tips = [
    "Use a VPN if content doesn't load in your region",
    "Close any pop-up tabs and return to continue watching",
    "Check your internet connection if videos buffer frequently",
    "Use the search feature to find specific content quickly",
    "Add shows to your watchlist to keep track of what to watch"
  ];

  return (
    <div className="p-6 pt-20 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
          <HelpCircle className="w-8 h-8 text-primary" />
          Help & Feedback
        </h1>
        <p className="text-muted-foreground">
          Get help, share your feedback, and rate your experience
        </p>
      </div>

      {/* Rating & Feedback Card */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Rate & Share Feedback
          </CardTitle>
          <CardDescription>
            Your feedback helps us improve PirateOne
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Star Rating */}
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
                  <Star
                    className={cn(
                      "w-8 h-8 transition-colors",
                      (hoverRating || rating) >= star
                        ? "fill-yellow-500 text-yellow-500"
                        : "text-muted-foreground"
                    )}
                  />
                </button>
              ))}
              <span className="ml-3 text-sm text-muted-foreground">
                {rating > 0 && (
                  <>
                    {rating === 1 && "Poor"}
                    {rating === 2 && "Fair"}
                    {rating === 3 && "Good"}
                    {rating === 4 && "Great"}
                    {rating === 5 && "Excellent!"}
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name (optional)</Label>
            <Input
              id="name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background/50"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background/50"
              required
            />
            <p className="text-xs text-muted-foreground">
              We'll use this to follow up if needed
            </p>
          </div>

          {/* Feedback Text */}
          <div className="space-y-2">
            <Label htmlFor="feedback">Your Feedback</Label>
            <Textarea
              id="feedback"
              placeholder="Tell us what you think about PirateOne. What do you love? What can we improve?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={5}
              className="bg-background/50 resize-none"
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmitFeedback}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Feedback
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Tips Card */}
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
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </span>
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
          <CardDescription>
            Complete list of all features available on PirateOne
          </CardDescription>
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
                {/* Streaming Features */}
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
                  <TableCell className="font-medium">Multiple Servers</TableCell>
                  <TableCell className="text-muted-foreground">Switch between 3 different streaming servers if one doesn't work</TableCell>
                  <TableCell className="text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></TableCell>
                </TableRow>
                <TableRow className="border-border/30">
                  <TableCell className="font-medium">HD Quality</TableCell>
                  <TableCell className="text-muted-foreground">Stream content in up to 1080p HD quality</TableCell>
                  <TableCell className="text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></TableCell>
                </TableRow>
                <TableRow className="border-border/30">
                  <TableCell className="font-medium">Trailer Previews</TableCell>
                  <TableCell className="text-muted-foreground">Watch official trailers before streaming</TableCell>
                  <TableCell className="text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></TableCell>
                </TableRow>

                {/* User Features */}
                <TableRow className="border-border/30 bg-primary/5">
                  <TableCell colSpan={3} className="font-semibold text-primary"><Circle className="w-3 h-3 inline mr-2 fill-primary" />User Features</TableCell>
                </TableRow>
                <TableRow className="border-border/30">
                  <TableCell className="font-medium">Watch History</TableCell>
                  <TableCell className="text-muted-foreground">Track your watched content (stored locally)</TableCell>
                  <TableCell className="text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></TableCell>
                </TableRow>
                <TableRow className="border-border/30">
                  <TableCell className="font-medium">Watchlist</TableCell>
                  <TableCell className="text-muted-foreground">Save movies and shows to watch later (stored locally)</TableCell>
                  <TableCell className="text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></TableCell>
                </TableRow>
                <TableRow className="border-border/30">
                  <TableCell className="font-medium">Theme Settings</TableCell>
                  <TableCell className="text-muted-foreground">Customize appearance with light/dark themes</TableCell>
                  <TableCell className="text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></TableCell>
                </TableRow>

                {/* Discovery Features */}
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
                  <TableCell className="font-medium">Top Rated</TableCell>
                  <TableCell className="text-muted-foreground">Browse highest rated movies and shows</TableCell>
                  <TableCell className="text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></TableCell>
                </TableRow>
                <TableRow className="border-border/30">
                  <TableCell className="font-medium">Popular Content</TableCell>
                  <TableCell className="text-muted-foreground">Browse most popular movies and TV shows</TableCell>
                  <TableCell className="text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></TableCell>
                </TableRow>
                <TableRow className="border-border/30">
                  <TableCell className="font-medium">Recommendations</TableCell>
                  <TableCell className="text-muted-foreground">Get similar content recommendations on watch page</TableCell>
                  <TableCell className="text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* FAQ Card */}
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

      {/* Storage Notice */}
      <Card className="border-amber-500/30 bg-amber-500/5 backdrop-blur">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-foreground mb-1">Local Storage Notice</h3>
              <p className="text-sm text-muted-foreground">
                All your data (watchlist, watch history, settings) is stored locally in your browser. 
                This means your data will persist on this device/browser but won't sync across different devices. 
                Clearing your browser data will remove this information.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Help;
