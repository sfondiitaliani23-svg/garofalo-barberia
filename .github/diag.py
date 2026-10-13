import re
from playwright.sync_api import sync_playwright
B='https://barberiagarofalo.it'
def labels(pg):
    body=pg.locator('body').inner_text(); i=body.find('Orari disponibili'); seg=body[i:i+3000]
    return re.findall(r'\b\d{2}:\d{2}\s*\n\s*(Luigi|Francesco|Vittorio)', seg)
with sync_playwright() as p:
    b=p.chromium.launch()
    for q,name in [('', 'nessuna preferenza (default)'), ('&barber=luigi-garofalo','Luigi'), ('&barber=vittorio-morlino','Vittorio')]:
        pg=b.new_page(viewport={'width':1366,'height':900}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(f'{B}/prenota?service=Taglio%20e%20shampoo{q}', wait_until='load', timeout=60000); pg.wait_for_timeout(2500)
        try: pg.click('text=Solo necessari',timeout=1500)
        except: pass
        pg.click('button:has-text("Avanti")'); pg.wait_for_timeout(5000)
        d=[x for x in pg.locator('button').filter(has_text=re.compile(r'^MER', re.I)).all() if x.is_enabled()]
        if d: d[0].click(); pg.wait_for_timeout(5000)
        l=labels(pg); from collections import Counter
        print(name, '| giorno:', d[0].inner_text().replace('\n',' ') if d else None, '| etichette:', dict(Counter(l)), '| errori:', errs[:1])
        pg.close()
    b.close()
