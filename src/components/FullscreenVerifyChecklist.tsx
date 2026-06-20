import { useEffect, useMemo, useState } from 'react';
import { Check, Chrome, Compass, Flame, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type BrowserKey = 'chrome' | 'safari' | 'firefox';

const STORAGE_KEY = 'fs-verify-checklist-v1';

const BROWSERS: { key: BrowserKey; label: string; Icon: typeof Chrome }[] = [
  { key: 'chrome',  label: 'Chrome',  Icon: Chrome },
  { key: 'safari',  label: 'Safari',  Icon: Compass },
  { key: 'firefox', label: 'Firefox', Icon: Flame },
];

const detectBrowser = (): BrowserKey | null => {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  if (/Firefox\//.test(ua)) return 'firefox';
  if (/Edg\//.test(ua) || /Chrome\//.test(ua)) return 'chrome';
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'safari';
  return null;
};

type State = Record<BrowserKey, 'untested' | 'pass' | 'fail'>;
const EMPTY: State = { chrome: 'untested', safari: 'untested', firefox: 'untested' };

export default function FullscreenVerifyChecklist() {
  const [state, setState] = useState<State>(EMPTY);
  const [open, setOpen]   = useState(true);
  const current = useMemo(detectBrowser, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...EMPTY, ...JSON.parse(raw) });
    } catch { /* ignore */ }
  }, []);

  const update = (key: BrowserKey, value: State[BrowserKey]) => {
    const next = { ...state, [key]: value };
    setState(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const reset = () => {
    setState(EMPTY);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  };

  const passed = Object.values(state).filter(v => v === 'pass').length;

  return (
    <div className="rounded-md border border-white/10 bg-zinc-900/60">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs"
      >
        <span className="font-semibold text-white/90">
          Fullscreen verification ({passed}/3)
        </span>
        <span className="text-white/50">{open ? 'Hide' : 'Show'}</span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2">
          <p className="text-[11px] text-white/60 leading-relaxed">
            Click the fullscreen button inside the player below in each browser, then mark the result.
            {current && <> Current browser detected: <span className="font-semibold text-white/80 capitalize">{current}</span>.</>}
          </p>

          <ul className="space-y-1.5">
            {BROWSERS.map(({ key, label, Icon }) => {
              const value = state[key];
              const isCurrent = current === key;
              return (
                <li key={key} className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded text-xs',
                  isCurrent ? 'bg-white/5 ring-1 ring-white/10' : 'bg-transparent',
                )}>
                  <Icon className="w-3.5 h-3.5 text-white/70" />
                  <span className="flex-1 text-white/80">
                    {label}{isCurrent && <span className="ml-1 text-[10px] text-emerald-400">(you)</span>}
                  </span>
                  <span className={cn(
                    'text-[10px] uppercase tracking-wide',
                    value === 'pass' && 'text-emerald-400',
                    value === 'fail' && 'text-red-400',
                    value === 'untested' && 'text-white/40',
                  )}>{value}</span>
                  <button
                    onClick={() => update(key, value === 'pass' ? 'untested' : 'pass')}
                    aria-label={`Mark ${label} as working`}
                    className={cn(
                      'p-1 rounded border',
                      value === 'pass'
                        ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                        : 'border-white/10 text-white/60 hover:text-emerald-300 hover:border-emerald-400/40',
                    )}
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => update(key, value === 'fail' ? 'untested' : 'fail')}
                    aria-label={`Mark ${label} as broken`}
                    className={cn(
                      'p-1 rounded border',
                      value === 'fail'
                        ? 'bg-red-500/20 border-red-400/40 text-red-300'
                        : 'border-white/10 text-white/60 hover:text-red-300 hover:border-red-400/40',
                    )}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex justify-end">
            <button
              onClick={reset}
              className="text-[11px] text-white/50 hover:text-white/80 underline underline-offset-2"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
