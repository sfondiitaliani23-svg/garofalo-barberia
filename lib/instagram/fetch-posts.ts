import type { InstagramPost } from '@/lib/instagram/types';

const IG_APP_ID = '936619743392459';
const USERNAME = 'barberia_garofalo';

type WebProfileNode = {
  id: string;
  shortcode: string;
  display_url: string;
  is_video: boolean;
  edge_media_to_caption?: { edges: { node: { text: string } }[] };
};

function mapNode(node: WebProfileNode): InstagramPost {
  const caption = node.edge_media_to_caption?.edges?.[0]?.node?.text;
  return {
    id: node.id,
    shortcode: node.shortcode,
    permalink: `https://www.instagram.com/p/${node.shortcode}/`,
    mediaUrl: node.display_url,
    mediaType: node.is_video ? 'VIDEO' : 'IMAGE',
    caption: caption?.slice(0, 120),
  };
}

async function fetchFromGraphApi(limit: number): Promise<InstagramPost[]> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return [];

  const fields = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp';
  const url = `https://graph.instagram.com/me/media?fields=${fields}&limit=${limit}&access_token=${token}`;

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    data?: {
      id: string;
      caption?: string;
      media_type: string;
      media_url?: string;
      permalink: string;
      thumbnail_url?: string;
    }[];
  };

  return (data.data ?? []).map((item) => ({
    id: item.id,
    shortcode: item.permalink.split('/p/')[1]?.replace('/', '') ?? item.id,
    permalink: item.permalink,
    mediaUrl: item.media_type === 'VIDEO' ? item.thumbnail_url ?? item.media_url ?? '' : item.media_url ?? '',
    mediaType: item.media_type as InstagramPost['mediaType'],
    caption: item.caption?.slice(0, 120),
  }));
}

async function fetchFromWebProfile(limit: number): Promise<InstagramPost[]> {
  const res = await fetch(
    `https://www.instagram.com/api/v1/users/web_profile_info/?username=${USERNAME}`,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GarofaloBarberia/1.0)',
        'X-IG-App-ID': IG_APP_ID,
        'X-Requested-With': 'XMLHttpRequest',
        Accept: '*/*',
      },
      next: { revalidate: 3600 },
    }
  );

  if (!res.ok) return [];

  const data = (await res.json()) as {
    data?: {
      user?: {
        edge_owner_to_timeline_media?: {
          edges?: { node: WebProfileNode }[];
        };
      };
    };
  };

  const edges = data.data?.user?.edge_owner_to_timeline_media?.edges ?? [];
  return edges.slice(0, limit).map((edge) => mapNode(edge.node));
}

export async function fetchInstagramPosts(limit = 6): Promise<InstagramPost[]> {
  try {
    const graphPosts = await fetchFromGraphApi(limit);
    if (graphPosts.length > 0) return graphPosts;

    const webPosts = await fetchFromWebProfile(limit);
    if (webPosts.length > 0) return webPosts;
  } catch {
    return [];
  }

  return [];
}