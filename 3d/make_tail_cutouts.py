"""Cut Mochi's and Tofu's real tails out of photos of them and write
tex/mochi-tail-cutout.png / tex/tofu-tail-cutout.png (card px, ready for
make_pup_layers.py, which grades them like the bodies).

Neither hero cut-out shows its tail (both sit facing the camera), so the
tails come from the reference photos in Pictures/Personal/Doggos/Clear:
  Mochi: 'mochi - biggest.jpeg', his white curl (tan at the base) rising
         over his rump at the top right, against the dark green door.
  Tofu:  'tofu 2nd biggest.jpeg', his plush golden tail lying out to the
         right of his sitting body on the grey tiles.
rembg finds nothing in these crops (no subject), so the matte is a colour
key (bright fur vs dark door / warm fur vs grey tiles) inside a hand
drawn region; the cut into the rump is hidden behind the body card.
Edge clean-up: fringe pixels take the colour of the nearby solid fur
(normalised blur), so no door-green / tile-grey halo survives; the coat
is colour-matched to the cut-out (mean/std or white-point gain).
Only these crops land in the project, never the source photos.
Run: uv run --with pillow --with numpy --with scipy python 3d/make_tail_cutouts.py
"""
import math
import os
import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage
from cutout_fx import smooth

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, 'tex')
SRC = os.path.expanduser(r'~/Pictures/Personal/Doggos/Clear')


def load(name, box):
    im = ImageOps.exif_transpose(Image.open(os.path.join(SRC, name))).convert('RGB').crop(box)
    return np.array(im).astype(np.float32) / 255


def ell(xx, yy, cx, cy, rx, ry, soft):
    d = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2)
    return 1 - smooth(1 - soft, 1 + soft, d)


def defringe(rgb, a, sig=4):
    """fringe colour <- normalised blur of the solid fur round it"""
    w = (a > 0.92).astype(np.float32)
    num = np.dstack([ndimage.gaussian_filter(rgb[..., c] * w, sig) for c in range(3)])
    den = ndimage.gaussian_filter(w, sig)[..., None] + 1e-6
    fill = num / den
    k = (1 - smooth(0.92, 0.99, a))[..., None]
    return rgb * (1 - k) + fill * k


def finish(rgb, a, flip, angle, scale, base, out):
    """flip / rotate / scale (premultiplied), trim, save; returns size and the base px"""
    pm = np.dstack([rgb * a[..., None], a])
    im = Image.fromarray((pm * 255).round().clip(0, 255).astype(np.uint8), 'RGBA')
    bx, by = base
    if flip:
        im = ImageOps.mirror(im); bx = im.width - 1 - bx
    w0, h0 = im.size
    im = im.rotate(angle, Image.BICUBIC, expand=True)
    t = math.radians(angle); dx, dy = bx - w0 / 2, by - h0 / 2
    bx, by = im.width / 2 + dx * math.cos(t) + dy * math.sin(t), im.height / 2 - dx * math.sin(t) + dy * math.cos(t)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    bx, by = bx * scale, by * scale
    l, t_, r, b = im.getbbox()
    im = im.crop((l, t_, r, b))
    p = np.array(im).astype(np.float32) / 255
    al = p[..., 3:]
    p[..., :3] = np.where(al > 1e-3, p[..., :3] / np.maximum(al, 1e-3), 0)   # un-premultiply
    Image.fromarray((p * 255).round().clip(0, 255).astype(np.uint8), 'RGBA').save(os.path.join(TEX, out), optimize=True)
    print(out, im.size, 'base px', (round(bx - l), round(by - t_)))


