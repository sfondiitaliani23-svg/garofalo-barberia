/** Aspetto dell'app: nero (quello di sempre) oppure oro. Resta su questo telefono. */

export const LOOK_KEY = 'gb-look';
export type Look = 'black' | 'gold';

export function readLook(): Look {
  try {
    return localStorage.getItem(LOOK_KEY) === 'gold' ? 'gold' : 'black';
  } catch {
    return 'black';
  }
}

/** Applica il colore subito, prima ancora di ridisegnare la pagina. */
export function applyLook(look: Look) {
  const root = document.documentElement;
  if (look === 'gold') root.setAttribute('data-look', 'gold');
  else root.removeAttribute('data-look');
  try {
    localStorage.setItem(LOOK_KEY, look);
  } catch {
    /* la scelta vale almeno finché la pagina è aperta */
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', look === 'gold' ? '#e4c36a' : '#000000');
}
