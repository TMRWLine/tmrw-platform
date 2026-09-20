import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { onboardingStorageKey } from '../lib/specimenPrivacy';

const SPORTS = [
  'Rugby Union',
  'Rugby League',
  'Basketball',
  'AFL',
  'Netball',
  'Tennis',
  'Golf',
  'Triathlon',
  'Combat Sports',
  'Cricket',
  'Football',
];

const fieldClass =
  'font-mono border border-white/15 bg-white/[0.02] text-white px-4 py-3 text-xs focus:border-[#D2FF00] outline-none w-full rounded-none';

export function AthleteOnboardingDrawer({
  userId,
  onComplete,
  onClose,
}: {
  userId: string;
  onComplete: () => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [postcode, setPostcode] = useState('');
  const [sport, setSport] = useState('Rugby Union');
  const [reelName, setReelName] = useState<string | null>(null);
  const [stripeReady, setStripeReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish() {
    if (!stripeReady) {
      setError('Connect the payout rail before entering the ledger.');
      return;
    }
    setBusy(true);
    setError(null);
    const payload = {
      id: userId,
      role: 'athlete' as const,
      postcode: postcode.trim(),
      sport,
      highlight_reel_url: reelName,
      stripe_connect_id: 'acct_onboarding_linked',
      onboarding_complete: true,
    };
    await supabase.from('profiles').upsert(payload);
    window.localStorage.setItem(onboardingStorageKey(userId), 'complete');
    setBusy(false);
    onComplete();
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-end bg-black/70 backdrop-blur-md">
      <aside className="w-full max-w-lg h-full bg-[#08080A] border-l border-white/10 p-8 overflow-y-auto relative">
        <button
          type="button"
          className="absolute top-6 right-6 text-zinc-500 hover:text-white font-mono text-xs uppercase cursor-pointer"
          onClick={onClose}
        >
          Close
        </button>
        <p className="font-mono text-[10px] tracking-widest uppercase text-[#D2FF00] mb-2">
          // ATHLETE ONBOARDING · STEP {step} / 3
        </p>
        <h2 className="text-2xl font-black uppercase tracking-tight text-white mt-0 mb-6">
          {step === 1 && 'Primary postcode & sport'}
          {step === 2 && 'Highlight reel upload'}
          {step === 3 && 'Stripe Connect payouts'}
        </h2>

        {step === 1 && (
          <div className="grid gap-4">
            <label className="font-mono text-[10px] tracking-widest uppercase text-zinc-500">
              Home postcode
              <input
                className={`${fieldClass} mt-2`}
                inputMode="numeric"
                maxLength={4}
                value={postcode}
                onChange={(e) => setPostcode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="2000"
              />
            </label>
            <label className="font-mono text-[10px] tracking-widest uppercase text-zinc-500">
              Primary sport
              <select className={`${fieldClass} mt-2`} value={sport} onChange={(e) => setSport(e.target.value)}>
                {SPORTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={postcode.length !== 4}
              className="w-full bg-[#D2FF00] text-black font-mono text-xs uppercase tracking-widest py-3 border-0 cursor-pointer disabled:opacity-40"
              onClick={() => setStep(2)}
            >
              Continue →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4">
            <label className="border border-dashed border-white/20 p-8 text-center font-mono text-xs text-zinc-400 cursor-pointer">
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => setReelName(e.target.files?.[0]?.name ?? null)}
              />
              {reelName ? `Queued: ${reelName}` : 'Drop a vertical highlight reel or click to upload'}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 border border-white/15 text-zinc-300 font-mono text-xs uppercase tracking-widest py-3 bg-transparent cursor-pointer"
                onClick={() => setStep(1)}
              >
                Back
              </button>
              <button
                type="button"
                disabled={!reelName}
                className="flex-1 bg-[#D2FF00] text-black font-mono text-xs uppercase tracking-widest py-3 border-0 cursor-pointer disabled:opacity-40"
                onClick={() => setStep(3)}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4">
            <p className="font-mono text-xs text-zinc-400 leading-relaxed m-0">
              Link Stripe Connect so Saturday disbursements settle directly to your account. Platform fee and
              community fund are applied automatically after you connect.
            </p>
            <button
              type="button"
              className={`w-full font-mono text-xs uppercase tracking-widest py-3 border-0 cursor-pointer ${
                stripeReady ? 'bg-white text-black' : 'bg-[#D2FF00] text-black'
              }`}
              onClick={() => setStripeReady(true)}
            >
              {stripeReady ? 'Payout rail linked' : 'Connect Stripe payouts'}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 border border-white/15 text-zinc-300 font-mono text-xs uppercase tracking-widest py-3 bg-transparent cursor-pointer"
                onClick={() => setStep(2)}
              >
                Back
              </button>
              <button
                type="button"
                disabled={busy}
                className="flex-1 bg-white text-black font-mono text-xs uppercase tracking-widest py-3 border-0 cursor-pointer disabled:opacity-40"
                onClick={() => void finish()}
              >
                {busy ? 'Saving…' : 'Enter dashboard →'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="font-mono text-[11px] text-red-400 mt-4 mb-0" role="alert">
            {error}
          </p>
        )}
      </aside>
    </div>
  );
}
