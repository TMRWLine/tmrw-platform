export type AgreementStatus = 'no_agreement' | 'pending' | 'active' | 'expired';

export type SportType =
  | 'Rugby Union'
  | 'Rugby League'
  | 'Basketball'
  | 'AFL'
  | 'Netball'
  | 'Tennis'
  | 'Golf'
  | 'Triathlon'
  | 'Para-Triathlon'
  | 'Combat Sports'
  | string;

export interface ComplianceBadgeConfig {
  label: string;
  detail: string;
  active: boolean;
}

export function getSportComplianceBadges(
  sport: string | null,
  athlete: { shute_shield_compliant: boolean; nrl_tpa_registered: boolean }
): ComplianceBadgeConfig[] {
  const s = (sport ?? '').toLowerCase();
  const badges: ComplianceBadgeConfig[] = [];

  if (s.includes('rugby') && s.includes('union')) {
    badges.push({
      label: 'Shute Shield $500 Cap',
      detail: "Arm's-length dealing",
      active: athlete.shute_shield_compliant,
    });
    badges.push({
      label: "Shute Shield Arm's-Length",
      detail: 'No club-channel payment',
      active: athlete.shute_shield_compliant,
    });
  } else if (s.includes('rugby') && s.includes('league')) {
    badges.push({
      label: 'NRL State Cup TPA',
      detail: 'Third-party registered',
      active: athlete.nrl_tpa_registered,
    });
    badges.push({
      label: 'NRL Logo Scrubbing',
      detail: 'No club emblems in content',
      active: athlete.nrl_tpa_registered,
    });
  } else if (s.includes('basketball')) {
    badges.push({
      label: 'NBL1 Commercial Exclusivity',
      detail: 'Category-exclusive deals',
      active: true,
    });
    badges.push({
      label: 'NCAA NIL Eligibility',
      detail: 'Amateur status preserved',
      active: true,
    });
  } else if (s.includes('soccer')) {
    badges.push({
      label: 'Football Australia Commercial Clearance',
      detail: 'FA commercial rights registered',
      active: true,
    });
    badges.push({
      label: 'NPL NSW Registration',
      detail: 'NPL competition compliance',
      active: true,
    });
  } else if (s.includes('cricket')) {
    badges.push({
      label: 'Cricket Australia Commercial Clearance',
      detail: 'CA commercial rights verified',
      active: true,
    });
    badges.push({
      label: 'NSW Premier Cricket Registration',
      detail: 'State league compliance',
      active: true,
    });
  } else if (s.includes('surfing')) {
    badges.push({
      label: 'Surfing Australia Commercial Clearance',
      detail: 'SA commercial rights cleared',
      active: true,
    });
    badges.push({
      label: 'WSL Regional Event Compliance',
      detail: 'WSL IP usage approved',
      active: true,
    });
  } else if (s.includes('afl')) {
    badges.push({
      label: 'AFL State League TPA Clearance',
      detail: 'Clearance certificate filed',
      active: true,
    });
    badges.push({
      label: 'VFL Player Payment Compliance',
      detail: 'VFL cap & TPA verified',
      active: true,
    });
  } else if (s.includes('netball')) {
    badges.push({
      label: 'Netball Australia Commercial Exclusivity',
      detail: 'SSN category exclusivity',
      active: true,
    });
    badges.push({
      label: 'State League Registration',
      detail: 'State league commercial registered',
      active: true,
    });
  } else if (s.includes('triathlon') && !s.includes('para')) {
    badges.push({
      label: 'AusTriathlon Commercial Clearance',
      detail: 'AusTriathlon commercial rights cleared',
      active: true,
    });
    badges.push({
      label: 'Individual Representation',
      detail: 'Self-managed commercial rights',
      active: true,
    });
  } else if (s.includes('para-triathlon')) {
    badges.push({
      label: 'AusTriathlon Commercial Clearance',
      detail: 'AusTriathlon commercial rights cleared',
      active: true,
    });
    badges.push({
      label: 'World Para Exclusivity',
      detail: 'World Triathlon Para Series IP cleared',
      active: true,
    });
  } else if (s.includes('combat')) {
    badges.push({
      label: 'Combat Sports Authority IP Clearance',
      detail: 'CSA commercial rights cleared',
      active: true,
    });
    badges.push({
      label: 'Individual Promotion Exclusivity',
      detail: 'Promotion rights exclusively licensed',
      active: true,
    });
  } else if (s.includes('tennis') || s.includes('golf')) {
    badges.push({
      label: 'Governing Body IP Clearance',
      detail: 'IP rights cleared for use',
      active: true,
    });
    badges.push({
      label: 'Individual Representation',
      detail: 'Self-managed commercial rights',
      active: true,
    });
  }

  return badges;
}

