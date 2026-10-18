import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface AthleteAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AthleteAuthModal: React.FC<AthleteAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  if (!isOpen) return null;

  const switchMode = (magic: boolean) => {
    setUseMagicLink(magic);
    setLinkSent(false);
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (useMagicLink) {
        // Passwordless: Supabase emails a one-time link that returns the user to this origin signed in.
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: window.location.origin,
            // Only applied when the email is new; existing users keep their stored role.
            data: { role: 'athlete' },
          },
        });
        if (error) throw error;
        setLinkSent(true);
        return;
      }
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: 'athlete',
              full_name: fullName,
            },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
      <div className="w-full max-w-md border border-white/20 bg-[#060709] p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white font-mono text-sm"
        >
          ✕
        </button>
        <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-[#D2FF00] font-semibold">
          // TALENT ACCESS
        </span>
        <h2 className="text-2xl font-black uppercase tracking-tight text-white mt-1 mb-6">
          {useMagicLink ? 'Passwordless Sign-In' : isSignUp ? 'Claim Your Backing' : 'Enter Talent Terminal'}
        </h2>

        {linkSent ? (
          <div className="space-y-6">
            <div
              role="status"
              data-testid="magic-link-sent"
              className="p-4 border border-[#D2FF00]/50 bg-[#D2FF00]/10 text-[#D2FF00] font-mono text-xs tracking-[0.08em] leading-relaxed"
            >
              Check your inbox for your secure sign-in link.
              <span className="block mt-2 text-white/60">Sent to {email.trim()}</span>
            </div>
            <button
              type="button"
              onClick={() => switchMode(false)}
              className="font-mono text-[10px] text-white/50 hover:text-white uppercase tracking-[0.16em]"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <>

            {errorMsg && (
              <div className="mb-4 p-3 border border-red-500/40 bg-red-950/20 text-red-400 font-mono text-[10px] uppercase tracking-[0.16em]">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && !useMagicLink && (
                <div>
                  <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-white/60 mb-1">
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#0E1015] border border-white/20 px-3 py-2 font-mono text-sm text-white focus:outline-none focus:border-[#D2FF00]"
                  />
                </div>
              )}
              <div>
                <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-white/60 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0E1015] border border-white/20 px-3 py-2 font-mono text-sm text-white focus:outline-none focus:border-[#D2FF00]"
                />
              </div>
              {!useMagicLink && (
                <div>
                  <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-white/60 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#0E1015] border border-white/20 px-3 py-2 font-mono text-sm text-white focus:outline-none focus:border-[#D2FF00]"
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black font-mono text-[11px] uppercase tracking-[0.16em] py-3 rounded-full hover:bg-[#D2FF00] transition-colors font-bold mt-4"
              >
                {loading
                  ? 'PROCESSING...'
                  : useMagicLink
                    ? 'EMAIL ME A SIGN-IN LINK ->'
                    : isSignUp
                      ? 'CREATE TALENT PROFILE ->'
                      : 'SIGN IN ->'}
              </button>
            </form>

            <div className="mt-6 text-center space-y-3">
              <button
                type="button"
                onClick={() => switchMode(!useMagicLink)}
                data-testid="toggle-magic-link"
                className="block w-full font-mono text-[10px] text-[#D2FF00] hover:text-white uppercase tracking-[0.16em]"
              >
                {useMagicLink ? 'Use a password instead' : 'Email me a sign-in link (no password)'}
              </button>
              {!useMagicLink && (
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="block w-full font-mono text-[10px] text-white/50 hover:text-white uppercase tracking-[0.16em]"
                >
                  {isSignUp ? 'Already registered? Sign In' : 'New talent? Create an account'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
