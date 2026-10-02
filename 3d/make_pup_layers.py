"""Split tex/<pup>-cutout.png (Mochi, Tofu, Pochi) into body, tail and two
front-paw layers, the same way make_dog_layers.py does Dumpling.

The cut-outs are rembg cuts of the dogs only (people and other dogs
masked off, a hand painted out of Mochi's shoulder).

Paws: each lower foreleg + paw is its own layer; the body keeps a
feathered overlap band under the layer's top edge, so a small lift or
tilt round the pivot (top of the layer) never opens a gap.
Tail: Pochi's real tail (standing side-on, tail up) is lifted off the
body above its base, with an overlap band. Mochi and Tofu sit facing
the camera, so their tails are not in the photo: a short tail is drawn
from their own coat (Mochi tan with a white tip, Tofu a cream plume)
and sits BEHIND the body (pivot hidden behind the hip), peeking out.
Pivots / crop boxes are in cut-out pixels and mirrored in build_scene.py
(PUP_CUTS). Run: uv run --with pillow --with numpy python 3d/make_pup_layers.py
"""
import os
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, 'tex')

# paw boxes (l, t, r, b) + pivot; tail: 'real' box + pivot, or 'drawn'
PUPS = {
    'mochi': dict(paws=(((50, 600, 136, 710), (92, 604)), ((164, 600, 254, 710), (208, 604))),
                  tail=dict(kind='drawn', size=(110, 120), pivot=(14, 104), fur=(10, 470, 40, 560),
                            path=[(14, 104), (45, 95), (72, 72), (88, 42), (92, 16)], w=(21, 10), tip=(250, 240, 228), tipfrac=0.3)),
    'tofu': dict(paws=(((26, 470, 112, 590), (68, 474)), ((114, 470, 204, 590), (160, 474))),
                 tail=dict(kind='drawn', size=(120, 110), pivot=(106, 94), fur=(70, 270, 130, 350),
                           path=[(106, 94), (80, 88), (52, 74), (30, 52), (18, 26)], w=(25, 16), tip=None, fluff=True)),
    'pochi': dict(paws=(((84, 300, 168, 452), (140, 304)), ((170, 312, 240, 390), (215, 316))),
                  tail=dict(kind='real', box=(208, 30, 316, 152), pivot=(282, 140))),
}


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def save(name, src, wgt, box=None):
    o = src.copy(); o[:, :, 3] = src[:, :, 3] * wgt
    if box:
        l, t, r, b = box; o = o[t:b, l:r]
    Image.fromarray(o.round().clip(0, 255).astype(np.uint8)).save(os.path.join(TEX, name), optimize=True)
    return o.shape[1], o.shape[0]


def drawn_tail(src, cfg, seed):
    """A tapered tail along cfg['path'], filled with a patch of the coat."""
    W, H = cfg['size']
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    pts = np.array(cfg['path'], np.float32)
    seg = np.diff(pts, axis=0); L = np.r_[0, np.cumsum(np.hypot(*seg.T))]
    d = np.full((H, W), 1e9, np.float32); s = np.zeros((H, W), np.float32)
    for i in range(len(seg)):
        p, v = pts[i], seg[i]; ll = (v ** 2).sum()
        u = np.clip(((xx - p[0]) * v[0] + (yy - p[1]) * v[1]) / ll, 0, 1)
        dd = np.hypot(xx - p[0] - u * v[0], yy - p[1] - u * v[1])
        m = dd < d; d[m] = dd[m]; s[m] = (L[i] + u * np.sqrt(ll))[m] / L[-1]
    w0, w1 = cfg['w']
    rad = w0 + (w1 - w0) * s ** 0.8
    if cfg.get('fluff'):
        rad = rad * (1 + 0.22 * np.sin(s * 40 + rng.uniform(0, 6)) * np.sin(np.arctan2(yy - H / 2, xx - W / 2) * 7))
    a = smooth(rad + 1.5, rad - 1.5, d)
    # coat: tile the fur patch along the tail (rotated 90deg so strands run lengthwise)
    l, t, r, b = cfg['fur']
    patch = src[t:b, l:r, :3]
    patch = np.rot90(patch) if patch.shape[0] > patch.shape[1] else patch
    reps = (H // patch.shape[0] + 2, W // patch.shape[1] + 2, 1)
    rgb = np.tile(patch, reps)[:H, :W].astype(np.float32)
    shade = 0.82 + 0.18 * np.clip(1 - d / np.maximum(rad, 1), 0, 1)        # rounder: darker edges
    rgb = rgb * shade[..., None]
    if cfg.get('tip'):
        tw = smooth(1 - cfg['tipfrac'] - 0.06, 1 - cfg['tipfrac'] + 0.06, s)[..., None]
        rgb = rgb * (1 - tw) + np.array(cfg['tip'], np.float32) * shade[..., None] * tw
    out = np.dstack([rgb, a * 255])
    im = Image.fromarray(out.clip(0, 255).astype(np.uint8), 'RGBA')
    return im.filter(ImageFilter.GaussianBlur(0.6))


for n, cfg in PUPS.items():
    src = np.array(Image.open(os.path.join(TEX, n + '-cutout.png')).convert('RGBA')).astype(np.float32)
    h, w = src.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    body_w = np.ones((h, w), np.float32)
    out = {}
    for side, (box, pv) in zip('lr', cfg['paws']):
        l, t, r, b = box
        inx = smooth(l, l + 8, xx) * (1 - smooth(r - 8, r, xx))
        pw = inx * smooth(t, t + 12, yy)                        # opaque from t+12 down
        out[side] = save(f'{n}-paw-{side}.png', src, pw, box)
        body_w *= 1 - smooth(l + 10, l + 18, xx) * (1 - smooth(r - 18, r - 10, xx)) * smooth(t + 26, t + 40, yy)
    tl = cfg['tail']
    if tl['kind'] == 'real':
        l, t, r, b = tl['box']
        tw = smooth(l, l + 8, xx) * (1 - smooth(b - 14, b - 2, yy))
        out['tail'] = save(f'{n}-tail.png', src, tw, tl['box'])
        body_w *= 1 - smooth(l + 8, l + 16, xx) * (1 - smooth(b - 26, b - 16, yy))
    else:
        im = drawn_tail(src, tl, sum(map(ord, n)))
        im.save(os.path.join(TEX, f'{n}-tail.png'), optimize=True); out['tail'] = im.size
    out['body'] = save(f'{n}-body.png', src, body_w)
    print(n, (w, h), out)
