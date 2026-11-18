export interface WhitelistingGrant {
  id: string;
  athleteId: string;
  athleteName: string;
  flightTierId: string;
  postcode: string;
  radiusKm: 5 | 15 | 50;
  tiktok_spark_code: string;
  meta_partnership_token: string;
  issuedAt: string;
  expiresAt: string;
}

export interface PaidWhitelistingGrant {
  checkoutSessionId: string;
  milestoneReleaseAvailable: boolean;
  grant: WhitelistingGrant;
  amountPaidCents: number;
}

export async function fetchPaidWhitelistingGrant(
  sessionId: string,
  signal?: AbortSignal,
): Promise<PaidWhitelistingGrant> {
  if (!/^cs_(test|live)_[a-zA-Z0-9]{1,240}$/.test(sessionId)) {
    throw new Error('No Stripe payment was verified for this receipt.');
  }

  const response = await fetch('/api/checkout/whitelisting-grant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
    signal,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.checkoutSessionId !== sessionId || typeof data.milestoneReleaseAvailable !== 'boolean' ||
      !data.grant?.id || !data.grant.athleteId || !data.grant.tiktok_spark_code || !data.grant.meta_partnership_token ||
      !Number.isSafeInteger(data.amountPaidCents) || data.amountPaidCents <= 0) {
    throw new Error(data?.error || 'The activation grant is temporarily unavailable.');
  }
  return {
    checkoutSessionId: data.checkoutSessionId,
    milestoneReleaseAvailable: data.milestoneReleaseAvailable,
    grant: data.grant,
    amountPaidCents: data.amountPaidCents,
  };
}
