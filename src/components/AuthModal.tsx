import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface AuthModalProps {
  isOpen: boolean;
  initialRole: 'athlete' | 'sponsor';
  onClose: () => void;
}

type AuthRole = 'athlete' | 'sponsor';

export function AuthModal({ isOpen, initialRole, onClose }: AuthModalProps) {
  const [activeRole, setActiveRole] = useState<AuthRole>(initialRole);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<'idle' | 'otp' | 'oauth'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setActiveRole(initialRole);
    setEmail('');
    setBusy('idle');
    setError(null);
    setOtpSent(false);
  }, [isOpen, initialRole]);

  useEffect(() => {
    if (!isOpen) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const athleteActive = activeRole === 'athlete';

  function persistRole(role: AuthRole) {
    window.localStorage.setItem('tmrw-pending-role', role);
  }

  async function handleMagicLink(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Enter a work or personal email.');
      return;
    }
    setBusy('otp');
    setError(null);
    persistRole(activeRole);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { data: { role: activeRole } },
    });
    setBusy('idle');
    if (otpError) {
      setError(otpError.message);
      return;
    }
    setOtpSent(true);
  }

  async function handleGoogle() {
    setBusy('oauth');
    setError(null);
    persistRole(activeRole);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { data: { role: activeRole } } as { queryParams?: { [key: string]: string } },
    });
    if (oauthError) {
      setBusy('idle');
      setError(oauthError.message);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#08080A] border border-white/10 p-8 relative shadow-[0_0_50px_rgba(0,0,0,0.8)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute top-6 right-6 text-zinc-500 hover:text-white font-mono text-xs uppercase cursor-pointer bg-transparent border-0 p-0 appearance-none"
          onClick={onClose}
        >
          Close
        </button>

        <p className="font-mono text-[10px] tracking-widest uppercase text-[#D2FF00] mb-2">
          {athleteActive ? '// CLAIM BACKING' : '// DEPLOY CAPITAL'}
        </p>
        <h2 id="auth-modal-title" className="text-2xl font-black uppercase tracking-tight text-white mt-0 mb-6">
          {athleteActive ? 'Enter as talent.' : 'Enter as capital.'}
        </h2>

        <div className="flex mb-6" role="tablist" aria-label="Account role">
          <button
            type="button"
            role="tab"
            aria-selected={athleteActive}
            className={
              athleteActive
                ? 'bg-[#D2FF00] text-black font-bold font-mono text-xs px-4 py-2 border-0 cursor-pointer appearance-none rounded-none'
                : 'text-zinc-500 hover:text-zinc-300 font-mono text-xs px-4 py-2 border border-white/10 bg-transparent cursor-pointer appearance-none rounded-none'
            }
            onClick={() => {
              setActiveRole('athlete');
              setOtpSent(false);
              setError(null);
            }}
          >
            ATHLETE / BALLER
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!athleteActive}
            className={
              !athleteActive
                ? 'bg-white text-black font-bold font-mono text-xs px-4 py-2 border-0 cursor-pointer appearance-none rounded-none'
                : 'text-zinc-500 hover:text-zinc-300 font-mono text-xs px-4 py-2 border border-white/10 bg-transparent cursor-pointer appearance-none rounded-none'
            }
            onClick={() => {
              setActiveRole('sponsor');
              setOtpSent(false);
              setError(null);
            }}
          >
            BRAND / CORPORATE
          </button>
        </div>

        {otpSent ? (
          <p className="font-mono text-xs text-zinc-300 leading-relaxed mb-4">
            Magic link sent to {email.trim()}. Open it on this device to continue into the{' '}
            {athleteActive ? 'athlete' : 'sponsor'} workspace.
          </p>
        ) : (
          <form onSubmit={handleMagicLink}>
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="EMAIL ADDRESS"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="font-mono border border-white/15 bg-white/[0.02] text-white px-4 py-3 text-xs focus:border-[#D2FF00] outline-none w-full mb-4 placeholder:text-zinc-600 appearance-none rounded-none"
            />
            <button
              type="submit"
              disabled={busy !== 'idle'}
              className={`w-full font-mono text-xs uppercase tracking-widest py-3 mb-4 border-0 cursor-pointer appearance-none rounded-none ${
                athleteActive ? 'bg-[#D2FF00] text-black font-bold' : 'bg-white text-black font-bold'
              } disabled:opacity-60`}
            >
              {busy === 'otp' ? 'Sending link…' : 'Send magic link'}
            </button>
          </form>
        )}

        <button
          type="button"
          disabled={busy !== 'idle'}
          onClick={handleGoogle}
          className="border border-white/10 hover:bg-white/[0.03] text-zinc-300 text-xs py-3 w-full font-mono uppercase mb-4 flex items-center justify-center gap-2 bg-transparent cursor-pointer disabled:opacity-60 appearance-none rounded-none"
        >
          <GoogleMark />
          {busy === 'oauth' ? 'Redirecting…' : 'Continue with Google'}
        </button>

        {error && (
          <p className="font-mono text-[11px] text-red-400 m-0" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="12" height="12" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.8-6.6 7.2l.1.1 6.3 5.3C36.9 41.5 44 36 44 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}
