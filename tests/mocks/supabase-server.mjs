import { fakeSupabase } from '../helpers/fake-supabase.mjs';
export async function createClient() { return globalThis.__testDb ? fakeSupabase(globalThis.__testDb) : null; }
export async function createServiceClient() { return globalThis.__testDb ? fakeSupabase(globalThis.__testDb) : null; }
