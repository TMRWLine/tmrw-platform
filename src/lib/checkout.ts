export const CHECKOUT_SUCCESS_PATH = '/checkout/success';

export interface CheckoutAthleteSnapshot {
  full_name?: string;
  grassroots_club_name?: string;
  image_url?: string;
}

export interface CheckoutSessionRequest {
  athleteId: string;
  tierId: string;
  athlete?: CheckoutAthleteSnapshot;
}

export interface CheckoutSessionResponse {
  checkoutUrl: string;
}

/**
 * Opens a Stripe Checkout session for a standardised commercial tier.
 * The server returns `{ checkoutUrl }`; the caller redirects the browser.
 */
export async function createCheckoutSession(
  payload: CheckoutSessionRequest,
): Promise<CheckoutSessionResponse> {
  const response = await fetch('/api/checkout/create-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => null)) as
    | (CheckoutSessionResponse & { error?: string })
    | null;

  if (!response.ok || !data?.checkoutUrl) {
    throw new Error(data?.error ?? 'Unable to initialise secure checkout.');
  }

  return { checkoutUrl: data.checkoutUrl };
}
