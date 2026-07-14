import json
import re
import urllib.request

URL = "https://www.instagram.com/barberia_garofalo/"
req = urllib.request.Request(
    URL,
    headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
    },
)

with urllib.request.urlopen(req, timeout=20) as response:
    html = response.read().decode("utf-8", errors="ignore")

print("html length:", len(html))

for pattern in ("shortcode", "edge_owner_to_timeline_media", "xdt_api"):
    print(pattern, html.count(pattern))

shortcodes = list(dict.fromkeys(re.findall(r'"shortcode":"([A-Za-z0-9_-]+)"', html)))
print("shortcodes:", shortcodes[:12])

# Newer Instagram embeds JSON in script tags
for match in re.finditer(r"<script[^>]*>(\{.*?\})</script>", html):
    chunk = match.group(1)
    if "shortcode" in chunk and len(chunk) > 500:
        try:
            data = json.loads(chunk)
            print("found json block keys:", list(data.keys())[:5])
        except json.JSONDecodeError:
            pass
        break