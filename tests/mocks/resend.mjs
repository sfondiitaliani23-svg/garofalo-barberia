globalThis.__emails ??= [];
export class Resend {
  constructor() { this.emails = { send: async (payload) => { globalThis.__emails.push(payload); return { data: { id: 'x' }, error: null }; } }; }
}
