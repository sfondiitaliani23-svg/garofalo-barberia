npm i -g vercel@latest >/dev/null 2>&1
git clone -q --depth 1 https://github.com/sfondiitaliani23-svg/garofalo-barberia.git /tmp/site 2>&1 | tail -2
cd /tmp/site && mkdir -p .vercel && printf '{"orgId":"%s","projectId":"%s"}' "$VERCEL_ORG_ID" "$VERCEL_PROJECT_ID" > .vercel/project.json
git log --oneline -1
timeout 500 vercel deploy --yes --token="$VERCEL_TOKEN" 2>&1 | tail -40
# 1791933880
