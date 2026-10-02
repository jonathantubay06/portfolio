"""Shared clean-up for the photo cut-out dogs (make_dog_layers.py,
make_pup_layers.py), so they read as dogs standing in the scene rather
than pasted photos.

carve():  replaces flat edges (where the photo frame or a neighbour cut
          the dog off) with a drawn contour: a smooth curve through
          hand-picked points, a fur-strand jitter on the edge, and a
          slight darkening just inside it so the edge turns away like
          fur instead of ending like paper.
grade():  matches each cut-out to the scene light: a touch less
          saturation/contrast, navy lifted into the shadows, warm
          highlights, a thin warm rim on the right (the desk's warm
          light) and a cool one on top (the cyan ceiling light), and a
          soft ground darkening at the feet.
trim():   crops the bottom so the lowest paw sits on the card's edge.
shadow(): a contact-shadow texture for the floor plane under the card:
          a tight dark pad under every paw (paws higher in the photo are
          further back, so their pad goes behind the card by
          lift / tan(camera elevation)) plus a soft ambient pool.
Rows/cols are cut-out pixels (y down).
"""
import numpy as np
from scipy import ndimage

# shadow texture extent, in card widths: x +-SH_X, depth SH_F in front .. SH_B behind
SH_X, SH_F, SH_B = 0.7, 0.3, 0.9
DEPTH_PER_LIFT = 1.8          # 1 / tan(~29deg), the page camera's elevation


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def _curve(pts, n):
    """values along 0..n-1 from (pos, val) points (monotone pos), smoothed"""
    pts = sorted(pts)
    p = np.array([q[0] for q in pts], np.float32); v = np.array([q[1] for q in pts], np.float32)
    out = np.interp(np.arange(n), p, v)
    return ndimage.gaussian_filter1d(out, 3), p[0], p[-1]


def carve(img, curves, seed=1, fur=1.3):
    """curves: [(side, [(pos, edge), ...][, (lo, hi)]), ...]; side L/R: pos = row,
    edge = col (pixels left of / right of the edge go); T/B: pos = col, edge = row.
    (lo, hi) limits the carve to that col (L/R) or row (T/B) span."""
    rgb, a = img[:, :, :3].copy(), img[:, :, 3].copy()
    h, w = a.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    rng = np.random.default_rng(seed)
    shade = np.ones((h, w), np.float32)
    for cv in curves:
        side, pts = cv[0], cv[1]
        vert = side in 'LR'
        n = h if vert else w
        e, p0, p1 = _curve(pts, n)
        # fur: fine strands (per-row jitter) on a slow wobble
        jit = ndimage.gaussian_filter1d(rng.normal(0, 1, n), 1.1) * fur * 1.5 + np.sin(np.arange(n) * 0.21 + rng.uniform(0, 6)) * fur * 0.6
        pos = yy if vert else xx
        crd = xx if vert else yy
        E = (e + jit)[pos.astype(int)]
        d = (crd - E) if side in 'LT' else (E - crd)              # >0 inside the dog
        on = smooth(p0 - 1, p0 + 6, pos) * (1 - smooth(p1 - 6, p1 + 1, pos))
        if len(cv) > 2:
            lo, hi = cv[2]; on = on * smooth(lo - 2, lo, crd) * (1 - smooth(hi, hi + 2, crd))
        keep = smooth(-1.6 - fur * 0.4, 1.2, d)
        a = a * (1 - on + on * keep)
        shade = shade * (1 - on * 0.2 * (1 - smooth(0, 9, d)))
    return np.dstack([rgb * shade[..., None], a])


def trim(img, thr=0.5 * 255):
    """drop stray specks (bits under ~150 px apart from the dog), then crop
    the bottom to the lowest paw"""
    img = img.copy()
    lab, k = ndimage.label(img[:, :, 3] > 8)
    if k > 1:
        sizes = ndimage.sum(np.ones(lab.shape), lab, range(1, k + 1))
        img[:, :, 3] *= np.isin(lab, 1 + np.where(sizes >= 150)[0])
    rows = np.where((img[:, :, 3] > thr).any(1))[0]
    return img[:rows[-1] + 2]


