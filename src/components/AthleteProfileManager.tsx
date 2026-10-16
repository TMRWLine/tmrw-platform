import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

interface AthleteProfileData {
  id: string;
  name: string;
  full_name: string;
  sport: string;
  club: string;
  league: string;
  postcode: string;
  position: string;
  market_value: number;
  gross_ex_gst: number;
  currency: 'AUD' | 'NZD';
  stripe_account_id: string | null;
  status: string;
  is_approved: boolean;
}

export const AthleteProfileManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [formData, setFormData] = useState<AthleteProfileData>({
    id: '',
    name: '',
    full_name: '',
    sport: '',
    club: '',
    league: '',
    postcode: '',
    position: '',
    market_value: 0,
    gross_ex_gst: 0,
    currency: 'AUD',
    stripe_account_id: null,
    status: 'No Agreement',
    is_approved: false,
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: athlete, error: athleteErr } = await supabase
        .from('athletes')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (athleteErr) throw athleteErr;

      const { data: financials } = await supabase
        .from('athlete_financials')
        .select('*')
        .eq('athlete_id', athlete.id)
        .single();

      setFormData({
        id: athlete.id,
        name: athlete.name || '',
        full_name: athlete.full_name || athlete.name || '',
        sport: athlete.sport || '',
        club: athlete.club || '',
        league: athlete.league || '',
        postcode: athlete.postcode || '',
        position: financials?.position || '',
        market_value: financials?.market_value || 0,
        gross_ex_gst: financials?.gross_ex_gst || 0,
        currency: financials?.currency || 'AUD',
        stripe_account_id: financials?.stripe_account_id || null,
        status: athlete.status || 'No Agreement',
        is_approved: athlete.is_approved || false,
      });
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSavedSuccess(false);
      const monogram = formData.full_name.substring(0, 2).toUpperCase();

      const { error: athleteError } = await supabase
        .from('athletes')
        .update({
          name: formData.name,
          full_name: formData.full_name,
          sport: formData.sport,
          club: formData.club,
          league: formData.league,
          postcode: formData.postcode,
          monogram,
        })
        .eq('id', formData.id);

      if (athleteError) throw athleteError;

      const { error: finError } = await supabase
        .from('athlete_financials')
        .update({
          position: formData.position,
          market_value: Number(formData.market_value),
          gross_ex_gst: Number(formData.gross_ex_gst),
          currency: formData.currency,
        })
        .eq('athlete_id', formData.id);

      if (finError) throw finError;

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060709] text-white flex items-center justify-center font-mono text-[11px] tracking-[0.2em]">
        INITIALISING TALENT PROFILE...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060709] text-white px-6 py-12 lg:px-16 selection:bg-[#D2FF00] selection:text-black">
      <div className="max-w-4xl mx-auto border border-white/15 bg-black/40 backdrop-blur-md p-8 md:p-12 relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/10 pb-6 mb-8 gap-4">
          <div>
            <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-[#D2FF00] font-semibold">
              // ATHLETE OPERATIONAL PROFILE
            </span>
            <h1 className="text-3xl font-extrabold uppercase tracking-tight mt-1">
              {formData.full_name || 'TALENT TERMINAL'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className={`font-mono text-[9px] uppercase tracking-[0.16em] px-3 py-1 rounded-full border ${
              formData.is_approved ? 'border-[#D2FF00] text-[#D2FF00]' : 'border-amber-400 text-amber-400'
            }`}>
              {formData.is_approved ? 'VERIFIED TALENT' : 'PENDING COMPLIANCE'}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] px-3 py-1 rounded-full border border-white/20 text-white/70">
              STATUS: {formData.status}
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-white/60 mb-2">
                Legal Full Name
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                className="w-full bg-[#0E1015] border border-white/20 px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-[#D2FF00] transition-colors"
              />
            </div>
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-white/60 mb-2">
                Display Name (Roster)
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full bg-[#0E1015] border border-white/20 px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-[#D2FF00] transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-white/60 mb-2">
                Sport Discipline
              </label>
              <input
                type="text"
                name="sport"
                value={formData.sport}
                onChange={handleChange}
                required
                className="w-full bg-[#0E1015] border border-white/20 px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-[#D2FF00] transition-colors"
              />
            </div>
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-white/60 mb-2">
                Current Club
              </label>
              <input
                type="text"
                name="club"
                value={formData.club}
                onChange={handleChange}
                required
                className="w-full bg-[#0E1015] border border-white/20 px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-[#D2FF00] transition-colors"
              />
            </div>
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-white/60 mb-2">
                Playing Position
              </label>
              <input
                type="text"
                name="position"
                value={formData.position}
                onChange={handleChange}
                placeholder="e.g. Flyhalf, Point Guard"
                className="w-full bg-[#0E1015] border border-white/20 px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-[#D2FF00] transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-white/60 mb-2">
                Representative League
              </label>
              <input
                type="text"
                name="league"
                value={formData.league}
                onChange={handleChange}
                required
                className="w-full bg-[#0E1015] border border-white/20 px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-[#D2FF00] transition-colors"
              />
            </div>
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-white/60 mb-2">
                Primary Postcode (Geospatial Anchor)
              </label>
              <input
                type="text"
                name="postcode"
                value={formData.postcode}
                onChange={handleChange}
                required
                className="w-full bg-[#0E1015] border border-white/20 px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-[#D2FF00] transition-colors"
              />
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-white/60 mb-4 block">
              // FINANCIAL PARAMETERS & COMMERCIAL CLEARANCE
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-white/60 mb-2">
                  Market Valuation
                </label>
                <input
                  type="number"
                  name="market_value"
                  value={formData.market_value}
                  onChange={handleChange}
                  className="w-full bg-[#0E1015] border border-white/20 px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-[#D2FF00] transition-colors"
                />
              </div>
              <div>
                <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-white/60 mb-2">
                  Match Fee (Ex GST)
                </label>
                <input
                  type="number"
                  name="gross_ex_gst"
                  value={formData.gross_ex_gst}
                  onChange={handleChange}
                  className="w-full bg-[#0E1015] border border-white/20 px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-[#D2FF00] transition-colors"
                />
              </div>
              <div>
                <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-white/60 mb-2">
                  Settlement Currency
                </label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  className="w-full bg-[#0E1015] border border-white/20 px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-[#D2FF00] transition-colors"
                >
                  <option value="AUD">AUD ($)</option>
                  <option value="NZD">NZD ($)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="border border-white/10 p-4 bg-[#0A0C10] flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/60">
                Stripe Express Payout Rail
              </span>
              <span className="font-mono text-xs text-white mt-1">
                {formData.stripe_account_id ? `CONNECTED: ${formData.stripe_account_id}` : 'NO PAYOUT ACCOUNT CONNECTED'}
              </span>
            </div>
            <button
              type="button"
              className="px-4 py-2 border border-white/20 hover:border-white font-mono text-[10px] tracking-[0.16em] uppercase transition-colors"
            >
              {formData.stripe_account_id ? 'UPDATE STRIPE' : 'CONNECT PAYOUTS'}
            </button>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-white/10">
            {savedSuccess ? (
              <span className="font-mono text-[10px] tracking-[0.2em] text-[#D2FF00] uppercase font-semibold">
                PROFILE DIRECTORY UPDATED
              </span>
            ) : <div />}
            <button
              type="submit"
              disabled={saving}
              className="bg-white text-black font-mono text-[11px] uppercase tracking-[0.16em] px-8 py-3.5 rounded-full hover:bg-[#D2FF00] transition-colors font-bold disabled:opacity-50"
            >
              {saving ? 'SYNCHRONISING...' : 'SAVE ATHLETE PROFILE ->'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AthleteProfileManager;