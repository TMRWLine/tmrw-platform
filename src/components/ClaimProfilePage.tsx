import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import './ClaimProfilePage.css';

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

export function ClaimProfilePage() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') || '';
  const guardianToken = params.get('guardian') || '';
  const demo = token === 'demo-token' || guardianToken === 'demo-token';
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

  return <main className="claim-page">
    <header className="claim-header"><a href="/" aria-label="TMRW home">TMRW<span>®</span></a><span className="claim-meta">ATHLETE ACCESS / PRIVATE</span></header>
    <div className="claim-shell">
      <div className="claim-kicker"><span className="claim-dot" /> {demo ? 'DEMO / NO DATA IS SAVED' : 'YOUR PROFILE. YOUR CALL.'}</div>
      {error && <div role="alert" className="claim-error">{error}</div>}
      {!lead && !error && <p role="status">Loading your private invitation…</p>}
      {lead && <>
        {step === 'preview' && <>
          <p className="claim-meta">01 / A LOCAL OPPORTUNITY</p>
          <h1>Your next chapter.<br /><em>Backed locally.</em></h1>
          <p className="claim-intro">Local businesses back local talent. We’ve put together a private starting profile for you. Nothing is public until you choose.</p>
          <section className="claim-profile"><div className="claim-profile-top"><span className="claim-meta">PRIVATE PROFILE PREVIEW</span><span className="claim-badge">NOT LIVE</span></div>
            <div className="claim-monogram">{lead.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
            <h2>{lead.full_name}</h2><p>{lead.sport} / {lead.league}</p><p className="claim-meta">{lead.club}</p>
          </section>
          <section><div className="claim-section-label"><h2>In your corner.</h2><span className="claim-meta">LOCAL SPONSORS</span></div>
            <p className="claim-small">A few businesses in your region. Examples of potential connections, not offers or endorsements.</p>
            {lead.sponsors?.length ? lead.sponsors.map(s => <div className="claim-sponsor" key={s.business_name}><strong>{s.business_name}</strong><span>{s.merchant_category} / {s.postcode}</span></div>) : <p className="claim-small">We’re still finding nearby sponsor opportunities for your area.</p>}
          </section>
          <button className="claim-primary" onClick={() => setStep('signin')}>Claim my profile <span>↗</span></button>
          <button className="claim-link" onClick={() => setInfo(!info)}>Why am I seeing this? / Sponsorship, not representation</button>
          {info && <div className="claim-note"><p>We found you via {lead.where_found}. We recorded public sporting facts only, for private research.</p><p>TMRW is not an agent. This is a sponsorship platform, not representation or an agency agreement. No master licence is requested here; any agreement comes later, only if there is a real sponsor match.</p>{lead.verification_source_url && <a href={lead.verification_source_url} target="_blank" rel="noreferrer">View public source ↗</a>}</div>}
          <button className="claim-link" onClick={() => setStep('decline')}>Decline & delete my data</button>
          <button className="claim-link" onClick={() => setStep('unsubscribe')}>Unsubscribe from outreach</button>
        </>}
        {step === 'signin' && <>
          <p className="claim-meta">02 / MAKE IT YOURS</p><h1>One profile.<br /><em>All yours.</em></h1>
          <p className="claim-intro">Sign in to claim your profile. You’ll review every detail and choose what’s public before anything goes live.</p>
          <section className="claim-note"><strong>{lead.full_name}</strong><p>{lead.club}</p><span className="claim-meta">PRIVATE UNTIL YOU CONSENT</span></section>
          <button className="claim-primary" disabled={busy} onClick={() => signin('google')}>Continue with Google <span>↗</span></button>
          <button className="claim-secondary" disabled={busy} onClick={() => signin('instagram')}>Continue with Instagram <span>↗</span></button>
          <p className="claim-small">Instagram Login requires a configured app and is not a Supabase identity provider. If unavailable, continue with Google.</p>
          <p className="claim-small">TMRW is not an agent. No representation agreement. No master licence at this stage.</p>
          <button className="claim-link" onClick={() => setStep('preview')}>← Back to private preview</button>
        </>}
        {step === 'consent' && <>
          <p className="claim-meta">03 / YOU SET THE BOUNDARIES</p><h1>Your details.<br /><em>Your decision.</em></h1>
          <p className="claim-intro">Correct anything below. Only fields marked Public will be visible to sponsors. Your birth date and guardian email always stay private.</p>
          <button className="claim-link" onClick={() => setStep('preview')}>← Back to private preview</button>
          <button className="claim-link" onClick={() => setStep('decline')}>Decline & delete my data</button>
          <button className="claim-link" onClick={() => setStep('unsubscribe')}>Unsubscribe from outreach</button>
          <form onSubmit={event => { event.preventDefault(); void act(async () => {
            if (!consents.every(Boolean)) throw new Error('Please review and accept all three consent choices.');
            if (!dob || new Date(dob + 'T00:00:00') > today) throw new Error('Enter a valid date of birth.');
            const result = await rpc('claim_athlete_profile', {
              p_token: token, p_details: details, p_public_fields: visible, p_dob: dob,
              p_under_18: under18, p_guardian_email: minor ? guardianEmail : null,
              p_data_consent: consents[0], p_public_consent: consents[1], p_contact_consent: consents[2],
            });
            setPendingGuardian(demo ? minor : result?.status === 'pending_guardian'); setStep('done');
          }); }}>
            {FIELDS.map(field => <div className="claim-field" key={field}><div className="claim-field-heading"><label htmlFor={'claim-' + field}>{FIELD_LABELS[field]}</label><button type="button" className={'claim-toggle ' + (visible.includes(field) ? 'is-public' : '')} aria-pressed={visible.includes(field)} onClick={() => setVisible(visible.includes(field) ? visible.filter(f => f !== field) : [...visible, field])}>{visible.includes(field) ? 'Public ↗' : 'Private'}</button></div>
              <input id={'claim-' + field} value={details[field]} maxLength={field === 'bio' ? 1000 : 150} required={field === 'full_name'} onChange={e => setDetails({ ...details, [field]: e.target.value })} /></div>)}
            <div className="claim-field"><label htmlFor="claim-dob">Date of birth <span className="claim-meta">ALWAYS PRIVATE</span></label><input id="claim-dob" type="date" value={dob} max={today.toLocaleDateString('en-CA')} required onChange={e => setDob(e.target.value)} /></div>
            <label className="claim-check"><input type="checkbox" checked={under18} onChange={e => setUnder18(e.target.checked)} /><span>I’m under 18 / require guardian consent</span></label>
            {minor && <section className="claim-note"><h2>A parent in your corner.</h2><p>Your profile stays private until your parent or guardian consents.</p><label htmlFor="claim-guardian-email">Parent / guardian email</label><input id="claim-guardian-email" type="email" required value={guardianEmail} onChange={e => setGuardianEmail(e.target.value)} /><p className="claim-small">A private guardian review link must be provided to them by the TMRW team. This form does not send email.</p></section>}
            <section className="claim-consents"><h2>Before you go live.</h2>{[
              'I consent to TMRW storing and using these details to operate my sponsorship profile.',
              'I consent to publishing only the fields I have marked Public, visible to potential sponsors.',
              'I consent to TMRW contacting me about sponsorship opportunities.',
            ].map((text, i) => <label className="claim-check" key={text}><input type="checkbox" required checked={consents[i]} onChange={e => setConsents(consents.map((v, n) => n === i ? e.target.checked : v))} /><span>{text}</span></label>)}</section>
            <p className="claim-small">TMRW is not an agent. No master licence or representation agreement is requested. You can decline and delete your profile, or unsubscribe, using your invitation link.</p>
            <button className="claim-primary" disabled={busy} type="submit">{busy ? 'Saving…' : minor ? 'Save & request guardian consent' : 'Consent & publish my profile'} <span>↗</span></button>
          </form>
        </>}
        {step === 'done' && <><div className="claim-success-mark">↗</div><p className="claim-meta">{pendingGuardian ? 'SAVED / STILL PRIVATE' : 'CONSENT RECORDED'}</p><h1>{pendingGuardian ? <>One more<br /><em>teammate.</em></> : <>You’re in.<br /><em>On your terms.</em></>}</h1>
          <p className="claim-intro">{pendingGuardian ? 'Your profile is awaiting parent or guardian consent. It is not public and sponsors cannot see it yet.' : 'Your chosen public fields are now live for potential sponsors. Everything else stays private.'}</p>
          <section className="claim-note"><h2>{pendingGuardian ? 'Next: guardian review' : 'What happens next?'}</h2><p>{pendingGuardian ? 'The TMRW team must provide your guardian with their private consent link. No email has been sent by this form.' : 'We’ll look for a local sponsorship fit. No guarantees, no representation agreement, and no master licence until a real sponsor match exists.'}</p></section>
          {demo && pendingGuardian && <a className="claim-primary" href="/claim?guardian=demo-token">Preview guardian consent ↗</a>}
          <a className="claim-link" href="/">Back to TMRW ↗</a>
        </>}
        {step === 'guardian' && <><p className="claim-meta">GUARDIAN / PRIVATE REVIEW</p><h1>In their corner.<br /><em>On their terms.</em></h1><p className="claim-intro">{lead.full_name} would like to make a sponsorship profile on TMRW. They have not been published.</p>
          <section className="claim-note"><h2>{lead.full_name}</h2><p>{lead.sport} / {lead.club}</p><p>Chosen public fields: {(lead.public_fields || ['full_name', 'sport', 'league', 'club']).map(f => FIELD_LABELS[f as ProfileField] || f).join(', ')}</p><p>Birth date, guardian email and private fields are not published.</p></section>
          <form onSubmit={e => { e.preventDefault(); void act(async () => { await rpc('consent_claim_guardian', { p_token: guardianToken, p_consent: guardianConsent }); setPendingGuardian(false); setStep('done'); }); }}>
            <label className="claim-check"><input type="checkbox" required checked={guardianConsent} onChange={e => setGuardianConsent(e.target.checked)} /><span>I am this athlete’s parent or legal guardian. I consent to TMRW using their details, publishing their selected public fields and contacting them for sponsorship opportunities.</span></label>
            <p className="claim-small">TMRW is not an agent. This is not a representation agreement or master licence.</p><button className="claim-primary" disabled={busy}>Approve profile publication ↗</button>
          </form></>}
        {step === 'decline' && <><p className="claim-meta">YOUR CHOICE / ALWAYS</p><h1>No pressure.<br /><em>No profile.</em></h1><p className="claim-intro">Declining permanently deletes your private research profile and any profile published through this invitation. This cannot be undone.</p><button className="claim-primary" disabled={busy} onClick={() => void act(async () => { await rpc('decline_athlete_claim', { p_token: token }); setStep('deleted'); })}>Confirm: delete my data <span>×</span></button><button className="claim-link" onClick={() => setStep('preview')}>Keep my private preview</button></>}
        {step === 'deleted' && <><p className="claim-meta">DELETION COMPLETE</p><h1>Deleted.<br /><em>Your call.</em></h1><p className="claim-intro">Your lead record and any profile published through this invitation have been deleted. Your invitation no longer works.</p><a className="claim-link" href="/">Back to TMRW ↗</a></>}
        {step === 'unsubscribe' && <><p className="claim-meta">OUTREACH / YOUR CONTROL</p><h1>Less noise.<br /><em>We hear you.</em></h1><p className="claim-intro">Stop outreach associated with this invitation and remove your profile details. Only an anonymous suppression marker for this invitation will remain.</p><button className="claim-primary" disabled={busy} onClick={() => void act(async () => { await rpc('unsubscribe_athlete_claim', { p_token: token }); setStep('unsubscribed'); })}>Confirm unsubscribe ↗</button><button className="claim-link" onClick={() => setStep('preview')}>Back to preview</button></>}
        {step === 'unsubscribed' && <><p className="claim-meta">UNSUBSCRIBED</p><h1>Your inbox.<br /><em>Your rules.</em></h1><p className="claim-intro">Outreach for this invitation is stopped. Your personal details have been removed; only an anonymous suppression marker remains.</p></>}
      </>}
      <footer className="claim-footer"><strong>TMRW®</strong><span>LOCAL TALENT. LOCAL BACKING.</span><span>SPONSORSHIP. NOT REPRESENTATION.</span></footer>
    </div>
  </main>;
}
