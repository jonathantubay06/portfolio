"""Cut the four dogs from their approved Pixar-style stills and split each
into animation layers: body, head (pivot at the neck), ears (children of
the head), tail and two front paws.

Sources (Personal Works/Dumpling and sibs/Social media/pixar-characters/):
<dog>-fullbody_flux2-klein-4b-pixar_1024x1024.jpg, full-body FLUX.2 Klein 4B
stills on a plain grey backdrop (2026-10-08; the photo cut-outs read as
pasted onto the cartoon desk, and the first 576x1024 stills cropped paws
and tails). --cut redoes the rembg step (isnet + alpha matting) into
tex/<dog>-cutout.png:
  uv run --python 3.11 --with "rembg[cpu]" --with pillow --with numpy --with scipy python 3d/make_dog_layers.py --cut
Then the split alone (no rembg):
  uv run --with pillow --with numpy --with scipy python 3d/make_dog_layers.py

Layers are polygons in cut-out px. A layer takes the alpha inside its
polygon (feathered); its parent loses that region except the `keep`
polygon, a band the parent keeps under the layer's joint edge, so a
small turn round the pivot never opens a gap (the parent's copy of the
band hides behind the layer). Layer order = paint order, children last.
cutout_fx grades the coat lightly (the stills are already studio lit)
and writes <dog>-shadow.png (contact pads under each paw + ambient pool).
Pivots and boxes are written to tex/dogs.json for build_scene.py.
"""
import json
import os
import sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from cutout_fx import trim, grade, shadow

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, 'tex')
SRC = r'C:\Users\tubay\Downloads\DevWorks\Personal Works\Dumpling and sibs\Social media\pixar-characters'

# crop box in the 1024 still, scale, then layers:
#   name: (parent, pivot, polygon, keep-polygon)
# feet: paw column ranges on the floor (contact shadow pads)
DOGS = json.load(open(os.path.join(HERE, 'dog_layers.json')))


def poly_mask(shape, pts, feather):
    im = Image.new('L', (shape[1], shape[0]), 0)
    ImageDraw.Draw(im).polygon([tuple(p) for p in pts], fill=255)
    m = np.asarray(im, np.float32) / 255
    return ndimage.gaussian_filter(m, feather) if feather else m


def cut(name, cfg):
    from rembg import remove, new_session
    im = Image.open(os.path.join(SRC, cfg.get('src', name + '-fullbody') + '_flux2-klein-4b-pixar_1024x1024.jpg')).convert('RGB')
    o = remove(im, session=new_session('isnet-general-use'), alpha_matting=True,
               alpha_matting_foreground_threshold=240, alpha_matting_background_threshold=20,
               alpha_matting_erode_size=8)
    if cfg.get('chroma'):                     # wispy plume: rembg left it half see-through
        o = chroma(im, o, cfg['chroma'])
    o = o.crop(tuple(cfg['crop']))
    s = cfg['scale'] * cfg.get('res', 1)
    o.resize((round(o.width * s), round(o.height * s)), Image.LANCZOS).save(os.path.join(TEX, name + '-cutout.png'), optimize=True)


def chroma(im, o, poly):
    """key a warm plume off the neutral grey backdrop: the backdrop has
    R - B of about -5, the coat 29 and up, so warmth is a clean alpha.
    Inside poly the alpha is the larger of rembg's and the key, and the
    soft fringe has the grey un-mixed so it keeps the cream colour."""
    rgb = np.asarray(im, np.float32)
    o = np.array(o, np.float32)
    m = poly_mask(rgb.shape[:2], poly, 3)
    k = np.clip((rgb[..., 0] - rgb[..., 2] + 3) / 30, 0, 1)
    k = ndimage.gaussian_filter(k, 0.7)
    a = np.maximum(o[..., 3] / 255, k * m)
    bg = np.array([180, 181, 185], np.float32)
    col = np.clip((rgb - (1 - a[..., None]) * bg) / np.maximum(a[..., None], 0.3), 0, 255)
    sel = (k * m > o[..., 3] / 255)[..., None]
    o[..., :3] = np.where(sel, col, o[..., :3])
    o[..., 3] = a * 255
    return Image.fromarray(o.round().astype(np.uint8), 'RGBA')


def degrey(img, boxes):
    """the grey backdrop showing through gaps between legs that rembg kept"""
    rgb = img[..., :3]; yy, xx = np.mgrid[0:img.shape[0], 0:img.shape[1]]
    for l, t, r, b in boxes:
        m = (xx >= l) & (xx <= r) & (yy >= t) & (yy <= b) & (rgb.max(-1) - rgb.min(-1) < 40) & (rgb.mean(-1) > 120)
        img[..., 3] *= 1 - np.clip(ndimage.gaussian_filter(m.astype(np.float32), 0.8) * 1.6, 0, 1)
    return img


def decontam(img, bg=(196, 197, 203)):
    """un-mix the grey backdrop from the soft edge (matting keeps the
    blended colour), so fringes take the coat colour, not grey"""
    a = img[..., 3:] / 255
    out = (img[..., :3] - (1 - a) * np.array(bg, np.float32)) / np.maximum(a, 0.25)
    soft = (a < 0.98)
    img[..., :3] = np.where(soft, np.clip(out, 0, 255), img[..., :3])
    return img


