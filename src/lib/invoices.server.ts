import { z } from 'zod';
import { createStripeClient, getStripeErrorMessage, type StripeEnv } from './stripe.server';

export const proposalSchema = z.object({
  serviceId: z.string().uuid(),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  company: z.string().trim().min(2).max(160),
  environment: z.enum(['sandbox', 'live']),
});

export type ProposalInput = z.infer<typeof proposalSchema>;

export type ProposalResult = { ok: true; invoiceId: string } | { ok: false; error: string };

const RATE_LIMIT_WINDOW_MINUTES = 10;
const RATE_LIMIT_MAX_REQUESTS = 5;

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

  const ipHash = await hashIp(clientIpFromHeaders(requestHeaders));
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60_000).toISOString();

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
    .select('id, title, description, price, tier, status, project_timeline')
    .eq('id', input.serviceId)
    .maybeSingle();

  if (serviceError || !service) return { ok: false, error: 'This engagement is no longer listed.' };
  if (service.status !== 'available') {
    return { ok: false, error: 'This engagement is currently booked. Please contact our team.' };
  }

  const amountInCents = Math.round(Number(service.price) * 100);
  const env: StripeEnv = input.environment;

  try {
    const stripe = createStripeClient(env);

    const existing = await stripe.customers.list({ email: input.email, limit: 1 });
    const customer = existing.data[0]
      ? await stripe.customers.update(existing.data[0].id, {
          name: input.fullName,
          metadata: { company: input.company },
        })
      : await stripe.customers.create({
          email: input.email,
          name: input.fullName,
          metadata: { company: input.company },
        });

    const invoice = await stripe.invoices.create({
      customer: customer.id,
      collection_method: 'send_invoice',
      days_until_due: 14,
      currency: 'aud',
      description: `${service.title} — ${service.tier} engagement (${service.project_timeline})`,
      metadata: {
        service_id: service.id,
        company: input.company,
        tier: service.tier,
      },
    });

    await stripe.invoiceItems.create({
      customer: customer.id,
      invoice: invoice.id,
      amount: amountInCents,
      currency: 'aud',
      description: `${service.title} (${service.tier}) — ${service.project_timeline}`,
    });

    const finalized = await stripe.invoices.finalizeInvoice(invoice.id!);
    await stripe.invoices.sendInvoice(finalized.id!);

    await supabaseAdmin.from('invoice_requests').insert({
      ip_hash: ipHash,
      service_id: service.id,
      email: input.email,
      company: input.company,
      stripe_invoice_id: finalized.id ?? null,
    });

    return { ok: true, invoiceId: finalized.id ?? '' };
  } catch (error) {
    console.error('Invoice creation failed:', error);
    await supabaseAdmin.from('invoice_requests').insert({ ip_hash: ipHash, service_id: service.id });
    return { ok: false, error: getStripeErrorMessage(error) };
  }
}