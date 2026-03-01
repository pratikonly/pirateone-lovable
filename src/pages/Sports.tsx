import { ExternalLink, Tv, Globe, Zap, Radio, Search, MessageSquare, Star, Shield, Layout, Users } from 'lucide-react';
import strikePreview from '@/assets/strike-preview.png';

const features = [
  { icon: <Tv className="w-5 h-5" />, title: 'Live Streaming', desc: 'Watch live matches with auto-advancing carousel, multiple stream sources, and HD quality selection.' },
  { icon: <Radio className="w-5 h-5" />, title: 'Live Now & Scheduled', desc: 'Browse currently streaming matches or upcoming fixtures sorted by sport category.' },
  { icon: <Globe className="w-5 h-5" />, title: 'Multi-Sport Coverage', desc: 'Football, Cricket, Basketball, Hockey, MotoSports, Olympics and more — all in one place.' },
  { icon: <Search className="w-5 h-5" />, title: 'Real-Time Search', desc: 'Search matches instantly by title, team name, or category.' },
  { icon: <Layout className="w-5 h-5" />, title: 'Match Stats Panel', desc: 'Live scores, team badges, venue info, stream sources, and category details on every watch page.' },
  { icon: <Zap className="w-5 h-5" />, title: 'Smart Proxy System', desc: 'Multi-layer proxy fallback chain ensures streams always load — Cloudflare Worker, corsproxy, allorigins.' },
  { icon: <Users className="w-5 h-5" />, title: 'Related Matches', desc: 'Same-category matches shown below the player so you never miss a game.' },
  { icon: <MessageSquare className="w-5 h-5" />, title: 'Feedback System', desc: 'Built-in feedback page with star ratings and email delivery via Resend API.' },
  { icon: <Shield className="w-5 h-5" />, title: 'Ad-Free Experience', desc: 'Clean, distraction-free interface with no intrusive ads or popups.' },
  { icon: <Star className="w-5 h-5" />, title: 'Dark Cyber Theme', desc: 'Sleek dark UI with cyan accents, glass effects, and smooth Framer Motion animations.' },
];

