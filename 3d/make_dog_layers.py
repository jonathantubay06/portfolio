"""Split tex/dumpling-cutout.png into a body layer and a tail-plume layer.

The plume sits mostly over the background, so the body just loses it (no
hole); a feathered overlap band at the tail base stays on both layers so
the seam hides in fur when the tail wags. Pivot (tail base) in source
pixels: PIVOT. The tail layer is cropped to TAIL_BOX.
Run: uv run --with pillow --with numpy python 3d/make_dog_layers.py
"""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, 'tex')
PIVOT = (318, 160)
TAIL_BOX = (232, 8, 436, 188)   # l, t, r, b


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


src = np.array(Image.open(os.path.join(TEX, 'dumpling-cutout.png')).convert('RGBA')).astype(np.float32)
h, w = src.shape[:2]
yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
a = src[:, :, 3]
in_x = smooth(228, 240, xx)                       # tail lives right of x~235
# right-hand plume tips droop to y~172; centre meets the rump at y~158
edge = 156 + 26 * smooth(372, 392, xx)
tail_w = in_x * (1 - smooth(edge - 6, edge + 8, yy))
body_w = 1 - in_x * (1 - smooth(edge - 14, edge - 2, yy))

body = src.copy(); body[:, :, 3] = a * body_w
tail = src.copy(); tail[:, :, 3] = a * tail_w
Image.fromarray(body.round().astype(np.uint8)).save(os.path.join(TEX, 'dumpling-body.png'), optimize=True)
l, t, r, b = TAIL_BOX
Image.fromarray(tail[t:b, l:r].round().astype(np.uint8)).save(os.path.join(TEX, 'dumpling-tail.png'), optimize=True)
print('body', w, h, 'tail', r - l, b - t)
