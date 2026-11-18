export interface ClaimOutreachInput {
  athleteName: string;
  club: string;
  whereFound: string;
  claimToken: string;
  origin: string;
  senderBusinessName: string;
  senderContact: string;
}

/** Draft only: callers must independently establish permission to contact the recipient. */
export function buildClaimOutreach(input: ClaimOutreachInput): string {
  for (const [key, value] of Object.entries(input)) {
    if (!value.trim()) throw new Error(`Missing outreach field: ${key}`);
  }
  const origin = new URL(input.origin);
  if (origin.protocol !== 'https:' && origin.hostname !== 'localhost') {
    throw new Error('Outreach links require HTTPS');
  }
  const claim = new URL('/claim', origin);
  claim.searchParams.set('token', input.claimToken);
  const unsubscribe = new URL(claim);
  unsubscribe.searchParams.set('action', 'unsubscribe');
  return [
    `Hi ${input.athleteName},`,
    `We found your public sporting profile with ${input.club} via ${input.whereFound}.`,
    'tmrw/. connects athletes with local sponsorship opportunities. We are contacting you to invite you to review a private profile and choose whether to make it public for sponsorship.',
    'tmrw/. is not an agent. This is sponsorship, not representation or an agency agreement. No master licence is requested at this stage.',
    `Review and claim your profile: ${claim.href}`,
    'You can decline and delete your research profile from that page. Nothing is published unless you consent (and a guardian consents if required).',
    `Unsubscribe from further outreach: ${unsubscribe.href}`,
    `Sent by ${input.senderBusinessName} (tmrw/.). Contact: ${input.senderContact}`,
  ].join('\n\n');
}