def at_res(cfg):
    """the polygons, pivots and boxes are authored at res 1; a dog cut at
    res r (sharper texture, same size on the desk) scales them by r"""
    r = cfg.get('res', 1)
    if r == 1: return cfg
    sc = lambda v: [sc(x) for x in v] if isinstance(v, list) else v * r
    cfg = json.loads(json.dumps(cfg))
    for k in ('degrey', 'feet', 'erase', 'nub'):
        if k in cfg: cfg[k] = sc(cfg[k])
    for L in cfg['layers'].values():
        for k in ('pivot', 'poly', 'keep', 'cut', 'band'):
            if k in L: L[k] = sc(L[k])
    return cfg


def split(name, cfg):
    cfg = at_res(cfg)
    raw = np.array(Image.open(os.path.join(TEX, name + '-cutout.png')).convert('RGBA')).astype(np.float32)
    raw = degrey(raw, cfg.get('degrey', []))
    for poly in cfg.get('erase', []):        # stray bits the still added (an extra tail tip, a long tail on a stub-tailed dog)
        raw[..., 3] *= 1 - poly_mask(raw.shape[:2], poly, 3)
    if cfg.get('nub'):                        # Pochi's stub tail: a small rounded bump of coat
        cx, cy, rx, ry = cfg['nub']; yy, xx = np.mgrid[0:raw.shape[0], 0:raw.shape[1]]
        e = ndimage.gaussian_filter((((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1).astype(np.float32), 1.2)
        coat = raw[int(cy + ry * 2.5), int(cx - rx), :3]
        raw[..., :3] = raw[..., :3] * (1 - e[..., None]) + coat * e[..., None]
        raw[..., 3] = np.maximum(raw[..., 3], 255 * e)
    src = grade(trim(raw), **cfg.get('grade', dict(rim_warm=0.35, rim_cool=0.3, sat=0.96, ground=0.14)))
    h, w = src.shape[:2]
    a = src[..., 3]
    # 1 px alpha erode: no light halo from the grey backdrop
    a = np.minimum.reduce([a, np.roll(a, 1, 0), np.roll(a, -1, 0), np.roll(a, 1, 1), np.roll(a, -1, 1)])
    a[:, :1] = a[:, -1:] = 0
    F = cfg.get('feather', 1.6)
    layers = cfg['layers']
    own = {'body': np.ones((h, w), np.float32)}
    for ln, L in layers.items():
        if 'cut' in L:                         # head: everything above the neck cut
            c = L['cut']; b = L.get('band', 20)
            L['poly'] = c + [[c[-1][0], -5], [c[0][0], -5]]
            L['keep'] = [[x, y + 6] for x, y in c] + [[x, y - (b if isinstance(b, int) else b[i])] for i, (x, y) in reversed(list(enumerate(c)))]
        own[ln] = poly_mask((h, w), L['poly'], F)
    # each parent loses its children's region outside the keep band
    for ln, L in layers.items():
        lose = own[ln] * (1 - poly_mask((h, w), L['keep'], F) if L.get('keep') else 1)
        own[L['parent']] = own[L['parent']] * (1 - lose)
    # hard inner cuts: a layer always sits over its parent's copy (the keep
    # band), so a feathered seam only adds half-alpha pixels along it
    for k in own: own[k] = (own[k] > 0.5).astype(np.float32)
    meta = {'size': [w, h], 'res': cfg.get('res', 1), 'layers': {}}
    shadow(src, cfg['feet']).save(os.path.join(TEX, name + '-shadow.png'), optimize=True)
    for ln, wgt in own.items():
        al = a * wgt
        ys, xs = np.where(al > 2)
        l, t, r, b = (0, 0, w, h) if ln == 'body' else (max(0, xs.min() - 2), max(0, ys.min() - 2), min(w, xs.max() + 3), min(h, ys.max() + 3))
        # alpha floor of 2 wherever the dog is solid: lossy WebP zeroes the
        # colour under alpha 0, and the feathered cut edges then filter in
        # a dark line (the seams at the neck / paws); 2/255 never passes
        # the page's alpha test, it only keeps the coat colour there
        o = src.copy(); o[..., 3] = np.maximum(al, 2 * (a > 100))
        Image.fromarray(o[t:b, l:r].round().clip(0, 255).astype(np.uint8)).save(os.path.join(TEX, f'{name}-{ln}.png'), optimize=True)
        if ln != 'body':
            L = layers[ln]
            meta['layers'][ln] = dict(parent=L['parent'], pivot=L['pivot'], box=[int(l), int(t), int(r), int(b)], dy=L.get('dy', -0.001))
    return meta


if __name__ == '__main__':
    only = [a for a in sys.argv[1:] if a in DOGS] or list(DOGS)
    out = {}
    p = os.path.join(TEX, 'dogs.json')
    if os.path.exists(p): out = json.load(open(p))
    for n in only:
        if '--cut' in sys.argv: cut(n, DOGS[n])
        out[n] = split(n, DOGS[n])
        print(n, out[n]['size'], {k: v['box'] for k, v in out[n]['layers'].items()})
    json.dump(out, open(p, 'w'), indent=1)
