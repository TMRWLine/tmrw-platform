import type { Athlete, PerformanceLog } from '../types';
import { COLLAB_SPLIT } from '../types';
import { athleteDisplayName, athleteInitials } from './formatName';
import { formatSeconds, generateMockEvents } from './twelvelabs';
import {
  deriveInstagramHandle,
  instagramUrl,
  leagueHandleForAthlete,
  suburbForPostcode,
} from './rosterDiscovery';

/** Training / outdoor clips only — no club kits or league marks in frame. */
const REELS = {
  match: 'https://videos.pexels.com/video-files/5386411/5386411-uhd_2560_1440_25fps.mp4',
  training: 'https://videos.pexels.com/video-files/4753989/4753989-hd_1920_1080_30fps.mp4',
  tennis: 'https://videos.pexels.com/video-files/6077718/6077718-hd_1920_1080_25fps.mp4',
  court: 'https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4',
};

const PORTRAITS: Record<string, string> = {
  tennis: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1200&q=80',
  basketball: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80',
  triathlon: 'https://images.unsplash.com/photo-1461896836934-ffe607ba6851?auto=format&fit=crop&w=1200&q=80',
  golf: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&w=1200&q=80',
  combat: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80',
  netball: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1200&q=80',
  cricket: 'https://images.unsplash.com/photo-1531415074968-ddadd8b76b32?auto=format&fit=crop&w=1200&q=80',
  default: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80',
};

export interface AthleteDossier {
  name: string;
  club: string;
  sport: string;
  postcode: string;
  geofenceKm: number;
  portraitUrl: string;
  clubInitials: string;
  matchReelUrl: string;
  trainingClipUrl: string;
  logs: PerformanceLog[];
  matchDate: string;
  suburbanViews: number;
  engagementRate: number;
  communityReach: number;
  /** Community reach as a share of local catchment views, capped at 99. */
  reachPct: number;
  audienceVelocityPct: number;
  matchDayIndex: number;
  nilClearance: boolean;
  exclusivityTerms: string;
  athletePct: number;
  partnerPct: number;
  verified: boolean;
  position: string | null;
  instagramHandle: string;
  instagramUrl: string;
  leagueHandle: string;
  suburb: string;
  following: number;
  stripeConnectId: string;
  exclusivityClear: boolean;
}

export function athleteDossier(athlete: Athlete): AthleteDossier {
  const name = athleteDisplayName(athlete);
  const club = athlete.current_club ?? athlete.club ?? 'Independent';
  const sport = athlete.sport ?? 'Multi-discipline';
  const seed = hashSeed(athlete.id || name);
  const geofenceKm = athlete.geofence_km ?? 15;
  const athletePct = athlete.payout_athlete_pct ?? COLLAB_SPLIT.athletePayoutPct;
  const partnerPct = athlete.payout_partner_pct ?? COLLAB_SPLIT.platformFeePct + COLLAB_SPLIT.communityFundPct;
  const instagramHandle = deriveInstagramHandle(athlete, name, sport, club);
  const nilClearance =
    athlete.nil_clearance ??
    (athlete.master_licence_signed || athlete.nrl_tpa_registered || athlete.shute_shield_compliant);
  const exclusivityTerms =
    athlete.exclusivity_terms ??
    (athlete.licence_status ?? athlete.agreement_status ?? 'no_agreement').replace(/_/g, ' ');
  const suburbanViews = athlete.suburban_views ?? 12000 + (seed % 28000);
  const engagementRate = athlete.engagement_rate ?? Number((3.1 + (seed % 42) / 10).toFixed(1));
  const communityReach = athlete.community_reach ?? athlete.follower_count ?? 8000 + (seed % 18000);

  return {
    name,
    club,
    sport,
    postcode: athlete.postcode ?? '————',
    geofenceKm,
    portraitUrl: athlete.portrait_url || portraitForSport(sport),
    clubInitials: athleteInitials(club),
    matchReelUrl: athlete.match_reel_url || reelForSport(sport, 'match'),
    trainingClipUrl: athlete.training_clip_url || reelForSport(sport, 'training'),
    logs: athlete.performance_logs?.length ? athlete.performance_logs : logsFromEvents(athlete),
    matchDate:
      athlete.match_date ??
      new Date(athlete.created_at || Date.now()).toLocaleDateString('en-AU', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    suburbanViews,
    engagementRate,
    communityReach,
    reachPct: Math.min(99, Math.round((communityReach / Math.max(suburbanViews, 1)) * 100)),
    audienceVelocityPct: Number((2 + (seed % 90) / 10).toFixed(1)),
    matchDayIndex: Math.min(100, Math.round(60 + engagementRate * 4 + (seed % 12))),
    nilClearance,
    exclusivityTerms,
    athletePct,
    partnerPct,
    verified: Boolean(athlete.master_licence_signed || athlete.ip_lock),
    position: athlete.profile_data?.position ?? null,
    instagramHandle,
    instagramUrl: instagramUrl(instagramHandle),
    leagueHandle: leagueHandleForAthlete(athlete),
    suburb: athlete.suburb || suburbForPostcode(athlete.postcode),
    following: athlete.follower_count ?? 2400 + (seed % 18000),
    stripeConnectId: athlete.stripe_connect_id || `acct_${(athlete.id || 'tmrw').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'connect'}`,
    exclusivityClear: nilClearance && !exclusivityTerms.toLowerCase().includes('pending'),
  };
}

function portraitForSport(sport: string): string {
  const s = sport.toLowerCase();
  if (s.includes('tennis')) return PORTRAITS.tennis;
  if (s.includes('basket')) return PORTRAITS.basketball;
  if (s.includes('triathlon') || s.includes('para')) return PORTRAITS.triathlon;
  if (s.includes('golf')) return PORTRAITS.golf;
  if (s.includes('combat')) return PORTRAITS.combat;
  if (s.includes('netball')) return PORTRAITS.netball;
  if (s.includes('cricket')) return PORTRAITS.cricket;
  return PORTRAITS.default;
}

function reelForSport(sport: string, kind: 'match' | 'training'): string {
  const s = sport.toLowerCase();
  if (s.includes('tennis')) return REELS.tennis;
  if (s.includes('basket')) return REELS.court;
  if (kind === 'training') return REELS.training;
  return REELS.match;
}

function logsFromEvents(athlete: Athlete): PerformanceLog[] {
  return generateMockEvents(athlete)
    .slice(0, 6)
    .map((event) => ({
      label: event.type.replace(/_/g, ' '),
      stamp: formatSeconds(event.start),
      note: event.text,
    }));
}

function hashSeed(id: string): number {
  return Array.from(id).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}
