from playwright.sync_api import sync_playwright
base='https://barberiagarofalo.it'
pages=['','servizi','galleria','recensioni','contatti','chi-siamo','login','prenota','registrati','area-cliente','admin/login','privacy','cookie']
with sync_playwright() as p:
    b=p.chromium.launch()
    for mobile in (False,True):
        ctx=b.new_context(viewport={'width':390,'height':844} if mobile else {'width':1366,'height':768}, is_mobile=mobile,
            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' if mobile else None)
        for path in pages:
            pg=ctx.new_page(); errs=[]
            pg.on('pageerror', lambda e, errs=errs: errs.append('PAGEERR '+str(e)+' | '+(e.stack or '')[:600]))
            pg.on('console', lambda m, errs=errs: errs.append('CONSOLE '+m.text[:400]) if m.type=='error' else None)
            try:
                r=pg.goto(f'{base}/{path}',wait_until='networkidle',timeout=60000)
                pg.wait_for_timeout(3000)
                try: pg.click('text=Solo necessari',timeout=1500); pg.wait_for_timeout(1000)
                except: pass
                app=pg.locator('text=Application error').count()
                st=r.status if r else '?'
            except Exception as e:
                errs.append('NAV '+str(e)[:200]); app='?'; st='?'
            print(('M ' if mobile else 'D ')+(path or '/'), st, 'APPERR' if app else 'ok')
            for e in errs: print('    ',e)
            pg.close()
    b.close()

import subprocess
print('--- memoria bloccata ---', flush=True)
subprocess.run(['python','.github/blocked.py','https://barberiagarofalo.it'])
