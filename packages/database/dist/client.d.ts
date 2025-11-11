import type { Database } from './types';
export declare function createSupabaseClient(url: string, anonKey: string): import("@supabase/supabase-js").SupabaseClient<Database, "public", "public", never, {
    PostgrestVersion: "12";
}>;
export type SupabaseClient = ReturnType<typeof createSupabaseClient>;
//# sourceMappingURL=client.d.ts.map