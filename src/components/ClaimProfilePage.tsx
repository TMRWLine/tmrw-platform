import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { ReactNode } from 'react';
import {
  AthleteAccessHeader, AthleteAccessTabs, AthleteAccessHero,
  ATHLETE_MONO, ATHLETE_FIELD_LABEL, ATHLETE_FIELD_SHELL, ATHLETE_FIELD_INPUT,
  ATHLETE_PRIMARY, ATHLETE_VOLT_CTA, type AthleteAccessMode,
} from './AthleteAccessShell';

type ProfileField = 'full_name' | 'sport' | 'league' | 'club' | 'bio' | 'instagram';
interface Lead {
  full_name: string;
  sport: string;
  league: string;
  club: string;
  where_found: string;
  verification_source_url?: string;
  status?: string;
  sponsors?: { business_name: string; merchant_category: string; postcode: string }[];
  public_fields?: string[];
}
const DEMO_LEAD: Lead = {
  full_name: 'Alex Morgan', sport: 'Basketball', league: 'Local premier league',
  club: 'Inner West Basketball', where_found: 'your club’s public match report',
  sponsors: [
    { business_name: 'Neighbourhood Coffee', merchant_category: 'Café · illustrative', postcode: '2042' },
    { business_name: 'Westside Recovery', merchant_category: 'Wellness · illustrative', postcode: '2040' },
    { business_name: 'Local Cycle Co.', merchant_category: 'Retail · illustrative', postcode: '2038' },
  ],
};
const FIELD_LABELS: Record<ProfileField, string> = {
  full_name: 'Full name', sport: 'Sport', league: 'League', club: 'Club',
  bio: 'About you', instagram: 'Instagram handle',
};
const FIELDS = Object.keys(FIELD_LABELS) as ProfileField[];
type Step = 'preview' | 'signin' | 'consent' | 'done' | 'decline' | 'deleted' | 'unsubscribe' | 'unsubscribed' | 'guardian';

const META = `${ATHLETE_MONO} text-[9.5px] font-bold uppercase tracking-[0.18em]`;
const COPY = 'm-0 font-sans text-xs text-neutral-600 leading-relaxed';
const PANEL = 'rounded-2xl bg-black/5 border border-black/10 p-5 space-y-3 mb-6';
const LINK = `${ATHLETE_MONO} block w-full bg-transparent border-0 px-0 py-2 text-[10px] text-carbon underline underline-offset-4 text-left cursor-pointer hover:opacity-70 transition-opacity`;
const CHECK = 'flex items-start gap-3 font-sans text-xs text-neutral-600 leading-relaxed cursor-pointer';
const CHECK_INPUT = 'shrink-0 mt-0.5 w-4 h-4 accent-carbon';
const SECTION_HEADING = 'm-0 font-sans text-sm font-black uppercase tracking-tight text-carbon';

function ClaimHero({ label, lines, children }: { label: string; lines: string[]; children: ReactNode }) {
  return <div>
    <p className={`${META} text-neutral-500 mb-3`}>{label}</p>
    <AthleteAccessHero lines={lines}>{children}</AthleteAccessHero>
  </div>;
}

