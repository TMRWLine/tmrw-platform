import React, { useEffect, useRef, useState } from 'react';
import './CartDrawer.css';
import { createPortal } from 'react-dom';
import { BrandLockup } from './BrandLockup';
import { ProductPhotoGallery } from './ProductPhotoGallery';
import type { AthleteRecord } from '../data/roster';

export type LockupStyleId = 'editorial' | 'stencil' | 'heritage';

export interface CartCapsuleItem {
  id: string;
  athleteName: string;
  athleteHandle: string;
  clubName: string;
  collabPartner?: string;
  collabRoyaltyPct?: number;
  postcode: string;
  title: string;
  edition: string;
  spec: string;
  gsm: string;
  fitProfile: string;
  garmentType: 'hoodie' | 'tee';
  priceAud: number;
  baseCostAud: number;
  unitsSold: number;
  unitsCap: number;
  swatchBg: string;
  monogram: string;
  lockupStyle: LockupStyleId;
}

const CUSTOM_CAPSULES_STORAGE_KEY = 'tmrw_custom_athlete_capsules_v12';
export const OPEN_CAPSULE_DRAWER_EVENT = 'tmrw:open-capsule-drawer';

export function dispatchOpenCapsuleDrawer(options?: {
  initialView?: 'empty' | 'capsules' | 'creator';
  athleteName?: string;
  clubName?: string;
  postcode?: string;
}) {
  window.dispatchEvent(
    new CustomEvent(OPEN_CAPSULE_DRAWER_EVENT, { detail: options ?? {} }),
  );
}

interface BlankChassis {
  id: string;
  code: string;
  name: string;
  gsm: string;
  fitProfile: string;
  garmentType: 'hoodie' | 'tee';
  baseCostAud: number;
  defaultRetailAud: number;
  spec: string;
}

const BLANK_CHASSIS_OPTIONS: readonly BlankChassis[] = [
  {
    id: 'hoodie_420',
    code: 'EARLS-01',
    name: '420GSM Heavy Wash French Terry Hoodie',
    gsm: '420GSM',
    fitProfile: 'BOX FIT · RAW EDGE TRIMMING',
    garmentType: 'hoodie',
    baseCostAud: 45,
    defaultRetailAud: 180,
    spec: '420GSM Heavyweight French Terry Cotton · Garment Dyed & Distressed',
  },
  {
    id: 'tee_280',
    code: 'EARLS-02',
    name: '280GSM Pigment-Dyed Heavy Tee',
    gsm: '280GSM',
    fitProfile: 'RELAXED ARCHITECTURAL CUT',
    garmentType: 'tee',
    baseCostAud: 25,
    defaultRetailAud: 95,
    spec: '280GSM Combed Cotton · Overlocked Seams & Pip Label',
  },
];

const SWATCH_THEMES = [
  {
    id: 'obsidian',
    label: '01 · Obsidian Carbon',
    swatchBg: 'bg-[#0F0F11] text-white',
  },
  {
    id: 'stone',
    label: '02 · Raw Stone',
    swatchBg: 'bg-[#D8D8D2] text-[#0F0F11] border border-black/15',
  },
  {
    id: 'chalk',
    label: '03 · Gallery Chalk',
    swatchBg: 'bg-[#F4F4F0] text-[#0F0F11] border border-black/15',
  },
] as const;

const LOCKUP_STYLES: readonly { id: LockupStyleId; label: string; className: string }[] = [
  {
    id: 'editorial',
    label: 'Monument Tight',
    className: 'font-sans font-black tracking-[-0.06em] uppercase',
  },
  {
    id: 'stencil',
    label: 'Mono Index',
    className: 'font-mono font-bold tracking-[-0.04em] uppercase',
  },
  {
    id: 'heritage',
    label: 'Varsity Wide',
    className: 'font-sans font-black tracking-[0.06em] uppercase',
  },
];

const DEFAULT_CAPSULE_DROPS: readonly CartCapsuleItem[] = [
  {
    id: 'drop_mt_2200',
    athleteName: 'Marcus Thorne',
    athleteHandle: '@marcusthorne_22',
    clubName: 'Bankstown Bruins',
    collabPartner: 'Earls Collection',
    collabRoyaltyPct: 15,
    postcode: '2200',
    title: 'MT-22 Heavyweight Contrast Hood',
    edition: 'LIMITED DROP · 042 / 100 REMAINING',
    spec: '420GSM Heavy Wash French Terry Cotton · Garment Dyed',
    gsm: '420GSM',
    fitProfile: 'BOX FIT · RAW EDGE TRIMMING',
    garmentType: 'hoodie',
    priceAud: 180,
    baseCostAud: 45,
    unitsSold: 58,
    unitsCap: 100,
    swatchBg: 'bg-[#0F0F11] text-white',
    monogram: 'MT·22',
    lockupStyle: 'editorial',
  },
  {
    id: 'drop_sb_2095',
    athleteName: 'Sienna Blake',
    athleteHandle: '@siennablake.run',
    clubName: 'Manly Warringah Athletics',
    collabPartner: 'Manly Run Club',
    collabRoyaltyPct: 0,
    postcode: '2095',
    title: 'SB Track Club Vintage Wash Tee',
    edition: '72-HOUR PRE-ORDER · 019 / 150 REMAINING',
    spec: '280GSM Pigment-Dyed Combed Cotton · Overlocked Seams',
    gsm: '280GSM',
    fitProfile: 'RELAXED ARCHITECTURAL CUT',
    garmentType: 'tee',
    priceAud: 95,
    baseCostAud: 25,
    unitsSold: 131,
    unitsCap: 150,
    swatchBg: 'bg-[#D8D8D2] text-[#0F0F11] border border-black/15',
    monogram: 'SB·01',
    lockupStyle: 'stencil',
  },
];

