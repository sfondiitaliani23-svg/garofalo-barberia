import json, glob
for f in sorted(glob.glob('lh-*.json'), key=lambda x: int(x[3:-5])):
    d=json.load(open(f)); a=d['audits']
    try: el=a['largest-contentful-paint-element']['details']['items'][0]['items'][0]['node'].get('selector','')
    except Exception: el='?'
    print(d['finalDisplayedUrl'].replace('https://barberiagarofalo.it','') or '/', '| perf', round(d['categories']['performance']['score']*100), '| LCP', a['largest-contentful-paint']['displayValue'], '|', el[:90])
