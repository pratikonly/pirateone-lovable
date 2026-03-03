import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import pirateOneLogo from '@/assets/pirateone-logo.png';

/* ─── Floating movie-poster columns ─── */
const POSTER_COLS = [
  [
    'https://image.tmdb.org/t/p/w300/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
    'https://image.tmdb.org/t/p/w300/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',
    'https://image.tmdb.org/t/p/w300/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
    'https://image.tmdb.org/t/p/w300/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg',
    'https://image.tmdb.org/t/p/w300/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg',
    'https://image.tmdb.org/t/p/w300/hek3koDUyRQk7FIhPXsa6mT2Zbo.jpg',
  ],
  [
    'https://image.tmdb.org/t/p/w300/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg',
    'https://image.tmdb.org/t/p/w300/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
    'https://image.tmdb.org/t/p/w300/NNxYkU70HPurnNCSiCjYAmacwm.jpg',
    'https://image.tmdb.org/t/p/w300/rktDFPbfHfUbArZ6OOOKsXcv0Bm.jpg',
    'https://image.tmdb.org/t/p/w300/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    'https://image.tmdb.org/t/p/w300/zdjkLpDuLqFPMzJCFJZjRkz3UBm.jpg',
  ],
  [
    'https://image.tmdb.org/t/p/w300/or06FN3Dka5tukK1e9sl16pB3iy.jpg',
    'https://image.tmdb.org/t/p/w300/velWPhVMQeQKcxggNEU8YmIo52R.jpg',
    'https://image.tmdb.org/t/p/w300/kqjL17yufvn9OVLyXYpvtyrFfak.jpg',
    'https://image.tmdb.org/t/p/w300/2CAL2433ZeIihfX1Hb2139CX0pW.jpg',
    'https://image.tmdb.org/t/p/w300/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
    'https://image.tmdb.org/t/p/w300/fOy2Jurz9k6RnJnMbVOwGKdZx2C.jpg',
  ],
  [
    'https://image.tmdb.org/t/p/w300/sv1xJUazXeYqALzczSZ3O6nkH75.jpg',
    'https://image.tmdb.org/t/p/w300/qNBAXBIQlnOThrVvA6mA2B5ggkl.jpg',
    'https://image.tmdb.org/t/p/w300/8kSerJrhrJWKLk1LViesGcnrVPE.jpg',
    'https://image.tmdb.org/t/p/w300/gEjNlhZhyHeto6a68ooh7xDiAhO.jpg',
    'https://image.tmdb.org/t/p/w300/A3ZbZsmsvNGdprRi2lKgGEeVLEH.jpg',
    'https://image.tmdb.org/t/p/w300/xmbU4JTUm4GYKE56n9TXjyHbCGw.jpg',
  ],
];

