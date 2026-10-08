"""Shared clean-up for the cut-out dogs (make_dog_layers.py), so they
read as dogs standing in the scene rather than pasted pictures.

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
