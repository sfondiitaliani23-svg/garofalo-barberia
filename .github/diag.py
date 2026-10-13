import json, glob, os, re, urllib.request
from urllib.parse import urljoin, urlparse
print('=== LIGHTHOUSE ===')
fails = {}
for f in sorted(glob.glob('qa-out/lh*.json')):
    try: d = json.load(open(f))
    except Exception as e: print(f, 'ERR'); continue
    c = d['categories']; a = d['audits']
    s = ' '.join(f"{k[:4]}={round((c[k]['score'] or 0)*100)}" for k in c)
    print(os.path.basename(f)[2:-5].ljust(32), s, '| LCP', a['largest-contentful-paint']['displayValue'], '| CLS', a['cumulative-layout-shift']['displayValue'], '| TBT', a['total-blocking-time']['displayValue'])
    for k, au in a.items():
        if au.get('score') is not None and au['score'] < 0.9 and au.get('scoreDisplayMode') in ('binary','numeric','metricSavings'):
            fails.setdefault(k, {'title': au['title'], 'pages': set(), 'detail': ''})
            fails[k]['pages'].add(os.path.basename(f)[2:-5])
            items = (au.get('details') or {}).get('items') or []
            if items and not fails[k]['detail']:
                it = items[0]; fails[k]['detail'] = json.dumps({x: (str(it[x])[:160]) for x in list(it)[:3]}, ensure_ascii=False)
print('\n=== AUDIT SOTTO 90 ===')
for k, v in sorted(fails.items(), key=lambda x: -len(x[1]['pages'])):
    print(f"[{len(v['pages'])}] {k}: {v['title']} | {v['detail'][:300]}")
print('\n=== LINK ===')
B='https://barberiagarofalo.it'
sm = urllib.request.urlopen(B+'/sitemap.xml', timeout=30).read().decode()
urls = re.findall(r'<loc>([^<]+)</loc>', sm)
seen, bad = set(), []
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    links = set()
    for u in urls:
        try:
            r = pg.goto(u, wait_until='domcontentloaded', timeout=45000)
            if r.status >= 400: bad.append((r.status, u, 'sitemap'))
            for h in pg.eval_on_selector_all('a[href]', 'els => els.map(e => e.getAttribute("href"))'):
                full = urljoin(u, h)
                if urlparse(full).netloc.endswith('barberiagarofalo.it') and not full.startswith(B+'/api'):
                    links.add((full.split('#')[0], u))
        except Exception as e: bad.append(('ERR', u, str(e)[:80]))
    print('pagine in sitemap:', len(urls), '| link interni unici:', len({l for l,_ in links}))
    checked = {}
    for l, src in links:
        if l in checked: continue
        try:
            req = urllib.request.Request(l, method='GET', headers={'User-Agent': 'qa'})
            code = urllib.request.urlopen(req, timeout=30).status
        except urllib.error.HTTPError as e: code = e.code
        except Exception as e: code = 'ERR'
        checked[l] = code
        if code != 200 and code not in (301, 302, 307, 308): bad.append((code, l, src))
    print('link rotti:', len(bad))
    for x in bad[:30]: print('  ', x)
    # axe
    print('\n=== ACCESSIBILITA (axe) ===')
    axe = urllib.request.urlopen('https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js', timeout=30).read().decode()
    agg = {}
    for path in ['/', '/servizi', '/prenota', '/contatti', '/journal', '/team', '/faq', '/link', '/login']:
        for vp in ({'width': 390, 'height': 844}, {'width': 1366, 'height': 900}):
            pg.set_viewport_size(vp); pg.goto(B+path, wait_until='load', timeout=60000); pg.wait_for_timeout(1500)
            pg.add_script_tag(content=axe)
            res = pg.evaluate("async () => (await axe.run(document, {resultTypes:['violations']})).violations.map(v => ({id:v.id, impact:v.impact, help:v.help, n:v.nodes.length, t:v.nodes[0].target.join(' '), h:v.nodes[0].html.slice(0,140)}))")
            for v in res:
                a = agg.setdefault(v['id'], {'impact': v['impact'], 'help': v['help'], 'pages': set(), 'n': 0, 'ex': v['t'] + ' :: ' + v['h']})
                a['pages'].add(path); a['n'] += v['n']
    for k, v in sorted(agg.items(), key=lambda x: -x[1]['n']):
        print(f"{v['impact']:9} {k} ({v['n']} elementi, pagine {sorted(v['pages'])}): {v['help']} | es: {v['ex'][:220]}")
    b.close()
