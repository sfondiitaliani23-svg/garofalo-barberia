import json, urllib.request
for i in (1,2,3):
    d=json.load(open(f'lh-servizi-{i}.json')); a=d['audits']
    el=a['largest-contentful-paint-element']['details']['items'][0]['items'][0]['node']
    print('servizi mobile run',i,'perf',round(d['categories']['performance']['score']*100),'LCP',a['largest-contentful-paint']['displayValue'],'| elemento:',el.get('selector'),'|',el.get('snippet','')[:160])
    ph=a['largest-contentful-paint-element']['details']['items'][1]['items'] if len(a['largest-contentful-paint-element']['details']['items'])>1 else []
    print('   fasi:', [(x.get('phase'), round(x.get('timing',0))) for x in ph])
req=urllib.request.Request('https://barberiagarofalo.it/api/presence', method='POST', data=b'')
print('presence anonimo ->', urllib.request.urlopen(req, timeout=30).status)
