import re
from pathlib import Path

base = Path(__file__).resolve().parent.parent
footer = (base / 'partials' / 'footer.html').read_text(encoding='utf-8').strip()

for path in base.glob('*.html'):
    text = path.read_text(encoding='utf-8')
    new_text, count = re.subn(
        r'  <footer class="site-footer">.*?</footer>',
        footer,
        text,
        count=1,
        flags=re.DOTALL,
    )
    if count:
        path.write_text(new_text, encoding='utf-8')
        print('updated', path.name)
    else:
        print('MISS', path.name)