const Sports = () => {
  return (
    <div className="min-h-screen px-4 md:px-8 py-6 pb-16">
      {/* Hero Section */}
      <div className="relative rounded-2xl overflow-hidden mb-10 border border-[#00e5ff]/20">
        <img
          src={strikePreview}
          alt="Strike — Live Sports Streaming"
          className="w-full h-[220px] sm:h-[320px] md:h-[420px] object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[#00e5ff]/10 border border-[#00e5ff]/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-[#00e5ff]" viewBox="0 0 512 512" fill="currentColor">
                <path d="M41.78 21.78c-4.997-.165-10.197 1.67-14.655 6.126-15.113 11.567-8.733 29.44 5.906 34.438-11.887 26.758 18.28 38.818 32.69 22.78 1.77 6.353 5.607 11.64 10.53 15.75-6.834 17.716-.453 35.182 10.47 46 17.075 16.914 34.658 11.5 53.78 3.064 5.01 7.768 11.952 14.45 19.844 19.28-8.644 2.492-15.876 8.443-19.844 16.345-12.357-12.712-32.463-4.77-34.28 8.562-2.857 20.933 23.414 31.447 33.093 17.72 4.16 10.35 13.758 17.576 25.125 19.28-20.317 15.863-18.628 46.463-.97 66 18.947 20.96 43.435 16.498 61.688 2.906 1.916 8.895 6.22 16.504 11.688 23.376-18.523 22.26-.477 54.163 22.78 54.875l8.876-6.06c-11.923-16.82-21.032-35.764-21.03-55.533 0-14.22 2.558-27.89 7.25-40.625l18.218 4.688c-4.375 11.248-6.782 23.355-6.782 35.938 0 14.232 7.458 30.79 18.625 46.187 9.12 12.572 20.516 24.252 31.158 33.563 2.31-15.783 2.148-32.015-2.438-49.563l18.094-4.72c10.652 40.76.39 75.718-10.844 108.126l42.094-26.06.406 45.717c.177.064.354.125.53.188l34.345-31.47 4.313 40.845.28.03c.01.002.022 0 .032 0L431.47 441l17.78 31.406c2.94-7.53 10.04-26.205 18.313-52.656 4.41-14.107 8.78-29.58 12.375-44.875h-.282c-17.53 0-31.75-14.193-31.75-31.72 0-17.525 14.22-31.75 31.75-31.75 2.998 0 5.877.443 8.625 1.22-2.127-53.22-45.973-97.026-102.655-100.78l.656-18.657c34.642 2.17 65.52 17.385 87.376 40.53 35.083-17.25 5.977-66.633-23.625-44.062 2.46-48.01-46.01-78.18-81.186-63.062-8.016-38.908-78.668-34.988-90.53-4.688l-25.127-8.75c-1.872-32.22-28.622-57.812-61.312-57.812-21.19 0-39.78 11.107-50.813 27.437l-12.25-7c-.32-17.463-14.582-31.53-32.125-31.53-11.532 0-21.208 6.03-26.874 15.156l-9.907-8.75c6.058-15.098-5.352-28.45-18.125-28.875zm236.44 37.032c-8.926 0-16.158 7.232-16.158 16.157 0 8.923 7.232 16.155 16.157 16.155 8.923 0 16.155-7.232 16.155-16.156 0-8.926-7.232-16.157-16.156-16.157zM45.114 103.196c-6.348 0-11.494 5.146-11.494 11.494 0 6.347 5.147 11.494 11.495 11.494 6.348 0 11.494-5.147 11.494-11.495 0-6.35-5.147-11.495-11.495-11.495zm298.197 94.15l2.063 18.75c-18.395 5.263-34.75 14.895-47.75 27.56L285.78 229.22c15.764-14.956 35.505-26.105 57.533-31.876zm39.563 92.53c20.235 0 36.625 16.425 36.625 36.656 0 20.233-16.39 36.626-36.625 36.626s-36.656-16.393-36.656-36.625c0-20.23 16.42-36.655 36.655-36.655zm-193.906 43.22c-11.435 0-20.69 9.253-20.69 20.686 0 11.435 9.255 20.72 20.69 20.72 11.432 0 20.718-9.285 20.718-20.72 0-11.432-9.286-20.686-20.72-20.686zm244.093 20.624l11.687 62.936-41.813-4.437 30.125-58.5z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl font-display text-white tracking-wider">STRIKE</h1>
              <p className="text-[#00e5ff] text-xs font-medium">Live Sports Streaming</p>
            </div>
          </div>
          <p className="text-[#a0a0a0] text-sm md:text-base max-w-2xl mb-5 leading-relaxed">
            Watch live football, cricket, basketball, motorsports, and more — all free, all in one sleek dark interface. Built with React, powered by a multi-proxy stream system.
          </p>
          <a
            href="https://strike-main.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #00e5ff, #00b8d4)',
              color: '#0d0d0d',
              boxShadow: '0 0 20px rgba(0,229,255,0.3)',
            }}
          >
            <ExternalLink className="w-4 h-4" />
            Visit Strike
          </a>
        </div>
      </div>

      {/* Features Grid */}
      <div className="mb-10">
        <h2 className="text-xl md:text-2xl font-display tracking-wider text-foreground mb-6">Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div
              key={i}
              className="rounded-xl p-5 border transition-all duration-200 hover:border-[#00e5ff]/40"
              style={{
                background: '#141414',
                borderColor: '#1a1a1a',
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="text-[#00e5ff]">{f.icon}</div>
                <h3 className="font-semibold text-sm text-foreground">{f.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tech & Design Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <div className="rounded-xl p-6 border" style={{ background: '#141414', borderColor: '#1a1a1a' }}>
          <h3 className="font-display text-lg tracking-wider text-foreground mb-4">Design System</h3>
          <div className="space-y-3">
            {[
              { color: '#00e5ff', label: 'Cyan — Primary accent' },
              { color: '#ff4757', label: 'Red — Live indicators' },
              { color: '#ffa502', label: 'Orange — Popular badges' },
              { color: '#2ed573', label: 'Green — Success states' },
            ].map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ background: c.color, boxShadow: `0 0 8px ${c.color}60` }} />
                <span className="text-xs text-muted-foreground">{c.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-[#1a1a1a]">
            <p className="text-xs text-muted-foreground"><span className="text-foreground font-medium">Fonts:</span> Outfit (UI) · JetBrains Mono (data)</p>
            <p className="text-xs text-muted-foreground mt-1"><span className="text-foreground font-medium">Theme:</span> 4-layer dark surfaces · Glass effects · Framer Motion</p>
          </div>
        </div>

        <div className="rounded-xl p-6 border" style={{ background: '#141414', borderColor: '#1a1a1a' }}>
          <h3 className="font-display text-lg tracking-wider text-foreground mb-4">Tech Stack</h3>
          <div className="flex flex-wrap gap-2">
            {['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'Framer Motion', 'shadcn/ui', 'Cloudflare Workers', 'Resend API', 'TheSportsDB API', 'Vercel'].map((t, i) => (
              <span
                key={i}
                className="px-3 py-1.5 rounded-full text-xs font-medium border"
                style={{ background: '#1a1a1a', borderColor: '#222222', color: '#a0a0a0' }}
              >
                {t}
              </span>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-[#1a1a1a]">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Multi-proxy fallback system ensures streams always load. Auto-refetches every 2 minutes. HD stream auto-selection. Responsive grid layouts for all devices.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center py-8 rounded-xl border" style={{ background: '#141414', borderColor: '#1a1a1a' }}>
        <h2 className="font-display text-2xl tracking-wider text-foreground mb-2">Ready to Watch?</h2>
        <p className="text-sm text-muted-foreground mb-5">Stream live sports for free — no account needed.</p>
        <a
          href="https://strike-main.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-semibold transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, #00e5ff, #00b8d4)',
            color: '#0d0d0d',
            boxShadow: '0 0 24px rgba(0,229,255,0.35)',
          }}
        >
          <ExternalLink className="w-4 h-4" />
          Go to Strike
        </a>
      </div>
    </div>
  );
};

export default Sports;
