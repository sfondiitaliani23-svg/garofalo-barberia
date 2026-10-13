from playwright.sync_api import sync_playwright
B='https://barberiagarofalo.it'
IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    ctx=b.new_context(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True, user_agent=IOS); pg=ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(B+'/servizi', wait_until='load', timeout=60000); pg.wait_for_timeout(2000)
    print('head script presente:', 'gb-bip' in pg.content())
    pg.click('text=Accetta tutti', timeout=8000); pg.wait_for_timeout(4000)
    print('iPhone: messaggio installa ->', pg.locator('.ia-sheet').count())
    print('pulsante footer ->', pg.locator('footer button:has-text("Installa")').count())
    print('errori:', errs); b.close()
