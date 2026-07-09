// ============================================================================
// GAROFALO BARBERIA - MAIN JAVASCRIPT
// ============================================================================
// Script principale per gestire interazioni, menu mobile, WhatsApp, form, etc.
// ============================================================================

/**
 * Inizializzazione globale al caricamento della pagina
 */
document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initSiteLogo();
  initWhatsAppButtons();
  initEmailLinks();
  initPhoneLinks();
  initLazyImages();
  initGalleryFilter();
  initContactForm();
  initBookingForm();
  highlightActiveNav();
  initScrollReveal();
  initPerfumeFlipCards();
  initPhotoStripBorder();
  initNewsletterForm();
  initTeamStudioCards();
  updateGoogleAnalytics();
});

/**
 * Applica il logo da config a tutte le navbar
 */
function initSiteLogo() {
  if (typeof SITE_CONFIG === 'undefined' || !SITE_CONFIG.logo) return;

  document.querySelectorAll('.site-logo').forEach((img) => {
    img.src = SITE_CONFIG.logo;
  });
}

/**
 * Gestisce il toggle del menu mobile
 */
function initMobileMenu() {
  const toggle = document.getElementById('menu-toggle');
  const menu = document.getElementById('mobile-menu');
  
  if (!toggle || !menu) return;

  // Toggle menu visibility
  toggle.addEventListener('click', () => {
    menu.classList.toggle('hidden');
    const isHidden = menu.classList.contains('hidden');
    toggle.setAttribute('aria-expanded', !isHidden);
  });

  // Chiudi menu quando si clicca su un link
  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menu.classList.add('hidden');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

/**
 * Inizializza tutti i bottoni WhatsApp con il link corretto
 */
function initWhatsAppButtons() {
  if (typeof SITE_CONFIG === 'undefined') return;

  const whatsappUrl = getWhatsAppLink();

  // Bottoni flottanti
  const waIcon = SITE_CONFIG.whatsappIcon || 'assets/sostituisci-immagini/icone/whatsapp.png';

  document.querySelectorAll('.whatsapp-float').forEach((btn) => {
    btn.href = whatsappUrl;
    btn.setAttribute('aria-label', 'Contattaci su WhatsApp');
    if (!btn.querySelector('img')) {
      btn.innerHTML = `<img src="${waIcon}" alt="WhatsApp" class="whatsapp-float-icon" width="58" height="58">`;
    }
  });

  document.querySelectorAll('.whatsapp-icon-inline, .whatsapp-float-icon').forEach((img) => {
    if (!img.getAttribute('src')) img.src = waIcon;
  });

  // Hero CTA
  const heroBtn = document.getElementById('hero-whatsapp');
  if (heroBtn) {
    heroBtn.href = whatsappUrl;
  }

  // Contatti pagina
  const contactBtn = document.getElementById('contact-whatsapp');
  if (contactBtn) {
    contactBtn.href = whatsappUrl;
  }

  // Footer links
  const footerBtn = document.getElementById('footer-whatsapp');
  if (footerBtn) {
    footerBtn.href = whatsappUrl;
  }

  const footerInstagram = document.getElementById('footer-instagram');
  if (footerInstagram && typeof SITE_CONFIG !== 'undefined' && SITE_CONFIG.instagram) {
    footerInstagram.href = SITE_CONFIG.instagram;
  }
  
  const footerLink = document.getElementById('footer-whatsapp-link');
  if (footerLink) {
    footerLink.href = whatsappUrl;
  }

  // Prenota pagina
  const ctkWhatsapp = document.getElementById('cta-whatsapp');
  if (ctkWhatsapp) {
    ctkWhatsapp.href = whatsappUrl;
  }

  // Contatti pagina CTA
  const footerCta = document.getElementById('footer-whatsapp-cta');
  if (footerCta) {
    footerCta.href = whatsappUrl;
  }
}

/**
 * Imposta i link telefono per aprire il dialer (chiamata/SMS)
 */
function initPhoneLinks() {
  if (typeof SITE_CONFIG === 'undefined' || !SITE_CONFIG.phone) return;

  const telUrl = `tel:${SITE_CONFIG.phone}`;

  document.querySelectorAll('a[href^="tel:"]').forEach((link) => {
    link.href = telUrl;
  });
}

/**
 * Reindirizza i link email a Gmail compose
 */
function initEmailLinks() {
  if (typeof SITE_CONFIG === 'undefined' || typeof getGmailComposeLink !== 'function') return;

  const gmailUrl = getGmailComposeLink(SITE_CONFIG.email);

  document.querySelectorAll('a[href^="mailto:"]').forEach((link) => {
    const href = link.getAttribute('href') || '';
    if (!href.includes(SITE_CONFIG.email)) return;

    link.href = gmailUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  });
}

/**
 * Implementa lazy loading per le immagini
 */
function initLazyImages() {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
          img.classList.add('loaded');
          observer.unobserve(img);
        }
      });
    });

    document.querySelectorAll('img[data-src]').forEach((img) => {
      imageObserver.observe(img);
    });
  }

  document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
    const markLoaded = () => img.classList.add('loaded');
    if (img.complete) markLoaded();
    else img.addEventListener('load', markLoaded, { once: true });
  });
}

