import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import './GuardianVerifyPage.mobile.css';

export const GUARDIAN_VERIFY_PATH = '/guardian-verify';

export const buildGuardianVerifyUrl = (token: string): string => {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${GUARDIAN_VERIFY_PATH}?token=${encodeURIComponent(token)}`;
};

interface AgreementData {
  id: string;
  athlete_name: string;
  full_name: string;
  sport: string;
  club: string;
  league: string;
  guardian_email: string;
  mou_status: string;
  is_minor: boolean;
  mou_text: string;
}

export const GuardianVerify: React.FC = () => {
  const [data, setData] = useState<AgreementData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSigned, setIsSigned] = useState<boolean>(false);

  const token = new URLSearchParams(window.location.search).get('token');

  useEffect(() => {
    const fetchAgreement = async () => {
      try {
        if (!supabase) throw new Error('Verification service is not configured.');
        if (!token) throw new Error('Open the private link for the agreement you were asked to review.');
        const { data: agreement, error } = await supabase.rpc('get_guardian_agreement', {
          lookup_token: token
        });

        if (error) throw error;
        if (!agreement) throw new Error('No agreement record found for this token.');

        setData(agreement);
        if (agreement.mou_status === 'signed') {
          setIsSigned(true);
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Unable to load legal agreement.');
      } finally {
        setLoading(false);
      }
    };

    fetchAgreement();
  }, [token]);

  const handleCountersign = async () => {
    if (data?.mou_status !== 'pending_guardian' || !token || token === 'demo-token') return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      if (!supabase) throw new Error('Verification service is not configured.');
      const { data: response, error } = await supabase.rpc('countersign_guardian_mou', {
        lookup_token: token,
      });

      if (error) throw error;
      if (response?.mou_status !== 'signed') {
        throw new Error('We could not record your signature.');
      }

      setIsSigned(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'We could not record your signature. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="guardian-verify-page min-h-screen bg-black text-white flex items-center justify-center font-mono">
        <p className="text-sm tracking-widest text-zinc-400">// VERIFYING CREDENTIALS...</p>
      </div>
    );
  }

  if (errorMessage && !data) {
    return (
      <div className="guardian-verify-page min-h-screen bg-black text-white flex items-center justify-center p-6 font-mono">
        <div className="guardian-verify-card max-w-md w-full border border-red-900 bg-red-950/20 p-6 rounded text-center">
          <p className="text-xs uppercase tracking-widest text-red-500 mb-2">// ACCESS RESTRICTED</p>
          <p className="text-sm text-zinc-300 mb-6">{errorMessage}</p>
          <a href="/" className="text-xs text-zinc-400 hover:text-white underline">RETURN TO HOME</a>
        </div>
      </div>
    );
  }

  return (
    <div className="guardian-verify-page min-h-screen bg-black text-white flex items-center justify-center p-4 font-mono">
      <div className="guardian-verify-card max-w-lg w-full border border-zinc-800 bg-zinc-950 p-8 rounded-lg shadow-2xl">
        <div className="mb-6">
          <p className="text-xs text-lime-400 uppercase tracking-widest mb-1">// GUARDIAN VERIFICATION</p>
          <h1 className="text-xl font-bold uppercase tracking-tight">Review a separate sponsorship licence</h1>
          <p className="mt-2 text-xs leading-relaxed text-zinc-300">This is not permission to show a profile to sponsors. An athlete and their guardian decide separately whether to grant commercial rights and whether to let a campaign use their photos or video.</p>
        </div>

        <div className="guardian-verify-details border border-zinc-800 bg-zinc-900/50 p-4 rounded mb-6 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-zinc-500">ATHLETE (MINOR):</span>
            <span className="text-white font-medium">{data?.athlete_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">DISCIPLINE:</span>
            <span className="text-white font-medium">{data?.sport}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">CLUB:</span>
            <span className="text-white font-medium">{data?.club}</span>
          </div>
        </div>

        {data && (data.mou_status === 'pending_guardian' || isSigned) ? (
          <div className="guardian-verify-terms border border-zinc-800 bg-black p-4 rounded text-xs text-zinc-300 leading-relaxed mb-6 space-y-3">
            <p className="text-zinc-200 font-semibold uppercase">Master Licence terms</p>
            <p className="whitespace-pre-line">{data.mou_text}</p>
            <p>Only countersign if you are the legal guardian and agree to the terms above. This does not approve a specific campaign or its use of photos or video.</p>
          </div>
        ) : (
          <p className="mb-6 text-xs leading-relaxed text-zinc-300">There is no separate licence awaiting your signature. To approve profile visibility, use the private profile review link instead.</p>
        )}

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-900 text-red-400 text-xs rounded text-center">
            {errorMessage}
          </div>
        )}

        {isSigned ? (
          <div className="p-4 border border-lime-500/30 bg-lime-950/20 text-center rounded">
            <p className="text-xs text-lime-400 font-bold tracking-widest uppercase">Licence countersigned</p>
            <p className="text-xs text-zinc-400 mt-1">Your signature is recorded for this agreement only.</p>
          </div>
        ) : data?.mou_status === 'pending_guardian' && token !== 'demo-token' ? (
          <button
            onClick={handleCountersign}
            disabled={submitting}
            className="w-full bg-white text-black font-semibold py-3 px-4 rounded text-xs uppercase tracking-wider hover:bg-zinc-200 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Recording signature…' : 'Countersign this licence'}
          </button>
        ) : null}
      </div>
    </div>
  );
};

export const GuardianVerifyPage = GuardianVerify;
export default GuardianVerifyPage;