const PosterColumn = ({ images, reverse = false }: { images: string[]; reverse?: boolean }) => (
  <div
    className={`flex flex-col gap-3 ${reverse ? 'animate-scroll-up' : 'animate-scroll-down'}`}
    style={{ animationDuration: reverse ? '35s' : '28s' }}
  >
    {[...images, ...images].map((src, i) => (
      <div key={i} className="w-28 h-40 rounded-lg overflow-hidden flex-shrink-0 opacity-60 hover:opacity-80 transition-opacity duration-500">
        <img
          src={src}
          alt=""
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      </div>
    ))}
  </div>
);

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@') || !email.includes('.')) {
      toast.error('Please enter a valid email address');
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) toast.error(error.message);
        else { toast.success('Welcome back, pirate! ⚓'); navigate('/'); }
      } else {
        if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
        const { error } = await signUp(email, password);
        if (error) toast.error(error.message);
        else { toast.success('Welcome aboard, pirate! 🏴‍☠️'); navigate('/'); }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes scrollDown {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        @keyframes scrollUp {
          0%   { transform: translateY(-50%); }
          100% { transform: translateY(0); }
        }
        .animate-scroll-down { animation: scrollDown linear infinite; }
        .animate-scroll-up   { animation: scrollUp  linear infinite; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.6s ease forwards; }
        .fade-up-1 { animation: fadeUp 0.6s 0.1s ease both; }
        .fade-up-2 { animation: fadeUp 0.6s 0.2s ease both; }
        .fade-up-3 { animation: fadeUp 0.6s 0.3s ease both; }
        .fade-up-4 { animation: fadeUp 0.6s 0.4s ease both; }

        .auth-input {
          background: rgba(255,255,255,0.05) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          color: #fff !important;
          height: 48px;
          font-size: 0.9rem;
          transition: border-color 0.2s, background 0.2s;
        }
        .auth-input::placeholder { color: rgba(255,255,255,0.3); }
        .auth-input:focus {
          outline: none;
          border-color: rgba(255,255,255,0.35) !important;
          background: rgba(255,255,255,0.08) !important;
          box-shadow: 0 0 0 3px rgba(255,255,255,0.04);
        }

        .submit-btn {
          height: 48px;
          font-size: 0.9rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          background: #fff;
          color: #0a0a0a;
          border: none;
          border-radius: 8px;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
        }
        .submit-btn:hover:not(:disabled) {
          background: rgba(255,255,255,0.9);
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      <div className="relative min-h-screen flex overflow-hidden" style={{ background: '#080808' }}>

        {/* ── Scrolling poster background ── */}
        <div className="absolute inset-0 flex gap-3 px-3 overflow-hidden pointer-events-none select-none">
          {POSTER_COLS.map((col, i) => (
            <PosterColumn key={i} images={col} reverse={i % 2 === 1} />
          ))}
          {/* Left-to-right gradient fade */}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to right, #080808 0%, transparent 30%, transparent 70%, #080808 100%)'
          }} />
          {/* Top and bottom fades */}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to bottom, #080808 0%, transparent 15%, transparent 85%, #080808 100%)'
          }} />
          {/* Dark center overlay */}
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse 60% 80% at 50% 50%, rgba(8,8,8,0.7) 0%, transparent 100%)'
          }} />
        </div>

        {/* ── Vignette grain ── */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
          opacity: 0.6,
        }} />

        {/* ── Center form ── */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-4 py-16">

          {/* Logo */}
          <div className="fade-up-1 flex flex-col items-center mb-10">
            <img
              src={pirateOneLogo}
              alt="PirateOne"
              className="h-10 object-contain invert dark:invert-0 mb-3"
            />
            <p className="text-xs tracking-[0.25em] uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Your streaming haven
            </p>
          </div>

          {/* Form panel */}
          <div
            className="fade-up-2 w-full"
            style={{
              maxWidth: '400px',
              background: 'rgba(18,18,18,0.85)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '36px 32px',
              boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
            }}
          >
            {/* Tab switcher */}
            <div className="fade-up-2 flex mb-8 rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', padding: '4px', gap: '4px' }}>
              {['Sign In', 'Sign Up'].map((tab) => {
                const active = (tab === 'Sign In') === isLogin;
                return (
                  <button
                    key={tab}
                    onClick={() => setIsLogin(tab === 'Sign In')}
                    className="flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200"
                    style={{
                      background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                      color: active ? '#fff' : 'rgba(255,255,255,0.4)',
                      border: active ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',
                      letterSpacing: '0.01em',
                    }}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* Heading */}
            <div className="fade-up-3 mb-6">
              <h1 className="text-2xl font-bold mb-1" style={{ color: '#fff', letterSpacing: '-0.02em' }}>
                {isLogin ? 'Welcome back' : 'Join the crew'}
              </h1>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {isLogin ? 'Sign in to continue watching' : 'Create your account to get started'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="fade-up-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Email
                </label>
                <input
                  type="email"
                  placeholder="pirate@sea.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="auth-input w-full rounded-lg px-4"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="auth-input w-full rounded-lg px-4 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'rgba(255,255,255,0.35)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {!isLogin && (
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Minimum 6 characters</p>
                )}
              </div>

              <button type="submit" disabled={loading} className="submit-btn w-full mt-2 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    {isLogin ? 'Signing in…' : 'Creating account…'}
                  </>
                ) : (
                  <>
                    {isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    {isLogin ? 'Sign In' : 'Create Account'}
                  </>
                )}
              </button>
            </form>

            {/* Toggle link */}
            <p className="mt-6 text-center text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="font-semibold transition-colors"
                style={{ color: 'rgba(255,255,255,0.75)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.75)')}
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>

          {/* Footer */}
          <p className="mt-8 text-xs text-center" style={{ color: 'rgba(255,255,255,0.2)', letterSpacing: '0.05em' }}>
            ⚓ &nbsp;Stream freely. No ads. No limits.
          </p>
        </div>
      </div>
    </>
  );
};

export default Auth;
