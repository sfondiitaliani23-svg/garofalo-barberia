'use client';

import { useState } from 'react';
import { SITE_CONFIG } from '@/lib/site-config';

export function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const text = encodeURIComponent(
      `Ciao Garofalo Barberia!\n\nNome: ${name}\nEmail: ${email}\nTelefono: ${phone}\n\nMessaggio:\n${message}`
    );

    window.open(`https://wa.me/${SITE_CONFIG.whatsapp}?text=${text}`, '_blank', 'noopener,noreferrer');

    setName('');
    setEmail('');
    setPhone('');
    setMessage('');
  };

  return (
    <div className="form-card contact-message-card">
      <div className="form-card-header">
        <h2 className="heading-display" style={{ fontSize: '1.75rem' }}>
          Scrivici un messaggio
        </h2>
        <p className="mt-1 text-sm text-white/50">Ti rispondiamo via WhatsApp</p>
      </div>
      <form onSubmit={handleSubmit} className="form-card-body space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm">
              Nome
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              placeholder="Il tuo nome"
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="tua@email.com"
            />
          </div>
        </div>
        <div>
          <label htmlFor="phone" className="mb-1 block text-sm">
            Telefono
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="form-input"
            placeholder={SITE_CONFIG.phoneDisplay}
          />
        </div>
        <div>
          <label htmlFor="message" className="mb-1 block text-sm">
            Messaggio
          </label>
          <textarea
            id="message"
            rows={4}
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="form-input resize-none"
            placeholder="Come possiamo aiutarti?"
          />
        </div>
        <button type="submit" className="btn-primary w-full sm:w-auto">
          Invia via WhatsApp
        </button>
      </form>
    </div>
  );
}