import { useState } from 'react';
import emailjs from '@emailjs/browser';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Star, Send, HelpCircle, Lightbulb, CheckCircle,
  Sparkles, Loader2, Shield, Database, Server, Download,
  ChevronDown, ChevronUp, Anchor, Tv, Film, Zap,
  BookMarked, History, Library, User, Camera, Search, TrendingUp,
  Award, ThumbsUp, MessageSquare, Hash
} from 'lucide-react';
import { cn } from '@/lib/utils';

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const EMAILJS_PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  || '';

/* ─── tiny reusable label ─── */
const SectionLabel = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '20px' }}>
    <span style={{ color: 'rgba(255,255,255,0.28)', display: 'flex' }}>{icon}</span>
    <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)' }}>{label}</span>
    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)', marginLeft: '6px' }} />
  </div>
);

const Help = () => {
  const { toast } = useToast();
  const [rating, setRating]           = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback]       = useState('');
  const [email, setEmail]             = useState('');
  const [name, setName]               = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openFaq, setOpenFaq]         = useState<number | null>(null);

  const handleSubmitFeedback = async () => {
    if (rating === 0)        { toast({ title: 'Rating Required',   description: 'Please select a rating before submitting.',   variant: 'destructive' }); return; }
    if (!feedback.trim())    { toast({ title: 'Feedback Required', description: 'Please write your feedback before submitting.', variant: 'destructive' }); return; }
    if (!email.trim())       { toast({ title: 'Email Required',    description: 'Please provide your email address.',           variant: 'destructive' }); return; }
    setIsSubmitting(true);
    if (EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY) {
      try {
        const ratingText = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][rating];
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, { from_name: name || 'Anonymous', from_email: email, rating: `${rating}/5 (${ratingText})`, message: feedback, to_name: 'PirateOne Team' }, EMAILJS_PUBLIC_KEY);
        toast({ title: 'Thank You! ✨', description: 'Your feedback has been sent successfully!' });
        setRating(0); setFeedback(''); setEmail(''); setName('');
      } catch {
        toast({ title: 'Sending Failed', description: 'Could not send feedback. Saved locally instead.', variant: 'destructive' });
        saveLocal();
      }
    } else { saveLocal(); toast({ title: 'Thank You!', description: 'Your feedback has been saved locally.' }); }
    setIsSubmitting(false);
  };

  const saveLocal = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('pirateone_feedback') || '[]');
      stored.push({ name: name || 'Anonymous', rating, feedback: feedback.trim(), email: email.trim(), createdAt: new Date().toISOString() });
      localStorage.setItem('pirateone_feedback', JSON.stringify(stored));
    } catch {}
    setRating(0); setFeedback(''); setEmail(''); setName('');
  };

  const faqs = [
    { question: 'Why do I need to click twice on the video player?',  answer: 'The first click activates the player and our ad protection layer. The second click performs your intended action (play, pause, fullscreen, etc). This is by design to block ad redirects.' },
    { question: 'Why is nothing loading on the website?',             answer: "If content isn't loading, try using a VPN. Some content may be geo-restricted in your region. A VPN will help bypass these restrictions." },
    { question: 'How do I add movies to my watchlist?',               answer: 'Click on any movie or series, then click the bookmark icon to add it to your watchlist. You can access your watchlist from the sidebar.' },
    { question: 'Why is the video quality low?',                      answer: 'Video quality depends on the source and your internet connection. Try switching to a different server in the Server selector on the watch page.' },
    { question: 'Can I download movies for offline viewing?',         answer: 'Yes! Use the Download button on the watch page to grab content for offline viewing. Quality options are available before downloading.' },
    { question: 'Is my watchlist saved across devices?',              answer: 'If you create an account and sign in, your watchlist syncs to the cloud. As a guest, data is stored locally in your browser only.' },
  ];

  const tips = [
    'Click once to activate the player, then click again to play/pause',
    "Use a VPN if content doesn't load in your region",
    "Try switching servers if one doesn't work — each has different content availability",
    'Check your internet connection if videos buffer frequently',
    'Sign in to sync your watchlist and library across devices',
  ];

  const featureGroups = [
    {
      label: 'Streaming', color: 'text-primary', iconBg: 'bg-primary/10', iconBorder: 'border-primary/20', iconColor: 'text-primary',
      features: [
        { icon: <Film className="w-4 h-4" />,     name: 'Movies Streaming',    desc: 'Thousands of movies in HD quality' },
        { icon: <Tv className="w-4 h-4" />,        name: 'TV Series Streaming', desc: 'Complete series with all seasons & episodes' },
        { icon: <Sparkles className="w-4 h-4" />,  name: 'Anime Streaming',     desc: 'Subbed & dubbed options available' },
        { icon: <Zap className="w-4 h-4" />,       name: 'HD Quality',          desc: 'Stream up to 1080p HD' },
        { icon: <Film className="w-4 h-4" />,      name: 'Trailer Previews',    desc: 'Watch official trailers before streaming' },
      ],
    },
    {
      label: 'Privacy & Security', color: 'text-emerald-400', iconBg: 'bg-emerald-500/10', iconBorder: 'border-emerald-500/20', iconColor: 'text-emerald-400',
      features: [
        { icon: <Shield className="w-4 h-4" />,   name: 'Ad Redirect Blocking',          desc: 'Blocks popups & new-tab ad redirects automatically while you watch' },
        { icon: <Database className="w-4 h-4" />, name: 'Data Stored Securely',           desc: 'Encrypted & stored securely — no tracking, no data sold' },
        { icon: <User className="w-4 h-4" />,     name: 'Browse Without or With Account', desc: 'Watch freely as a guest, or sign in to sync across devices' },
      ],
    },
    {
      label: 'User Features', color: 'text-blue-400', iconBg: 'bg-blue-500/10', iconBorder: 'border-blue-500/20', iconColor: 'text-blue-400',
      features: [
        { icon: <History className="w-4 h-4" />,   name: 'Watch History',   desc: 'Track watched content, syncs to cloud when signed in' },
        { icon: <BookMarked className="w-4 h-4" />, name: 'Watchlist',       desc: 'Save movies & shows to watch later' },
        { icon: <Library className="w-4 h-4" />,   name: 'Library Tracking', desc: 'Mark as Watching, Completed, or Dropped' },
        { icon: <Anchor className="w-4 h-4" />,    name: 'Pirate Identity', desc: 'Fun randomized pirate persona — regenerate anytime' },
        { icon: <Camera className="w-4 h-4" />,    name: 'Profile Picture', desc: 'Upload your own profile picture from Settings' },
      ],
    },
    {
      label: 'Discovery', color: 'text-purple-400', iconBg: 'bg-purple-500/10', iconBorder: 'border-purple-500/20', iconColor: 'text-purple-400',
      features: [
        { icon: <Search className="w-4 h-4" />,       name: 'Search',               desc: 'Find any movie, TV show, or anime by title or TMDB ID' },
        { icon: <Hash className="w-4 h-4" />,          name: 'TMDB ID Lookup',       desc: 'Jump directly to any title by entering its TMDB ID (e.g. movie:550 or tv:1396)' },
        { icon: <TrendingUp className="w-4 h-4" />,   name: 'Trending Content',     desc: "Discover what's hot this week" },
        { icon: <Award className="w-4 h-4" />,         name: 'Top Rated & Popular',  desc: 'Browse highest rated and most popular titles' },
        { icon: <ThumbsUp className="w-4 h-4" />,     name: 'Recommendations',      desc: 'Similar content suggestions on every watch page' },
        { icon: <MessageSquare className="w-4 h-4" />, name: 'Community Reviews',    desc: 'Real audience reviews powered by TMDB on every movie & show page' },
      ],
    },
  ];

  return (
    <>
      <style>{`
        @keyframes hfadeup { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .h-fu { animation: hfadeup 0.45s ease both; }

        /* feedback box inputs */
        .fb-input {
          width: 100%; height: 44px; padding: 0 14px; border-radius: 10px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
          color: #fff; font-size: 0.875rem; outline: none; box-sizing: border-box;
          transition: border-color 0.2s, background 0.2s;
        }
        .fb-input::placeholder { color: rgba(255,255,255,0.25); }
        .fb-input:focus { border-color: rgba(255,255,255,0.25); background: rgba(255,255,255,0.07); }

        .fb-textarea {
          width: 100%; padding: 12px 14px; border-radius: 10px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
          color: #fff; font-size: 0.875rem; outline: none; resize: none; box-sizing: border-box;
          transition: border-color 0.2s, background 0.2s; line-height: 1.55;
          font-family: inherit;
        }
        .fb-textarea::placeholder { color: rgba(255,255,255,0.25); }
        .fb-textarea:focus { border-color: rgba(255,255,255,0.25); background: rgba(255,255,255,0.07); }

        .fb-submit {
          width: 100%; height: 46px; border-radius: 10px;
          background: #fff; border: none; color: #0a0a0a;
          font-size: 0.875rem; font-weight: 700; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
          letter-spacing: 0.01em;
        }
        .fb-submit:hover:not(:disabled) { background: rgba(255,255,255,0.88); transform: translateY(-1px); box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
        .fb-submit:disabled { opacity: 0.45; cursor: not-allowed; }

        /* two-column grid */
        .help-grid { display: grid; grid-template-columns: 360px 1fr; gap: 0 48px; align-items: start; }
        @media (max-width: 900px) { .help-grid { grid-template-columns: 1fr; } }

        .help-right-col { border-left: 1px solid rgba(255,255,255,0.06); padding-left: 48px; }
        @media (max-width: 900px) { .help-right-col { border-left: none; padding-left: 0; margin-top: 48px; } }

        /* FAQ */
        .faq-row { border-bottom: 1px solid rgba(255,255,255,0.06); }
        .faq-btn { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 0; background: none; border: none; cursor: pointer; text-align: left; }

        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '88px 24px 72px' }}>

        {/* ── CENTERED TITLE ── */}
        <div className="h-fu" style={{ textAlign: 'center', marginBottom: '48px', width: '100%', maxWidth: '900px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '8px' }}>
            <Anchor style={{ width: 28, height: 28, color: 'var(--primary)' }} />
            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', margin: 0 }}>Help & Feedback</h1>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.38)', margin: 0 }}>Everything you need to sail smoothly on PirateOne</p>
        </div>

        {/* ── TWO-COLUMN GRID ── */}
        <div className="h-fu help-grid" style={{ width: '100%', maxWidth: '900px' }}>

          {/* ════ LEFT — FEEDBACK BOX ════ */}
          <div>
            {/* Feedback box */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '32px',
            }}>
              <SectionLabel icon={<MessageSquare size={13} />} label="Rate & Share Feedback" />

              {/* Stars */}
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.38)', marginBottom: '10px' }}>How would you rate your experience?</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {[1,2,3,4,5].map(star => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', transition: 'transform 0.15s' }}
                      onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.92)')}
                      onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      <Star style={{
                        width: 32, height: 32, transition: 'all 0.15s',
                        fill: (hoverRating || rating) >= star ? '#eab308' : 'transparent',
                        color: (hoverRating || rating) >= star ? '#eab308' : 'rgba(255,255,255,0.2)',
                        filter: (hoverRating || rating) >= star ? 'drop-shadow(0 0 6px rgba(234,179,8,0.5))' : 'none',
                      }} />
                    </button>
                  ))}
                  {rating > 0 && (
                    <span style={{ marginLeft: '8px', fontSize: '0.8rem', fontWeight: 600, color: '#eab308' }}>
                      {['','Poor','Fair','Good','Great','Excellent!'][rating]}
                    </span>
                  )}
                </div>
              </div>

              {/* Name + Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '6px' }}>
                    Name <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input className="fb-input" type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '6px' }}>
                    Email <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input className="fb-input" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </div>

              {/* Feedback */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '6px' }}>
                  Feedback
                </label>
                <textarea className="fb-textarea" rows={5} placeholder="Tell us what you love or what we can improve…" value={feedback} onChange={e => setFeedback(e.target.value)} />
              </div>

              <button className="fb-submit" onClick={handleSubmitFeedback} disabled={isSubmitting}>
                {isSubmitting
                  ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#0a0a0a', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block', flexShrink: 0 }} />Sending…</>
                  : <><Send size={15} />Submit Feedback</>
                }
              </button>
            </div>

            {/* What's On Board — servers + downloads */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '28px', marginBottom: '28px' }}>
              <SectionLabel icon={<Sparkles size={13} />} label="What's On Board" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Servers */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '9px', background: 'rgba(var(--primary-rgb,168,85,247),0.12)', border: '1px solid rgba(var(--primary-rgb,168,85,247),0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Server size={15} style={{ color: 'var(--primary)' }} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#fff' }}>17 Streaming Servers</span>
                        <span style={{ fontSize: '0.65rem', background: 'rgba(var(--primary-rgb,168,85,247),0.15)', color: 'var(--primary)', border: '1px solid rgba(var(--primary-rgb,168,85,247),0.2)', padding: '1px 7px', borderRadius: '99px', fontWeight: 700 }}>NEW</span>
                      </div>
                      <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', margin: 0 }}>Switch instantly if one goes down</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', paddingLeft: '44px' }}>
                    {Array.from({ length: 17 }, (_, i) => (
                      <span key={i} style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)', padding: '2px 7px', borderRadius: '5px', fontFamily: 'monospace' }}>S{i+1}</span>
                    ))}
                  </div>
                </div>

                {/* Downloads */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '9px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Download size={15} style={{ color: '#34d399' }} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#fff' }}>Download Any Show</span>
                        <span style={{ fontSize: '0.65rem', background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)', padding: '1px 7px', borderRadius: '99px', fontWeight: 700 }}>NEW</span>
                      </div>
                      <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', margin: 0 }}>Offline viewing, your quality</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', paddingLeft: '44px' }}>
                    {['480p','720p','1080p','4K'].map(q => (
                      <span key={q} style={{ fontSize: '0.65rem', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399', padding: '2px 7px', borderRadius: '5px', fontFamily: 'monospace' }}>{q}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ════ RIGHT — FEATURES + TIPS + FAQ ════ */}
          <div className="help-right-col">

            {/* ALL FEATURES */}
            <div style={{ marginBottom: '36px' }}>
              <SectionLabel icon={<Sparkles size={13} />} label="All Features" />
              {featureGroups.map(group => (
                <div key={group.label} style={{ marginBottom: '24px' }}>
                  <p className={cn('text-xs font-bold uppercase tracking-widest mb-4', group.color)}>{group.label}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
                    {group.features.map(f => (
                      <div key={f.name} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border', group.iconBg, group.iconBorder, group.iconColor)} style={{ marginTop: 1 }}>
                          {f.icon}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>{f.name}</span>
                            <CheckCircle style={{ width: 12, height: 12, color: '#22c55e', flexShrink: 0 }} />
                          </div>
                          <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginTop: '2px', lineHeight: 1.4 }}>{f.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* TIPS */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '28px', marginBottom: '28px' }}>
              <SectionLabel icon={<Lightbulb size={13} />} label="Quick Tips" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tips.map((tip, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '99px', background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.2)', color: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, marginTop: '1px' }}>{i+1}</span>
                    <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, margin: 0 }}>{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '28px' }}>
              <SectionLabel icon={<HelpCircle size={13} />} label="Frequently Asked Questions" />
              <div>
                {faqs.map((faq, i) => (
                  <div key={i} className="faq-row">
                    <button className="faq-btn" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 500, color: openFaq === i ? 'var(--primary)' : '#fff', transition: 'color 0.2s' }}>{faq.question}</span>
                      {openFaq === i
                        ? <ChevronUp style={{ width: 15, height: 15, color: 'var(--primary)', flexShrink: 0 }} />
                        : <ChevronDown style={{ width: 15, height: 15, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />}
                    </button>
                    {openFaq === i && (
                      <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', paddingBottom: '14px', lineHeight: 1.6, margin: 0 }}>{faq.answer}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <p style={{ marginTop: '48px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.05em', textAlign: 'center' }}>
          ⚓ PirateOne · Your feedback matters
        </p>
      </div>
    </>
  );
};

export default Help;
