import { z } from 'zod';
import { createStripeClient, getStripeErrorMessage, type StripeEnv } from './stripe.server';
import { resolveStripeEnv } from './stripe-env.server';

export const proposalSchema = z.object({
  serviceId: z.string().uuid(),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  company: z.string().trim().min(2).max(160),
});

export type ProposalInput = z.infer<typeof proposalSchema>;

export type ProposalResult =
  | { ok: true; invoiceId: string; hostedInvoiceUrl: string | null; testMode: boolean }
  | { ok: false; error: string };

const RATE_LIMIT_WINDOW_MINUTES = 10;
const RATE_LIMIT_MAX_REQUESTS = 5;
const DEDUPE_WINDOW_MINUTES = 10;

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'yopmail.com',
  '10minutemail.com',
  'tempmail.com',
  'trashmail.com',
  'sharklasers.com',
  'getnada.com',
  'dispostable.com',
]);

export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  return (
    headers.get('cf-connecting-ip') ??
    (forwarded ? forwarded.split(',')[0]!.trim() : null) ??
    headers.get('x-real-ip') ??
    'unknown'
  );
}

export async function hashIp(ip: string): Promise<string> {
  const salt = process.env['SUPABASE_PROJECT_ID'] ?? 'elite-b2b';
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${salt}:${ip}`),
  );
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function submitProposalRequest(
  input: ProposalInput,
  requestHeaders: Headers,
): Promise<ProposalResult> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

  const env: StripeEnv = resolveStripeEnv(requestHeaders);
  const email = input.email.toLowerCase();
  const domain = email.split('@')[1] ?? '';

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { ok: false, error: 'Please use your corporate email address.' };
  }

  const ipHash = await hashIp(clientIpFromHeaders(requestHeaders));
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60_000).toISOString();

  // --- Rate limit (counted before any Stripe work, so rejected attempts count too)
  const { count, error: countError } = await supabaseAdmin
    .from('invoice_requests')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', windowStart);

  if (countError) return { ok: false, error: 'Unable to verify request. Please try again shortly.' };
  if ((count ?? 0) >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      ok: false,
      error: 'Too many proposal requests from this network. Please try again in a few minutes.',
    };
  }

  const { data: service, error: serviceError } = await supabaseAdmin
    .from('services')
    .select('id, title, description, price, tier, status, project_timeline, stripe_price_key')
    .eq('id', input.serviceId)
    .maybeSingle();

  // Always record the attempt so bad-input probing is rate limited too.
  const { data: attempt } = await supabaseAdmin
    .from('invoice_requests')
    .insert({
      ip_hash: ipHash,
      service_id: service?.id ?? null,
      email,
      full_name: input.fullName,
      company: input.company,
      status: 'pending',
      currency: 'aud',
    })
    .select('id')
    .single();

  const attemptId = attempt?.id ?? null;

  const fail = async (message: string): Promise<ProposalResult> => {
    if (attemptId) {
      await supabaseAdmin
        .from('invoice_requests')
        .update({ status: 'failed', error: message })
        .eq('id', attemptId);
    }
    return { ok: false, error: message };
  };

  if (serviceError || !service) return fail('This engagement is no longer listed.');
  if (service.status !== 'available') {
    return fail('This engagement is currently booked. Please contact our team.');
  }

  // --- Duplicate submission guard: reuse a recent invoice for the same buyer + service
  const dedupeStart = new Date(Date.now() - DEDUPE_WINDOW_MINUTES * 60_000).toISOString();
  const { data: recent } = await supabaseAdmin
    .from('invoice_requests')
    .select('stripe_invoice_id, hosted_invoice_url')
    .eq('email', email)
    .eq('service_id', service.id)
    .eq('status', 'sent')
    .gte('created_at', dedupeStart)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent?.stripe_invoice_id) {
    if (attemptId) {
      await supabaseAdmin
        .from('invoice_requests')
        .update({ status: 'failed', error: 'duplicate_suppressed' })
        .eq('id', attemptId);
    }
    return {
      ok: true,
      invoiceId: recent.stripe_invoice_id,
      hostedInvoiceUrl: recent.hosted_invoice_url,
      testMode: env === 'sandbox',
    };
  }

  const amountInCents = Math.round(Number(service.price) * 100);
  const idempotencyRoot = attemptId ?? `${ipHash}:${service.id}:${Date.now()}`;

  try {
    const stripe = createStripeClient(env);

    const existing = await stripe.customers.list({ email, limit: 1 });
    const customer = existing.data[0]
      ? await stripe.customers.update(existing.data[0].id, {
          name: input.fullName,
          metadata: { company: input.company },
        })
      : await stripe.customers.create(
          {
            email,
            name: input.fullName,
            metadata: { company: input.company },
          },
          { idempotencyKey: `cust_${idempotencyRoot}` },
        );

    const invoice = await stripe.invoices.create(
      {
        customer: customer.id,
        collection_method: 'send_invoice',
        days_until_due: 14,
        currency: 'aud',
        description: `${service.title} — ${service.tier} engagement (${service.project_timeline})`,
        metadata: {
          service_id: service.id,
          request_id: attemptId ?? '',
          company: input.company,
          tier: service.tier,
        },
      },
      { idempotencyKey: `inv_${idempotencyRoot}` },
    );

    // Prefer the synced Stripe Price so revenue reports roll up per service.
    await stripe.invoiceItems.create(
      {
        customer: customer.id,
        invoice: invoice.id,
        ...(service.stripe_price_key
          ? { pricing: { price: service.stripe_price_key }, quantity: 1 }
          : { amount: amountInCents, currency: 'aud' }),
        description: `${service.title} (${service.tier}) — ${service.project_timeline}`,
      } as never,
      { idempotencyKey: `item_${idempotencyRoot}` },
    );

    const finalized = await stripe.invoices.finalizeInvoice(invoice.id!);
    const sent = await stripe.invoices.sendInvoice(finalized.id!);

    if (attemptId) {
      await supabaseAdmin
        .from('invoice_requests')
        .update({
          status: 'sent',
          stripe_invoice_id: sent.id ?? null,
          stripe_customer_id: customer.id,
          hosted_invoice_url: sent.hosted_invoice_url ?? null,
          amount_cents: amountInCents,
        })
        .eq('id', attemptId);
    }

    return {
      ok: true,
      invoiceId: sent.id ?? '',
      hostedInvoiceUrl: sent.hosted_invoice_url ?? null,
      testMode: env === 'sandbox',
    };
  } catch (error) {
    console.error('Invoice creation failed:', error);
    return fail(getStripeErrorMessage(error));
  }
}
