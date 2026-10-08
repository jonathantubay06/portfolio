"""Split tex/dumpling-cutout.png into body, tail-plume and two front-paw layers.

tex/dumpling-cutout.png (315x427) is the approved Pixar-style still of
Dumpling (Personal Works/Dumpling and sibs/Social media/pixar-characters/
dumpling-fullbody_flux2-klein-4b-pixar_1024x1024.jpg: standing, 3/4 to
the left, tail plume up on the right), cut with rembg (isnet + alpha
matting), cropped to (209, 76, 883, 991) and scaled 0.467 so she stands
~0.2 world units tall (smaller than Tofu and Mochi). Regenerate it with
  uv run --python 3.11 --with "rembg[cpu]" --with pillow --with numpy --with scipy python 3d/make_dog_layers.py --cut <jpg>
(2026-10-08: the photo cut-out read as pasted onto the cartoon desk).

Tail: the plume over the rump is cut along the back line; the body keeps
a feathered band under it so the seam hides in fur when the tail wags.
Paws: each front leg below the chest is its own layer, pivot at the
elbow; the body keeps a feathered overlap band under each layer's top
edge, so a small pat round the pivot never opens a gap. The far hind
leg and the near hind leg stay on the body.
cutout_fx grades the coat (lightly: the still is already studio lit) and
trims the card to the lowest paw; it also writes dumpling-shadow.png.
Pivots / crop boxes are in cut-out pixels and mirrored in build_scene.py.
Run: uv run --with pillow --with numpy --with scipy python 3d/make_dog_layers.py
"""
import os
import sys
import numpy as np
from PIL import Image
from cutout_fx import trim, grade, shadow, smooth

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, 'tex')
CROP, SCALE = (209, 76, 883, 991), 0.467

if '--cut' in sys.argv:
    from rembg import remove, new_session
    im = Image.open(sys.argv[sys.argv.index('--cut') + 1]).convert('RGB')
    cut = remove(im, session=new_session('isnet-general-use'), alpha_matting=True,
                 alpha_matting_foreground_threshold=240, alpha_matting_background_threshold=20,
                 alpha_matting_erode_size=8).crop(CROP)
    cut.resize((round(cut.width * SCALE), round(cut.height * SCALE)), Image.LANCZOS).save(os.path.join(TEX, 'dumpling-cutout.png'), optimize=True)

TAIL_PIVOT, TAIL_BOX = (222, 182), (196, 108, 315, 258)   # l, t, r, b
PAW_L_PIVOT, PAW_L_BOX = (80, 322), (30, 306, 124, 427)
PAW_R_PIVOT, PAW_R_BOX = (142, 318), (96, 300, 192, 427)
PAW_SPLIT = 112                  # x between the two forelegs
PAW_TOP = 318                    # paw layers start fading in here

raw = np.array(Image.open(os.path.join(TEX, 'dumpling-cutout.png')).convert('RGBA')).astype(np.float32)
# the grey backdrop shows through between the far forearm and the hind leg
# and rembg kept it opaque: drop low-chroma light pixels in that gap only
rgb_ = raw[..., :3]; gy_, gx_ = np.mgrid[0:raw.shape[0], 0:raw.shape[1]]
gap = (gx_ >= 180) & (gx_ <= 202) & (gy_ >= 262) & (gy_ <= 320)
grey = (rgb_.max(-1) - rgb_.min(-1) < 40) & (rgb_.mean(-1) > 120)
from scipy import ndimage
raw[..., 3] *= 1 - ndimage.gaussian_filter((gap & grey).astype(np.float32), 0.8).clip(0, 1) * 1.6
raw[..., 3] = raw[..., 3].clip(0, 255)
src = grade(trim(raw),
            rim_warm=0.35, rim_cool=0.3, sat=0.96, ground=0.14)
FEET = [(42, 112), (112, 182), (182, 206), (212, 262)]   # paw columns on the book
h, w = src.shape[:2]
yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
a = src[:, :, 3]
# 1 px alpha erode: no light halo from the grey studio backdrop
a = np.minimum.reduce([a, np.roll(a, 1, 0), np.roll(a, -1, 0), np.roll(a, 1, 1), np.roll(a, -1, 1)])

# back line under the plume (rump top), cut-out px
back = np.interp(xx, [200, 214, 232, 246, 252, 258, 264, 320], [150, 168, 196, 228, 250, 266, 300, 330])
in_x = smooth(212, 218, xx)                   # right of the ear
tail_w = in_x * (1 - smooth(back - 9, back - 1, yy))
body_w = 1 - in_x * (1 - smooth(back - 16, back - 6, yy))   # body fades only under solid tail

fore = 1 - smooth(175, 183, xx)                               # forelegs: left of the far hind leg
side_l = 1 - smooth(PAW_SPLIT + 2, PAW_SPLIT + 10, xx)
side_r = smooth(PAW_SPLIT - 10, PAW_SPLIT - 2, xx) * fore
paw_in = smooth(PAW_TOP, PAW_TOP + 10, yy)
paw_l_w, paw_r_w = paw_in * side_l, paw_in * side_r
body_w = body_w * (1 - fore * smooth(PAW_TOP + 22, PAW_TOP + 36, yy))


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
