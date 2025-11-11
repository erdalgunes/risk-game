import { createClient } from '@supabase/supabase-js';
export function createSupabaseClient(url, anonKey) {
    return createClient(url, anonKey);
}