/**
 * Gestisce il filtro della galleria
 */
function initGalleryFilter() {
  const filters = document.querySelectorAll('.filter-btn');
  const items = document.querySelectorAll('.gallery-item');

  if (filters.length === 0 || items.length === 0) return;

  filters.forEach((btn) => {
    btn.addEventListener('click', () => {
      const category = btn.dataset.filter;

      // Aggiorna gli stili dei bottoni
      filters.forEach((f) => f.classList.remove('active'));
      btn.classList.add('active');

      // Filtra gli elementi
      items.forEach((item) => {
        const itemCategory = item.getAttribute('data-category');
        const shouldShow = category === 'tutti' || itemCategory === category;

        if (shouldShow) {
          item.classList.remove('hidden');
          item.style.opacity = '1';
        } else {
          item.classList.add('hidden');
          item.style.opacity = '0';
        }
      });
    });
  });
}

/**
 * Gestisce il form di contatto
 */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form || typeof SITE_CONFIG === 'undefined') return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = form.querySelector('#name')?.value || '';
    const email = form.querySelector('#email')?.value || '';
    const phone = form.querySelector('#phone')?.value || '';
    const message = form.querySelector('#message')?.value || '';

    // Componi messaggio per WhatsApp
    const whatsappMessage = encodeURIComponent(
      `Ciao Garofalo Barberia!\n\n` +
      `Nome: ${name}\n` +
      `Email: ${email}\n` +
      `Telefono: ${phone}\n\n` +
      `Messaggio:\n${message}`
    );

    // Apri WhatsApp
    window.open(
      `https://wa.me/${SITE_CONFIG.whatsapp}?text=${whatsappMessage}`,
      '_blank'
    );

    // Reset form
    form.reset();
  });
}

/**
 * Prenotazione integrata multi-step (senza Fresha)
 */
