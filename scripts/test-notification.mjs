#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
}

const topic = process.env.NTFY_TOPIC ?? 'garofalo-barberia-luigi-prenotazioni';
const baseUrl = (process.env.NTFY_URL ?? 'https://ntfy.sh').replace(/\/$/, '');

const response = await fetch(`${baseUrl}/${topic}`, {
  method: 'POST',
  headers: {
    Title: 'Test — Nuova prenotazione Garofalo',
    Priority: 'urgent',
    Tags: 'calendar,barber',
  },
  body: 'Test notifica: Mario Rossi — Taglio e shampoo — domani alle 10:00',
});

if (!response.ok) {
  console.error('Notifica fallita', response.status, await response.text());
  process.exit(1);
}

console.log('Notifica inviata al topic:', topic);
console.log('Luigi deve avere l\'app ntfy e iscriversi a questo topic.');