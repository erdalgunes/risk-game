/**
 * Supabase client configuration
 *
 * NOTE: We use an untyped client to avoid TypeScript inference issues
 * with insert/update operations. Types are cast at usage sites.
 */
/**
 * Get or create Supabase client (untyped to avoid inference issues)
 */
export declare function getSupabaseClient(): import("@supabase/supabase-js").SupabaseClient<unknown, {
    PostgrestVersion: string;
}, never, never, {
    PostgrestVersion: string;
}>;
/**
 * Reset client (useful for testing)
 */
export declare function resetClient(): void;
