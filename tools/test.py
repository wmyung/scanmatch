# End-to-end check with the fictional samples:  python3 tools/test.py   (pip install playwright; set CHROME=/path/to/chrome or run `playwright install chromium`)
import os, sys, pathlib
from playwright.sync_api import sync_playwright
R = pathlib.Path(__file__).resolve().parent.parent
ok = True
def check(name, cond, got):
    global ok; ok &= bool(cond); print(('PASS ' if cond else 'FAIL ') + name + ' — ' + str(got))
with sync_playwright() as pw:
    kw = {'executable_path': os.environ['CHROME']} if os.environ.get('CHROME') else {}
    b = pw.chromium.launch(**kw); pg = b.new_context(viewport={'width': 1280, 'height': 860}, locale='en-US').new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto((R / 'index.html').as_uri()); pg.wait_for_function("document.getElementById('badge').style.display==='none'", timeout=60000)
    pg.click('#dataBtn'); pg.click('#dpSample'); pg.click('#dpClose')
    def shot(f):
        pg.set_input_files('#snap', str(R / 'samples' / 'photos' / f)); pg.wait_for_timeout(300)
        pg.wait_for_function("document.getElementById('busy').style.display==='none'", timeout=180000)
    shot('pair_match.jpg'); now = pg.inner_text('#now')
    check('scan finds the tube', 'DEMO-001' in now, now[:60].replace('\n', ' '))
    pg.click('#modeP'); pg.wait_for_timeout(200); shot('pair_match.jpg')
    check('pair: matching label → ○', 'Match' in pg.inner_text('#verdictT'), pg.inner_text('#verdictT').replace('\n', ' '))
    pg.wait_for_timeout(6500); shot('pair_mismatch.jpg')
    check('pair: wrong label → ✕', 'Mismatch' in pg.inner_text('#verdictT'), pg.inner_text('#verdictP').replace('\n', ' / '))
    pg.click('#modeK'); pg.wait_for_timeout(200)
    for f, need in [('rack_full.jpg', 'read 95'), ('rack_rotated_missing.jpg', 'estimated 5')]:
        shot(f); s = pg.inner_text('#sumL'); cells = pg.evaluate("[...document.querySelectorAll('table.rk td')].map(t=>t.title)")
        a1 = next((c for c in cells if c.startswith('A01 ')), ''); h12 = next((c for c in cells if c.startswith('H12 ')), '')
        check(f'rack {f}', need in s and '7012345600' in a1 and 'empty' in h12, s.replace('\n', ' '))
    check('no page errors', not errs, errs)
    b.close()
sys.exit(0 if ok else 1)
