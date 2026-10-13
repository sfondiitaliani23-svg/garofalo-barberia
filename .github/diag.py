import urllib.request, json
from playwright.sync_api import sync_playwright
B='https://barberiagarofalo.it'
m=json.loads(urllib.request.urlopen(B+'/manifest.webmanifest',timeout=30).read()); print('manifest', m['name'], [i['src'] for i in m['icons']])
for u in ['/pwa/icon-512.png','/offline.html','/sw.js']:
    r=urllib.request.urlopen(B+u,timeout=30); print(u, r.status, r.headers.get('cache-control'))
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(); pg=ctx.new_page(); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    for path in ['/prodotti','/offerte','/']:
        r=pg.goto(B+path, wait_until='load', timeout=60000); pg.wait_for_timeout(3000)
        print(path, r.status, 'cards:', pg.locator('.pr-card, .of-card, .of-empty').count(), 'APPERR' if pg.locator('text=Application error').count() else 'ok')
    pg.wait_for_timeout(3000)
    print('sw attivo:', pg.evaluate("navigator.serviceWorker.getRegistration().then(r => !!(r && (r.active||r.installing||r.waiting)))"))
    ctx.set_offline(True)
    try:
        pg.goto(B+'/servizi', wait_until='load', timeout=20000); print('offline ->', pg.locator('h1').first.inner_text())
    except Exception as e: print('offline nav err', str(e)[:100])
    ctx.set_offline(False)
    print('errori:', errs); b.close()
