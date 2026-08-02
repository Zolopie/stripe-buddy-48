import type { StripeEnv } from './stripe.server';

const PREVIEW_HOST_MARKERS = ['-dev.lovable.app', 'localhost', '127.0.0.1', 'id-preview--'];

/**
 * The Stripe environment is decided on the server only. The browser must never
 * be able to influence which Stripe account an invoice is issued against.
 */
export function resolveStripeEnv(requestHeaders?: Headers): StripeEnv {
  if (!process.env['STRIPE_LIVE_API_KEY']) return 'sandbox';

  const host = (requestHeaders?.get('host') ?? '').toLowerCase();
  if (PREVIEW_HOST_MARKERS.some((marker) => host.includes(marker))) return 'sandbox';

  return 'live';
}

export function stripeEnvFromWebhookQuery(url: URL): StripeEnv {
  return url.searchParams.get('env') === 'live' ? 'live' : 'sandbox';
}