# ── Mochi: white curl, tan base, over the rump (crop of the 3024x2490 photo)
rgb = load('mochi - biggest.jpeg', (1900, 0, 2600, 800))
h, w = rgb.shape[:2]
yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
v = rgb.max(2); rb = rgb[..., 0] - rgb[..., 2]
key = np.maximum(smooth(0.36, 0.58, v), smooth(0.05, 0.12, rb) * smooth(0.22, 0.32, v))
a = key * ell(xx, yy, 352, 218, 250, 188, 0.05)
a *= 1 - ell(xx, yy, 354, 262, 88, 70, 0.08)                      # the hole of the curl
a *= 1 - ell(xx, yy, 362, 318, 92, 46, 0.1)                       # and the pale thing seen through it
a *= smooth(40, 60, yy)                                            # another dog's legs above
rump = np.interp(xx[0], [0, 100, 200, 300, 400, 480, 560, 700], [420, 375, 350, 340, 345, 365, 410, 470])
a *= 1 - smooth(rump - 8, rump + 2, yy)                            # the rump (hidden behind the body)
# keep the rise and the top of the curl; the far arm falling back to his
# rump ends in a wispy tip (strand jitter) so it reads as a hook, not a ring
tip = 205 + ndimage.gaussian_filter1d(np.random.default_rng(3).normal(0, 1, w), 1.5) * 10
a *= 1 - smooth(tip - 12, tip + 34, yy) * (1 - smooth(290, 330, xx))
a = ndimage.gaussian_filter(a, 1.2)
lab, n = ndimage.label(a > 0.5)
if n > 1:
    big = 1 + np.argmax(ndimage.sum(np.ones_like(a), lab, range(1, n + 1)))
    a *= ndimage.gaussian_filter((lab == big).astype(np.float32), 2) > 0.02
rgb = defringe(rgb, a)
bright = (a > 0.95) & (v > 0.75)
gain = np.array([0.988, 0.951, 0.871]) / rgb[bright].mean(0)     # white point -> Mochi's cream
rgb = np.clip(rgb * gain, 0, 1)
# base = the tan right arm where it meets the rump; mirrored so the curl
# rises behind his right hip and curls out over it
finish(rgb, a, True, 22, 0.36, (500, 395), 'mochi-tail-cutout.png')

# ── Tofu: plush tail out to the right of him (crop of the 3024x4032 photo)
rgb = load('tofu 2nd biggest.jpeg', (2000, 2000, 3024, 3400))
h, w = rgb.shape[:2]
yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
v = rgb.max(2); rb = rgb[..., 0] - rgb[..., 2]
key = smooth(0.05, 0.11, rb) * smooth(0.36, 0.48, v)
under = np.interp(xx[0], [290, 400, 500, 600, 700, 850], [605, 597, 580, 552, 512, 470])   # plume underside
under = under + ndimage.gaussian_filter1d(np.random.default_rng(7).normal(0, 1, w), 1.5) * 9 - 6   # fur strands, not a cut
region = smooth(285, 300, xx) * (1 - smooth(830, 850, xx)) * smooth(110, 130, yy) * (1 - smooth(under, under + 14, yy))
a = key * region
solid = ndimage.binary_fill_holes(ndimage.binary_closing(a > 0.5, iterations=6))
solid = ndimage.binary_erosion(solid, iterations=3)               # grout / shadow specks inside the plume
a = ndimage.gaussian_filter(np.maximum(a, solid * region), 1.2)
lab, n = ndimage.label(a > 0.5)
if n > 1:
    big = 1 + np.argmax(ndimage.sum(np.ones_like(a), lab, range(1, n + 1)))
    a *= ndimage.gaussian_filter((lab == big).astype(np.float32), 2) > 0.02
rgb = defringe(rgb, a)
m = a > 0.95
ref_mu, ref_sd = np.array([0.925, 0.708, 0.539]), np.array([0.068, 0.107, 0.118])
mu, sd = rgb[m].mean(0), rgb[m].std(0)
rgb = np.clip((rgb - mu) / sd * ref_sd + mu + (ref_mu - mu), 0, 1)
finish(rgb, a, False, 0, 0.37, (285, 500), 'tofu-tail-cutout.png')
