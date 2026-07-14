const username = 'barberia_garofalo';

const res = await fetch(
  `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
  {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'X-IG-App-ID': '936619743392459',
      'X-Requested-With': 'XMLHttpRequest',
      'Accept': '*/*',
    },
  }
);

console.log('status', res.status);
if (!res.ok) {
  console.log(await res.text());
  process.exit(1);
}

const data = await res.json();
const edges = data?.data?.user?.edge_owner_to_timeline_media?.edges ?? [];
console.log('posts', edges.length);
for (const edge of edges.slice(0, 6)) {
  const node = edge.node;
  console.log(node.shortcode, node.is_video ? 'video' : 'image', node.display_url?.slice(0, 60));
}