function initBookingForm() {
  const form = document.getElementById('booking-form');
  if (!form || typeof SITE_CONFIG === 'undefined') return;

  const serviceContainer = document.getElementById('service-options');
  const barberContainer = document.getElementById('barber-options');
  const timeSelect = document.getElementById('booking-time');
  const dateInput = document.getElementById('booking-date');
  const prevBtn = document.getElementById('booking-prev');
  const nextBtn = document.getElementById('booking-next');
  const submitBtn = document.getElementById('booking-submit');
  const summary = document.getElementById('booking-summary');
  const panels = form.querySelectorAll('.booking-panel');
  const stepIndicators = document.querySelectorAll('.booking-step-indicator');

  let currentStep = 1;
  const state = { service: '', servicePrice: '', barber: '', date: '', time: '' };

  const allServices = [];
  Object.entries(SITE_CONFIG.services).forEach(([category, items]) => {
    items.forEach((item) => {
      allServices.push({ ...item, category });
    });
  });

  serviceContainer.innerHTML = allServices.map((s) => `
    <label class="booking-option cursor-pointer block p-4 transition">
      <input type="radio" name="service" value="${s.name}" data-price="${s.price}" data-duration="${s.duration}" class="sr-only peer">
      <div class="border border-transparent rounded-lg p-1 -m-1">
        <p class="font-medium font-ui">${s.name}</p>
        <p class="text-gold text-sm font-ui">${s.duration} · ${formatPrice(s.price)}</p>
      </div>
    </label>
  `).join('');

  barberContainer.innerHTML = SITE_CONFIG.team.map((member) => `
    <label class="booking-option booking-option--barber cursor-pointer block p-4 transition">
      <input type="radio" name="barber" value="${member.name}" class="sr-only peer">
      <div class="booking-option-row">
        <div class="booking-option-copy">
          <p class="font-medium font-ui">${member.name}</p>
          <p class="text-gold text-sm font-ui">${member.role}</p>
        </div>
        <img
          src="${member.image}"
          alt="${member.name}"
          class="booking-option-avatar"
          width="120"
          height="156"
          loading="lazy"
          decoding="async"
        >
      </div>
    </label>
  `).join('') + `
    <label class="booking-option cursor-pointer block p-4 transition sm:col-span-2">
      <input type="radio" name="barber" value="Nessuna preferenza" class="sr-only peer">
      <div class="border border-transparent rounded-lg p-1 -m-1">
        <p class="font-medium font-ui">Nessuna preferenza</p>
        <p class="text-sm font-ui" style="color:var(--muted)">Il primo barbiere disponibile</p>
      </div>
    </label>
  `;

  const slots = SITE_CONFIG.booking?.timeSlots || [];
  timeSelect.innerHTML = '<option value="">Scegli un orario</option>' +
    slots.map((t) => `<option value="${t}">${t}</option>`).join('');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  dateInput.min = tomorrow.toISOString().split('T')[0];
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);
  dateInput.max = maxDate.toISOString().split('T')[0];

  form.querySelectorAll('.booking-option input').forEach((input) => {
    input.addEventListener('change', () => {
      form.querySelectorAll(`input[name="${input.name}"]`).forEach((radio) => {
        radio.closest('.booking-option')?.classList.remove('border-gold');
      });
      input.closest('.booking-option')?.classList.add('border-gold');

      if (input.name === 'service' && currentStep === 1) {
        showStep(2);
      } else if (input.name === 'barber' && currentStep === 2) {
        showStep(3);
      }
    });
  });

  function tryAdvanceFromDateTime() {
    if (currentStep !== 3 || !dateInput.value || !timeSelect.value) return;
    if (!validateStep(3)) return;
    showStep(4);
  }

  dateInput.addEventListener('change', tryAdvanceFromDateTime);
  timeSelect.addEventListener('change', tryAdvanceFromDateTime);

  function showStep(step) {
    currentStep = step;
    panels.forEach((p) => p.classList.toggle('hidden', Number(p.dataset.panel) !== step));
    stepIndicators.forEach((ind) => {
      const s = Number(ind.dataset.step);
      const dot = ind.querySelector('.step-dot');
      const label = ind.querySelector('.step-label');
      const active = s === step;
      const done = s < step;
      dot.className = 'step-dot w-8 h-8 rounded-full font-bold flex items-center justify-center text-sm ' +
        (active ? 'bg-gold text-black' : done ? 'step-dot-done' : 'step-dot-inactive');
      if (label) label.className = 'step-label hidden sm:inline font-ui ' + (active ? 'text-gold' : 'text-white/50');
    });
    prevBtn.classList.toggle('hidden', step === 1);
    nextBtn.classList.toggle('hidden', step === 4);
    submitBtn.classList.toggle('hidden', step !== 4);
    if (step === 4) updateSummary();
  }

  function getSelected(name) {
    return form.querySelector(`input[name="${name}"]:checked`);
  }

  function validateStep(step) {
    if (step === 1 && !getSelected('service')) {
      alert('Seleziona un servizio per continuare.');
      return false;
    }
    if (step === 2 && !getSelected('barber')) {
      alert('Seleziona un barbiere per continuare.');
      return false;
    }
    if (step === 3) {
      if (!dateInput.value || !timeSelect.value) {
        alert('Seleziona data e orario.');
        return false;
      }
      const selected = new Date(dateInput.value + 'T' + timeSelect.value);
      if (SITE_CONFIG.booking?.closedDays?.includes(selected.getDay())) {
        alert('La barberia è chiusa la domenica. Scegli un altro giorno.');
        return false;
      }
    }
    return true;
  }

  function updateSummary() {
    const service = getSelected('service');
    const barber = getSelected('barber');
    state.service = service?.value || '';
    state.servicePrice = service?.dataset.price || '';
    state.barber = barber?.value || '';
    state.date = dateInput.value;
    state.time = timeSelect.value;

    const dateFormatted = state.date
      ? new Date(state.date + 'T12:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
      : '';

    summary.innerHTML = `
      <p><strong>Servizio:</strong> ${state.service} (${formatPrice(Number(state.servicePrice))})</p>
      <p><strong>Barbiere:</strong> ${state.barber}</p>
      <p><strong>Data:</strong> ${dateFormatted} alle ${state.time}</p>
    `;
    summary.classList.remove('hidden');
  }

  prevBtn?.addEventListener('click', () => showStep(currentStep - 1));
  nextBtn?.addEventListener('click', () => {
    if (validateStep(currentStep)) showStep(currentStep + 1);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.querySelector('#booking-name')?.value?.trim();
    const phone = form.querySelector('#booking-phone')?.value?.trim();
    const notes = form.querySelector('#booking-notes')?.value?.trim();

    if (!name || !phone) {
      alert('Inserisci nome e telefono.');
      return;
    }

    updateSummary();
    const dateFormatted = new Date(state.date + 'T12:00').toLocaleDateString('it-IT', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    const message = encodeURIComponent(
      `Ciao Garofalo Barberia! Vorrei prenotare:\n\n` +
      `Servizio: ${state.service} (${formatPrice(Number(state.servicePrice))})\n` +
      `Barbiere: ${state.barber}\n` +
      `Data: ${dateFormatted}\n` +
      `Orario: ${state.time}\n\n` +
      `Nome: ${name}\n` +
      `Telefono: ${phone}` +
      (notes ? `\nNote: ${notes}` : '')
    );

    window.open(`https://wa.me/${SITE_CONFIG.whatsapp}?text=${message}`, '_blank');
    trackEvent('booking_submit', { service: state.service });
  });

  showStep(1);
}

/**
 * Evidenzia il link di navigazione attivo
 */
function highlightActiveNav() {
  const currentPath = window.location.pathname;
  const filename = currentPath.split('/').pop() || 'index.html';
  const normalized = filename === '' || filename === '/' ? 'index.html' : filename;

  document.querySelectorAll('.site-nav-link, .mobile-menu a').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('tel') || href === '#') return;

    const isActive = href === normalized;
    link.classList.toggle('active', isActive);
  });
}