export function getUniversalComplianceBadges(created_at: string): ComplianceBadgeConfig[] {
  return [
    {
      label: 'APP 1.7–1.9 ADM Transparency',
      detail: 'Automated decision-making logged',
      active: true,
    },
    {
      label: 'NZ IPP 3A',
      detail: `Ingested ${new Date(created_at).toLocaleDateString('en-AU')}`,
      active: true,
    },
  ];
}

export interface Athlete {
  id: string;
  name: string;
  sport: string | null;
  current_club: string | null;
  agreement_status: AgreementStatus;
  profile_data: {
    position?: string;
    ranking?: number;
    specialty?: string;
    age?: number;
    market_value_aud?: number;
    market_value_nzd?: number;
  } | null;
  location: string | null;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
  follower_count: number | null;
  gender: string | null;
  master_licence_signed: boolean;
  nrl_tpa_registered: boolean;
  shute_shield_compliant: boolean;
  created_at: string;
  updated_at: string;
}

export type SponsorCategory =
  | 'Sporting Goods'
  | 'Food & Beverage'
  | 'Health & Wellness'
  | 'Training & Coaching'
  | 'Automotive'
  | 'Apparel & Fashion'
  | string;

export type Currency = 'AUD' | 'NZD' | string;

export interface Sponsor {
  id: string;
  business_name: string;
  merchant_category: SponsorCategory | null;
  budget_allocation: number;
  contact_email: string | null;
  target_radius_meters: number;
  location: string | null;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
  currency: Currency;
  created_at: string;
  updated_at: string;
}

export interface MatchedSponsor extends Sponsor {
  distance_meters: number;
  distance_km: number;
  lat: number | null;
  lng: number | null;
}

export interface AthleteLocation {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  postcode: string | null;
  follower_count: number | null;
  master_licence_signed: boolean;
  nrl_tpa_registered: boolean;
  shute_shield_compliant: boolean;
}

export interface MatchSponsorsResponse {
  athlete: AthleteLocation | null;
  matches: MatchedSponsor[];
}

export type DealStatus = 'pending' | 'active' | 'expired' | 'terminated';

export interface Agreement {
  id: string;
  athlete_id: string;
  sponsor_id: string;
  status: DealStatus;
  deal_value: number | null;
  gst_amount: number | null;
  total_inc_gst: number | null;
  start_date: string | null;
  end_date: string | null;
  exclusivity_category: string | null;
  auto_renew_flag: boolean;
  terms: string | null;
  created_at: string;
  updated_at: string;
}

export type SenderType = 'sponsor' | 'athlete' | 'platform';

export interface Message {
  id: string;
  agreement_id: string;
  sender_type: SenderType;
  content: string;
  created_at: string;
}

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';

export interface Campaign {
  id: string;
  sponsor_id: string;
  title: string;
  description: string | null;
  budget_aud: number | null;
  radius_km: number | null;
  sport_category: string | null;
  status: CampaignStatus;
  created_at: string;
  updated_at: string;
}

export type ApplicationStatus = 'pending' | 'accepted' | 'declined';

export interface CampaignApplication {
  id: string;
  campaign_id: string;
  athlete_id: string;
  pitch: string | null;
  status: ApplicationStatus;
  created_at: string;
}

export interface OutreachRequest {
  athleteName: string;
  sportType: string;
  sponsorCategory: string;
}

export interface OutreachResponse {
  copy: string;
  subject: string;
  cached: boolean;
}
