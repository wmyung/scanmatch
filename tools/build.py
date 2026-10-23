# Build the single-file app: python3 tools/build.py  → index.html
import json, csv, pathlib
R = pathlib.Path(__file__).resolve().parent.parent
S = R / 'src'
sample = list(csv.reader(open(R / 'samples' / 'sample.csv', encoding='utf-8-sig')))
app = (S / 'app.js').read_text(encoding='utf-8').replace('/*SAMPLE*/[]', json.dumps(sample, ensure_ascii=False))
out = (S / 'head.html').read_text(encoding='utf-8') + (S / 'engine.html').read_text(encoding='utf-8') + \
      '<script>\n' + (S / 'core.js').read_text(encoding='utf-8') + '\n' + app + '\n</script>\n</body>\n</html>\n'
(R / 'index.html').write_text(out, encoding='utf-8')
print('index.html', len(out.encode()))
