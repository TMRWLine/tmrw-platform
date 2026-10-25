import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

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
  status: string;
  is_minor: boolean;
  mou_text: string;
}

export const GuardianVerify: React.FC = () => {
  const [data, setData] = useState<AgreementData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSigned, setIsSigned] = useState<boolean>(false);

  const getEffectiveToken = (): string => {
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get('token');
    if (!token || token === 'demo-token') {
      return '99999999-9999-9999-9999-000000000001';
    }
    return token;
  };

  useEffect(() => {
    const fetchAgreement = async () => {
      try {
        if (!supabase) throw new Error('Verification service is not configured.');
        const token = getEffectiveToken();
        const { data: agreement, error } = await supabase.rpc('get_guardian_agreement', {
          lookup_token: token
        });

        if (error) throw error;
        if (!agreement) throw new Error('No agreement record found for this token.');

        setData(agreement);
        if (agreement.status === 'signed') {
          setIsSigned(true);
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Unable to load legal agreement.');
      } finally {
        setLoading(false);
      }
    };

    fetchAgreement();
  }, []);

  const handleCountersign = async () => {
    setSubmitting(true);
    setErrorMessage(null);

    try {
      if (!supabase) throw new Error('Verification service is not configured.');
      const token = getEffectiveToken();
      const { data: response, error } = await supabase.rpc('countersign_guardian_mou', {
        lookup_token: token,
        token: token
      });

      if (error) throw error;
      if (response && response.success === false) {
        throw new Error(response.error || 'Failed to record signature.');
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
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-mono">
        <p className="text-sm tracking-widest text-zinc-400">// VERIFYING CREDENTIALS...</p>
      </div>
    );
  }

  if (errorMessage && !data) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 font-mono">
        <div className="max-w-md w-full border border-red-900 bg-red-950/20 p-6 rounded text-center">
          <p className="text-xs uppercase tracking-widest text-red-500 mb-2">// ACCESS RESTRICTED</p>
          <p className="text-sm text-zinc-300 mb-6">{errorMessage}</p>
          <a href="/" className="text-xs text-zinc-400 hover:text-white underline">RETURN TO HOME</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 font-mono">
      <div className="max-w-lg w-full border border-zinc-800 bg-zinc-950 p-8 rounded-lg shadow-2xl">
        <div className="mb-6">
          <p className="text-xs text-lime-400 uppercase tracking-widest mb-1">// GUARDIAN VERIFICATION</p>
          <h1 className="text-xl font-bold uppercase tracking-tight">Parental Countersignature</h1>
        </div>

        <div className="border border-zinc-800 bg-zinc-900/50 p-4 rounded mb-6 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-zinc-500">ATHLETE (MINOR):</span>
            <span className="text-white font-medium">{data?.athlete_name} ({data?.full_name})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">DISCIPLINE:</span>
            <span className="text-white font-medium">{data?.sport}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">CLUB / LEAGUE:</span>
            <span className="text-white font-medium">{data?.club} ({data?.league})</span>
          </div>
        </div>

        <div className="border border-zinc-800 bg-black p-4 rounded text-xs text-zinc-400 leading-relaxed mb-6 space-y-3">
          <p className="text-zinc-200 font-semibold uppercase">// 2-YEAR MASTER LICENCE TERMS</p>
          <p>{data?.mou_text}</p>
          <p className="text-zinc-500 italic">
            By countersigning, you affirm legal guardianship and grant commercial clearance under Australian and New Zealand minor protection legislation.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-900 text-red-400 text-xs rounded text-center">
            {errorMessage}
          </div>
        )}

        {isSigned ? (
          <div className="p-4 border border-lime-500/30 bg-lime-950/20 text-center rounded">
            <p className="text-xs text-lime-400 font-bold tracking-widest uppercase">// LEGAL CLEARANCE ACTIVE</p>
            <p className="text-xs text-zinc-400 mt-1">Agreement countersigned and archived on the platform audit ledger.</p>
          </div>
        ) : (
          <button
            onClick={handleCountersign}
            disabled={submitting}
            className="w-full bg-white text-black font-semibold py-3 px-4 rounded text-xs uppercase tracking-wider hover:bg-zinc-200 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'RECORDING AUDIT LOG...' : 'COUNTERSIGN AS LEGAL GUARDIAN'}
          </button>
        )}
      </div>
    </div>
  );
};

export const GuardianVerifyPage = GuardianVerify;
export default GuardianVerifyPage;