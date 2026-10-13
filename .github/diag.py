from playwright.sync_api import sync_playwright
B='https://barberiagarofalo.it'
with sync_playwright() as p:
    b=p.chromium.launch()
    for barber in ['vittorio-morlino','francesco-costantino','luigi-garofalo']:
        pg=b.new_page(viewport={'width':1366,'height':900}); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(f'{B}/prenota?barber={barber}&service=Taglio%20e%20shampoo', wait_until='load', timeout=60000); pg.wait_for_timeout(2500)
        try: pg.click('text=Solo necessari',timeout=1500)
        except: pass
        pg.click('button:has-text("Avanti")'); pg.wait_for_timeout(6000)
        # primo giorno disponibile
        days=pg.locator('[data-date], button:has-text("ott"), button:has-text("nov")')
        txt=pg.locator('body').inner_text()
        dbtn=pg.locator('button').filter(has_text='ott').all()+pg.locator('button').filter(has_text='nov').all()
        clicked=None
        for d in dbtn:
            t=d.inner_text().strip()
            if d.is_enabled() and 'Ottobre' not in t and 'Novembre' not in t:
                d.click(); clicked=t.replace('\n',' '); break
        pg.wait_for_timeout(5000)
        slots=[s.inner_text() for s in pg.locator('button').all() if __import__('re').fullmatch(r'\d{2}:\d{2}', s.inner_text().strip() or '')]
        print(barber, '| giorno:', clicked, '| orari:', len(slots), slots[:6], '| errori:', errs[:2], '| riservato:', 'Riservato a Luigi' in txt)
        pg.close()
    b.close()
