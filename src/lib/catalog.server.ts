import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

export type ServiceRow = Database['public']['Tables']['services']['Row'];

// Publishable-key client for public, read-only catalog data (RLS applies as anon).
export function createPublicSupabase() {
  const url = process.env['SUPABASE_URL']!;
  const key = process.env['SUPABASE_PUBLISHABLE_KEY']!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) {
          headers.delete('Authorization');
        }
        headers.set('apikey', key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export async function fetchServices(): Promise<ServiceRow[]> {
  const supabase = createPublicSupabase();
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('price', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}