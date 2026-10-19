import test from 'node:test';
import assert from 'node:assert/strict';
import { renderReviewRequestEmailHtml, reviewPageUrl } from '../lib/utils/email-templates.ts';

test('le cinque stelle portano a /recensioni/nuova con le stelle scelte', () => {
  const html = renderReviewRequestEmailHtml({ customerName: 'Marco Rossi', barberName: 'Luigi Garofalo' });
  for (let n = 1; n <= 5; n++) {
    assert.ok(html.includes(`/recensioni/nuova?stelle=${n}"`), `stella ${n}`);
  }
  assert.ok(html.includes('Lascia una recensione'));
  assert.ok(html.includes('Ciao Marco'));
});

test('indirizzo recensione: stelle fuori da 1-5 vengono ignorate', () => {
  assert.ok(reviewPageUrl(0).endsWith('/recensioni/nuova'));
  assert.ok(reviewPageUrl(6).endsWith('/recensioni/nuova'));
  assert.ok(reviewPageUrl(4).endsWith('/recensioni/nuova?stelle=4'));
});

test('il nome del cliente è protetto da HTML e il link per non riceverle compare solo se c\'è', () => {
  const a = renderReviewRequestEmailHtml({ customerName: '<script>x</script>' });
  assert.ok(!a.includes('<script>x'));
  assert.ok(!a.includes('Non inviarmele più'));
  const b = renderReviewRequestEmailHtml({ customerName: 'Anna', unsubscribeUrl: 'https://esempio.it/stop' });
  assert.ok(b.includes('https://esempio.it/stop'));
});
