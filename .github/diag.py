import json, urllib.request
from playwright.sync_api import sync_playwright
B='https://barberiagarofalo.it'
for u in ['/robots.txt','/sitemap.xml','/llms.txt','/api/open-now']:
    try:
        r=urllib.request.urlopen(B+u, timeout=30); body=r.read().decode()[:160].replace('\n',' ')
        print(u, r.status, body)
    except Exception as e: print(u,'ERR',e)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    for path in ['/','/servizi','/taglio-uomo-foggia','/barba-foggia','/taglio-bambino-foggia','/contatti']:
        r=pg.goto(B+path, wait_until='load', timeout=60000); pg.wait_for_timeout(2500)
        lds=[json.loads(x)['@type'] for x in pg.locator('script[type="application/ld+json"]').all_text_contents()]
        badge=pg.locator('.open-badge[role=status]').first.inner_text() if pg.locator('.open-badge[role=status]').count() else 'none'
        print(path, r.status, lds, badge, 'APPERR' if pg.locator('text=Application error').count() else 'ok')
    pg.goto(B+'/servizi', wait_until='load'); pg.wait_for_timeout(1500)
    try: pg.click('text=Solo necessari',timeout=1500)
    except: pass
    pg.click('text=Per me'); pg.click('text=Solo capelli'); pg.click('.sg-cta'); pg.wait_for_timeout(3000)
    print('guida ->', pg.url, 'selezionati:', pg.locator('text=Servizi selezionati').count())
    print('errori:', errs)
    b.close()
