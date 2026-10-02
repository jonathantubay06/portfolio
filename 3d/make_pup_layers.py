"""Split tex/<pup>-cutout.png (Mochi, Tofu, Pochi) into body, tail and two
front-paw layers, the same way make_dog_layers.py does Dumpling.

The cut-outs are rembg cuts of the dogs only (people and other dogs
masked off, a hand painted out of Mochi's shoulder). Before splitting,
cutout_fx carves the edges the photo frame / a neighbour cut flat
(Mochi's ear tip, left haunch and right side, both sides of Tofu; Tofu's
missing right haunch is his left one mirrored) into fur contours, grades the coat to the scene light and
trims the card to the lowest paw; it also writes <pup>-shadow.png, the
contact shadow under the card.

Paws: each lower foreleg + paw is its own layer; the body keeps a
feathered overlap band under the layer's top edge, so a small lift or
tilt round the pivot (top of the layer) never opens a gap.
Tails: none of the three photos shows a usable tail (Mochi and Tofu sit
facing the camera, Pochi lies on his), and a drawn one read as fake, so
there is no tail layer (the code still splits one off if 'tail' is set).
Pivots / crop boxes are in cut-out pixels and mirrored in build_scene.py
(PUP_CUTS). Run: uv run --with pillow --with numpy --with scipy python 3d/make_pup_layers.py
"""
import os
import numpy as np
from PIL import Image
from cutout_fx import carve, trim, grade, shadow, smooth, extend, ghost_leg

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, 'tex')

# paw boxes (l, t, r, b) + pivot; tail: real box + pivot or None;
# carve: flat edges redrawn (side, [(row|col, edge)]); feet: paw columns on the floor
PUPS = {
    'mochi': dict(paws=(((50, 600, 136, 710), (92, 604)), ((164, 600, 254, 710), (208, 604))), tail=None, fur=1.6,
                  carve=[('L', [(405, 36), (420, 26), (440, 16), (465, 9), (495, 6), (525, 7), (548, 10), (565, 15), (580, 18), (592, 16), (602, 13)]),
                         ('R', [(52, 220), (62, 254), (75, 266), (90, 270), (105, 269), (120, 265), (132, 258), (142, 251), (150, 248)]),
                         ('R', [(236, 233), (270, 243), (310, 241), (350, 236), (390, 236), (430, 242), (470, 250), (510, 256), (545, 257), (575, 254), (600, 248), (620, 242), (634, 236), (642, 230)])],
                  feet=[(66, 136), (176, 246), (8, 60), (232, 258)]),
    'tofu': dict(paws=(((26, 470, 112, 590), (68, 474)), ((114, 470, 204, 590), (160, 474))), tail=None, fur=1.4,
                 carve=[('L', [(118, 31), (140, 31), (170, 33), (200, 34), (240, 31), (280, 28), (320, 27), (360, 27), (400, 26), (430, 22), (450, 16), (465, 11), (480, 8), (495, 9), (508, 13), (516, 20)]),
                        ('R', [(150, 238), (170, 229), (190, 220), (210, 211), (230, 199), (250, 192), (270, 188), (290, 187), (310, 190), (330, 195), (350, 201), (375, 204), (400, 206), (430, 206), (460, 205), (485, 204), (500, 202), (508, 197)])],
                 leg=((0, 400, 50, 520), 178, 0, 0.9, True),   # right haunch: the left one mirrored
                 feet=[(40, 110), (130, 196), (8, 32), (200, 222)]),
    # Pochi lying down (front paws out, all four legs in the photo; tail hidden behind him)
    'pochi': dict(paws=(((40, 212, 92, 262), (66, 216)), ((88, 212, 140, 262), (114, 216))), fur=0.45,
                  tail=dict(file='pochi-tail-cutout.png'), carve=[('B', [(176, 213), (200, 212), (230, 212), (262, 211)], (195, 240)), ('B', [(38, 249), (64, 251), (90, 250), (116, 251), (140, 249)], (232, 262))], feet=[(45, 90), (92, 135), (268, 300), (300, 330)]),
}


def save(name, src, wgt, box=None):
    o = src.copy(); o[:, :, 3] = src[:, :, 3] * wgt
    if box:
        l, t, r, b = box; o = o[t:b, l:r]
    Image.fromarray(o.round().clip(0, 255).astype(np.uint8)).save(os.path.join(TEX, name), optimize=True)
    return o.shape[1], o.shape[0]


for n, cfg in PUPS.items():
    raw = np.array(Image.open(os.path.join(TEX, n + '-cutout.png')).convert('RGBA')).astype(np.float32)
    raw = carve(raw, cfg['carve'], sum(map(ord, n)), cfg['fur'])
    if cfg.get('extend'):                                   # rebuild a haunch the photo cut off
        raw = extend(raw, cfg['extend'], fur=cfg['fur'], lo=cfg.get('extend_lo', 0))
    if cfg.get('leg'):                                      # far hind leg / missing haunch from its twin
        raw = ghost_leg(raw, *cfg['leg'])
    src = grade(trim(raw))
    h, w = src.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    body_w = np.ones((h, w), np.float32)
    out = {'h': h}
    for side, (box, pv) in zip('lr', cfg['paws']):
        l, t, r, b = box
        inx = smooth(l, l + 8, xx) * (1 - smooth(r - 8, r, xx))
        pw = inx * smooth(t, t + 12, yy)                        # opaque from t+12 down
        out[side] = save(f'{n}-paw-{side}.png', src, pw, (l, t, r, min(b, h)))
        body_w *= 1 - smooth(l + 10, l + 18, xx) * (1 - smooth(r - 18, r - 10, xx)) * smooth(t + 26, t + 40, yy)
    tl = cfg['tail']
    if tl and tl.get('file'):        # tail lifted from another photo of him (it hides in this one)
        tsrc = grade(np.array(Image.open(os.path.join(TEX, tl['file'])).convert('RGBA')).astype(np.float32))
        Image.fromarray(tsrc.round().clip(0, 255).astype(np.uint8)).save(os.path.join(TEX, f'{n}-tail.png'), optimize=True)
        out['tail'] = tsrc.shape[1::-1]
    elif tl:
        l, t, r, b = tl['box']
        tw = smooth(l, l + 8, xx) * (1 - smooth(b - 14, b - 2, yy))
        out['tail'] = save(f'{n}-tail.png', src, tw, tl['box'])
        body_w *= 1 - smooth(l + 8, l + 16, xx) * (1 - smooth(b - 26, b - 16, yy))
    elif os.path.exists(os.path.join(TEX, f'{n}-tail.png')):
        os.remove(os.path.join(TEX, f'{n}-tail.png'))
    out['body'] = save(f'{n}-body.png', src, body_w)
    shadow(src, cfg['feet']).save(os.path.join(TEX, f'{n}-shadow.png'), optimize=True)
    print(n, (w, h), out)