function loadAllCapsules(): CartCapsuleItem[] {
  try {
    const raw = window.localStorage.getItem(CUSTOM_CAPSULES_STORAGE_KEY);
    if (!raw) return [...DEFAULT_CAPSULE_DROPS];
    const parsed = JSON.parse(raw) as CartCapsuleItem[];
    return [...parsed, ...DEFAULT_CAPSULE_DROPS];
  } catch {
    return [...DEFAULT_CAPSULE_DROPS];
  }
}

function saveCustomCapsule(newCapsule: CartCapsuleItem) {
  try {
    const raw = window.localStorage.getItem(CUSTOM_CAPSULES_STORAGE_KEY);
    const existing = raw ? (JSON.parse(raw) as CartCapsuleItem[]) : [];
    const updated = [newCapsule, ...existing];
    window.localStorage.setItem(CUSTOM_CAPSULES_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('tmrw:capsules-updated'));
  } catch {
    // Ignore storage errors
  }
}

function getLockupClass(styleId?: LockupStyleId): string {
  const found = LOCKUP_STYLES.find((s) => s.id === styleId);
  return found ? found.className : LOCKUP_STYLES[0].className;
}

interface CartDrawerProps {
  isOpen?: boolean;
  onClose: () => void;
  onHome: () => void;
  selectedAthlete?: AthleteRecord | any | null;
  onExploreRoster?: () => void;
}

