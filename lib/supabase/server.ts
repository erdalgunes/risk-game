import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client for use in Server Actions and API routes
 * Uses environment variables that are only available server-side
 * Untyped for flexibility - we cast results to our types in actions
 */
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}
