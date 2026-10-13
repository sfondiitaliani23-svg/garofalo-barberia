from playwright.sync_api import sync_playwright
B='https://barberiagarofalo.it'
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    r=pg.goto(B+'/team', wait_until='load', timeout=60000); pg.wait_for_timeout(2000)
    links=[a.get_attribute('href') for a in pg.locator('.tm-card').all()]
    print('/team', r.status, links)
    for l in links:
        r=pg.goto(B+l, wait_until='load', timeout=60000); pg.wait_for_timeout(1500)
        hours=pg.locator('.lp-hours div').all_inner_texts()
        print(l, r.status, '|', ' ; '.join(h.replace('\n',' ') for h in hours), '| away:', pg.locator('.tm-away').count())
    pg.goto(B+links[-1], wait_until='load'); pg.locator('a:has-text("Prenota con")').first.click(); pg.wait_for_timeout(3000)
    print('prenota ->', pg.url.replace(B,''))
    print('errori:', errs); b.close()
