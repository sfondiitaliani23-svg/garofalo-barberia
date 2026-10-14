import urllib.request
from playwright.sync_api import sync_playwright
B='https://barberiagarofalo.it'
css=urllib.request.urlopen(B+'/',timeout=40).read().decode()
with sync_playwright() as p:
    b=p.chromium.launch()
    c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    c.add_init_script("const _mm=window.matchMedia;window.matchMedia=q=>q.includes('standalone')?{matches:true,addEventListener(){},removeEventListener(){}}:_mm.call(window,q);")
    pg=c.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)[:150]))
    for path in ['/','/contatti','/prenota','/galleria']:
        pg.goto(B+path,wait_until='load',timeout=60000); pg.wait_for_timeout(1500)
    print('dock presente:', pg.locator('.app-dock').count(), 'voci:', pg.locator('.app-tab').count(), 'tooltip:', pg.locator('.app-tab').first.get_attribute('data-tooltip'))
    print('viewport app:', pg.evaluate("document.querySelector('meta[name=viewport]').content"))
    print('errori:', errs)
    d=b.new_page(); d.goto(B+'/admin/dashboard',wait_until='load',timeout=60000); print('admin senza login ->', d.url)
    b.close()
