set +e
npm i -g lighthouse@12.2.1 >/dev/null 2>&1
export CHROME_PATH=$(python -c "from playwright.sync_api import sync_playwright as s; p=s().start(); print(p.chromium.executable_path); p.stop()")
i=0
for path in servizi servizi prenota galleria contatti ""; do i=$((i+1)); lighthouse "https://barberiagarofalo.it/$path" --quiet --chrome-flags="--headless=new --no-sandbox" --only-categories=performance --output=json --output-path=lh-$i.json >/dev/null 2>&1; done
python .github/diag.py
