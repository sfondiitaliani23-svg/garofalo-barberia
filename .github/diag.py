import time, urllib.request
from playwright.sync_api import sync_playwright
B='https://barberiagarofalo.it'
def ttfb(path, rsc=False):
    h={'User-Agent':'Mozilla/5.0 (Linux; Android 14) Mobile'}
    if rsc: h.update({'RSC':'1'})
    out=[]
    for _ in range(3):
        s=time.time(); r=urllib.request.urlopen(urllib.request.Request(B+path,headers=h),timeout=60); r.read(1); t1=time.time()-s; d=r.read(); out.append('%.2fs/%.2fs %dkB cache=%s'%(t1,time.time()-s,len(d)//1024,r.headers.get('x-vercel-cache')))
    return out
for p in ['/','/prenota','/contatti','/servizi','/area-cliente/dashboard','/login']:
    print('HTML',p,ttfb(p))
for p in ['/prenota','/contatti','/']:
    print('RSC ',p,ttfb(p,True))
with sync_playwright() as p:
    b=p.chromium.launch(); c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=2.5)
    c.add_init_script("""document.addEventListener('DOMContentLoaded',()=>document.documentElement.classList.add('is-app'));
    window.__lt=[];new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__lt.push(Math.round(e.duration)))).observe({type:'longtask',buffered:true});""")
    pg=c.new_page(); cdp=c.new_cdp_session(pg); cdp.send('Emulation.setCPUThrottlingRate',{'rate':4})
    slow=[]; st={}
    pg.on('request',lambda r:st.__setitem__(r.url,time.time()))
    pg.on('requestfinished',lambda r:slow.append('%.2fs %s'%(time.time()-st[r.url],r.url.replace(B,'')[:80])) if time.time()-st.get(r.url,time.time())>0.8 else None)
    s=time.time(); pg.goto(B+'/',wait_until='load',timeout=120000); print('home load %.1fs'%(time.time()-s))
    pg.wait_for_timeout(6000)
    try: pg.click('text=Accetta tutti',timeout=3000)
    except: pass
    lt=pg.evaluate('window.__lt'); print('home long tasks',len(lt),sum(lt),lt[:10])
    for name,sel in [('Contatti','h1'),('Prenota','text=Scegli'),('Home','.home-page'),('Prenota','text=Scegli'),('Contatti','h1')]:
        pg.evaluate('window.__lt=[]')
        s=time.time(); pg.click(f'.app-tab:has-text("{name}")')
        pg.wait_for_url('**/'+('' if name=='Home' else name.lower()),timeout=60000); t1=time.time()-s
        pg.wait_for_selector(sel,timeout=60000); pg.wait_for_timeout(300)
        print('tab %-9s url %.2fs  long tasks %s'%(name,t1,sum(pg.evaluate('window.__lt'))))
        pg.wait_for_timeout(1500)
    print('richieste lente:',slow[:25])
    # chi gira in continuo?
    cnt={}
    pg.on('request',lambda r:cnt.__setitem__(r.url.replace(B,'').split('?')[0],cnt.get(r.url.replace(B,'').split('?')[0],0)+1))
    pg.wait_for_timeout(30000); print('richieste in 30s da fermo:',cnt)
    b.close()