const RetroPixelCabinetIcon: React.FC = () => (
  <svg
    viewBox="0 0 32 32"
    className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-5 select-none"
    shapeRendering="crispEdges"
    aria-hidden="true"
  >
    <rect x="9" y="2" width="14" height="10" fill="#FFFFFF" stroke="#0F0F11" strokeWidth="2" />
    <rect x="12" y="12" width="3" height="2" fill="#0F0F11" />
    <rect x="14" y="4" width="4" height="2" fill="#0F0F11" />
    <rect x="16" y="6" width="2" height="2" fill="#0F0F11" />
    <rect x="15" y="9" width="2" height="2" fill="#0F0F11" />

    <rect x="10" y="15" width="12" height="15" fill="#B8FF00" stroke="#0F0F11" strokeWidth="2" />
    <rect x="12" y="17" width="8" height="5" fill="#B8FF00" stroke="#0F0F11" strokeWidth="1" />
    <rect x="15" y="19" width="2" height="1" fill="#FFFFFF" />
    <rect x="12" y="23" width="8" height="5" fill="#B8FF00" stroke="#0F0F11" strokeWidth="1" />
    <rect x="15" y="25" width="2" height="1" fill="#FFFFFF" />
  </svg>
);

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen = true,
  onClose,
  onHome,
  selectedAthlete,
  onExploreRoster,
}) => {
  const [view, setView] = useState<'empty' | 'capsules' | 'creator' | 'checkout_demo'>('capsules');
  const [capsules, setCapsules] = useState<CartCapsuleItem[]>(() =>
    typeof window !== 'undefined' ? loadAllCapsules() : [...DEFAULT_CAPSULE_DROPS],
  );
  const [cartItems, setCartItems] = useState<{ item: CartCapsuleItem; qty: number; size: string }[]>([]);
  const drawerRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const demoHeadingRef = useRef<HTMLHeadingElement>(null);
  const [bagUpdate, setBagUpdate] = useState('');
  const [selectedSize, setSelectedSize] = useState<Record<string, string>>({
    drop_mt_2200: 'L',
    drop_sb_2095: 'M',
  });
  const [sponsorBulkMode, setSponsorBulkMode] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [demoReceipt, setDemoReceipt] = useState<{
    sessionId: string;
    split: { athleteAud: number; clubAud: number; partnerAud: number } | null;
  } | null>(null);

  // Studio State
  const [selectedChassisId, setSelectedChassisId] = useState<string>('hoodie_420');
  const [selectedSwatchId, setSelectedSwatchId] = useState<string>('obsidian');
  const [selectedLockupStyle, setSelectedLockupStyle] = useState<LockupStyleId>('editorial');
  const [specimenSide, setSpecimenSide] = useState<'front' | 'back'>('front');
  const [newAthleteName, setNewAthleteName] = useState('Marcus Thorne');
  const [newClubName, setNewClubName] = useState('Bankstown Bruins');
  const [newCollabPartner, setNewCollabPartner] = useState('Earls Collection');
  const [enablePartnerRoyaltySplit, setEnablePartnerRoyaltySplit] = useState(true);
  const [newPostcode, setNewPostcode] = useState('2200');
  const [newGarmentTitle, setNewGarmentTitle] = useState('MT-22 Heavyweight Contrast Hood');
  const [newUnitsCap] = useState<number>(100);
  const [newPrice, setNewPrice] = useState<number>(180);
  const [newMonogram, setNewMonogram] = useState('MT·22');
  const [siaCleared, setSiaCleared] = useState(true);

  const activeChassis =
    BLANK_CHASSIS_OPTIONS.find((c) => c.id === selectedChassisId) ?? BLANK_CHASSIS_OPTIONS[0];
  const activeSwatch =
    SWATCH_THEMES.find((s) => s.id === selectedSwatchId) ?? SWATCH_THEMES[0];

  const navigateMobile = (nextView: 'capsules' | 'empty' | 'creator') => {
    setView(nextView);
    drawerRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  };

  useEffect(() => {
    if (!selectedAthlete) return;
    const name = selectedAthlete.display_name || selectedAthlete.name;
    if (name) {
      setNewAthleteName(name);
      const initials = name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      setNewMonogram(`${initials}·01`);
    }
    if (selectedAthlete.current_club || selectedAthlete.club) {
      setNewClubName(selectedAthlete.current_club || selectedAthlete.club);
    }
    if (selectedAthlete.primary_postcode || selectedAthlete.postcode) {
      setNewPostcode(String(selectedAthlete.primary_postcode || selectedAthlete.postcode));
    }
  }, [selectedAthlete]);

  useEffect(() => {
    const onOpenCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      if (detail.initialView) setView(detail.initialView);
      if (detail.athleteName) setNewAthleteName(detail.athleteName);
      if (detail.clubName) setNewClubName(detail.clubName);
      if (detail.postcode) setNewPostcode(detail.postcode);
    };
    window.addEventListener(OPEN_CAPSULE_DRAWER_EVENT, onOpenCustom);
    return () => window.removeEventListener(OPEN_CAPSULE_DRAWER_EVENT, onOpenCustom);
  }, []);

  useEffect(() => {
    const sync = () => setCapsules(loadAllCapsules());
    sync();
    window.addEventListener('tmrw:capsules-updated', sync);
    return () => window.removeEventListener('tmrw:capsules-updated', sync);
  }, [isOpen]);

  useEffect(() => {
    const drawer = drawerRef.current;
    if (!isOpen || !drawer) return;
    const trigger = document.activeElement;
    drawer.showModal();
    closeRef.current?.focus();
    return () => {
      drawer.close();
      if (document.activeElement === document.body && trigger instanceof HTMLElement && trigger.getClientRects().length) {
        trigger.focus({ preventScroll: true });
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    drawerRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    if (view === 'checkout_demo') demoHeadingRef.current?.focus({ preventScroll: true });
  }, [isOpen, view]);

  if (!isOpen) return null;

  const addToCart = (drop: CartCapsuleItem) => {
    setCheckoutError(null);
    const qtyToAdd = sponsorBulkMode ? 25 : 1;
    const size = sponsorBulkMode ? '25x VENUE CURVE (3S·8M·9L·5XL)' : selectedSize[drop.id] || 'L';
    if ((cartItems.find(entry => entry.item.id === drop.id && entry.size === size)?.qty ?? 0) + qtyToAdd > 100) {
      setBagUpdate('This item has reached the maximum quantity per order.');
      return;
    }
    setCartItems((prev) => {
      const existingIdx = prev.findIndex((x) => x.item.id === drop.id && x.size === size);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          qty: updated[existingIdx].qty + qtyToAdd,
        };
        return updated;
      }
      return [...prev, { item: drop, qty: qtyToAdd, size }];
    });
    setBagUpdate(`Added ${drop.title} to your bag.`);
  };

  const handleStripeCheckout = async () => {
    if (cartItems.length === 0 || isCheckingOut) return;
    setIsCheckingOut(true);
    setCheckoutError(null);

    try {
      const capsuleItems = cartItems.map((entry) => ({
        id: entry.item.id,
        title: entry.item.title,
        athleteName: entry.item.athleteName,
        clubName: entry.item.clubName,
        collabPartner: entry.item.collabPartner,
        collabRoyaltyPct: entry.item.collabRoyaltyPct ?? 0,
        priceAud: entry.item.priceAud,
        baseCostAud: entry.item.baseCostAud,
        qty: entry.qty,
        size: entry.size,
      }));

      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capsuleItems }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Could not initialise Stripe Checkout session.');
      }

      if (data.checkoutUrl && /^https?:\/\//i.test(data.checkoutUrl)) {
        window.location.assign(data.checkoutUrl);
        return;
      }

      const sessionId = data.sessionId;
      if (typeof sessionId !== 'string' || !sessionId.startsWith('cs_demo_capsule_')) {
        throw new Error('Checkout did not return a payment link.');
      }
      const { athleteAud, clubAud, partnerAud } = data.splits ?? {};
      const split = [athleteAud, clubAud, partnerAud].every(Number.isFinite)
        ? { athleteAud, clubAud, partnerAud }
        : null;
      setDemoReceipt({ sessionId, split });
      setView('checkout_demo');
    } catch (err: any) {
      setCheckoutError(err?.message || 'Unable to connect to checkout server on port 3001.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleSelectChassis = (chassis: BlankChassis) => {
    setSelectedChassisId(chassis.id);
    setNewPrice(chassis.defaultRetailAud);
    if (chassis.garmentType === 'tee') {
      setNewGarmentTitle('SB Track Club Vintage Wash Tee');
    } else {
      setNewGarmentTitle('MT-22 Heavyweight Contrast Hood');
    }
  };

  const handlePublishCapsule = (e: React.FormEvent) => {
    e.preventDefault();
    const hasPartner = newCollabPartner.trim().length > 0;
    const created: CartCapsuleItem = {
      id: `drop_custom_${Date.now()}`,
      athleteName: newAthleteName,
      athleteHandle: `@${newAthleteName.toLowerCase().replace(/\s+/g, '')}`,
      clubName: newClubName,
      collabPartner: hasPartner ? newCollabPartner.trim() : undefined,
      collabRoyaltyPct: hasPartner && enablePartnerRoyaltySplit ? 15 : 0,
      postcode: newPostcode,
      title: newGarmentTitle,
      edition: `LIMITED DROP · ${newUnitsCap} / ${newUnitsCap} REMAINING`,
      spec: activeChassis.spec,
      gsm: activeChassis.gsm,
      fitProfile: activeChassis.fitProfile,
      garmentType: activeChassis.garmentType,
      priceAud: Number(newPrice) || activeChassis.defaultRetailAud,
      baseCostAud: activeChassis.baseCostAud,
      unitsSold: 1,
      unitsCap: newUnitsCap,
      swatchBg: activeSwatch.swatchBg,
      monogram: newMonogram || 'TM·01',
      lockupStyle: selectedLockupStyle,
    };
    saveCustomCapsule(created);
    setCapsules(loadAllCapsules());
    setView('capsules');
  };

  const removeFromCart = (idx: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const changeQuantity = (idx: number, qty: number) => {
    setCartItems(prev => prev.map((entry, i) => i === idx ? { ...entry, qty } : entry));
  };

  const grossTotal = cartItems.reduce((sum, entry) => sum + entry.item.priceAud * entry.qty, 0);
  const formatAud = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', currencyDisplay: 'narrowSymbol' });

  const hasPartnerActive = newCollabPartner.trim().length > 0 && enablePartnerRoyaltySplit;
  const athletePctPreview = hasPartnerActive ? 0.55 : 0.7;
  const partnerPctPreview = hasPartnerActive ? 0.15 : 0;
  const previewNetMargin = Math.max(0, Number(newPrice) - activeChassis.baseCostAud);
  const previewAthleteUnit = Math.round(previewNetMargin * athletePctPreview);
  const previewPartnerUnit = Math.round(previewNetMargin * partnerPctPreview);
  const previewClubUnit = Math.round(previewNetMargin * 0.15);

  return createPortal(
    <dialog
      ref={drawerRef}
      aria-label="Merchandise showroom and bag"
      data-lenis-prevent="true"
      onCancel={event => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const controls = [...event.currentTarget.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]',
        )].filter(control => control.tabIndex >= 0 && control.getClientRects().length);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      className="capsule-shop fixed inset-0 m-0 h-full w-full max-h-none max-w-none border-0 bg-white p-0 text-[#0F0F11] open:flex flex-col overflow-y-auto overscroll-contain selection:bg-volt selection:text-[#0F0F11] motion-safe:animate-fadeIn"
    >
      <header className="capsule-shop-header shrink-0 w-full max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 py-5 flex items-center justify-between border-b border-black/10">
        <BrandLockup onClick={onHome} />

        <div className="hidden md:flex items-center gap-6 font-sans text-xs font-medium text-[#0F0F11]">
          <button
            type="button"
            onClick={() => {
              onClose();
              onExploreRoster?.();
            }}
            className="bg-transparent border-0 cursor-pointer hover:opacity-60 font-medium"
          >
            The Roster
          </button>
          <button
            type="button"
            onClick={() => setView('capsules')}
            className={`bg-transparent border-0 cursor-pointer font-bold ${
              view === 'capsules' ? 'underline underline-offset-4' : 'hover:opacity-60'
            }`}
          >
            Athlete Merch Capsules ({capsules.length})
          </button>
          <span className="h-3.5 w-[1px] bg-black/15" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setView('creator')}
            className={`rounded-full px-3.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider cursor-pointer border transition-colors ${
              view === 'creator'
                ? 'bg-[#0F0F11] text-volt border-[#0F0F11]'
                : 'bg-[#EAEAE6] text-[#0F0F11] border-black/10 hover:bg-[#0F0F11] hover:text-white'
            }`}
          >
            Athlete Portal · Studio
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-pressed={view === 'empty'}
            onClick={() => setView('empty')}
            className="capsule-header-bag min-h-11 rounded-full border border-black/15 bg-white px-3 font-mono text-xs font-bold text-[#080808] aria-pressed:bg-[#080808] aria-pressed:text-white"
          >
            Bag ({cartItems.reduce((s, i) => s + i.qty, 0)})
          </button>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            title="Close [ESC]"
            aria-label="Close bag"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#0F0F11] hover:bg-white text-white hover:text-[#0F0F11] border border-transparent hover:border-black/20 px-5 py-1.5 font-sans text-xs font-bold tracking-tight shadow-sm transition-all duration-300 cursor-pointer group"
          >
            <span>Close</span>
            <span className="text-[11px] text-volt group-hover:text-[#0F0F11] transition-colors">✕</span>
          </button>
        </div>

        <nav className="capsule-mobile-nav" aria-label="Capsule shop navigation">
          <button type="button" aria-pressed={view === 'capsules'} onClick={() => navigateMobile('capsules')}>Showroom</button>
          <button type="button" aria-pressed={view === 'empty'} onClick={() => navigateMobile('empty')}>Bag ({cartItems.reduce((sum, entry) => sum + entry.qty, 0)})</button>
          <button type="button" aria-pressed={view === 'creator'} onClick={() => navigateMobile('creator')}>Studio</button>
          <button type="button" onClick={() => { onClose(); onExploreRoster?.(); }}>The Roster</button>
        </nav>
      </header>

      <p role="status" className="sr-only">{bagUpdate}</p>
      <div className="capsule-shop-content flex-1 w-full max-w-[1440px] mx-auto px-3 sm:px-6 md:px-8 pt-6 pb-14 flex flex-col">
        <div className="capsule-shop-panel w-full min-h-[640px] rounded-[20px] bg-[#F7F7F6] p-3 sm:p-8 md:p-12 flex flex-col relative overflow-hidden">
          {view === 'empty' && cartItems.length === 0 && (
            <div className="max-w-md mx-auto text-center my-auto py-16">
              <RetroPixelCabinetIcon />

              <h2 className="m-0 font-sans text-2xl sm:text-3xl font-bold tracking-[-0.02em] text-[#0F0F11] mb-5">
                Your cart is empty
              </h2>

              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => setView('capsules')}
                  className="rounded-full bg-volt hover:bg-[#0F0F11] text-[#0F0F11] hover:text-white px-7 py-3 font-sans text-xs font-bold tracking-tight transition-colors cursor-pointer border-0 shadow-sm"
                >
                  Explore athlete capsules
                </button>

                <button
                  type="button"
                  onClick={() => setView('creator')}
                  className="rounded-full bg-white hover:bg-[#0F0F11] text-[#0F0F11] hover:text-white px-6 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer border border-black/10"
                >
                  Open Capsule Studio →
                </button>
              </div>
            </div>
          )}

          {/* CREATOR STUDIO VIEW */}
          {view === 'creator' && (
            <div className="capsule-studio w-full max-w-6xl mx-auto space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-black/15 pb-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-600 mb-1.5">
                    <span>ZERO-INVENTORY PRE-ORDER ENGINE</span>
                    <span>·</span>
                    <span className="rounded bg-[#0F0F11] text-volt px-2 py-0.5">
                      {hasPartnerActive ? '55 / 15 / 15 / 15 CO-LAB SPLIT' : '70 / 15 / 15 ROYALTY SPLIT'}
                    </span>
                  </div>
                  <h2 className="m-0 font-sans text-3xl sm:text-5xl font-black uppercase tracking-[-0.03em] text-[#0F0F11] leading-none">
                    Athlete Capsule Creator Studio<span className="text-volt">.</span>
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setView('capsules')}
                  className="rounded-full bg-white hover:bg-[#0F0F11] text-[#0F0F11] hover:text-white px-5 py-2 font-mono text-[10px] font-bold uppercase cursor-pointer border border-black/15 transition-colors"
                >
                  ← Back to Showroom
                </button>
              </div>

              <form onSubmit={handlePublishCapsule} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                <div className="lg:col-span-5 flex flex-col justify-between">
                  <div className="rounded-[24px] bg-white p-6 sm:p-7 border border-black/15 flex flex-col justify-between shadow-sm h-full">
                    <div>
                      <div className="flex items-center justify-between gap-2 pb-4 mb-4 border-b border-black/10">
                        <span className="font-mono text-[9.5px] font-bold uppercase tracking-widest text-neutral-500">
                          DESIGN MOCKUP · NOT A PRODUCT PHOTO
                        </span>
                        <div className="flex items-center gap-1 bg-[#EAEAE6] p-1 rounded-full">
                          <button
                            type="button"
                            onClick={() => setSpecimenSide('front')}
                            aria-pressed={specimenSide === 'front'}
                            className={`rounded-full px-3 py-1 font-mono text-[9px] font-bold uppercase cursor-pointer border-0 transition-colors ${
                              specimenSide === 'front' ? 'bg-[#0F0F11] text-volt' : 'bg-transparent text-[#0F0F11]'
                            }`}
                          >
                            Front
                          </button>
                          <button
                            type="button"
                            onClick={() => setSpecimenSide('back')}
                            aria-pressed={specimenSide === 'back'}
                            className={`rounded-full px-3 py-1 font-mono text-[9px] font-bold uppercase cursor-pointer border-0 transition-colors ${
                              specimenSide === 'back' ? 'bg-[#0F0F11] text-volt' : 'bg-transparent text-[#0F0F11]'
                            }`}
                          >
                            Back
                          </button>
                        </div>
                      </div>

                      <div
                        className={`capsule-studio-preview rounded-[18px] h-96 p-6 flex flex-col justify-between mb-5 relative overflow-hidden select-none ${activeSwatch.swatchBg}`}
                      >
                        <div className="absolute inset-0 z-0 overflow-hidden bg-black/20">
                          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/50" />
                        </div>

                        <div className="flex items-center justify-between font-mono text-[9.5px] font-bold uppercase relative z-10 text-white">
                          <span>{activeChassis.garmentType.toUpperCase()} · {newUnitsCap} UNITS</span>
                          <span className="bg-black/60 text-volt px-2.5 py-0.5 rounded-full">
                            {specimenSide === 'back' ? 'BACK ARCHIVE' : 'FRONT SPECIMEN'}
                          </span>
                        </div>

                        <div className="relative my-auto h-36 flex items-center justify-center z-10">
                          <div
                            className={`absolute inset-0 flex flex-col items-center justify-center text-center transition-all duration-500 ${
                              specimenSide === 'back'
                                ? 'opacity-0 scale-95 pointer-events-none'
                                : 'opacity-100 scale-100'
                            }`}
                          >
                            <div className={`text-5xl sm:text-6xl text-white drop-shadow-lg ${getLockupClass(selectedLockupStyle)}`}>
                              {newMonogram}
                              <span className="text-volt">.</span>
                            </div>
                            {newCollabPartner.trim() && (
                              <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-black/85 text-volt px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-widest border border-volt/30 shadow-sm">
                                <span>× {newCollabPartner}</span>
                              </div>
                            )}
                          </div>

                          <div
                            className={`absolute inset-0 flex flex-col items-center justify-center text-center font-mono transition-all duration-500 bg-black/55 backdrop-blur-md rounded-2xl p-4 border border-white/15 ${
                              specimenSide === 'back'
                                ? 'opacity-100 scale-100'
                                : 'opacity-0 scale-95 pointer-events-none'
                            }`}
                          >
                            <div className="text-[10px] uppercase text-volt tracking-widest">
                              ARCHIVE // {newClubName}
                            </div>
                            <div className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-md mt-1">
                              POSTCODE {newPostcode}
                              <span className="text-volt">.</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between font-mono text-[9.5px] uppercase text-white/90 relative z-10 pt-2 border-t border-white/15">
                          <span>{newAthleteName}</span>
                          <span>{activeChassis.gsm}</span>
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="m-0 font-sans text-lg font-black text-[#0F0F11]">
                            {newGarmentTitle}
                          </h3>
                          <p className="m-0 mt-1 font-sans text-xs text-neutral-600">
                            {activeChassis.spec}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-sans text-2xl font-black text-[#0F0F11] block">
                            A${newPrice}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl bg-[#EAEAE6] p-3.5 font-mono text-[10px] space-y-1.5 border border-black/10">
                        <div className="flex justify-between text-neutral-700">
                          <span>{Math.round(athletePctPreview * 100)}% ATHLETE:</span>
                          <strong className="text-[#0F0F11]">A${previewAthleteUnit} / unit</strong>
                        </div>
                        {hasPartnerActive && (
                          <div className="flex justify-between text-neutral-700">
                            <span>15% CO-LAB ({newCollabPartner.toUpperCase()}):</span>
                            <strong className="text-[#0F0F11]">A${previewPartnerUnit} / unit</strong>
                          </div>
                        )}
                        <div className="flex justify-between text-neutral-700">
                          <span>15% JUNIOR CLUB:</span>
                          <strong className="text-[#0F0F11]">A${previewClubUnit} / unit</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-7 rounded-[24px] bg-white p-6 sm:p-8 border border-black/15 flex flex-col justify-between space-y-5">
                  <div className="space-y-5">
                    <div>
                      <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2">
                        01 · SELECT GARMENT MOCKUP CHASSIS (HOODIE VS TEE)
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {BLANK_CHASSIS_OPTIONS.map((chassis) => {
                          const isSelected = chassis.id === selectedChassisId;
                          return (
                            <button
                              key={chassis.id}
                              type="button"
                              onClick={() => handleSelectChassis(chassis)}
                              aria-pressed={isSelected}
                              className={`rounded-xl p-3.5 text-left transition-all cursor-pointer border ${
                                isSelected
                                  ? 'bg-[#0F0F11] text-white border-[#0F0F11]'
                                  : 'bg-[#EAEAE6]/60 text-[#0F0F11] border-black/10 hover:bg-[#EAEAE6]'
                              }`}
                            >
                              <div className="flex items-center justify-between font-sans text-xs font-bold">
                                <span>{chassis.code} · {chassis.name}</span>
                                <span className={isSelected ? 'text-volt' : 'text-neutral-500'}>
                                  Base A${chassis.baseCostAud}
                                </span>
                              </div>
                              <p className={`m-0 mt-1 font-mono text-[9.5px] truncate ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                                {chassis.spec}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                          02 · COLORWAY SWATCH
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {SWATCH_THEMES.map((sw) => (
                            <button
                              key={sw.id}
                              type="button"
                              onClick={() => setSelectedSwatchId(sw.id)}
                              aria-pressed={selectedSwatchId === sw.id}
                              className={`rounded-lg py-2 px-2 font-mono text-[9px] font-bold uppercase cursor-pointer border transition-all ${
                                selectedSwatchId === sw.id
                                  ? 'bg-[#0F0F11] text-volt border-[#0F0F11]'
                                  : 'bg-[#EAEAE6] text-[#0F0F11] border-black/10'
                              }`}
                            >
                              {sw.label.split('·')[1]}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                          03 · MONOGRAM TYPOGRAPHY
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {LOCKUP_STYLES.map((st) => (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => setSelectedLockupStyle(st.id)}
                              aria-pressed={selectedLockupStyle === st.id}
                              className={`rounded-lg py-2 px-2 font-mono text-[9px] font-bold uppercase cursor-pointer border transition-all ${
                                selectedLockupStyle === st.id
                                  ? 'bg-[#0F0F11] text-volt border-[#0F0F11]'
                                  : 'bg-[#EAEAE6] text-[#0F0F11] border-black/10'
                              }`}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label htmlFor="capsule-athlete-name" className="block font-mono text-[10px] font-bold uppercase text-neutral-500 mb-1">
                          ATHLETE NAME
                        </label>
                        <input
                          type="text"
                          required
                          value={newAthleteName}
                          id="capsule-athlete-name"
                          onChange={(e) => setNewAthleteName(e.target.value)}
                          className="w-full rounded-xl bg-[#EAEAE6] border-0 px-3.5 py-2.5 font-sans text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label htmlFor="capsule-club-name" className="block font-mono text-[10px] font-bold uppercase text-neutral-500 mb-1">
                          JUNIOR CLUB (15%)
                        </label>
                        <input
                          type="text"
                          required
                          value={newClubName}
                          id="capsule-club-name"
                          onChange={(e) => setNewClubName(e.target.value)}
                          className="w-full rounded-xl bg-[#EAEAE6] border-0 px-3.5 py-2.5 font-sans text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label htmlFor="capsule-partner-name" className="block font-mono text-[10px] font-bold uppercase text-neutral-500 mb-1">
                          CO-LAB BRAND
                        </label>
                        <input
                          type="text"
                          value={newCollabPartner}
                          id="capsule-partner-name"
                          onChange={(e) => setNewCollabPartner(e.target.value)}
                          className="w-full rounded-xl bg-[#EAEAE6] border-0 px-3.5 py-2.5 font-sans text-xs font-bold"
                        />
                      </div>
                    </div>

                    {newCollabPartner.trim().length > 0 && (
                      <div className="rounded-xl bg-[#0F0F11] text-white p-3.5 flex flex-wrap items-center justify-between gap-3">
                        <div className="font-mono text-[10px]">
                          <span className="text-volt font-bold uppercase block">
                            CO-BRANDED ROYALTY RAIL ({newCollabPartner.toUpperCase()})
                          </span>
                          <span className="text-neutral-300">Route 15% partner royalty via Stripe Connect?</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEnablePartnerRoyaltySplit((v) => !v)}
                          aria-pressed={enablePartnerRoyaltySplit}
                          className={`rounded-full px-3.5 py-1.5 font-mono text-[9.5px] font-bold uppercase cursor-pointer border-0 ${
                            enablePartnerRoyaltySplit ? 'bg-volt text-[#0F0F11]' : 'bg-white/15 text-white'
                          }`}
                        >
                          {enablePartnerRoyaltySplit ? '✓ Include apparel collaborator royalty' : 'No apparel collaborator royalty'}
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-12 gap-3">
                      <div className="col-span-2 sm:col-span-6">
                        <label htmlFor="capsule-garment-title" className="block font-mono text-[10px] font-bold uppercase text-neutral-500 mb-1">
                          GARMENT TITLE
                        </label>
                        <input
                          type="text"
                          required
                          value={newGarmentTitle}
                          id="capsule-garment-title"
                          onChange={(e) => setNewGarmentTitle(e.target.value)}
                          className="w-full rounded-xl bg-[#EAEAE6] border-0 px-3.5 py-2.5 font-sans text-xs font-bold"
                        />
                      </div>
                      <div className="col-span-1 sm:col-span-3">
                        <label htmlFor="capsule-postcode" className="block font-mono text-[10px] font-bold uppercase text-neutral-500 mb-1">
                          POSTCODE
                        </label>
                        <input
                          type="text"
                          maxLength={4}
                          value={newPostcode}
                          id="capsule-postcode"
                          inputMode="numeric"
                          onChange={(e) => setNewPostcode(e.target.value)}
                          className="w-full rounded-xl bg-[#EAEAE6] border-0 px-3 py-2.5 font-mono text-xs font-bold"
                        />
                      </div>
                      <div className="col-span-1 sm:col-span-3">
                        <label htmlFor="capsule-retail-price" className="block font-mono text-[10px] font-bold uppercase text-neutral-500 mb-1">
                          RETAIL AUD
                        </label>
                        <input
                          type="number"
                          value={newPrice}
                          id="capsule-retail-price"
                          onChange={(e) => setNewPrice(Number(e.target.value))}
                          className="w-full rounded-xl bg-[#EAEAE6] border-0 px-3 py-2.5 font-mono text-xs font-bold"
                        />
                      </div>
                    </div>

                    <label className="flex items-start gap-2.5 rounded-xl bg-[#EAEAE6]/70 p-3 cursor-pointer border border-black/10">
                      <input
                        type="checkbox"
                        checked={siaCleared}
                        onChange={(e) => setSiaCleared(e.target.checked)}
                        className="mt-0.5 accent-[#0F0F11]"
                      />
                      <span className="font-mono text-[10px] text-neutral-700 leading-relaxed">
                        <strong>APPAREL RIGHTS:</strong> Confirm permission to use the athlete’s mark and check applicable sport rules before production.
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={!siaCleared}
                    className="w-full rounded-full bg-[#0F0F11] hover:bg-volt disabled:opacity-40 text-white hover:text-[#0F0F11] py-4 font-mono text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer border-0 shadow-md"
                  >
                    Publish Vertical Specimen to Showroom →
                  </button>
                </div>
              </form>
            </div>
          )}

          {view === 'capsules' && (
            <div className="w-full space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-black/10 pb-6">
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500 block mb-2">
                    ATHLETE CAPSULES
                  </span>
                  <h2 className="m-0 font-sans text-3xl sm:text-5xl font-black uppercase tracking-[-0.03em] text-[#0F0F11] leading-none">
                    Co-Branded Athlete Merch.
                  </h2>
                </div>

                <div className="capsule-purchase-mode flex items-center gap-2 bg-white p-1.5 rounded-full border border-black/10">
                  <button
                    type="button"
                    onClick={() => setSponsorBulkMode(false)}
                    aria-pressed={!sponsorBulkMode}
                    className={`rounded-full px-4 py-1.5 font-mono text-[10px] font-bold uppercase cursor-pointer border-0 transition-colors ${
                      !sponsorBulkMode ? 'bg-[#0F0F11] text-volt' : 'bg-transparent text-[#0F0F11]'
                    }`}
                  >
                    Fan Drop (1x Unit)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSponsorBulkMode(true)}
                    aria-pressed={sponsorBulkMode}
                    className={`rounded-full px-4 py-1.5 font-mono text-[10px] font-bold uppercase cursor-pointer border-0 transition-colors ${
                      sponsorBulkMode ? 'bg-[#0F0F11] text-volt' : 'bg-transparent text-[#0F0F11]'
                    }`}
                  >
                    Sponsor Venue Pack (25x Units)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {capsules.map((drop) => {
                  const multiplier = sponsorBulkMode ? 25 : 1;
                  const displayPrice = drop.priceAud * multiplier;
                  const netPerUnit = drop.priceAud - drop.baseCostAud;
                  const athletePct = drop.collabRoyaltyPct ? 0.55 : 0.7;
                  const athleteTotal = Math.round(netPerUnit * athletePct) * multiplier;
                  const partnerTotal = drop.collabRoyaltyPct
                    ? Math.round(netPerUnit * (drop.collabRoyaltyPct / 100)) * multiplier
                    : 0;
                  const clubTotal = Math.round(netPerUnit * 0.15) * multiplier;
                  return (
                    <article
                      key={drop.id}
                      className="capsule-product grid grid-cols-1 gap-5 border border-black/15 bg-white p-4 sm:grid-cols-2 sm:p-6"
                    >
                      <ProductPhotoGallery sku={drop.id} name={drop.title} />
                      <div className="flex min-w-0 flex-col gap-4">
                        <p className="m-0 font-mono text-xs text-neutral-700">
                          {drop.athleteName} × {drop.clubName}
                          {drop.collabPartner && ` × ${drop.collabPartner}`}
                        </p>

                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="m-0 font-sans text-xl font-black text-[#0F0F11]">
                              {drop.title}
                            </h3>
                            <p className="m-0 mt-1 font-sans text-xs text-neutral-600">
                              {drop.spec}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-sans text-2xl font-black text-[#0F0F11] block">
                              A${displayPrice.toLocaleString()}
                            </span>
                            <span className="font-mono text-[9px] uppercase text-neutral-500">
                              {sponsorBulkMode ? '25x Venue Pack' : 'Single Unit'}
                            </span>
                          </div>
                        </div>

                        <div className="capsule-product-actions flex flex-wrap items-center gap-3">
                          {!sponsorBulkMode ? (
                            <div role="group" aria-label={`Size for ${drop.title}`} className="flex flex-wrap items-center gap-1.5">
                              {['S', 'M', 'L', 'XL'].map((sz) => (
                                <button
                                  key={sz}
                                  type="button"
                                  aria-label={`Size ${sz} for ${drop.title}`}
                                  aria-pressed={(selectedSize[drop.id] || 'L') === sz}
                                  onClick={() =>
                                    setSelectedSize((prev) => ({ ...prev, [drop.id]: sz }))
                                  }
                                  className={`w-11 h-11 rounded-xl font-mono text-xs font-bold cursor-pointer border transition-colors ${
                                    (selectedSize[drop.id] || 'L') === sz
                                      ? 'bg-[#0F0F11] text-volt border-[#0F0F11]'
                                      : 'bg-[#EAEAE6] text-[#0F0F11] border-black/10 hover:bg-[#0F0F11] hover:text-white'
                                  }`}
                                >
                                  {sz}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-xl bg-[#EAEAE6] px-3 py-2 font-mono text-[10px] font-bold text-[#0F0F11]">
                              SIZE CURVE: 3S·8M·9L·5XL
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => addToCart(drop)}
                            className="min-h-11 rounded-full bg-[#0F0F11] hover:bg-volt text-white hover:text-[#0F0F11] px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider cursor-pointer border-0 shadow-md transition-colors"
                          >
                            {sponsorBulkMode
                              ? `+ Lock 25x Pack (A$${displayPrice.toLocaleString()})`
                              : '+ Add to Bag'}
                          </button>
                        </div>
                        <div className="rounded-xl bg-[#EAEAE6] p-3.5 font-mono text-[10.5px] space-y-1.5 border border-black/10">
                          <div className="flex justify-between">
                            <span className="text-neutral-600">
                              {Math.round(athletePct * 100)}% TO {drop.athleteName.toUpperCase()}:
                            </span>
                            <strong className="text-[#0F0F11]">
                              A${athleteTotal.toLocaleString()} {sponsorBulkMode ? '/ pack' : '/ unit'}
                            </strong>
                          </div>
                          {drop.collabPartner && partnerTotal > 0 && (
                            <div className="flex justify-between">
                              <span className="text-neutral-600">
                                15% TO {drop.collabPartner.toUpperCase()}:
                              </span>
                              <strong className="text-[#0F0F11]">
                                A${partnerTotal.toLocaleString()} {sponsorBulkMode ? '/ pack' : '/ unit'}
                              </strong>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-neutral-600">
                              15% TO {drop.clubName.toUpperCase()}:
                            </span>
                            <strong className="text-[#0F0F11]">
                              A${clubTotal.toLocaleString()} {sponsorBulkMode ? '/ pack' : '/ unit'}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

            </div>
          )}

          {view === 'empty' && cartItems.length > 0 && (
            <section aria-label="Your bag" className="capsule-live-bag space-y-5 bg-[#0F0F11] p-5 text-white sm:p-8">
              <h2 className="m-0 text-3xl font-black">Your bag</h2>
              <ul className="m-0 list-none space-y-3 p-0">
                {cartItems.map((entry, idx) => {
                  const step = entry.size.startsWith('25x ') ? 25 : 1;
                  return (
                    <li key={entry.item.id + entry.size} className="flex flex-wrap items-center justify-between gap-3 border-b border-white/20 pb-3">
                      <div className="text-sm">
                        <strong>{entry.item.title}</strong>
                        <p className="m-0 mt-1 text-neutral-300">{entry.size} · A${(entry.item.priceAud * entry.qty).toLocaleString()}</p>
                      </div>
                      <div className="capsule-bag-quantity flex items-center gap-2">
                        <button type="button" disabled={entry.qty <= step} onClick={() => changeQuantity(idx, entry.qty - step)}
                          aria-label={`Decrease quantity of ${entry.item.title}`}
                          className="h-11 w-11 border border-white/30 bg-transparent text-white disabled:opacity-40">−</button>
                        <span aria-label="Quantity" aria-live="polite">{entry.qty}</span>
                        <button type="button" disabled={entry.qty + step > 100} onClick={() => changeQuantity(idx, entry.qty + step)}
                          aria-label={`Increase quantity of ${entry.item.title}`}
                          className="h-11 w-11 border border-white/30 bg-transparent text-white disabled:opacity-40">+</button>
                        <button type="button" onClick={() => removeFromCart(idx)}
                          aria-label={`Remove ${entry.item.title} from bag`}
                          className="min-h-11 bg-transparent px-2 text-xs text-white underline">Remove</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="m-0 font-bold">Subtotal · A${grossTotal.toLocaleString()}</p>
                <button type="button" disabled={isCheckingOut} onClick={handleStripeCheckout}
                  className="min-h-11 rounded-full border-0 bg-volt px-6 font-mono text-xs font-bold uppercase text-[#0F0F11] hover:bg-white disabled:opacity-50">
                  {isCheckingOut ? 'Opening checkout…' : 'Checkout'}
                </button>
              </div>
              {checkoutError && <p role="alert" className="m-0 text-sm text-red-200">{checkoutError}</p>}
              <button type="button" onClick={() => setView('capsules')}
                className="min-h-11 border-0 bg-transparent p-0 text-sm text-white underline">Continue browsing</button>
            </section>
          )}

          {view === 'checkout_demo' && demoReceipt && (
            <div className="max-w-lg mx-auto text-center my-auto py-12 space-y-5">
              <h2 ref={demoHeadingRef} tabIndex={-1} className="m-0 font-sans text-4xl font-black uppercase tracking-tight text-[#0F0F11]">
                Demo order
              </h2>
              <p className="m-0 font-sans text-sm text-neutral-700 leading-relaxed">
                No payment was taken, no order was placed, and no funds were transferred.
              </p>
              {demoReceipt.split && (
                <p className="m-0 font-sans text-sm text-neutral-700">
                  Example split (AUD): {formatAud.format(demoReceipt.split.athleteAud)} for athletes,
                  {' '}{formatAud.format(demoReceipt.split.clubAud)} for clubs
                  {demoReceipt.split.partnerAud > 0 && `, and ${formatAud.format(demoReceipt.split.partnerAud)} for collaborators`}.
                </p>
              )}
              <p className="m-0 font-mono text-[11px] text-neutral-500">Demo session: {demoReceipt.sessionId}</p>
              <div className="pt-4 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCartItems([]);
                    setView('empty');
                  }}
                  className="rounded-full bg-[#0F0F11] text-white px-6 py-3 font-mono text-[10px] font-bold uppercase tracking-widest cursor-pointer border-0"
                >
                  Back to Empty Bag
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full bg-[#0F0F11] hover:bg-white text-white hover:text-[#0F0F11] border border-transparent hover:border-black/25 px-6 py-3 font-sans text-xs font-bold transition-all duration-300 cursor-pointer group"
                >
                  Close <span className="text-volt group-hover:text-[#0F0F11] transition-colors">✕</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </dialog>,
    document.body,
  );
};

export default CartDrawer;