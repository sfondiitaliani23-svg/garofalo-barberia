npm i -g vercel@latest >/dev/null 2>&1
mkdir -p /tmp/v && cd /tmp/v && mkdir -p .vercel && printf '{"orgId":"%s","projectId":"%s"}' "$VERCEL_ORG_ID" "$VERCEL_PROJECT_ID" > .vercel/project.json
vercel ls --token="$VERCEL_TOKEN" 2>&1 | head -12
U=$(vercel ls --token="$VERCEL_TOKEN" 2>/dev/null | grep -o 'https://[^ ]*vercel.app' | head -1)
echo "ULTIMO: $U"
vercel inspect "$U" --logs --token="$VERCEL_TOKEN" 2>&1 | grep -v "^\s*$" | tail -80
# 1791933775
