export type InstagramPost = {
  id: string;
  shortcode: string;
  permalink: string;
  mediaUrl: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  caption?: string;
};