import type { SiteContent } from '@/types/database';

interface SiteBannersProps {
  banners: SiteContent[];
}

export function SiteBanners({ banners }: SiteBannersProps) {
  if (banners.length === 0) return null;

  return (
    <div>
      {banners.map((banner) => (
        <div
          key={banner.id}
          role="status"
          className="border-b border-gold/25 bg-gold/10 px-4 py-2.5 text-center text-sm text-white"
        >
          {banner.title && <strong className="font-semibold text-gold">{banner.title}</strong>}
          {banner.title && banner.body && <span className="text-white/50"> — </span>}
          {banner.body && <span className="text-white/85">{banner.body}</span>}
        </div>
      ))}
    </div>
  );
}