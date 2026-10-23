# Generate fictional sample data and synthetic test photos (no real data anywhere).
#   python3 tools/make_samples.py     (needs: pip install ppf.datamatrix pillow)
import csv, pathlib, random
from ppf.datamatrix import DataMatrix
from PIL import Image, ImageDraw, ImageOps, ImageFilter, ImageFont
R = pathlib.Path(__file__).resolve().parent.parent
S = R / 'samples'; (S / 'photos').mkdir(parents=True, exist_ok=True)
rows = [['Barcode', 'Sample', 'Label', 'Position']]
for c in range(12):
    for r in range(8):
        n = c * 8 + r
        if n == 95: continue                       # last well (H12) left empty, like real kits
        rows.append([f'70{12345600 + n:08d}', f'DEMO-{n + 1:03d}', f'LBL-{n + 1:04d}', 'ABCDEFGH'[r] + f'{c + 1:02d}'])
with open(S / 'sample.csv', 'w', newline='', encoding='utf-8') as f: csv.writer(f).writerows(rows)

def dm(text, size, invert):
    m = DataMatrix(text).matrix; n = len(m); c = max(1, size // (n + 2))
    im = Image.new('L', ((n + 2) * c,) * 2, 255); g = ImageDraw.Draw(im)
    for y, row in enumerate(m):
        for x, v in enumerate(row):
            if v: g.rectangle([(x + 1) * c, (y + 1) * c, (x + 2) * c - 1, (y + 2) * c - 1], 0)
    return ImageOps.invert(im) if invert else im

def rack_photo(path, rot, missing=(), blur=0.8):
    W, H = 2400, 1700; img = Image.new('RGB', (W, H), (210, 205, 198)); d = ImageDraw.Draw(img)
    d.rounded_rectangle([140, 120, W - 140, H - 120], 30, fill=(225, 225, 222), outline=(160, 160, 160), width=6)
    pitch = 170; x0 = W // 2 - pitch * 11 / 2; y0 = H // 2 - pitch * 7 / 2
    by = {row[3]: row[0] for row in rows[1:]}
    for c in range(12):
        for r in range(8):
            cx, cy = int(x0 + c * pitch), int(y0 + r * pitch); pos = 'ABCDEFGH'[r] + f'{c + 1:02d}'
            d.ellipse([cx - 72, cy - 72, cx + 72, cy + 72], fill=(185, 185, 185))
            if pos not in by or pos in missing: continue
            d.ellipse([cx - 62, cy - 62, cx + 62, cy + 62], fill=(35, 35, 38))
            code = dm(by[pos], 78, True).rotate(random.Random(pos).uniform(-25, 25), expand=True, fillcolor=0)
            img.paste(code.convert('RGB'), (cx - code.width // 2, cy - code.height // 2), code.point(lambda v: 255 if v else 0).convert('L') if False else None)
    img = img.rotate(rot, expand=True, fillcolor=(120, 120, 120)).filter(ImageFilter.GaussianBlur(blur))
    img.save(path, quality=90)

def pair_photo(path, tube_row, label_row):
    img = Image.new('RGB', (1600, 1200), (200, 200, 196)); d = ImageDraw.Draw(img)
    d.ellipse([200, 300, 700, 800], fill=(40, 40, 40)); c = dm(tube_row[0], 260, True); img.paste(c.convert('RGB'), (450 - c.width // 2, 550 - c.height // 2))
    d.rounded_rectangle([850, 380, 1450, 720], 20, fill=(250, 250, 248)); l = dm(label_row[2], 220, False); img.paste(l.convert('RGB'), (880, 440))
    d.text((1130, 520), label_row[2], fill=(0, 0, 0))
    img.filter(ImageFilter.GaussianBlur(0.7)).save(path, quality=90)

random.seed(1)
rack_photo(S / 'photos' / 'rack_full.jpg', 0)
rack_photo(S / 'photos' / 'rack_rotated_missing.jpg', 90, missing={'B03', 'C07', 'F11', 'A12', 'G05'}, blur=1.4)
pair_photo(S / 'photos' / 'pair_match.jpg', rows[1], rows[1])
pair_photo(S / 'photos' / 'pair_mismatch.jpg', rows[1], rows[2])
print('rows', len(rows) - 1, 'photos', len(list((S / 'photos').glob('*.jpg'))))
