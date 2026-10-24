"""Make an AVIF twin for every WebP under img/ (Owner: Jojo, personal).

build.js wraps an <img> in <picture> with an AVIF <source> only when every
WebP it references has a twin, so a missing or skipped file just keeps the
WebP. A twin is only written when it is at least 10% smaller than the WebP.
img/hero3d is left out: its posters already sit in a <picture> that
31-hero-hotspots.js rewrites.

Run after adding or changing images:
    uv run --with pillow python make-avif.py
"""
from pathlib import Path
from PIL import Image

QUALITY = 60  # screenshots carry small text; lower blurs it
root = Path(__file__).parent / 'img'
made = kept = 0
saved = 0
for webp in sorted(root.rglob('*.webp')):
    if 'hero3d' in webp.parts:
        continue
    avif = webp.with_suffix('.avif')
    if avif.exists() and avif.stat().st_mtime >= webp.stat().st_mtime:
        kept += 1
        continue
    with Image.open(webp) as im:
        im.save(avif, 'AVIF', quality=QUALITY, speed=4)
    a, w = avif.stat().st_size, webp.stat().st_size
    if a > w * 0.9:
        avif.unlink()
        print(f'skip  {webp.relative_to(root)} (avif {a // 1024} KB vs webp {w // 1024} KB)')
        continue
    made += 1
    saved += w - a
print(f'{made} made, {kept} up to date, {saved // 1024} KB smaller in total')
