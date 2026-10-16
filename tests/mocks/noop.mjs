globalThis.__sideEffects ??= [];
export async function ensureProfileForAuthUser() {}
export async function notifyAdminNewBooking(x) { globalThis.__sideEffects.push(['notifyNew', x]); }
export async function notifyAdminBookingCancellation(x) { globalThis.__sideEffects.push(['notifyCancel', x]); }
export async function sendImmediateWhatsAppReminderIfEligible(x) { globalThis.__sideEffects.push(['reminder', x]); }
