import json, os, re, urllib.request, urllib.error
from playwright.sync_api import sync_playwright
B = 'https://barberiagarofalo.it'
SEC = os.environ.get('CRON_SECRET', '')

def get(path, headers=None):
    req = urllib.request.Request(B + path, headers={'User-Agent': 'Mozilla/5.0 diag', **(headers or {})})
    try:
        r = urllib.request.urlopen(req, timeout=40)
        return r.status, r.read().decode('utf-8', 'replace')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8', 'replace')
    except Exception as e:
        return 0, str(e)

# 1. Tutte le pagine della sitemap
st, sm = get('/sitemap.xml')
urls = re.findall(r'<loc>(.*?)</loc>', sm)
print('SITEMAP', st, len(urls), 'pagine')
bad = []
for u in urls:
    s, _ = get(u.replace(B, ''))
    if s != 200: bad.append((u, s))
print('PAGINE NON OK:', bad or 'nessuna')

# 2. Altre pagine e API
for p in ['/link', '/robots.txt', '/llms.txt', '/manifest.webmanifest', '/sw.js', '/offline.html', '/login', '/registrati',
          '/api/open-now', '/api/push/key', '/feedback', '/area-cliente', '/admin']:
    s, body = get(p)
    print('GET', p, s, body[:90].replace('\n', ' ') if p.startswith('/api') else '')
if SEC:
    for p in ['/api/cron/comeback?dry=1']:
        s, body = get(p, {'Authorization': 'Bearer ' + SEC})
        print('CRON', p, s, body[:300])

# 3. Browser: errori JavaScript su desktop e telefono, prenotazione
pages = ['/', '/servizi', '/prenota', '/team', '/galleria', '/recensioni', '/contatti', '/faq', '/journal', '/offerte', '/prodotti', '/prima-visita', '/link']
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, opts in [('desktop', {'viewport': {'width': 1366, 'height': 850}}),
                       ('telefono', {'viewport': {'width': 390, 'height': 844}, 'is_mobile': True, 'has_touch': True})]:
        ctx = b.new_context(**opts)
        pg = ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:150]))
        pg.on('console', lambda m: errs.append('console: ' + m.text[:150]) if m.type == 'error' else None)
        for path in pages:
            try:
                pg.goto(B + path, wait_until='load', timeout=60000)
                pg.wait_for_timeout(1500)
                if 'Application error' in pg.content(): errs.append(path + ' APPLICATION ERROR')
            except Exception as e:
                errs.append(path + ' ' + str(e)[:100])
        print(name.upper(), 'errori:', errs or 'nessuno')
        ctx.close()
    # prenotazione: arrivano gli orari?
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True)
    pg = ctx.new_page()
    pg.goto(B + '/prenota', wait_until='load', timeout=60000); pg.wait_for_timeout(2500)
    txt = pg.inner_text('body')
    print('PRENOTA testo iniziale:', txt[:200].replace('\n', ' | '))
    b.close()
