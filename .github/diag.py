import urllib.request
from playwright.sync_api import sync_playwright
B='https://barberiagarofalo.it'
print('sitemap journal:', urllib.request.urlopen(B+'/sitemap.xml',timeout=30).read().decode().count('/journal/'))
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    for path in ['/journal','/journal/primo-taglio-bambino','/journal/non-esiste','/','/admin/journal']:
        r=pg.goto(B+path, wait_until='load', timeout=60000); pg.wait_for_timeout(1500)
        print(path, r.status, pg.url.replace(B,''), 'cards:', pg.locator('.jr-card').count(), 'banner:', pg.locator('[role=status].border-gold\\/25').count())
    print('errori:', errs); b.close()
