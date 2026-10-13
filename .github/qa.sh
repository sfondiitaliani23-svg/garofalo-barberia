set +e
mkdir -p qa-out
npm i -g lighthouse@12.2.1 >/dev/null 2>&1
CHROME=$(python -c "from playwright.sync_api import sync_playwright as s; p=s().start(); print(p.chromium.executable_path); p.stop()")
export CHROME_PATH=$CHROME
B=https://barberiagarofalo.it
for path in / /servizi /prenota /galleria /contatti /taglio-uomo-foggia /journal /team/luigi-garofalo /recensioni /chi-siamo; do
  name=$(echo "$path" | tr '/' '_'); [ "$name" = "_" ] && name="_home"
  for mode in mobile desktop; do
    flag=""; [ $mode = desktop ] && flag="--preset=desktop"
    lighthouse "$B$path" $flag --quiet --chrome-flags="--headless=new --no-sandbox" --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=qa-out/lh$name-$mode.json >/dev/null 2>&1
  done
done
python .github/diag.py
# rerun 1791903535
