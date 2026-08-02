import { createStripeClient, getStripeErrorMessage, type StripeEnv } from './stripe.server';

export interface CatalogSyncResult {
  ok: boolean;
  environment: StripeEnv;
  created: number;
  updated: number;
  failed: number;
  errors: string[];
}

function priceLookupKey(serviceId: string): string {
  return `svc_${serviceId.replace(/-/g, '')}`;
}

/**
 * Mirrors every row of public.services into Stripe as a Product with a single
 * one-time AUD Price, and writes the resulting ids back onto the service row.
 * Idempotent: re-running reconciles names, descriptions and amounts.
 */
export async function syncCatalogToStripe(env: StripeEnv): Promise<CatalogSyncResult> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const stripe = createStripeClient(env);

  const result: CatalogSyncResult = {
    ok: true,
    environment: env,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  };

  const { data: services, error } = await supabaseAdmin
    .from('services')
    .select(
      'id, title, description, price, tier, project_timeline, stripe_product_key, stripe_price_key, stripe_product_key_live, stripe_price_key_live',
    );

  if (error || !services) {
    return { ...result, ok: false, errors: [error?.message ?? 'Unable to read services'] };
  }

  // Stripe test and live are separate accounts: ids from one are invalid in the
  // other, so each environment gets its own pair of columns.
  const productColumn = env === 'live' ? 'stripe_product_key_live' : 'stripe_product_key';
  const priceColumn = env === 'live' ? 'stripe_price_key_live' : 'stripe_price_key';

  for (const service of services) {
    const amount = Math.round(Number(service.price) * 100);
    const lookupKey = priceLookupKey(service.id);

    try {
      // ---- Product ------------------------------------------------------
      let productId =
        (env === 'live' ? service.stripe_product_key_live : service.stripe_product_key) ?? null;
      if (productId) {
        try {
          await stripe.products.update(productId, {
            name: service.title,
            description: service.description.slice(0, 500),
            metadata: { service_id: service.id, tier: service.tier },
          });
        } catch {
          productId = null;
        }
      }
      if (!productId) {
        const product = await stripe.products.create({
          name: service.title,
          description: service.description.slice(0, 500),
          tax_code: 'txcd_20030000', // General services
          metadata: {
            service_id: service.id,
            tier: service.tier,
            project_timeline: service.project_timeline,
          },
        });
        productId = product.id;
        result.created += 1;
      } else {
        result.updated += 1;
      }

      // ---- Price (immutable in Stripe; recreate when the amount drifts) --
      const existingPrices = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
      let priceId = existingPrices.data[0]?.id ?? null;
      const amountMatches = existingPrices.data[0]?.unit_amount === amount;

      if (priceId && !amountMatches) {
        await stripe.prices.update(priceId, { active: false });
        priceId = null;
      }

      if (!priceId) {
        const price = await stripe.prices.create({
          product: productId,
          currency: 'aud',
          unit_amount: amount,
          lookup_key: lookupKey,
          transfer_lookup_key: true,
          metadata: { service_id: service.id },
        });
        priceId = price.id;
      }

      await supabaseAdmin
        .from('services')
        .update(
          env === 'live'
            ? { stripe_product_key_live: productId, stripe_price_key_live: priceId }
            : { stripe_product_key: productId, stripe_price_key: priceId },
        )
        .eq('id', service.id);
    } catch (syncError) {
      result.failed += 1;
      result.ok = false;
      result.errors.push(`${service.title}: ${getStripeErrorMessage(syncError)}`);
    }
  }

  return result;
}
