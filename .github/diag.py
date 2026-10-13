import urllib.request, json
from playwright.sync_api import sync_playwright
B='https://barberiagarofalo.it'
class NoRedir(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k): return None
op=urllib.request.build_opener(NoRedir)
for q in ['vetrina','specchio','cassa']:
    try: op.open(B+'/qr/'+q, timeout=30)
    except urllib.error.HTTPError as e: print('/qr/'+q, e.code, '->', e.headers.get('location'))
for u in ['/sitemap.xml','/llms.txt']:
    body=urllib.request.urlopen(B+u, timeout=30).read().decode()
    print(u, 'journal' in body, 'faq' in body, 'prima-visita' in body)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    for path in ['/prima-visita','/faq','/journal','/journal/primo-taglio-bambino','/lavora-con-noi','/feedback','/link','/admin/messaggi']:
        r=pg.goto(B+path, wait_until='load', timeout=60000); pg.wait_for_timeout(2000)
        lds=[json.loads(x)['@type'] for x in pg.locator('script[type="application/ld+json"]').all_text_contents()]
        print(path, r.status, pg.url.replace(B,''), lds, 'APPERR' if pg.locator('text=Application error').count() else 'ok')
    print('errori:', errs)
    b.close()
