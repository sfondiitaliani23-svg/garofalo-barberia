'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  imageUrl: string;
  isOwner?: boolean;
}

interface TeamStudioSectionProps {
  members: TeamMember[];
}

export function TeamStudioSection({ members }: TeamStudioSectionProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll<HTMLElement>('.team-studio-card'));
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    if (canHover) return;

    const handleLinkClick = (card: HTMLElement) => (event: Event) => {
      if (!card.classList.contains('is-active')) {
        event.preventDefault();
        cards.forEach((other) => other.classList.remove('is-active'));
        card.classList.add('is-active');
      }
    };

    const listeners = cards.map((card) => {
      const link = card.querySelector('.team-studio-link');
      if (!link) return null;
      const handler = handleLinkClick(card);
      link.addEventListener('click', handler);
      return { link, handler };
    });

    const handleDocumentClick = (event: MouseEvent) => {
      if (!(event.target as Element).closest('.team-studio-card')) {
        cards.forEach((card) => card.classList.remove('is-active'));
      }
    };

    document.addEventListener('click', handleDocumentClick);

    return () => {
      listeners.forEach((entry) => {
        if (entry) entry.link.removeEventListener('click', entry.handler);
      });
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [members]);

  return (
    <section className="section section-white team-studio-section">
      <div className="container-lux">
        <div className="team-studio-header">
          <h2 className="team-studio-title">Il nostro Team</h2>
          <div className="diamond-divider team-studio-divider">
            <div className="diamond-line" />
            <div className="diamond-block" />
            <div className="diamond-line" />
          </div>
          <p className="team-studio-subtitle">
            I nostri esperti sono qui per aiutarti a migliorare il tuo stile.
          </p>
        </div>

        <div ref={gridRef} className="team-studio-grid">
          {members.map((member) => (
            <div
              key={member.id}
              className={`team-studio-card${member.isOwner ? ' team-studio-card--owner' : ''}`}
            >
              <div className="team-studio-link" role="button" tabIndex={0} aria-label={`${member.name} — ${member.role}`}>
                <div className="team-studio-photo-wrap">
                  <div className="team-studio-photo-bg" aria-hidden="true" />
                  <div className="team-studio-photo">
                    <Image
                      src={member.imageUrl}
                      alt={`${member.name} — ${member.role}`}
                      width={400}
                      height={520}
                      style={{ width: '100%', height: 'auto', maxHeight: 520, objectFit: 'cover', objectPosition: 'top center' }}
                    />
                  </div>
                </div>
                <h3 className="team-studio-name">{member.name}</h3>
                <p className="team-studio-role">{member.role}</p>
              </div>
              <Link href="/prenota" className="team-studio-book-btn">
                Prenota
              </Link>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/prenota" className="btn-primary">
            Vieni a conoscerci — prenota ora
          </Link>
        </div>
      </div>
    </section>
  );
}