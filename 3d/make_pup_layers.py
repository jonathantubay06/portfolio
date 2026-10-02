"""Split tex/<pup>-cutout.png (Mochi, Tofu, Pochi) into body, tail and two
front-paw layers, the same way make_dog_layers.py does Dumpling.

The cut-outs are rembg cuts of the dogs only (people and other dogs
masked off, a hand painted out of Mochi's shoulder). Before splitting,
cutout_fx carves the edges the photo frame / a neighbour cut flat
(Mochi's ear tip and left haunch, both sides of Tofu, Pochi's rump and
back paw) into fur contours, grades the coat to the scene light and
trims the card to the lowest paw; it also writes <pup>-shadow.png, the
contact shadow under the card.

Paws: each lower foreleg + paw is its own layer; the body keeps a
feathered overlap band under the layer's top edge, so a small lift or
tilt round the pivot (top of the layer) never opens a gap.
Tail: Pochi's real tail (standing side-on, tail up) is lifted off the
body above its base, with an overlap band. Mochi and Tofu sit facing the
camera, so their tails are not in the photo (a drawn one read as fake):
no tail layer.
Pivots / crop boxes are in cut-out pixels and mirrored in build_scene.py
(PUP_CUTS). Run: uv run --with pillow --with numpy --with scipy python 3d/make_pup_layers.py
"""
import os
import numpy as np
from PIL import Image
from cutout_fx import carve, trim, grade, shadow, smooth

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, 'tex')

# paw boxes (l, t, r, b) + pivot; tail: real box + pivot or None;
# carve: flat edges redrawn (side, [(row|col, edge)]); feet: paw columns on the floor
PUPS = {
    'mochi': dict(paws=(((50, 600, 136, 710), (92, 604)), ((164, 600, 254, 710), (208, 604))), tail=None, fur=1.2,
                  carve=[('L', [(405, 36), (420, 26), (440, 16), (465, 9), (495, 6), (525, 7), (548, 10), (565, 15), (580, 18), (592, 16), (602, 13)]),
                         ('R', [(52, 220), (62, 254), (75, 266), (90, 270), (105, 269), (120, 265), (132, 258), (142, 251), (150, 248)]),
                         ('R', [(236, 233), (260, 243), (290, 247), (330, 248), (370, 246), (410, 246), (450, 250), (490, 254), (530, 256), (565, 255), (595, 251), (615, 246), (632, 239), (640, 230)])],
                  feet=[(66, 136), (176, 246), (8, 60), (232, 258)]),
    'tofu': dict(paws=(((26, 470, 112, 590), (68, 474)), ((114, 470, 204, 590), (160, 474))), tail=None, fur=1.4,
                 carve=[('L', [(118, 31), (140, 31), (170, 33), (200, 34), (240, 31), (280, 28), (320, 27), (360, 27), (400, 26), (430, 22), (450, 16), (465, 11), (480, 8), (495, 9), (508, 13), (516, 20)]),
                        ('R', [(150, 238), (170, 229), (190, 220), (210, 211), (230, 199), (250, 192), (270, 188), (290, 187), (310, 190), (330, 195), (350, 201), (375, 204), (400, 206), (430, 206), (460, 205), (485, 204), (500, 202), (508, 197)])],
                 feet=[(40, 110), (130, 196), (8, 32)]),
    'pochi': dict(paws=(((84, 300, 168, 452), (140, 304)), ((170, 312, 240, 390), (215, 316))),
                  tail=dict(box=(208, 30, 316, 152), pivot=(282, 140)), fur=0.45,
                  carve=[('R', [(150, 299), (175, 307), (200, 314), (220, 316), (238, 313), (252, 305), (264, 293), (274, 284), (285, 286), (300, 292), (320, 296), (340, 299)]),
                         ('R', [(398, 316), (415, 319), (430, 320), (442, 320), (452, 318), (460, 314), (466, 308), (472, 300)]),
                         ('R', [(404, 133), (416, 133), (428, 130), (438, 126), (446, 120), (452, 113), (458, 106)], (100, 200))],
                  feet=[(90, 130), (288, 318)]),
}


def save(name, src, wgt, box=None):
    o = src.copy(); o[:, :, 3] = src[:, :, 3] * wgt
    if box:
        l, t, r, b = box; o = o[t:b, l:r]
    Image.fromarray(o.round().clip(0, 255).astype(np.uint8)).save(os.path.join(TEX, name), optimize=True)
    return o.shape[1], o.shape[0]


for n, cfg in PUPS.items():
    raw = np.array(Image.open(os.path.join(TEX, n + '-cutout.png')).convert('RGBA')).astype(np.float32)
    src = grade(trim(carve(raw, cfg['carve'], sum(map(ord, n)), cfg['fur'])))
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
    if tl:
        l, t, r, b = tl['box']
        tw = smooth(l, l + 8, xx) * (1 - smooth(b - 14, b - 2, yy))
        out['tail'] = save(f'{n}-tail.png', src, tw, tl['box'])
        body_w *= 1 - smooth(l + 8, l + 16, xx) * (1 - smooth(b - 26, b - 16, yy))
    elif os.path.exists(os.path.join(TEX, f'{n}-tail.png')):
        os.remove(os.path.join(TEX, f'{n}-tail.png'))
    out['body'] = save(f'{n}-body.png', src, body_w)
    shadow(src, cfg['feet']).save(os.path.join(TEX, f'{n}-shadow.png'), optimize=True)
    print(n, (w, h), out)
