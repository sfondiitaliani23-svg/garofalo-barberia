import Image from 'next/image';
import { Play } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/site-config';
import { fetchInstagramPosts } from '@/lib/instagram/fetch-posts';
import { InstagramEmbedFallback } from '@/components/contatti/InstagramEmbedFallback';
import { L, type Lang } from '@/lib/i18n';

export async function InstagramFeed({ lang = 'it' }: { lang?: Lang }) {
  const posts = await fetchInstagramPosts(6);

  return (
    <div className="form-card contatti-instagram-card p-6">
      <div className="eyebrow">
        <div className="eyebrow-line" />
        <span className="eyebrow-text">Instagram</span>
      </div>

      <div className="contatti-instagram-body">
        <div className="contatti-instagram-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="2" width="20" height="20" rx="5" />
            <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
            <path d="M17.5 6.5h.01" />
          </svg>
        </div>
        <div>
          <p className="contatti-instagram-handle">{SITE_CONFIG.instagramHandle}</p>
          <p className="contatti-instagram-text">{L(lang, 'Seguici per tagli, barba e novità dal salone.', 'Follow us for haircuts, beards and news from the barbershop.')}</p>
        </div>
      </div>

      {posts.length > 0 ? (
        <div className="contatti-instagram-grid">
          {posts.map((post) => (
            <a
              key={post.id}
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="contatti-instagram-post"
              aria-label={post.caption ? `${L(lang, 'Post Instagram', 'Instagram post')}: ${post.caption}` : L(lang, 'Apri post Instagram', 'Open Instagram post')}
            >
              <Image
                src={post.mediaUrl}
                alt={post.caption ?? L(lang, 'Post Instagram Barberia Garofalo', 'Instagram post from Barberia Garofalo')}
                fill
                sizes="(max-width: 640px) 50vw, 150px"
                className="object-cover"
                unoptimized
              />
              {post.mediaType === 'VIDEO' && (
                <span className="contatti-instagram-play" aria-hidden="true">
                  <Play size={18} fill="currentColor" />
                </span>
              )}
            </a>
          ))}
        </div>
      ) : (
        <InstagramEmbedFallback username="barberia_garofalo" />
      )}

      <a
        href={SITE_CONFIG.instagram}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary contatti-instagram-btn"
      >
        {L(lang, 'Segui', 'Follow')}
      </a>
    </div>
  );
}