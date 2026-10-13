import urllib.request
from playwright.sync_api import sync_playwright
B='https://barberiagarofalo.it'
r=urllib.request.urlopen(B+'/', timeout=30)
for k in ['strict-transport-security','x-content-type-options','x-frame-options','referrer-policy','permissions-policy','cross-origin-opener-policy','content-security-policy']:
    print(k, '=>', r.headers.get(k))
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(); pg=ctx.new_page(); errs=[]; csp=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: csp.append(m.text[:160]) if 'Content Security Policy' in m.text or 'Refused' in m.text else None)
    evt=[]
    pg.on('request', lambda rq: evt.append(rq.url) if '/api/evt' in rq.url else None)
    for path in ['/','/contatti','/servizi','/login','/prenota','/journal','/link']:
        rr=pg.goto(B+path, wait_until='load', timeout=60000); pg.wait_for_timeout(2500)
        if path=='/':
            try: pg.click('text=Accetta', timeout=2000)
            except:
                try: pg.click('text=Accetta tutti', timeout=1500)
                except: pass
        print(path, rr.status, 'APPERR' if pg.locator('text=Application error').count() else 'ok')
    print('iframe mappa:', pg.goto(B+'/contatti') and pg.locator('iframe').count())
    pg.goto(B+'/link', wait_until='load'); pg.wait_for_timeout(1500)
    with ctx.expect_page() as np:
        pg.locator('a:has-text("WhatsApp")').first.click()
    pg.wait_for_timeout(2000)
    print('chiamate /api/evt:', len(evt))
    print('violazioni CSP:', csp[:5]); print('errori:', errs[:3]); b.close()
