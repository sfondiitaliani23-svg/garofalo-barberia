export async function getSession() { return globalThis.__testUser ?? null; }
export async function getProfile() { const u = globalThis.__testUser; return u ? { id: u.id, role: u.role ?? 'customer', email: u.email } : null; }
export async function requireAdmin() { return globalThis.__testUser; }
