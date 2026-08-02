export type StripeEnvironment = 'sandbox' | 'live';

const clientToken = import.meta.env['VITE_PAYMENTS_CLIENT_TOKEN'] as string | undefined;

export function getPaymentsEnvironment(): StripeEnvironment {
  if (clientToken?.startsWith('pk_test_')) return 'sandbox';
  if (clientToken?.startsWith('pk_live_')) return 'live';
  throw new Error(
    'Payments are not configured for this build. Complete payments go-live to enable corporate invoicing.',
  );
}

export function isTestPayments(): boolean {
  return !!clientToken?.startsWith('pk_test_');
}

export function hasPaymentsToken(): boolean {
  return !!clientToken;
}