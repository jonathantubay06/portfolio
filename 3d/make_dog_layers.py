"""Split tex/dumpling-cutout.png into body, tail-plume and two front-paw layers.

tex/dumpling-cutout.png (466x586) is a rembg cut of the play-bow panel of
the Dumpling reference sheet, cropped wide enough that both front paws are
whole (largest alpha component kept, so no stray quilt specks).

Tail: the plume sits mostly over the background, so the body just loses it
(no hole); a feathered overlap band at the tail base stays on both layers
so the seam hides in fur when the tail wags.
Paws: each forearm + paw is its own layer from just below the chest down;
the body keeps a feathered overlap band under each layer's top edge, so a
small pat/tilt round the pivot (near the elbow) never opens a gap.
Before splitting, cutout_fx grades the coat to the scene light and trims
the card to the lowest paw; it also writes dumpling-shadow.png (contact
shadow pads under the paws, the hind paw's set further back).
Pivots / crop boxes are in source pixels and mirrored in build_scene.py.
Run: uv run --with pillow --with numpy --with scipy python 3d/make_dog_layers.py
"""
import os
import numpy as np
from PIL import Image
from cutout_fx import trim, grade, shadow

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, 'tex')
PIVOT = (336, 172)               # tail base
TAIL_BOX = (250, 0, 466, 204)    # l, t, r, b
PAW_L_PIVOT, PAW_L_BOX = (100, 478), (0, 456, 176, 586)
PAW_R_PIVOT, PAW_R_BOX = (262, 482), (150, 460, 380, 586)
PAW_SPLIT = 160                  # x between the two forearms
PAW_TOP = 478                    # paw layers start fading in here


from cutout_fx import smooth


src = grade(trim(np.array(Image.open(os.path.join(TEX, 'dumpling-cutout.png')).convert('RGBA')).astype(np.float32)))
FEET = [(24, 150), (170, 262), (384, 456)]   # paw columns on the book
h, w = src.shape[:2]
yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
a = src[:, :, 3]

in_x = smooth(246, 258, xx)                       # tail lives right of x~252
edge = 166 + 26 * smooth(390, 410, xx)            # plume underside, droops at the right
tail_w = in_x * (1 - smooth(edge - 6, edge + 8, yy))
body_w = 1 - in_x * (1 - smooth(edge - 22, edge - 10, yy))   # body fades only under solid tail (no see-through seam)

# front legs: left of the back leg (x<372), below the chest
fore = 1 - smooth(366, 378, xx)
side_l = 1 - smooth(PAW_SPLIT + 4, PAW_SPLIT + 16, xx)   # layers overlap ~20 px at the split
side_r = smooth(PAW_SPLIT - 16, PAW_SPLIT - 4, xx) * fore
paw_in = smooth(PAW_TOP, PAW_TOP + 14, yy)        # paw layers: opaque from ~492 down
paw_l_w, paw_r_w = paw_in * side_l, paw_in * side_r
body_w = body_w * (1 - fore * smooth(PAW_TOP + 30, PAW_TOP + 50, yy))   # body overlap ~492-528


def save(name, wgt, box=None):
    o = src.copy(); o[:, :, 3] = a * wgt
    if box:
        l, t, r, b = box; o = o[t:b, l:r]
    Image.fromarray(o.round().astype(np.uint8)).save(os.path.join(TEX, name), optimize=True)
    return o.shape[1], o.shape[0]


shadow(src, FEET).save(os.path.join(TEX, 'dumpling-shadow.png'), optimize=True)
print('size', (w, h), 'body', save('dumpling-body.png', body_w),
      'tail', save('dumpling-tail.png', tail_w, TAIL_BOX),
      'paw_l', save('dumpling-paw-l.png', paw_l_w, PAW_L_BOX),
      'paw_r', save('dumpling-paw-r.png', paw_r_w, PAW_R_BOX))
