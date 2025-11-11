/**
 * Supabase client configuration
 *
 * NOTE: We use an untyped client to avoid TypeScript inference issues
 * with insert/update operations. Types are cast at usage sites.
 */

import { createClient } from '@supabase/supabase-js';

let supabaseClient: ReturnType<typeof createClient> | null = null;

/**
 * Get or create Supabase client (untyped to avoid inference issues)
 */
export function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  // Use untyped client to avoid "Type 'never' is not assignable" errors
  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  return supabaseClient;
}

/**
 * Reset client (useful for testing)
 */
export function resetClient() {
  supabaseClient = null;
}