function initNewsletterForm() {
  const form = document.getElementById('newsletter-form');
  if (!form || typeof SITE_CONFIG === 'undefined') return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = form.querySelector('#newsletter-email');
    const email = input?.value?.trim();
    if (!email) return;

    const subject = 'Iscrizione newsletter — Garofalo Barberia';
    const body = `Ciao, vorrei iscrivermi alla newsletter di Garofalo Barberia.\n\nEmail: ${email}`;
    window.open(getGmailComposeLink(SITE_CONFIG.email, subject, body), '_blank', 'noopener,noreferrer');
  });
}

function initPhotoStripBorder() {
  const items = document.querySelectorAll('.photo-strip-item');
  if (items.length === 0) return;

  items.forEach((item) => {
    const activate = () => {
      item.classList.remove('border-out');
      item.classList.add('border-in');
    };

    const deactivate = () => {
      item.classList.remove('border-in');
      item.classList.add('border-out');
    };

    item.addEventListener('mouseenter', activate);
    item.addEventListener('mouseleave', deactivate);
    item.addEventListener('focus', activate);
    item.addEventListener('blur', deactivate);
  });
}

function initPerfumeFlipCards() {
  const cards = document.querySelectorAll('.perfume-card-flip');
  if (cards.length === 0) return;

  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  cards.forEach((card) => {
    if (!canHover) {
      card.addEventListener('click', () => {
        const isFlipped = card.classList.contains('is-flipped');
        cards.forEach((other) => other.classList.remove('is-flipped'));
        if (!isFlipped) card.classList.add('is-flipped');
      });
    }

    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        card.classList.toggle('is-flipped');
      }
    });
  });

  if (!canHover) {
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.perfume-card-flip')) {
        cards.forEach((card) => card.classList.remove('is-flipped'));
      }
    });
  }
}

function initTeamStudioCards() {
  const cards = document.querySelectorAll('.team-studio-card');
  if (cards.length === 0) return;

  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (!canHover) {
    cards.forEach((card) => {
      const bioLink = card.querySelector('.team-studio-link');
      if (!bioLink) return;

      bioLink.addEventListener('click', (event) => {
        if (!card.classList.contains('is-active')) {
          event.preventDefault();
          cards.forEach((other) => other.classList.remove('is-active'));
          card.classList.add('is-active');
        }
      });
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.team-studio-card')) {
        cards.forEach((card) => card.classList.remove('is-active'));
      }
    });
  }
}

function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');
  if (reveals.length === 0) return;

  if (!('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  reveals.forEach((el) => observer.observe(el));
}

/**
 * Aggiorna Google Analytics se configurato
 */
function updateGoogleAnalytics() {
  if (typeof SITE_CONFIG !== 'undefined' && SITE_CONFIG.ga4Id) {
    // GA4 è già inizializzato nel template HTML tramite tag <script>
    // Questa funzione può essere usata per event tracking personalizzati
    if (typeof gtag !== 'undefined') {
      gtag('event', 'page_view');
    }
  }
}

/**
 * Track eventi personalizzati per Google Analytics
 * @param {string} eventName - Nome dell'evento
 * @param {Object} eventData - Dati dell'evento
 */
function trackEvent(eventName, eventData = {}) {
  if (typeof gtag !== 'undefined') {
    gtag('event', eventName, eventData);
  }
}

/**
 * Smooth scroll ai link interni
 */
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href !== '#' && document.querySelector(href)) {
      e.preventDefault();
      document.querySelector(href).scrollIntoView({ behavior: 'smooth' });
    }
  });
});