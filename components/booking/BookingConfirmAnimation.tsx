import './booking-confirm.css';

/**
 * Animazione di conferma prenotazione: anello oro, forbici che tagliano due volte,
 * poi la spunta. Solo grafica (SVG + CSS), nessuna libreria. Con "movimento ridotto"
 * compare subito la spunta ferma (vedi booking-confirm.css).
 * Decorativa: il testo "Prenotazione confermata" sta accanto, quindi aria-hidden.
 */
export function BookingConfirmAnimation() {
  return (
    <svg
      className="bk-confirm"
      viewBox="0 0 64 64"
      width="64"
      height="64"
      aria-hidden="true"
      focusable="false"
    >
      <circle className="bk-confirm__ring" cx="32" cy="32" r="29" pathLength="100" />
      <g className="bk-confirm__scissors">
        <g className="bk-confirm__half bk-confirm__half--a">
          <polygon points="32,35 29,10 33,12" />
          <line x1="32" y1="35" x2="41" y2="49" />
          <circle cx="42" cy="51" r="4.5" />
        </g>
        <g className="bk-confirm__half bk-confirm__half--b">
          <polygon points="32,35 35,10 31,12" />
          <line x1="32" y1="35" x2="23" y2="49" />
          <circle cx="22" cy="51" r="4.5" />
        </g>
        <circle className="bk-confirm__pivot" cx="32" cy="35" r="1.6" />
      </g>
      <path className="bk-confirm__check" d="M19 33 L28 42 L45 23" pathLength="100" />
    </svg>
  );
}
