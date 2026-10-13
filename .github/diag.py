import json, urllib.request
from playwright.sync_api import sync_playwright
B='https://barberiagarofalo.it'
k=json.loads(urllib.request.urlopen(B+'/api/push/key', timeout=30).read()); print('chiave notifiche:', len(k.get('publicKey','')), 'caratteri')
k2=json.loads(urllib.request.urlopen(B+'/api/push/key?x=2', timeout=30).read()); print('stessa chiave alla seconda richiesta:', k==k2)
sw=urllib.request.urlopen(B+'/sw.js', timeout=30).read().decode(); print('sw con push:', "addEventListener('push'" in sw)
req=urllib.request.Request(B+'/api/push/subscribe', method='POST', data=b'{}', headers={'Content-Type':'application/json'})
try: urllib.request.urlopen(req, timeout=30)
except urllib.error.HTTPError as e: print('iscrizione senza login ->', e.code)
init="document.addEventListener('DOMContentLoaded',()=>document.documentElement.classList.add('is-app'));"
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True); ctx.add_init_script(init); pg=ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(B+'/', wait_until='load', timeout=60000); pg.wait_for_timeout(2500)
    try: pg.click('text=Accetta tutti', timeout=4000)
    except: pass
    print('barra app:', pg.locator('.app-tabbar').is_visible())
    pg.click('.app-tab:has-text("Servizi")'); pg.wait_for_timeout(2000)
    print('servizi h1:', pg.evaluate("getComputedStyle(document.querySelector('h1')).display"))
    print('errori:', errs); b.close()