def grade(img, rim_warm=0.55, rim_cool=0.4, sat=0.9, ground=0.2):
    rgb, a = img[:, :, :3] / 255.0, img[:, :, 3] / 255.0
    h, w = a.shape
    lum = (rgb @ np.array([0.2126, 0.7152, 0.0722]))[..., None]
    rgb = lum + (rgb - lum) * sat                                       # a touch less saturated
    rgb = 0.5 + (rgb - 0.5) * 0.94                                      # and contrast
    navy, warm = np.array([0.08, 0.12, 0.24]), np.array([1.0, 0.86, 0.72])
    sh = (1 - smooth(0.0, 0.55, lum)) * 0.22                            # navy into the shadows
    hi = smooth(0.6, 1.0, lum) * 0.08                                   # warm highlights
    rgb = rgb * (1 - sh) + navy * sh
    rgb = rgb * (1 - hi) + rgb * warm * hi
    # rim light: a thin band inside the silhouette, facing each light
    inside = ndimage.distance_transform_edt(a > 0.5)
    band = 1 - smooth(0.5, 5.0, inside)
    sa = ndimage.gaussian_filter(a, 3)
    gy, gx = np.gradient(sa)
    nl = np.hypot(gx, gy) + 1e-6
    nx, ny = -gx / nl, -gy / nl                                         # outward normal (y down)
    rw = band * np.clip(nx * 0.95 - ny * 0.3, 0, 1) * rim_warm
    rc = band * np.clip(-ny * 0.9 - nx * 0.4, 0, 1) * rim_cool
    rgb = rgb + rw[..., None] * np.array([1.0, 0.62, 0.32]) * 0.55 + rc[..., None] * np.array([0.45, 0.8, 1.0]) * 0.4
    # ground darkening: the bottom of the dog sits in the desk's shade
    rows = np.where((a > 0.5).any(1))[0]
    top, bot = rows[0], rows[-1]
    g = smooth(bot - (bot - top) * 0.12, bot, np.arange(h, dtype=np.float32))[:, None, None] * ground
    rgb = rgb * (1 - g) + navy * g * 0.5
    return np.dstack([np.clip(rgb, 0, 1) * 255, a * 255])


def shadow(img, feet, out_w=256):
    """feet: [(x0, x1), ...] column ranges of the paws that stand on the floor"""
    a = img[:, :, 3] / 255.0
    h, w = a.shape
    sol = a > 0.5
    low = np.array([np.where(sol[:, x])[0].max() if sol[:, x].any() else -1 for x in range(w)])
    bot = low.max()
    W = w                                                               # texture is in cut-out px first
    tw, th = int(round(W * 2 * SH_X)), int(round(W * (SH_F + SH_B)))
    yy, xx = np.mgrid[0:th, 0:tw].astype(np.float32)
    X = xx - tw / 2 + w / 2                                             # cut-out column
    D = SH_B * W - yy                                                   # depth behind the card (px)
    pads = np.zeros((th, tw), np.float32)
    ds = []
    for x0, x1 in feet:
        lift = bot - low[x0:x1].max()
        dep = max(0, lift) * DEPTH_PER_LIFT
        ds.append(dep)
        cx, rx = (x0 + x1) / 2, (x1 - x0) / 2 + 3
        ry = max(6, rx * 0.45)
        e = ((X - cx) / rx) ** 2 + ((D - dep) / ry) ** 2
        pads = np.maximum(pads, np.exp(-e * 2.2) * 0.95)
    xs = np.where(sol.any(0))[0]
    cx, rx = (xs[0] + xs[-1]) / 2, (xs[-1] - xs[0]) / 2 * 1.1
    dc = (min(ds) + max(ds)) / 2; ry = max(rx * 0.35, (max(ds) - min(ds)) / 2 + rx * 0.25)
    pool = np.exp(-(((X - cx) / rx) ** 2 + ((D - dc) / ry) ** 2) * 1.4) * 0.72
    s = 1 - (1 - ndimage.gaussian_filter(pads, 2.5)) * (1 - ndimage.gaussian_filter(pool, 6))
    out = np.zeros((th, tw, 4), np.float32); out[..., 3] = np.clip(s, 0, 1) * 255
    from PIL import Image
    im = Image.fromarray(out.astype(np.uint8), 'RGBA')
    return im.resize((out_w, max(8, round(out_w * th / tw))), Image.LANCZOS)
