import os, json, urllib.request
B='https://barberiagarofalo.it'
req=urllib.request.Request(B+'/api/cron/comeback?dry=1', headers={'Authorization':'Bearer '+os.environ.get('CRON_SECRET','')})
try:
    r=urllib.request.urlopen(req, timeout=60); d=json.loads(r.read())
    # niente email o nomi completi nel log: solo conteggi e giorni
    print('ok:', d.get('ok'), '| candidati oggi:', d.get('count'), '| esclusi:', d.get('skipped'))
    for p in d.get('preview', [])[:10]: print('  -', p.get('daysSince'), 'giorni |', p.get('barber'), '|', ', '.join(p.get('services', [])))
except Exception as e: print('errore', e)
r=urllib.request.urlopen(B+'/api/promemoria/stop?e=eA&t=x', timeout=30); print('stop link non valido ->', r.status, 'Link non valido' in r.read().decode())
