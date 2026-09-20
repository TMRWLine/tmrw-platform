import { useEffect, useMemo, useRef, useState } from 'react';
import Lenis from '@studio-freight/lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  MapPin,
  X,
  Sparkles,
  Loader2,
  Mail,
  RefreshCw,
  Copy,
  Check,
  Shield,
  PenLine,
  Film,
  BadgeCheck,
  Info,
  ToggleLeft,
  ToggleRight,
  Eye,
  DollarSign,
  Wallet,
  Landmark,
  Zap,
  Receipt,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Search,
  Calendar,
  Lock,
  Maximize2,
  Globe,
} from 'lucide-react';
import type {
  Athlete,
  AthleteLocation,
  MatchedSponsor,
  Sponsor,
  Agreement,
  SpatialTierCode,
  SponsorshipTierKey,
} from './types';
import { SPATIAL_TIERS } from './types';
import { fetchAgreements } from './api';
import { getSportComplianceBadges, getUniversalComplianceBadges } from './types';
import { BrandKitTab } from './components/AthleteProfileModal';
import { MessageThread } from './components/MessageThread';
import { StatementsPanel } from './components/StatementsPanel';
import { Navbar, type LandingSectionId, type NavView } from './components/Navbar';
import { AdminDrawer } from './components/AdminDrawer';
import { Hero } from './components/Hero';
import { HeroFluidReveal } from './components/HeroFluidReveal';
import { LandingNarrative } from './components/LandingNarrative';
import { BrandLockup, LandingStackSlot } from './components/LandingStack';
import { LivingContours } from './components/LivingContours';
import { SpatialCatchment } from './components/SpatialCatchment';
import { SponsorDrawer } from './components/SponsorDrawer';
import { AthletePortal } from './components/AthletePortal';
import { AuthModal } from './components/AuthModal';
import { RosterSection } from './components/RosterSection';
import { AthleteDrawer } from './components/AthleteDrawer';
import { FilmModal } from './components/FilmModal';
import { AthleteOnboardingDrawer } from './components/AthleteOnboardingDrawer';
import { EnterpriseBarrier } from './components/EnterpriseBarrier';
import { supabase } from './lib/supabaseClient';
import { isAthleteOnboardingComplete } from './lib/specimenPrivacy';

import {
  fetchAthletes,
  fetchAthletesNearby,
  fetchAthletesByTier,
  fetchCatchmentCounts,
  fetchSponsors,
  fetchNearbySponsors,
  fetchSponsorsByRadius,
  generateContractReview,
  formatCurrency,
  signMasterLicence,
} from './api';
import MapView from './MapView';
import { athleteInitials, athleteDisplayName } from './lib/formatName';

type AppView = 'landing' | 'sponsor' | 'athlete';

gsap.registerPlugin(ScrollTrigger);

export type RadiusFilter = '25km' | '50km' | 'all';

type OutreachState = {
  loading: boolean;
  result: { subject: string; copy: string; cached: boolean } | null;
  error: string | null;
  copied: boolean;
};

type ProfileTab = 'overview' | 'brandkit' | 'agreement';

