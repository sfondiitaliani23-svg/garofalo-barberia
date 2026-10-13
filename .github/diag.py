import re
from playwright.sync_api import sync_playwright
B='https://barberiagarofalo.it'
with sync_playwright() as p:
    b=p.chromium.launch()
    for barber in ['vittorio-morlino','francesco-costantino','luigi-garofalo']:
        pg=b.new_page(viewport={'width':1366,'height':900})
        pg.goto(f'{B}/prenota?barber={barber}&service=Taglio%20e%20shampoo', wait_until='load', timeout=60000); pg.wait_for_timeout(2500)
        try: pg.click('text=Solo necessari',timeout=1500)
        except: pass
        pg.click('button:has-text("Avanti")'); pg.wait_for_timeout(6000)
        dbtn=[d for d in pg.locator('button').filter(has_text=re.compile(r'^(LUN|MAR|MER|GIO|VEN|SAB|DOM)', re.I)).all() if d.is_enabled()]
        print(barber, 'giorni cliccabili:', len(dbtn), [d.inner_text().replace('\n',' ') for d in dbtn[:5]])
        if len(dbtn)>1:
            dbtn[1].click(); pg.wait_for_timeout(6000)
            body=pg.locator('body').inner_text()
            times=re.findall(r'\b(?:0[89]|1\d|20):[0-5]\d\b', body.split('Scegli il giorno')[-1])
            i=body.find('Scegli il giorno'); tail=body[i:].replace('\n',' | ')
            print('   ', dbtn[1].inner_text().replace('\n',' '), 'orari trovati:', len(times), times[:8])
            print('   ', tail[300:700])
        pg.close()
    b.close()