export function ClaimProfilePage() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') || '';
  const guardianToken = params.get('guardian') || '';
  const demo = token === 'demo-token' || guardianToken === 'demo-token';
  const [accessMode, setAccessMode] = useState<AthleteAccessMode>('claim');
  const [step, setStep] = useState<Step>(guardianToken ? 'guardian' : params.get('action') === 'unsubscribe' ? 'unsubscribe' : 'preview');
  const [lead, setLead] = useState<Lead | null>(null);
  const [details, setDetails] = useState<Record<ProfileField, string>>({ full_name: '', sport: '', league: '', club: '', bio: '', instagram: '' });
  const [visible, setVisible] = useState<ProfileField[]>(['full_name', 'sport', 'league', 'club']);
  const [consents, setConsents] = useState([false, false, false]);
  const [dob, setDob] = useState('');
  const [under18, setUnder18] = useState(false);
  const [guardianEmail, setGuardianEmail] = useState('');
  const [guardianConsent, setGuardianConsent] = useState(false);
  const [pendingGuardian, setPendingGuardian] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState(false);
  const today = new Date();
  const eighteenthBirthday = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  const minor = under18 || Boolean(dob && new Date(dob + 'T00:00:00') > eighteenthBirthday);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        let profile: Lead;
        if (demo) profile = DEMO_LEAD;
        else {
          if (!supabase || (!token && !guardianToken)) throw new Error('This claim link is unavailable. Please use your personal invitation.');
          const { data, error: rpcError } = await supabase.rpc(guardianToken ? 'preview_claim_guardian' : 'preview_athlete_claim', { p_token: guardianToken || token });
          if (rpcError) throw new Error(rpcError.message);
          profile = data as Lead;
        }
        if (!active) return;
        setLead(profile);
        setDetails({ full_name: profile.full_name || '', sport: profile.sport || '', league: profile.league || '', club: profile.club || '', bio: '', instagram: '' });
        if (!guardianToken && params.get('action') !== 'unsubscribe' && !demo && supabase) {
          const { data } = await supabase.auth.getSession();
          if (active && data.session) setStep('consent');
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Unable to load your invitation.');
      }
    }
    void load();
    return () => { active = false; };
  }, [token, guardianToken, demo]);

  async function act(action: () => Promise<void>) {
    setBusy(true); setError('');
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  }
  async function rpc(name: string, args: Record<string, unknown>) {
    if (demo) return null;
    if (!supabase) throw new Error('Claim service is not configured.');
    const { data, error: rpcError } = await supabase.rpc(name, args);
    if (rpcError) throw new Error(rpcError.message);
    return data;
  }
  function signin(provider: 'google' | 'instagram') {
    void act(async () => {
      if (demo) { setStep('consent'); return; }
      if (provider === 'instagram') {
        const response = await fetch('/api/auth/instagram/start?token=' + encodeURIComponent(token));
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Instagram sign-in unavailable. Please use Google.');
        window.location.assign(result.url);
        return;
      }
      if (!supabase) throw new Error('Sign-in is unavailable.');
      const redirect = new URL('/claim', window.location.origin);
      redirect.searchParams.set('token', token);
      const { error: authError } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirect.href } });
      if (authError) throw authError;
    });
  }


  const signInContent = <>
    <ClaimHero label="02 / MAKE IT YOURS" lines={['One profile', 'All yours']}>
      <p className="m-0 font-sans text-xs text-white/75 leading-relaxed">
        {guardianToken ? 'You do not need an account for guardian review. Return to the Claim profile tab to review their choices.' :
          'Sign in to claim your profile. You’ll review every detail and choose what’s public before anything goes live.'}
      </p>
      <span className={`inline-block rounded-full bg-volt text-carbon px-3 py-1 ${META}`}>Private until you consent</span>
    </ClaimHero>
    {guardianToken ? <button className={ATHLETE_PRIMARY} onClick={() => setAccessMode('claim')}>Return to guardian review ↗</button> : <>
      <section className={PANEL}>
        <span className={`${META} text-neutral-500`}>Your invitation</span>
        <h2 className={SECTION_HEADING}>{lead?.full_name}</h2>
        <p className={`${META} text-neutral-600`}>{lead?.club}</p>
      </section>
      <div className="space-y-3">
        <button className={ATHLETE_PRIMARY} disabled={busy} onClick={() => { setAccessMode('claim'); signin('google'); }}>Continue with Google <span aria-hidden="true">↗</span></button>
        <button className={`${ATHLETE_PRIMARY} !bg-black/5 !text-carbon border border-black/10`} disabled={busy} onClick={() => { setAccessMode('claim'); signin('instagram'); }}>Continue with Instagram <span aria-hidden="true">↗</span></button>
        <p className={COPY}>Instagram Login requires a configured app and is not a Supabase identity provider. If unavailable, continue with Google.</p>
        <p className={COPY}>TMRW is not an agent. No representation agreement. No master licence at this stage.</p>
        <button className={LINK} onClick={() => { setAccessMode('claim'); setStep('preview'); }}>← Back to private preview</button>
      </div>
    </>}
  </>;

  const privacyActions = <div className="border-t border-b border-black/10 py-3 my-6">
    <button className={LINK} onClick={() => setStep('decline')}>Decline &amp; delete my data</button>
    <button className={LINK} onClick={() => setStep('unsubscribe')}>Unsubscribe from outreach</button>
  </div>;

  return <main className="min-h-dvh bg-[var(--canvas)] text-carbon selection:bg-volt selection:text-carbon">
    <div className="fixed inset-0 bg-black/60 hidden sm:block" aria-hidden="true" />
    <div className="relative sm:ml-auto min-h-dvh w-full max-w-[500px] bg-[var(--canvas)] p-6 sm:p-8 md:p-10 box-border sm:shadow-2xl">
      <AthleteAccessHeader onClose={() => window.location.assign('/')} />
      <AthleteAccessTabs mode={accessMode} panelId="claim-access-panel" onChange={setAccessMode} />
      <div role="tabpanel" id="claim-access-panel" aria-label={accessMode === 'claim' ? 'Claim profile' : 'Sign in'}>
        <p className={`${META} text-neutral-500 mb-6`}><span className="inline-block w-1.5 h-1.5 rounded-full bg-volt mr-2" />{demo ? 'DEMO / NO DATA IS SAVED' : 'YOUR PROFILE. YOUR CALL.'}</p>
        {error && <div role="alert" className={`${PANEL} ${COPY} !border-carbon`}>{error}</div>}
        {!lead && !error && <p role="status" className={COPY}>Loading your private invitation…</p>}
        {lead && <>
          {accessMode === 'authenticate' ? signInContent : <>
            {step === 'preview' && <>
              <ClaimHero label="01 / A LOCAL OPPORTUNITY" lines={['Your profile', 'Your terms']}>
                <p className="m-0 font-sans text-xs text-white/75 leading-relaxed">Local businesses back local talent. We’ve put together a <span className="bg-volt text-carbon font-bold px-1.5 py-0.5 rounded-[3px]">private starting profile</span> for you. Nothing is public until you choose.</p>
                <button className={ATHLETE_VOLT_CTA} onClick={() => setStep('signin')}>Claim my profile <span aria-hidden="true">↗</span></button>
              </ClaimHero>
              <section className={PANEL} aria-label="Private profile preview">
                <div className="flex items-center justify-between gap-2">
                  <span className={`${META} text-neutral-500`}>Private profile preview</span>
                  <span className={`${META} rounded-full bg-carbon text-volt px-2 py-1 whitespace-nowrap`}>Not live</span>
                </div>
                <h2 className="m-0 font-sans font-black uppercase text-2xl tracking-tight leading-tight">{lead.full_name}<span className="text-volt">.</span></h2>
                <dl className="m-0 border-t border-black/10">
                  {(['sport', 'league', 'club'] as const).map(field => <div key={field} className={`flex justify-between items-start gap-4 border-b border-black/10 py-3 ${ATHLETE_MONO} text-[10px]`}>
                    <dt className="uppercase tracking-wider text-neutral-500">{FIELD_LABELS[field]}</dt>
                    <dd className="m-0 text-right font-bold max-w-[70%]">{lead[field] || 'Not provided'}</dd>
                  </div>)}
                </dl>
              </section>
              <section className="mb-6">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h2 className={SECTION_HEADING}>In your corner<span className="text-volt">.</span></h2>
                  <span className={`${META} text-neutral-500 text-right`}>Local sponsors</span>
                </div>
                <p className={COPY}>A few businesses in your region. Examples of potential connections, not offers or endorsements.</p>
                <div className="mt-3 border-t border-black/10">
                  {lead.sponsors?.length ? lead.sponsors.map(s => <div className="border-b border-black/10 py-4 space-y-1" key={s.business_name}>
                    <h3 className="m-0 font-sans text-xs font-bold">{s.business_name}</h3>
                    <p className={`${ATHLETE_MONO} m-0 text-[9.5px] text-neutral-500 uppercase tracking-wide`}>{s.merchant_category} / {s.postcode}</p>
                  </div>) : <p className={`${COPY} py-4`}>We’re still finding nearby sponsor opportunities for your area.</p>}
                </div>
              </section>
              <button className={LINK} aria-expanded={info} onClick={() => setInfo(!info)}>Why am I seeing this? / Sponsorship, not representation</button>
              {info && <div className={`${PANEL} ${COPY}`}>
                <p>We found you via {lead.where_found}. We recorded public sporting facts only, for private research.</p>
                <p>TMRW is not an agent. This is a sponsorship platform, not representation or an agency agreement. No master licence is requested here; any agreement comes later, only if there is a real sponsor match.</p>
                {lead.verification_source_url && <a className={LINK} href={lead.verification_source_url} target="_blank" rel="noreferrer">View public source ↗</a>}
              </div>}
              {privacyActions}
            </>}
            {step === 'signin' && signInContent}
            {step === 'consent' && <>
              <ClaimHero label="03 / YOU SET THE BOUNDARIES" lines={['Your details', 'Your decision']}>
                <p className="m-0 font-sans text-xs text-white/75 leading-relaxed">Correct anything below. Only fields marked <span className="bg-volt text-carbon font-bold px-1.5 py-0.5 rounded-[3px]">Public</span> will be visible to sponsors. Your birth date and guardian email always stay private.</p>
              </ClaimHero>
              <button className={LINK} onClick={() => setStep('preview')}>← Back to private preview</button>
              {privacyActions}
              <form className="space-y-6" onSubmit={event => { event.preventDefault(); void act(async () => {
                if (!consents.every(Boolean)) throw new Error('Please review and accept all three consent choices.');
                if (!dob || new Date(dob + 'T00:00:00') > today) throw new Error('Enter a valid date of birth.');
                const result = await rpc('claim_athlete_profile', {
                  p_token: token, p_details: details, p_public_fields: visible, p_dob: dob,
                  p_under_18: under18, p_guardian_email: minor ? guardianEmail : null,
                  p_data_consent: consents[0], p_public_consent: consents[1], p_contact_consent: consents[2],
                });
                setPendingGuardian(demo ? minor : result?.status === 'pending_guardian'); setStep('done');
              }); }}>
                <div className="space-y-5">
                  {FIELDS.map(field => <div key={field}>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <label className={`${ATHLETE_FIELD_LABEL} !mb-0`} htmlFor={'claim-' + field}>{FIELD_LABELS[field]}</label>
                      <button type="button" aria-label={`${FIELD_LABELS[field]}: ${visible.includes(field) ? 'Public' : 'Private'}`} aria-pressed={visible.includes(field)}
                        className={`rounded-full px-3 py-1.5 ${ATHLETE_MONO} text-[9px] uppercase tracking-wider font-bold border-0 cursor-pointer transition-opacity hover:opacity-70 ${visible.includes(field) ? 'bg-volt text-carbon' : 'bg-black/5 text-neutral-600'}`}
                        onClick={() => setVisible(visible.includes(field) ? visible.filter(f => f !== field) : [...visible, field])}>{visible.includes(field) ? 'Public ↗' : 'Private'}</button>
                    </div>
                    <div className={ATHLETE_FIELD_SHELL}><input className={ATHLETE_FIELD_INPUT} id={'claim-' + field} value={details[field]} maxLength={field === 'bio' ? 1000 : 150} required={field === 'full_name'} onChange={e => setDetails({ ...details, [field]: e.target.value })} /></div>
                  </div>)}
                  <div>
                    <label className={ATHLETE_FIELD_LABEL} htmlFor="claim-dob">Date of birth <span className="ml-2">Always private</span></label>
                    <div className={ATHLETE_FIELD_SHELL}><input className={ATHLETE_FIELD_INPUT} id="claim-dob" type="date" value={dob} max={today.toLocaleDateString('en-CA')} required onChange={e => setDob(e.target.value)} /></div>
                  </div>
                </div>
                <label className={CHECK}><input className={CHECK_INPUT} type="checkbox" checked={under18} onChange={e => setUnder18(e.target.checked)} /><span>I’m under 18 / require guardian consent</span></label>
                {minor && <section className={PANEL}>
                  <span className={`${META} rounded-full bg-volt text-carbon px-3 py-1 inline-block`}>Still private</span>
                  <h2 className={SECTION_HEADING}>A parent in your corner<span className="text-volt">.</span></h2>
                  <p className={COPY}>Your profile stays private until your parent or guardian consents.</p>
                  <div><label className={ATHLETE_FIELD_LABEL} htmlFor="claim-guardian-email">Parent / guardian email</label>
                    <div className={`${ATHLETE_FIELD_SHELL} !bg-[var(--canvas)]`}><input className={ATHLETE_FIELD_INPUT} id="claim-guardian-email" type="email" required value={guardianEmail} onChange={e => setGuardianEmail(e.target.value)} /></div></div>
                  <p className={COPY}>A private guardian review link must be provided to them by the TMRW team. This form does not send email.</p>
                </section>}
                <section aria-label="Consent choices" className="rounded-2xl border border-black/10 p-5 space-y-4">
                  <h2 className={SECTION_HEADING}>Before you go live<span className="text-volt">.</span></h2>
                  {[
                    'I consent to TMRW storing and using these details to operate my sponsorship profile.',
                    'I consent to publishing only the fields I have marked Public, visible to potential sponsors.',
                    'I consent to TMRW contacting me about sponsorship opportunities.',
                  ].map((text, i) => <label className={CHECK} key={text}><input className={CHECK_INPUT} type="checkbox" required checked={consents[i]} onChange={e => setConsents(consents.map((v, n) => n === i ? e.target.checked : v))} /><span>{text}</span></label>)}
                </section>
                <p className={COPY}>TMRW is not an agent. No master licence or representation agreement is requested. You can decline and delete your profile, or unsubscribe, using your invitation link.</p>
                <button className={ATHLETE_PRIMARY} disabled={busy} type="submit">{busy ? 'Saving…' : minor ? 'Save & request guardian consent' : 'Consent & publish my profile'} <span aria-hidden="true">↗</span></button>
              </form>
            </>}
            {step === 'done' && <>
              <ClaimHero label={pendingGuardian ? 'SAVED / STILL PRIVATE' : 'CONSENT RECORDED'} lines={pendingGuardian ? ['One more', 'Teammate'] : ['You’re in', 'On your terms']}>
                <p className="m-0 font-sans text-xs text-white/75 leading-relaxed">{pendingGuardian ? 'Your profile is awaiting parent or guardian consent. It is not public and sponsors cannot see it yet.' : 'Your chosen public fields are now live for potential sponsors. Everything else stays private.'}</p>
                <span className={`inline-block bg-volt text-carbon px-3 py-1 rounded-full ${META}`}>{pendingGuardian ? 'Awaiting guardian' : 'Your choices saved'}</span>
              </ClaimHero>
              <section className={PANEL}>
                <h2 className={SECTION_HEADING}>{pendingGuardian ? 'Next: guardian review' : 'What happens next?'}</h2>
                <p className={COPY}>{pendingGuardian ? 'The TMRW team must provide your guardian with their private consent link. No email has been sent by this form.' : 'We’ll look for a local sponsorship fit. No guarantees, no representation agreement, and no master licence until a real sponsor match exists.'}</p>
              </section>
              {demo && pendingGuardian && <a className={ATHLETE_PRIMARY} href="/claim?guardian=demo-token">Preview guardian consent ↗</a>}
              <a className={LINK} href="/">Back to TMRW ↗</a>
            </>}
            {step === 'guardian' && <>
              <ClaimHero label="GUARDIAN / PRIVATE REVIEW" lines={['In their corner', 'On their terms']}>
                <p className="m-0 font-sans text-xs text-white/75 leading-relaxed">{lead.full_name} would like to make a sponsorship profile on TMRW. They have not been published.</p>
                <span className={`inline-block bg-volt text-carbon px-3 py-1 rounded-full ${META}`}>Private until you consent</span>
              </ClaimHero>
              <section className={PANEL}>
                <h2 className={SECTION_HEADING}>{lead.full_name}</h2>
                <p className={`${META} text-neutral-600`}>{lead.sport} / {lead.club}</p>
                <div className={`border-t border-black/10 pt-3 ${ATHLETE_MONO} text-[10px] leading-relaxed`}><span className="block uppercase tracking-wider text-neutral-500 mb-2">Chosen public fields</span>{(lead.public_fields || ['full_name', 'sport', 'league', 'club']).map(f => FIELD_LABELS[f as ProfileField] || f).join(', ')}</div>
                <p className={COPY}>Birth date, guardian email and private fields are not published.</p>
              </section>
              <form className="space-y-5" onSubmit={e => { e.preventDefault(); void act(async () => { await rpc('consent_claim_guardian', { p_token: guardianToken, p_consent: guardianConsent }); setPendingGuardian(false); setStep('done'); }); }}>
                <label className={CHECK}><input className={CHECK_INPUT} type="checkbox" required checked={guardianConsent} onChange={e => setGuardianConsent(e.target.checked)} /><span>I am this athlete’s parent or legal guardian. I consent to TMRW using their details, publishing their selected public fields and contacting them for sponsorship opportunities.</span></label>
                <p className={COPY}>TMRW is not an agent. This is not a representation agreement or master licence.</p>
                <button className={ATHLETE_PRIMARY} disabled={busy}>Approve profile publication ↗</button>
              </form>
            </>}
            {step === 'decline' && <>
              <ClaimHero label="YOUR CHOICE / ALWAYS" lines={['No pressure', 'No profile']}>
                <p className="m-0 font-sans text-xs text-white/75 leading-relaxed">Declining permanently deletes your private research profile and any profile published through this invitation. This cannot be undone.</p>
              </ClaimHero>
              <button className={ATHLETE_PRIMARY} disabled={busy} onClick={() => void act(async () => { await rpc('decline_athlete_claim', { p_token: token }); setStep('deleted'); })}>Confirm: delete my data <span aria-hidden="true">×</span></button>
              <button className={LINK} onClick={() => setStep('preview')}>Keep my private preview</button>
            </>}
            {step === 'deleted' && <>
              <ClaimHero label="DELETION COMPLETE" lines={['Deleted', 'Your call']}>
                <p className="m-0 font-sans text-xs text-white/75 leading-relaxed">Your lead record and any profile published through this invitation have been deleted. Your invitation no longer works.</p>
              </ClaimHero>
              <a className={ATHLETE_PRIMARY} href="/">Back to TMRW ↗</a>
            </>}
            {step === 'unsubscribe' && <>
              <ClaimHero label="OUTREACH / YOUR CONTROL" lines={['Less noise', 'We hear you']}>
                <p className="m-0 font-sans text-xs text-white/75 leading-relaxed">Stop outreach associated with this invitation and remove your profile details. Only an anonymous suppression marker for this invitation will remain.</p>
              </ClaimHero>
              <button className={ATHLETE_PRIMARY} disabled={busy} onClick={() => void act(async () => { await rpc('unsubscribe_athlete_claim', { p_token: token }); setStep('unsubscribed'); })}>Confirm unsubscribe ↗</button>
              <button className={LINK} onClick={() => setStep('preview')}>Back to preview</button>
            </>}
            {step === 'unsubscribed' && <>
              <ClaimHero label="UNSUBSCRIBED" lines={['Your inbox', 'Your rules']}>
                <p className="m-0 font-sans text-xs text-white/75 leading-relaxed">Outreach for this invitation is stopped. Your personal details have been removed; only an anonymous suppression marker remains.</p>
              </ClaimHero>
              <a className={ATHLETE_PRIMARY} href="/">Back to TMRW ↗</a>
            </>}
          </>}
        </>}
      </div>
      <footer className="mt-8 border-t border-black/10 pt-5 space-y-2">
        <p className={`${META} text-neutral-500 m-0`}>Local talent. Local backing.</p>
        <p className={`${META} text-neutral-500 m-0`}>Sponsorship. Not representation.</p>
        <p className={COPY}>TMRW is not an agent.</p>
      </footer>
    </div>
  </main>;
}
