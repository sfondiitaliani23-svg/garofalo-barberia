from playwright.sync_api import sync_playwright
B='https://barberiagarofalo.it'
spy = """window.__evt=[]; const ob=navigator.sendBeacon.bind(navigator); navigator.sendBeacon=(u,d)=>{ if(String(u).includes('/api/evt')) window.__evt.push(String(u)); return ob(u,d); };"""
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(); ctx.add_init_script(spy); pg=ctx.new_page(); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(B+'/servizi', wait_until='load', timeout=60000); pg.wait_for_timeout(2000)
    pg.click('text=Accetta tutti', timeout=5000); pg.wait_for_timeout(1500)
    print('consenso:', pg.evaluate("localStorage.getItem('garofalo_cookie_consent')")[:60])
    pg.locator('a[href^="/prenota"]').first.click(); pg.wait_for_timeout(2500)
    print('beacon dopo Prenota (pagina nuova, conteggio precedente):', 'ok' )
    pg.goto(B+'/contatti', wait_until='load'); pg.wait_for_timeout(2000)
    pg.evaluate("document.querySelector('a[href^=\"tel:\"]').addEventListener('click', e=>e.preventDefault())")
    pg.locator('a[href^="tel:"]').first.click(); pg.wait_for_timeout(1500)
    print('beacon /api/evt su Chiama:', pg.evaluate('window.__evt.length'))
    print('errori:', errs[:3]); b.close()
