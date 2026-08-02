import { createFileRoute } from '@tanstack/react-router';
import { createStripeClient } from '@/lib/stripe.server';
import { stripeEnvFromWebhookQuery } from '@/lib/stripe-env.server';

export const Route = createFileRoute('/api/public/webhooks/stripe')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const env = stripeEnvFromWebhookQuery(new URL(request.url));
        const secret =
          env === 'live'
            ? process.env['PAYMENTS_LIVE_WEBHOOK_SECRET']
            : process.env['PAYMENTS_SANDBOX_WEBHOOK_SECRET'];

        if (!secret) return new Response('Webhook not configured', { status: 500 });

        const signature = request.headers.get('stripe-signature');
        if (!signature) return new Response('Missing signature', { status: 401 });

        const body = await request.text();
        const stripe = createStripeClient(env);

        let event;
        try {
          event = await stripe.webhooks.constructEventAsync(body, signature, secret);
        } catch {
          return new Response('Invalid signature', { status: 401 });
        }

        const statusByEvent: Record<string, string> = {
          'invoice.paid': 'paid',
          'invoice.payment_succeeded': 'paid',
          'invoice.voided': 'void',
          'invoice.marked_uncollectible': 'uncollectible',
        };

        const nextStatus = statusByEvent[event.type];
        if (!nextStatus) return new Response('ok');

        const invoice = event.data.object as {
          id?: string;
          metadata?: Record<string, string> | null;
        };
        if (!invoice.id) return new Response('ok');

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

        await supabaseAdmin
          .from('invoice_requests')
          .update({
            status: nextStatus,
            paid_at: nextStatus === 'paid' ? new Date().toISOString() : null,
          })
          .eq('stripe_invoice_id', invoice.id);

        if (nextStatus === 'paid') {
          const { data: row } = await supabaseAdmin
            .from('invoice_requests')
            .select('service_id')
            .eq('stripe_invoice_id', invoice.id)
            .maybeSingle();

          const serviceId = row?.service_id ?? invoice.metadata?.['service_id'] ?? null;
          if (serviceId) {
            await supabaseAdmin
              .from('services')
              .update({ status: 'booked' })
              .eq('id', serviceId);
          }
        }

        return new Response('ok');
      },
    },
  },
});