export function MarketplaceApp() {
  const [view, setView] = useState<AppView>('landing');
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [activeAthlete, setActiveAthlete] = useState<Athlete | null>(null);
  const [athleteLocation, setAthleteLocation] = useState<AthleteLocation | null>(null);
  const [matches, setMatches] = useState<MatchedSponsor[]>([]);
  const [matching, setMatching] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(10);
  const [radiusSearching, setRadiusSearching] = useState(false);

  const [outreach, setOutreach] = useState<Record<string, OutreachState>>({});

  const [profileAthlete, setProfileAthlete] = useState<Athlete | null>(null);
  const [profileTab, setProfileTab] = useState<ProfileTab>('overview');
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showADMModal, setShowADMModal] = useState(false);
  const [manualOverride, setManualOverride] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [navView, setNavView] = useState<NavView | null>(null);
  const [athleteFocus, setAthleteFocus] = useState<'overview' | 'drops'>('overview');
  const [landingSection, setLandingSection] = useState<LandingSectionId | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const horizontalSectionRef = useRef<HTMLDivElement>(null);
  const horizontalTrackRef = useRef<HTMLDivElement>(null);
  const [radiusFilter, setRadiusFilter] = useState<RadiusFilter>('all');
  const [catchmentTier, setCatchmentTier] = useState<SpatialTierCode | null>(null);
  const [catchmentCounts, setCatchmentCounts] = useState<Record<SpatialTierCode, number> | null>(null);
  const [drawerAthlete, setDrawerAthlete] = useState<Athlete | null>(null);
  const [authModalState, setAuthModalState] = useState<{ open: boolean; role: 'athlete' | 'sponsor' }>({
    open: false,
    role: 'athlete',
  });
  const [sessionRole, setSessionRole] = useState<'athlete' | 'sponsor' | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [barrierOpen, setBarrierOpen] = useState(false);
  const [specimenAthlete, setSpecimenAthlete] = useState<Athlete | null>(null);
  const [filmAthlete, setFilmAthlete] = useState<Athlete | null>(null);
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  useEffect(() => {
    if (view !== 'landing') return;

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    lenisRef.current = lenis;
    const onLenisScroll = () => ScrollTrigger.update();
    lenis.on('scroll', onLenisScroll);

    const ticker = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(ticker);
    gsap.ticker.lagSmoothing(0);

    const mm = gsap.matchMedia();
    mm.add('(min-width: 768px)', () => {
      const section = horizontalSectionRef.current;
      const track = horizontalTrackRef.current;
      if (!section || !track) return;

      const tween = gsap.to(track, {
        xPercent: -50,
        ease: 'none',
        scrollTrigger: {
          id: 'horizontal-pin',
          trigger: section,
          pin: true,
          scrub: 1,
          start: 'top top',
          end: '+=1800',
          pinSpacing: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          fastScrollEnd: true,
          preventOverlaps: true,
        },
      });

      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
        gsap.set(track, { clearProps: 'transform' });
      };
    });

    let refreshDebounce = 0;
    const refreshAll = () => {
      window.clearTimeout(refreshDebounce);
      refreshDebounce = window.setTimeout(() => ScrollTrigger.refresh(), 90);
    };
    const refreshTimer = window.setTimeout(refreshAll, 120);
    const layoutTimer = window.setTimeout(refreshAll, 480);
    window.addEventListener('load', refreshAll);
    window.addEventListener('tmrw-hero-ready', refreshAll);
    let fontsAlive = true;
    void document.fonts?.ready.then(() => {
      if (fontsAlive) refreshAll();
    });

    return () => {
      fontsAlive = false;
      window.clearTimeout(refreshTimer);
      window.clearTimeout(layoutTimer);
      window.clearTimeout(refreshDebounce);
      window.removeEventListener('load', refreshAll);
      window.removeEventListener('tmrw-hero-ready', refreshAll);
      gsap.ticker.remove(ticker);
      mm.revert();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      lenis.off('scroll', onLenisScroll);
      lenisRef.current = null;
      lenis.destroy();
    };
  }, [view]);

  useEffect(() => {
    if (view !== 'landing' || !landingSection) return;
    const id = landingSection;
    const t = window.setTimeout(() => {
      let target: number | HTMLElement | null = document.getElementById(id);
      const pin = document.getElementById('horizontal-wrapper');
      if (pin && (id === 'for-brands' || id === 'campaign-architecture')) {
        const pinRect = pin.getBoundingClientRect();
        const spacer = pin.parentElement;
        const spacerRect = spacer?.getBoundingClientRect();
        const start = window.scrollY + pinRect.top;
        const span = (spacerRect?.height ?? pinRect.height) - window.innerHeight;
        const end = window.scrollY + (spacerRect?.top ?? pinRect.top) + Math.max(span, 0);
        target = id === 'campaign-architecture' ? end : start;
      }
      if (target != null) {
        if (lenisRef.current) {
          lenisRef.current.scrollTo(target, { offset: 0, duration: 1.15 });
        } else if (typeof target === 'number') {
          window.scrollTo({ top: target, behavior: 'smooth' });
        } else {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
      setLandingSection(null);
    }, 80);
    return () => window.clearTimeout(t);
  }, [view, landingSection]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setListError(null);
      try {
        const s = await fetchSponsors();
        if (!cancelled) setSponsors(s);
      } catch (e) {
        if (!cancelled) setListError(e instanceof Error ? e.message : 'Failed to load data');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const counts = await fetchCatchmentCounts();
        if (!cancelled) setCatchmentCounts(counts);
      } catch {
        if (!cancelled) setCatchmentCounts(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingList(true);
      setListError(null);
      try {
        let rows: Athlete[];
        const tier = SPATIAL_TIERS.find((t) => t.code === catchmentTier);
        if (tier) {
          rows = await fetchAthletesByTier(tier);
        } else if (radiusFilter === 'all') {
          rows = await fetchAthletes();
        } else {
          rows = await fetchAthletesNearby(radiusFilter === '25km' ? 25 : 50);
        }
        if (!cancelled) setAthletes(rows);
      } catch (e) {
        if (!cancelled) setListError(e instanceof Error ? e.message : 'Failed to load data');
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [radiusFilter, catchmentTier]);

  async function handleFindNearby(athlete: Athlete) {
    setActiveAthlete(athlete);
    setMatches([]);
    setAthleteLocation(null);
    setMatchError(null);
    setMatching(true);
    setOutreach({});
    setRadiusKm(10);
    try {
      const res = await fetchNearbySponsors(athlete.id);
      setMatches(res.matches);
      setAthleteLocation(res.athlete);
    } catch (e) {
      setMatchError(e instanceof Error ? e.message : 'Failed to match sponsors');
    } finally {
      setMatching(false);
    }
  }

  async function handleRadiusSearch(loc: AthleteLocation, km: number) {
    setRadiusSearching(true);
    setMatchError(null);
    try {
      const expanded = await fetchSponsorsByRadius(loc, km);
      setMatches(expanded);
    } catch (e) {
      setMatchError(e instanceof Error ? e.message : 'Failed to search sponsors');
    } finally {
      setRadiusSearching(false);
    }
  }

  async function handleGenerateOutreach(sponsor: MatchedSponsor) {
    if (!activeAthlete) return;
    const sport = activeAthlete.sport ?? 'athlete';
    setOutreach((prev) => ({
      ...prev,
      [sponsor.id]: { loading: true, result: null, error: null, copied: false },
    }));
    try {
      const res = await generateContractReview({
        athleteName: athleteDisplayName(activeAthlete),
        sportType: sport,
        sponsorCategory: sponsor.merchant_category ?? 'Sponsorship',
      });
      setOutreach((prev) => ({
        ...prev,
        [sponsor.id]: { loading: false, result: res, error: null, copied: false },
      }));
    } catch (e) {
      setOutreach((prev) => ({
        ...prev,
        [sponsor.id]: {
          loading: false,
          result: null,
          error: e instanceof Error ? e.message : 'Failed to generate copy',
          copied: false,
        },
      }));
    }
  }

  function handleCopy(sponsorId: string, text: string) {
    navigator.clipboard?.writeText(text).then(
      () => {
        setOutreach((prev) => ({
          ...prev,
          [sponsorId]: { ...prev[sponsorId], copied: true },
        }));
        setTimeout(() => {
          setOutreach((prev) => ({
            ...prev,
            [sponsorId]: { ...prev[sponsorId], copied: false },
          }));
        }, 1500);
      },
      () => {}
    );
  }

  function openSponsorDrawer(athlete: Athlete) {
    setDrawerAthlete(athlete);
    setBookingError(null);
    setBookingConfirmed(false);
  }

  function enterSponsorWorkspace() {
    setView('sponsor');
    setNavView('sponsor');
  }

  function enterAthletePortal(focus: 'overview' | 'drops' = 'overview') {
    setAthleteFocus(focus);
    setView('athlete');
    setNavView(focus === 'drops' ? 'drops' : 'athlete');
  }

  function openAuthModal(role: 'athlete' | 'sponsor') {
    setAuthModalState({ open: true, role });
  }

  function closeAuthModal() {
    setAuthModalState((prev) => ({ ...prev, open: false }));
  }

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        if (!session?.user) {
          setSessionRole(null);
          setSessionUserId(null);
          if (_event === 'SIGNED_OUT') {
            setView('landing');
            setNavView(null);
            setOnboardingOpen(false);
            setSpecimenAthlete(null);
            setFilmAthlete(null);
          }
          return;
        }

        setSessionUserId(session.user.id);

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, postcode, sport, stripe_connect_id, onboarding_complete')
          .eq('id', session.user.id)
          .maybeSingle();

        const metaRole =
          typeof session.user.user_metadata?.role === 'string'
            ? session.user.user_metadata.role
            : null;
        const storedRole = window.localStorage.getItem('tmrw-pending-role');
        const role =
          (profile as { role?: string } | null)?.role ?? metaRole ?? storedRole;

        if (role === 'athlete') {
          setSessionRole('athlete');
          setAuthModalState((prev) => ({ ...prev, open: false }));
          const complete = isAthleteOnboardingComplete(
            profile as {
              onboarding_complete?: boolean | null;
              postcode?: string | null;
              sport?: string | null;
              stripe_connect_id?: string | null;
            } | null,
            session.user.id
          );
          setAthleteFocus('overview');
          setView('athlete');
          setNavView('athlete');
          setOnboardingOpen(!complete);
          return;
        }
        if (role === 'sponsor') {
          setSessionRole('sponsor');
          setView('sponsor');
          setNavView('sponsor');
          setAuthModalState((prev) => ({ ...prev, open: false }));
          setBarrierOpen(false);
          setOnboardingOpen(false);
        }
      })();
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authModalState.open) {
      lenisRef.current?.stop();
    } else {
      lenisRef.current?.start();
    }
  }, [authModalState.open]);

  function goLandingSection(id: LandingSectionId) {
    setView('landing');
    setNavView(null);
    setLandingSection(id);
  }

  const hunterAthlete =
    athletes.find((a) => `${a.name ?? ''} ${a.full_name ?? ''}`.toLowerCase().includes('bligh')) ?? null;

  const catchment3000: AthleteLocation = useMemo(
    () => ({
      id: 'postcode-3000',
      name: 'Postcode 3000',
      lat: -37.8136,
      lng: 144.9631,
      postcode: '3000',
      follower_count: null,
      master_licence_signed: true,
      nrl_tpa_registered: false,
      shute_shield_compliant: true,
    }),
    []
  );

  const workspaceSponsors: MatchedSponsor[] = useMemo(
    () =>
      (sponsors ?? [])
        .filter((s) => s.latitude != null && s.longitude != null)
        .map((s) => ({
          ...s,
          lat: s.latitude,
          lng: s.longitude,
          distance_meters: 0,
          distance_km: 0,
        })),
    [sponsors]
  );

  async function handleConfirmSponsorship(tier: SponsorshipTierKey, postcode: string) {
    if (!drawerAthlete || booking || !tier || !postcode.trim()) return;
    setBooking(true);
    setBookingError(null);
    try {
      await new Promise((r) => setTimeout(r, 700));
      const next: Athlete = {
        ...drawerAthlete,
        licence_status: 'ACTIVE',
        agreement_status: 'active',
      };
      setDrawerAthlete(next);
      setAthletes((prev) => prev.map((a) => (a.id === next.id ? { ...a, ...next } : a)));
      setBookingConfirmed(true);
    } catch (e) {
      setBookingError(e instanceof Error ? e.message : 'Failed to book sponsorship');
    } finally {
      setBooking(false);
    }
  }

  async function handleSignMOU() {
    if (!profileAthlete) return;
    setSigning(true);
    setSignError(null);
    try {
      await signMasterLicence(profileAthlete.id);
      const updated = { ...profileAthlete, master_licence_signed: true };
      setProfileAthlete(updated);
      setAthletes((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a))
      );
      setShowSignModal(false);
    } catch (e) {
      setSignError(e instanceof Error ? e.message : 'Failed to sign MOU');
    } finally {
      setSigning(false);
    }
  }

  const panelOpen = activeAthlete !== null;

  return (
    <div className={`app-shell bg-brand-black text-brand-white font-sans bg-grain${view === 'landing' ? '' : ' app-shell-padded'}`}>
      <header className="topnav fixed top-0 left-0 w-full z-50 px-8 py-5 flex items-center justify-between backdrop-blur-md bg-[#08080A]/85 border-b border-white/5 transition-colors pointer-events-auto">
        <BrandLockup onClick={() => setView('landing')} />
        <Navbar
          activeView={navView}
          onSection={goLandingSection}
          onJoinRoster={() => openAuthModal('athlete')}
          onEnterprise={() => openAuthModal('sponsor')}
        />
      </header>

      <div className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden bg-[#08080A]">
        <LivingContours />
      </div>

      <AdminDrawer open={adminOpen} onClose={() => setAdminOpen(false)} />

      {view === 'landing' ? (
        <div className="landing-scroll landing-stack relative z-10 w-full bg-transparent">
          <LandingStackSlot z={10} className="pointer-events-none">
            <Hero
              FluidCanvas={HeroFluidReveal}
              onSponsorAccess={() => openAuthModal('sponsor')}
              onAthletePortal={() => openAuthModal('athlete')}
            />
          </LandingStackSlot>
          <LandingNarrative
            onSponsor={enterSponsorWorkspace}
            onAthlete={enterAthletePortal}
            horizontalSectionRef={horizontalSectionRef}
            horizontalTrackRef={horizontalTrackRef}
          />
        </div>
      ) : (
      <main className="page bg-transparent">
        <div className="page-head editorial-copy border-b border-white/10" id="athlete-roster">
          <p className="font-mono text-xs tracking-widest uppercase text-[#D2FF00] mb-3">
            {view === 'sponsor' ? '// ENTERPRISE WORKSPACE' : '// ATHLETE LEDGER'}
          </p>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white mt-0">
            {view === 'sponsor' ? 'Sponsor Discovery Workspace' : 'Athlete Commercial Dashboard'}
          </h1>
          <p className="font-mono text-[11px] tracking-widest text-zinc-400 mt-3">
            {view === 'sponsor'
              ? 'PostGIS radius filters · postcode 3000 catchment · live partner map'
              : 'Hunter Bligh overview · pending payouts · collab merch rail'}
          </p>
        </div>

        {listError && (
          <div className="state">
            <p style={{ color: 'var(--error)', marginBottom: 8 }}>{listError}</p>
            <button className="btn" onClick={() => window.location.reload()}>
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        )}

        {view === 'sponsor' && !listError && (
          <>
            <SpatialCatchment
              selected={catchmentTier}
              counts={catchmentCounts}
              onSelect={(code) => {
                setCatchmentTier(code);
                setRadiusFilter('all');
              }}
              onClear={() => setCatchmentTier(null)}
            />
            <div className="radius-filter">
              <span className="radius-filter-label">Radius:</span>
              <div className="radius-toggle">
                <button
                  className={catchmentTier === null && radiusFilter === '25km' ? 'active' : ''}
                  onClick={() => { setCatchmentTier(null); setRadiusFilter('25km'); }}
                >25km</button>
                <button
                  className={catchmentTier === null && radiusFilter === '50km' ? 'active' : ''}
                  onClick={() => { setCatchmentTier(null); setRadiusFilter('50km'); }}
                >50km</button>
                <button
                  className={catchmentTier === null && radiusFilter === 'all' ? 'active' : ''}
                  onClick={() => { setCatchmentTier(null); setRadiusFilter('all'); }}
                >All Postcodes</button>
              </div>
            </div>
            <div className="relative isolate h-[320px] w-full overflow-hidden rounded-none border border-brand-zinc">
              <MapView
                athlete={catchment3000}
                sponsors={workspaceSponsors}
                catchmentMeters={5000}
                className="relative h-full w-full overflow-hidden"
              />
            </div>
            {loadingList ? (
              <div className="state">
                <div className="spinner" />
                Loading athletes…
              </div>
            ) : (
              <RosterSection
                athletes={athletes}
                loading={false}
                veiled={sessionRole !== 'sponsor'}
                onPrimary={(a) => {
                  if (sessionRole !== 'sponsor') setBarrierOpen(true);
                  else openSponsorDrawer(a);
                }}
                onPerson={(a) => {
                  if (sessionRole !== 'sponsor') setBarrierOpen(true);
                  else setSpecimenAthlete(a);
                }}
                onFilm={(a) => {
                  if (sessionRole !== 'sponsor') setBarrierOpen(true);
                  else setFilmAthlete(a);
                }}
              />
            )}
          </>
        )}

        {view === 'athlete' && (
          <AthletePortal
            athlete={hunterAthlete}
            focus={athleteFocus}
            onOpenDrops={() => setAthleteFocus('drops')}
          />
        )}
      </main>
      )}

      {drawerAthlete && (
        <SponsorDrawer
          athlete={drawerAthlete}
          submitting={booking}
          error={bookingError}
          confirmed={bookingConfirmed}
          onConfirm={handleConfirmSponsorship}
          onClose={() => setDrawerAthlete(null)}
        />
      )}

      {panelOpen && (
        <>
          <div className="panel-overlay" onClick={() => setActiveAthlete(null)} />
          <aside className="panel" role="dialog" aria-label="Matched sponsors">
            <div className="panel-head">
              <div>
                <h2>Matched Sponsors</h2>
                <div className="sub">
                  For {athleteDisplayName(activeAthlete)} · {activeAthlete!.sport ?? 'athlete'}
                </div>
              </div>
              <button
                className="icon-btn"
                onClick={() => setActiveAthlete(null)}
                aria-label="Close panel"
              >
                <X size={16} />
              </button>
            </div>
            <div className="panel-body">
              {matching && (
                <div className="state">
                  <div className="spinner" />
                  Running spatial match…
                </div>
              )}
              {matchError && (
                <div className="state">
                  <p style={{ color: 'var(--error)', marginBottom: 8 }}>{matchError}</p>
                  <button
                    className="btn"
                    onClick={() => activeAthlete && handleFindNearby(activeAthlete)}
                  >
                    <RefreshCw size={14} /> Retry
                  </button>
                </div>
              )}
              {!matching && !matchError && matches.length === 0 && athleteLocation && (
                <div className="radius-slider-section">
                  <div className="relative isolate h-[320px] w-full overflow-hidden rounded-none border border-brand-zinc">
                    <MapView athlete={athleteLocation} sponsors={[]} className="relative h-full w-full overflow-hidden" />
                  </div>
                  <div className="radius-slider-body">
                    <div className="radius-slider-head">
                      <MapPin size={16} />
                      <span>No sponsors found within range. Expand your search radius.</span>
                    </div>
                    <div className="radius-slider-control">
                      <input
                        type="range"
                        min={5}
                        max={100}
                        step={5}
                        value={radiusKm}
                        onChange={(e) => setRadiusKm(Number(e.target.value))}
                        className="radius-slider"
                      />
                      <span className="radius-value">{radiusKm} km</span>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleRadiusSearch(athleteLocation, radiusKm)}
                        disabled={radiusSearching}
                      >
                        {radiusSearching ? (
                          <><Loader2 size={13} className="spin" /> Searching…</>
                        ) : (
                          <><Search size={13} /> Search</>
                        )}
                      </button>
                    </div>
                    <div className="radius-quick-actions">
                      <button
                        className="btn btn-sm"
                        onClick={() => {
                          setRadiusKm(25);
                          handleRadiusSearch(athleteLocation, 25);
                        }}
                        disabled={radiusSearching}
                      >
                        <Maximize2 size={13} /> Expand to 25km
                      </button>
                      <button
                        className="btn btn-sm"
                        onClick={() => {
                          setRadiusKm(50);
                          handleRadiusSearch(athleteLocation, 50);
                        }}
                        disabled={radiusSearching}
                      >
                        <Maximize2 size={13} /> Expand to 50km
                      </button>
                      <button
                        className="btn btn-sm"
                        onClick={() => {
                          setRadiusKm(100);
                          handleRadiusSearch(athleteLocation, 100);
                        }}
                        disabled={radiusSearching}
                      >
                        <Globe size={13} /> Show All National
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {!matching && !matchError && (matches.length > 0 || (athleteLocation && matches.length === 0 && !athleteLocation)) && (
                <div className="relative isolate h-[320px] w-full overflow-hidden rounded-none border border-brand-zinc">
                  <MapView athlete={athleteLocation} sponsors={matches} className="relative h-full w-full overflow-hidden" />
                </div>
              )}
              {!matching && !matchError && matches.length > 2 && (
                <div className="carousel">
                  <button
                    className="carousel-arrow carousel-prev"
                    onClick={(e) => {
                      const sc = e.currentTarget.parentElement?.querySelector('.carousel-track');
                      if (sc) sc.scrollBy({ left: -320, behavior: 'smooth' });
                    }}
                    aria-label="Previous sponsors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div className="carousel-track">
                    {matches.map((m) => (
                      <div className="carousel-slide" key={m.id}>
                        <MatchCard
                          sponsor={m}
                          outreach={outreach[m.id]}
                          onGenerate={() => handleGenerateOutreach(m)}
                          onCopy={(text) => handleCopy(m.id, text)}
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    className="carousel-arrow carousel-next"
                    onClick={(e) => {
                      const sc = e.currentTarget.parentElement?.querySelector('.carousel-track');
                      if (sc) sc.scrollBy({ left: 320, behavior: 'smooth' });
                    }}
                    aria-label="Next sponsors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
              {!matching && !matchError && matches.length > 0 && matches.length <= 2 &&
                matches.map((m) => (
                  <MatchCard
                    key={m.id}
                    sponsor={m}
                    outreach={outreach[m.id]}
                    onGenerate={() => handleGenerateOutreach(m)}
                    onCopy={(text) => handleCopy(m.id, text)}
                  />
                ))}
              {!matching && !matchError && matches.length > 0 && (
                <button
                  className="btn btn-ghost adm-trigger"
                  onClick={() => setShowADMModal(true)}
                >
                  <Info size={14} /> How this match was calculated
                </button>
              )}
            </div>
          </aside>
        </>
      )}

      {profileAthlete && (
        <ProfileModal
          athlete={profileAthlete}
          tab={profileTab}
          onTabChange={setProfileTab}
          onClose={() => setProfileAthlete(null)}
          onSignMOU={() => setShowSignModal(true)}
          onSigned={(updated) => {
            setProfileAthlete(updated);
            setAthletes((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
          }}
        />
      )}

      {showADMModal && activeAthlete && (
        <ADMModal
          athleteName={athleteDisplayName(activeAthlete)}
          matches={matches}
          manualOverride={manualOverride}
          onToggleOverride={() => setManualOverride(!manualOverride)}
          onClose={() => setShowADMModal(false)}
        />
      )}

      {showSignModal && profileAthlete && (
        <SignMOUModal
          athleteName={athleteDisplayName(profileAthlete)}
          signing={signing}
          error={signError}
          onConfirm={handleSignMOU}
          onCancel={() => {
            setShowSignModal(false);
            setSignError(null);
          }}
        />
      )}

      <AuthModal
        key={`${authModalState.open}-${authModalState.role}`}
        isOpen={authModalState.open}
        initialRole={authModalState.role}
        onClose={closeAuthModal}
      />

      {barrierOpen && (
        <EnterpriseBarrier
          onAuthenticate={() => {
            setBarrierOpen(false);
            openAuthModal('sponsor');
          }}
          onClose={() => setBarrierOpen(false)}
        />
      )}

      {specimenAthlete && (
        <AthleteDrawer
          athlete={specimenAthlete}
          onSponsor={() => {
            const next = specimenAthlete;
            setSpecimenAthlete(null);
            openSponsorDrawer(next);
          }}
          onClose={() => setSpecimenAthlete(null)}
        />
      )}

      {filmAthlete && (
        <FilmModal athlete={filmAthlete} onClose={() => setFilmAthlete(null)} />
      )}

      {onboardingOpen && sessionUserId && (
        <AthleteOnboardingDrawer
          userId={sessionUserId}
          onComplete={() => {
            setOnboardingOpen(false);
            enterAthletePortal('overview');
          }}
          onClose={() => setOnboardingOpen(false)}
        />
      )}
    </div>
  );
}

function getAthleteCurrency(athlete?: Athlete | null): string {
  const loc = typeof athlete?.location === 'string' ? athlete.location.toLowerCase() : '';
  if (loc.includes('brazil') || loc.includes('brasil')) return 'BRL';
  if (loc.includes('new zealand') || loc.includes('zealand')) return 'NZD';
  if (athlete?.profile_data?.market_value_nzd != null) return 'NZD';
  return 'AUD';
}

function initials(name?: string | null): string {
  return athleteInitials(name);
}

function statusBadge(status?: string | null): { label: string; cls: string } {
  switch ((status ?? '').toLowerCase().replace(/\s+/g, '_')) {
    case 'active':
      return { label: 'Active', cls: 'active' };
    case 'pending':
      return { label: 'Pending', cls: 'pending' };
    case 'expired':
      return { label: 'Expired', cls: 'warning' };
    default:
      return { label: 'No agreement', cls: '' };
  }
}

export default function App() {
  return <MarketplaceApp />;
}

function MatchCard({
  sponsor,
  outreach,
  onGenerate,
  onCopy,
}: {
  sponsor: MatchedSponsor;
  outreach?: OutreachState;
  onGenerate: () => void;
  onCopy: (text: string) => void;
}) {
  const o = outreach;
  const fullCopy = o?.result
    ? `Subject: ${o.result.subject}\n\n${o.result.copy}`
    : '';
  return (
    <div className="match">
      <div className="match-top">
        <div>
          <h4>{sponsor.business_name}</h4>
          <div className="sub">{sponsor.merchant_category ?? 'Uncategorized'}</div>
        </div>
        <span className="badge accent">
          <MapPin size={12} /> {sponsor.distance_km.toFixed(1)} km
        </span>
      </div>
      <div className="card-meta">
        <span className="badge success">
          {formatCurrency(sponsor.budget_allocation ?? 0, sponsor.currency)} budget
        </span>
        {sponsor.contact_email && (
          <span className="badge">
            <Mail size={12} /> {sponsor.contact_email}
          </span>
        )}
      </div>

      <div className="card-actions">
        <button className="btn btn-primary" onClick={onGenerate} disabled={o?.loading}>
          {o?.loading ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
          Generate Outreach Copy
        </button>
      </div>

      {o?.error && <div style={{ color: 'var(--error)', fontSize: 13 }}>{o.error}</div>}

      {o?.result && (
        <div className="outreach">
          <div className="row">
            <span className="subject">Subject: {o.result.subject}</span>
            <span className="spacer" />
            {o.result.cached && <span className="cache-hit">⚡ prompt cache hit</span>}
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => onCopy(fullCopy)}
              aria-label="Copy outreach copy"
            >
              {o.copied ? <Check size={13} /> : <Copy size={13} />}
              {o.copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre>{o.result.copy}</pre>
        </div>
      )}
    </div>
  );
}

/* ---------- Profile Modal ---------- */

function ProfileModal({
  athlete,
  tab,
  onTabChange,
  onClose,
  onSignMOU,
  onSigned,
}: {
  athlete: Athlete;
  tab: ProfileTab;
  onTabChange: (t: ProfileTab) => void;
  onClose: () => void;
  onSignMOU: () => void;
  onSigned?: (updated: Athlete) => void;
}) {
  const mv = athlete.profile_data?.market_value_aud ?? athlete.profile_data?.market_value_nzd;
  const mvCurrency = getAthleteCurrency(athlete);
  return (
    <>
      <div className="panel-overlay" onClick={onClose} />
      <div className="modal" role="dialog" aria-label="Athlete profile">
        <div className="modal-head">
          <div className="modal-avatar">{initials(athleteDisplayName(athlete))}</div>
          <div style={{ flex: 1 }}>
            <h2>{athleteDisplayName(athlete)}</h2>
            <div className="sub">
              {athlete.sport ?? '—'}
              {athlete.current_club ? ` · ${athlete.current_club}` : ''}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close profile">
            <X size={16} />
          </button>
        </div>

        <div className="modal-tabs">
          <button
            className={tab === 'overview' ? 'active' : ''}
            onClick={() => onTabChange('overview')}
          >
            Overview
          </button>
          <button
            className={tab === 'brandkit' ? 'active' : ''}
            onClick={() => onTabChange('brandkit')}
          >
            <Film size={13} style={{ marginRight: 5, verticalAlign: '-2px' }} />
            Brand Kit &amp; Highlights
          </button>
          <button
            className={tab === 'agreement' ? 'active' : ''}
            onClick={() => onTabChange('agreement')}
          >
            <Receipt size={13} style={{ marginRight: 5, verticalAlign: '-2px' }} />
            Agreement
          </button>
        </div>

        <div className="modal-body">
          {tab === 'overview' && (
            <>
              <div className="info-grid">
                <InfoRow label="Position" value={athlete.profile_data?.position ?? '—'} />
                <InfoRow label="Age" value={athlete.profile_data?.age != null ? String(athlete.profile_data.age) : '—'} />
                <InfoRow
                  label="Market Value"
                  value={typeof mv === 'number' ? formatCurrency(mv, mvCurrency) : '—'}
                />
                <InfoRow
                  label="Followers"
                  value={athlete.follower_count != null ? athlete.follower_count.toLocaleString() : '—'}
                />
                <InfoRow label="Postcode" value={athlete.postcode ?? '—'} />
                <InfoRow label="Agreement" value={statusBadge(athlete.agreement_status).label} />
              </div>

              <div className="licence-section">
                <div className="licence-head">
                  <Shield size={16} />
                  <h3>Master Licence Status</h3>
                </div>
                <div className={`licence-tag ${athlete.master_licence_signed ? 'signed' : 'unsigned'}`}>
                  {athlete.master_licence_signed ? (
                    <>
                      <BadgeCheck size={16} />
                      <span>2-Year Master Licence MOU — Signed</span>
                    </>
                  ) : (
                    <>
                      <X size={16} />
                      <span>2-Year Master Licence MOU — Not Signed</span>
                    </>
                  )}
                </div>
                <p className="licence-desc">
                  The Master Licence Memorandum of Understanding grants exclusive commercial
                  representation rights for all digital and physical branding assets, including
                  social media content, match-day signage, and apparel branding, for a 2-year term.
                </p>
                {!athlete.master_licence_signed && (
                  <button className="btn btn-primary" onClick={onSignMOU}>
                    <PenLine size={14} /> Sign Digital MOU
                  </button>
                )}
              </div>

              <div className="compliance-grid">
                {getSportComplianceBadges(athlete.sport, athlete).map((b, i) => (
                  <ComplianceChip key={`sp-${i}`} label={b.label} active={b.active} />
                ))}
                {getUniversalComplianceBadges(athlete.created_at).map((b, i) => (
                  <ComplianceChip key={`uni-${i}`} label={b.label} active={b.active} />
                ))}
              </div>
            </>
          )}

          {tab === 'brandkit' && <BrandKitTab athlete={athlete} onSigned={onSigned} />}

          {tab === 'agreement' && <CommercialLedger athlete={athlete} />}
        </div>
      </div>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  );
}

function ComplianceChip({ label, active }: { label: string; active: boolean }) {
  return (
    <div className={`compliance-chip ${active ? 'active' : 'inactive'}`}>
      {active ? <BadgeCheck size={14} /> : <X size={14} />}
      <span>{label}</span>
    </div>
  );
}

/* ---------- Sign MOU Modal ---------- */

function SignMOUModal({
  athleteName,
  signing,
  error,
  onConfirm,
  onCancel,
}: {
  athleteName: string;
  signing: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [typedName, setTypedName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const canSubmit = typedName.trim().length > 1 && agreed && !signing;

  return (
    <>
      <div className="panel-overlay" onClick={onCancel} />
      <div className="sign-modal" role="dialog" aria-label="Sign Master Licence MOU">
        <div className="modal-head">
          <div className="modal-avatar">
            <PenLine size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <h2>Sign Master Licence MOU</h2>
            <div className="sub">2-Year exclusive commercial representation</div>
          </div>
          <button className="icon-btn" onClick={onCancel} aria-label="Cancel">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div className="mou-clause">
            <p>
              By signing this Memorandum of Understanding, <strong>{athleteName}</strong> grants
              tmrw/. exclusive commercial representation rights for all digital and physical
              branding assets for a <strong>2-year term</strong>, including:
            </p>
            <ul>
              <li>Social media content and sponsored post placement</li>
              <li>Match-day signage and on-field branding</li>
              <li>Apparel and merchandise branding rights</li>
              <li>Digital broadcast and streaming overlays</li>
            </ul>
            <p className="mou-note">
              This MOU is governed by the NRL Third Party Agreement framework and Shute Shield
              compliance requirements where applicable.
            </p>
          </div>

          <div className="sign-form">
            <label className="sign-label">
              Type your full name to sign digitally
              <input
                type="text"
                className="sign-input"
                placeholder={athleteName}
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                disabled={signing}
              />
            </label>
            <label className="sign-check">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                disabled={signing}
              />
              <span>I have read and agree to the terms of the Master Licence MOU</span>
            </label>
          </div>

          {error && <div className="sign-error">{error}</div>}

          <div className="card-actions" style={{ marginTop: 8 }}>
            <button className="btn" onClick={onCancel} disabled={signing}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={onConfirm}
              disabled={!canSubmit}
            >
              {signing ? (
                <>
                  <Loader2 size={14} className="spin" /> Signing…
                </>
              ) : (
                <>
                  <PenLine size={14} /> Sign &amp; Activate MOU
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- Commercial Ledger & Settlement ---------- */

interface IntegrityConfig {
  title: string;
  description: string;
  confirmLabel: string;
  confirmedLabel: string;
  warningText: string;
  registeredLabel: string;
}

function getIntegrityConfig(sport: string | null): IntegrityConfig {
  const s = (sport ?? '').toLowerCase();

  if (s.includes('rugby') && s.includes('league')) {
    return {
      title: 'NRL Integrity Unit Registration',
      description:
        'Before settlement can be executed, the deal must be confirmed as registered with the NRL Integrity Unit. This verifies that the third-party agreement complies with NRL salary cap and integrity requirements.',
      confirmLabel: 'Confirmed',
      confirmedLabel: 'Registered with NRL Integrity Unit',
      warningText: 'Confirm NRL Integrity Unit registration before executing settlement.',
      registeredLabel: 'Registered with NRL Integrity Unit',
    };
  }

  if (s.includes('rugby') && s.includes('union')) {
    return {
      title: 'Shute Shield / NZ Rugby TPA Declaration',
      description:
        'Before settlement can be executed, confirm that this contract is an arm\u2019s-length third-party agreement (TPA) compliant with Shute Shield and New Zealand Rugby commercial regulations. No club-channel payments or cap-circumvention arrangements are permitted.',
      confirmLabel: 'Arm\u2019s-length TPA confirmed',
      confirmedLabel: 'Arm\u2019s-length TPA declared',
      warningText: 'Confirm Shute Shield / NZ Rugby arm\u2019s-length TPA declaration before executing settlement.',
      registeredLabel: 'Arm\u2019s-length TPA declared',
    };
  }

  if (s.includes('basketball')) {
    return {
      title: 'NBL1 & NCAA NIL Eligibility Clearance',
      description:
        'Before settlement can be executed, confirm that the athlete has NBL1 commercial clearance and NCAA Name, Image and Likeness (NIL) eligibility has been verified. This ensures no amateur status violations under NBL1 or NCAA rules.',
      confirmLabel: 'NBL1 & NCAA NIL cleared',
      confirmedLabel: 'NBL1 & NCAA NIL eligibility cleared',
      warningText: 'Confirm NBL1 & NCAA NIL Eligibility clearance before executing settlement.',
      registeredLabel: 'NBL1 & NCAA NIL eligibility cleared',
    };
  }

  if (s.includes('soccer')) {
    return {
      title: 'Football Australia Commercial Clearance',
      description:
        'Before settlement can be executed, confirm that the athlete has Football Australia commercial clearance and NPL NSW registration has been verified. This ensures the deal complies with FA commercial rights and NPL competition regulations.',
      confirmLabel: 'FA & NPL cleared',
      confirmedLabel: 'Football Australia commercial clearance confirmed',
      warningText: 'Confirm Football Australia commercial clearance before executing settlement.',
      registeredLabel: 'Football Australia commercial clearance confirmed',
    };
  }

  if (s.includes('cricket')) {
    return {
      title: 'Cricket Australia Commercial Clearance',
      description:
        'Before settlement can be executed, confirm that the athlete has Cricket Australia commercial clearance and NSW Premier Cricket registration has been verified. This ensures the deal complies with CA commercial rights and state league regulations.',
      confirmLabel: 'CA clearance confirmed',
      confirmedLabel: 'Cricket Australia commercial clearance confirmed',
      warningText: 'Confirm Cricket Australia commercial clearance before executing settlement.',
      registeredLabel: 'Cricket Australia commercial clearance confirmed',
    };
  }

  if (s.includes('surfing')) {
    return {
      title: 'Surfing Australia & WSL Commercial Clearance',
      description:
        'Before settlement can be executed, confirm that the athlete has Surfing Australia commercial clearance and WSL Regional event compliance has been verified. This ensures the deal complies with SA commercial rights and WSL IP usage terms.',
      confirmLabel: 'SA & WSL cleared',
      confirmedLabel: 'Surfing Australia & WSL clearance confirmed',
      warningText: 'Confirm Surfing Australia & WSL commercial clearance before executing settlement.',
      registeredLabel: 'Surfing Australia & WSL clearance confirmed',
    };
  }

  if (s.includes('afl')) {
    return {
      title: 'AFL State League TPA Clearance',
      description:
        'Before settlement can be executed, confirm that the athlete has AFL State League third-party agreement clearance. This verifies the deal complies with AFL commercial and player payment regulations.',
      confirmLabel: 'AFL TPA cleared',
      confirmedLabel: 'AFL State League TPA cleared',
      warningText: 'Confirm AFL State League TPA clearance before executing settlement.',
      registeredLabel: 'AFL State League TPA cleared',
    };
  }

  if (s.includes('netball')) {
    return {
      title: 'Netball Australia Commercial Registration',
      description:
        'Before settlement can be executed, confirm that the athlete is registered under Netball Australia commercial exclusivity rules. This verifies category exclusivity and SSN competition compliance.',
      confirmLabel: 'Netball Aus cleared',
      confirmedLabel: 'Netball Australia commercial registration confirmed',
      warningText: 'Confirm Netball Australia commercial registration before executing settlement.',
      registeredLabel: 'Netball Australia commercial registration confirmed',
    };
  }

  if (s.includes('para-triathlon')) {
    return {
      title: 'AusTriathlon Commercial Clearance & World Para Exclusivity',
      description:
        'Before settlement can be executed, confirm that the athlete has AusTriathlon Commercial Clearance and World Triathlon Para Series exclusivity has been verified. This ensures the deal complies with both AusTriathlon commercial rights and World Para IP and classification regulations.',
      confirmLabel: 'AusTriathlon & World Para cleared',
      confirmedLabel: 'AusTriathlon Commercial Clearance & World Para Exclusivity confirmed',
      warningText: 'Confirm AusTriathlon Commercial Clearance & World Para Exclusivity before executing settlement.',
      registeredLabel: 'AusTriathlon Commercial Clearance & World Para Exclusivity confirmed',
    };
  }

  if (s.includes('combat')) {
    return {
      title: 'Combat Sports Authority Promotion Clearance',
      description:
        'Before settlement can be executed, confirm that the athlete has Combat Sports Authority IP clearance and individual promotion exclusivity has been verified. This ensures the deal complies with CSA commercial rights and promotion regulations.',
      confirmLabel: 'CSA promotion cleared',
      confirmedLabel: 'Combat Sports Authority promotion clearance confirmed',
      warningText: 'Confirm Combat Sports Authority promotion clearance before executing settlement.',
      registeredLabel: 'Combat Sports Authority promotion clearance confirmed',
    };
  }

  if (s.includes('triathlon')) {
    return {
      title: 'AusTriathlon Commercial Clearance',
      description:
        'Before settlement can be executed, confirm that the athlete has AusTriathlon Commercial Clearance. This verifies the athlete holds individual commercial representation rights and the deal complies with AusTriathlon commercial regulations.',
      confirmLabel: 'AusTriathlon cleared',
      confirmedLabel: 'AusTriathlon Commercial Clearance confirmed',
      warningText: 'Confirm AusTriathlon Commercial Clearance before executing settlement.',
      registeredLabel: 'AusTriathlon Commercial Clearance confirmed',
    };
  }

  // Default / other sports
  return {
    title: 'Governing Body Commercial Registration',
    description:
      'Before settlement can be executed, confirm that the athlete has commercial registration clearance from their sport\u2019s governing body. This verifies the deal complies with applicable commercial and eligibility regulations.',
    confirmLabel: 'Commercial registration confirmed',
    confirmedLabel: 'Governing body commercial registration confirmed',
    warningText: 'Confirm governing body commercial registration before executing settlement.',
    registeredLabel: 'Governing body commercial registration confirmed',
  };
}

function CommercialLedger({ athlete }: { athlete: Athlete }) {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(true);

  useEffect(() => {
    let active = true;
    setLoadingDeals(true);
    fetchAgreements(athlete.id)
      .then((rows) => {
        if (active) setAgreements(rows);
      })
      .catch(() => {
        if (active) setAgreements([]);
      })
      .finally(() => {
        if (active) setLoadingDeals(false);
      });
    return () => {
      active = false;
    };
  }, [athlete.id]);

  const activeDeal = agreements.find((a) => a.status === 'active');
  const fallbackGross =
    athlete.profile_data?.market_value_aud ?? athlete.profile_data?.market_value_nzd ?? 0;
  const grossExGst = activeDeal?.deal_value != null ? Number(activeDeal.deal_value) : fallbackGross;
  const currency = getAthleteCurrency(athlete);

  // GST / Tax breakdown — 10% GST on top of ex-GST amount
  const gstAmount = activeDeal?.gst_amount != null ? Number(activeDeal.gst_amount) : Math.round(grossExGst * 0.1);
  const totalIncGst = activeDeal?.total_inc_gst != null ? Number(activeDeal.total_inc_gst) : grossExGst + gstAmount;

  // Commission and payout calculated strictly on Ex-GST amount
  const commission = Math.round(grossExGst * 0.20);
  const netPayout = grossExGst - commission;

  const [settling, setSettling] = useState(false);
  const [settled, setSettled] = useState(false);
  const [integrityConfirmed, setIntegrityConfirmed] = useState(false);
  const [webhookLog, setWebhookLog] = useState<string | null>(null);

  const integrity = getIntegrityConfig(athlete.sport);

  // Tenure / renewal
  const startDate = activeDeal?.start_date ?? null;
  const endDate = activeDeal?.end_date ?? null;
  const exclusivityCategory = activeDeal?.exclusivity_category ?? null;
  const autoRenewFlag = activeDeal?.auto_renew_flag ?? false;

  const daysToExpiry = useMemo(() => {
    if (!endDate) return null;
    const diff = new Date(endDate).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [endDate]);

  const withinRenewalWindow = daysToExpiry != null && daysToExpiry <= 30 && daysToExpiry >= 0;

  async function handleSettle() {
    if (!integrityConfirmed || settling || settled) return;
    setSettling(true);
    setWebhookLog(null);
    await new Promise((r) => setTimeout(r, 1800));
    const evtId = `evt_3Pq${Math.random().toString(36).slice(2, 10)}Z6J`;
    setSettled(true);
    setSettling(false);
    setWebhookLog(
      `Stripe webhook ${evtId} received · ${formatCurrency(netPayout, currency)} → athlete account · ${formatCurrency(commission, currency)} platform fee collected`
    );
  }

  return (
    <div className="ledger">
      {/* GST / Tax Breakdown */}
      <div className="ledger-section">
        <div className="ledger-head">
          <DollarSign size={16} />
          <h3>Commercial Ledger &amp; GST Breakdown</h3>
        </div>
        <p className="ledger-desc">
          Financial breakdown for the active sponsorship deal with{' '}
          <strong>{athleteDisplayName(athlete)}</strong>. GST is calculated at 10% on the gross deal value.
          The platform collects a 20% commission on the Ex-GST amount; the remaining 80% is
          released to the athlete's connected account via Stripe Connect split payment.
        </p>

        <div className="ledger-breakdown">
          {loadingDeals && (
            <div className="ledger-row" style={{ justifyContent: 'center' }}>
              <Loader2 size={14} className="spin" /> Loading deal data…
            </div>
          )}
          {!loadingDeals && agreements.length === 0 && (
            <div className="ledger-warn" style={{ background: 'rgba(148,163,184,0.06)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              No active agreement on file. Figures shown are the athlete's indicative market value.
            </div>
          )}
          <div className="ledger-row">
            <div className="ledger-row-label">
              <DollarSign size={14} /> Gross Deal (Ex. GST)
            </div>
            <div className="ledger-row-value gross">
              {formatCurrency(grossExGst, currency)}
            </div>
          </div>
          <div className="ledger-row">
            <div className="ledger-row-label">
              <Receipt size={14} /> GST (10%)
            </div>
            <div className="ledger-row-value">
              {formatCurrency(gstAmount, currency)}
            </div>
          </div>
          <div className="ledger-divider" />
          <div className="ledger-row">
            <div className="ledger-row-label">
              <DollarSign size={14} /> Total (Inc. GST)
            </div>
            <div className="ledger-row-value gross">
              {formatCurrency(totalIncGst, currency)}
            </div>
          </div>
          <div className="ledger-divider" />
          <div className="ledger-row">
            <div className="ledger-row-label">
              <Wallet size={14} /> Platform Commission (20% of Ex-GST)
            </div>
            <div className="ledger-row-value commission">
              −{formatCurrency(commission, currency)}
            </div>
          </div>
          <div className="ledger-divider" />
          <div className="ledger-row">
            <div className="ledger-row-label">
              <Landmark size={14} /> Net Athlete Payout (80% of Ex-GST)
            </div>
            <div className="ledger-row-value net">
              {formatCurrency(netPayout, currency)}
            </div>
          </div>
        </div>
      </div>

      {/* Endorsement Tenure & Exclusivity */}
      <div className="ledger-section">
        <div className="ledger-head">
          <Calendar size={16} />
          <h3>Endorsement Tenure &amp; Exclusivity</h3>
        </div>
        <div className="ledger-tenure-grid">
          <div className="ledger-tenure-cell">
            <span className="ledger-tenure-label">Start Date</span>
            <span className="ledger-tenure-value">{startDate ? new Date(startDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
          </div>
          <div className="ledger-tenure-cell">
            <span className="ledger-tenure-label">End Date</span>
            <span className="ledger-tenure-value">{endDate ? new Date(endDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
          </div>
          <div className="ledger-tenure-cell">
            <span className="ledger-tenure-label">Days to Expiry</span>
            <span className={`ledger-tenure-value ${daysToExpiry != null && daysToExpiry <= 30 ? 'warn' : ''}`}>
              {daysToExpiry != null ? `${daysToExpiry} days` : '—'}
            </span>
          </div>
          <div className="ledger-tenure-cell">
            <span className="ledger-tenure-label">Auto-Renew</span>
            <span className="ledger-tenure-value">
              <span className={`badge ${autoRenewFlag ? 'success' : ''}`}>{autoRenewFlag ? 'Enabled' : 'Disabled'}</span>
            </span>
          </div>
        </div>
        {exclusivityCategory && (
          <div className="ledger-exclusivity">
            <Lock size={14} />
            <span className="ledger-exclusivity-label">Category Exclusivity:</span>
            <span className="badge accent">{exclusivityCategory}</span>
          </div>
        )}

        {/* Automated Renewal Prompt */}
        {withinRenewalWindow && (
          <div className="ledger-renewal-prompt">
            <RefreshCw size={16} />
            <div style={{ flex: 1 }}>
              <strong>Renewal Window Active</strong>
              <p>
                This agreement expires in {daysToExpiry} day{daysToExpiry !== 1 ? 's' : ''}.
                {autoRenewFlag
                  ? ' Auto-renewal is enabled — the agreement will renew automatically unless cancelled.'
                  : ' Review and initiate renewal to maintain continuity.'}
              </p>
            </div>
            {!autoRenewFlag && (
              <button className="btn btn-primary btn-sm">
                <RefreshCw size={13} /> Initiate Renewal
              </button>
            )}
          </div>
        )}
      </div>

      {/* Integrity Unit Verification */}
      <div className="ledger-section">
        <div className="ledger-head">
          <Landmark size={16} />
          <h3>{integrity.title}</h3>
        </div>
        <p className="ledger-desc">
          {integrity.description}
        </p>
        <div className="ledger-toggle-row">
          <button
            className={`adm-toggle ${integrityConfirmed ? 'on' : 'off'}`}
            onClick={() => setIntegrityConfirmed(!integrityConfirmed)}
            aria-pressed={integrityConfirmed}
          >
            {integrityConfirmed ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            <span>{integrityConfirmed ? integrity.confirmLabel : 'Not Confirmed'}</span>
          </button>
          {integrityConfirmed && (
            <span className="ledger-confirmed-tag">
              <CheckCircle2 size={14} /> {integrity.confirmedLabel}
            </span>
          )}
        </div>
      </div>

      {/* Stripe Split Payment */}
      <div className="ledger-section">
        <div className="ledger-head">
          <Zap size={16} />
          <h3>Stripe Split Payment</h3>
        </div>
        <p className="ledger-desc">
          Executing the split payment triggers a Stripe Connect webhook that releases the net
          payout to the athlete's connected account and collects the 20% platform fee.
        </p>
        <button
          className="btn btn-primary ledger-settle-btn"
          onClick={handleSettle}
          disabled={!integrityConfirmed || settling || settled}
        >
          {settling ? (
            <>
              <Loader2 size={14} className="spin" /> Triggering webhook…
            </>
          ) : settled ? (
            <>
              <CheckCircle2 size={14} /> Settlement Complete
            </>
          ) : (
            <>
              <Zap size={14} /> Execute Stripe Split Payment
            </>
          )}
        </button>
        {!integrityConfirmed && !settled && (
          <div className="ledger-warn">
            {integrity.warningText}
          </div>
        )}
        {webhookLog && (
          <div className="ledger-webhook-log">
            <CheckCircle2 size={14} />
            <span>{webhookLog}</span>
          </div>
        )}
      </div>

      {/* RCTI Statements & Invoices */}
      <StatementsPanel
        grossExGst={grossExGst}
        currency={currency}
        athleteName={athleteDisplayName(athlete)}
        startDate={startDate}
        endDate={endDate}
      />

      {/* Two-Way In-App Messaging */}
      <MessageThread
        agreementId={activeDeal?.id ?? null}
        athleteName={athleteDisplayName(athlete)}
      />
    </div>
  );
}

/* ---------- Compliance & Privacy Helpers ---------- */

function computeConfidence(distanceKm: number, radiusM: number): number {
  const radiusKm = radiusM / 1000;
  if (radiusKm <= 0 || distanceKm >= radiusKm) return 0;
  return Math.round((1 - distanceKm / radiusKm) * 100);
}

/* ---------- ADM Transparency Modal ---------- */

function ADMModal({
  athleteName,
  matches,
  manualOverride,
  onToggleOverride,
  onClose,
}: {
  athleteName: string;
  matches: MatchedSponsor[];
  manualOverride: boolean;
  onToggleOverride: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="panel-overlay" onClick={onClose} />
      <div className="modal adm-modal" role="dialog" aria-label="Match calculation transparency">
        <div className="modal-head">
          <div className="modal-avatar">
            <Info size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <h2>How This Match Was Calculated</h2>
            <div className="sub">Automated Decision-Making Transparency · APP 1.7–1.9</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div className="adm-section">
            <h3 className="adm-heading">Spatial Overlap Density Formula</h3>
            <p className="adm-text">
              For each sponsor, we measure the straight-line distance between{' '}
              <strong>{athleteName}</strong>'s registered location and the sponsor's business
              location. A sponsor is included as a match if the athlete falls within the sponsor's
              defined target radius.
            </p>
            <div className="adm-formula">
              Confidence = (Target Radius − Distance to Athlete) ÷ Target Radius × 100%
            </div>
            <p className="adm-text">
              The closer the athlete is to the sponsor relative to the sponsor's reach, the higher
              the confidence score. A score of 100% means the athlete is at the sponsor's exact
              location; a score near 0% means the athlete is at the edge of the sponsor's reach.
            </p>
          </div>

          <div className="adm-section">
            <h3 className="adm-heading">Confidence Scores</h3>
            <div className="adm-scores">
              {matches.map((m) => {
                const conf = computeConfidence(m.distance_km, m.target_radius_meters);
                return (
                  <div key={m.id} className="adm-score-row">
                    <div className="adm-score-name">{m.business_name}</div>
                    <div className="adm-score-bar-wrap">
                      <div className="adm-score-bar" style={{ width: `${conf}%` }} />
                    </div>
                    <div className="adm-score-value">{conf}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="adm-section adm-override">
            <div className="adm-override-head">
              <h3 className="adm-heading">Manual Override</h3>
              <button
                className={`adm-toggle ${manualOverride ? 'on' : 'off'}`}
                onClick={onToggleOverride}
                aria-pressed={manualOverride}
              >
                {manualOverride ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                <span>{manualOverride ? 'ON' : 'OFF'}</span>
              </button>
            </div>
            <p className="adm-text">
              When manual override is enabled, automated matching results are treated as
              recommendations only. A human reviewer must approve each sponsor–athlete pairing
              before any outreach is sent. This fulfils APP 1.7–1.9 requirements for meaningful
              human intervention in automated decision-making.
            </p>
            {manualOverride && (
              <div className="adm-override-notice">
                <Eye size={14} />
                <span>
                  Manual review required — automated matches will not trigger outreach
                  automatically.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
