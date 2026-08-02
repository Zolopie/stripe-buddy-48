import { createFileRoute } from '@tanstack/react-router';
import { syncCatalogToStripe } from '@/lib/catalog-sync.server';
import { resolveStripeEnv } from '@/lib/stripe-env.server';

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const Route = createFileRoute('/api/public/catalog-sync')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env['CATALOG_SYNC_TOKEN'];
        if (!expected) return new Response('Sync not configured', { status: 500 });

        const provided = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
        if (!provided || !timingSafeEqual(provided, expected)) {
          return new Response('Unauthorized', { status: 401 });
        }

        const result = await syncCatalogToStripe(resolveStripeEnv(request.headers));
        return Response.json(result, { status: result.ok ? 200 : 207 });
      },
    },
  },
});
