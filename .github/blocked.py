import sys
from playwright.sync_api import sync_playwright
base=sys.argv[1]
js="""for (const k of ['localStorage','sessionStorage']) Object.defineProperty(window,k,{get(){throw new DOMException("The operation is insecure.","SecurityError")}});"""
js2="""try{delete Crypto.prototype.randomUUID}catch(e){}"""
with sync_playwright() as p:
    b=p.chromium.launch()
    for name,script in (('storage bloccato',js),('iPhone vecchio (no randomUUID)',js2)):
        ctx=b.new_context(); ctx.add_init_script(script)
        for path in ['','servizi','prenota','login']:
            pg=ctx.new_page(); errs=[]
            pg.on('pageerror', lambda e, errs=errs: errs.append(str(e)[:120]))
            pg.goto(f'{base}/{path}',wait_until='networkidle',timeout=60000); pg.wait_for_timeout(2000)
            print(name, path or '/', 'APPERR' if pg.locator('text=Application error').count() else 'ok', errs[:2])
            pg.close()
    b.close()
