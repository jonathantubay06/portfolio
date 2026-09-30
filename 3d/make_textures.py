"""Draws the flat textures the Blender scene uses (icons, tablet UI, keyboard).

Run: python 3d/make_textures.py   (writes 3d/tex/*.png)
Photos of real work come from img/preview-*-1080w.webp.
"""
import os
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'tex')
os.makedirs(OUT, exist_ok=True)
CYAN, BLUE, NAVY, INK = (0, 212, 255), (14, 122, 255), (10, 22, 40), (6, 14, 26)
S = 512


def face(draw_icon, name):
    """Dark rounded cube face with a glowing white icon in the middle."""
    im = Image.new('RGB', (S, S), (16, 30, 52))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((18, 18, S - 18, S - 18), 60, outline=(40, 90, 140), width=6)
    glow = Image.new('L', (S, S), 0)
    draw_icon(ImageDraw.Draw(glow), 255)
    im.paste((120, 220, 255), (0, 0), glow.filter(ImageFilter.GaussianBlur(14)))
    icon = Image.new('L', (S, S), 0)
    draw_icon(ImageDraw.Draw(icon), 255)
    im.paste((235, 248, 255), (0, 0), icon)
    im.save(os.path.join(OUT, name))


def cart(d, c):
    d.line([(120, 150), (170, 150), (215, 330), (390, 330)], fill=c, width=26, joint='curve')
    d.polygon([(185, 190), (410, 190), (380, 290), (205, 290)], outline=c, width=24)
    for x in (230, 360):
        d.ellipse((x - 24, 360, x + 24, 408), fill=c)


def gear(d, c):
    import math
    cx = cy = S // 2
    pts = []
    for i in range(16):
        a = math.pi * 2 * i / 16
        r = 170 if i % 2 == 0 else 128
        for da in (-0.14, 0.14):
            pts.append((cx + r * math.cos(a + da), cy + r * math.sin(a + da)))
    d.polygon(pts, fill=c)
    d.ellipse((cx - 62, cy - 62, cx + 62, cy + 62), fill=0)


def database(d, c):
    for y in (150, 240, 330):
        d.ellipse((150, y - 40, 362, y + 40), outline=c, width=22)
    d.line([(150, 150), (150, 330)], fill=c, width=22)
    d.line([(362, 150), (362, 330)], fill=c, width=22)


def tablet_ui():
    W, H = 600, 820
    im = Image.new('RGB', (W, H), (12, 24, 44))
    d = ImageDraw.Draw(im)
    for y in range(40, H, 60):
        d.rounded_rectangle((380, y, 560, y + 14), 7, fill=(40, 70, 110))
    nodes = [(190, 190, (40, 150, 255)), (190, 410, (60, 90, 130)), (190, 630, (20, 160, 130))]
    d.line([(190, 190), (190, 630)], fill=(70, 150, 220), width=6)
    for x, y, col in nodes:
        d.ellipse((x - 78, y - 78, x + 78, y + 78), fill=col, outline=(160, 220, 255), width=6)
    d.polygon([(200, 140), (160, 200), (190, 200), (178, 245), (222, 180), (192, 180)], fill='white')
    d.ellipse((160, 380, 220, 440), outline='white', width=14)
    for y in (600, 630, 660):
        d.ellipse((160, y - 14, 220, y + 14), outline='white', width=8)
    im.save(os.path.join(OUT, 'tablet.png'))


def keyboard():
    im = Image.new('RGB', (1024, 640), (22, 28, 38))
    d = ImageDraw.Draw(im)
    for r in range(5):
        for k in range(14):
            x, y = 40 + k * 68, 40 + r * 70
            d.rounded_rectangle((x, y, x + 58, y + 58), 8, fill=(34, 42, 56))
    d.rounded_rectangle((370, 420, 654, 600), 14, fill=(30, 37, 50))
    im.save(os.path.join(OUT, 'keyboard.png'))


def storefront():
    """Generic online store (no client branding) for the laptop screen."""
    W, H = 1280, 800
    im = Image.new('RGB', (W, H), (246, 244, 240))
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, W, 64), fill=(255, 255, 255))
    d.rounded_rectangle((40, 22, 160, 42), 6, fill=(20, 30, 50))
    for i in range(4):
        d.rounded_rectangle((520 + i * 110, 26, 600 + i * 110, 38), 5, fill=(170, 175, 185))
    d.ellipse((1180, 18, 1208, 46), outline=(20, 30, 50), width=4)
    d.rounded_rectangle((40, 90, W - 40, 390), 18, fill=(18, 40, 70))
    d.ellipse((760, 60, 1180, 480), fill=(0, 150, 220))
    d.ellipse((840, 140, 1100, 400), fill=(255, 140, 40))
    d.rounded_rectangle((90, 150, 520, 200), 10, fill=(255, 255, 255))
    d.rounded_rectangle((90, 220, 430, 244), 8, fill=(150, 180, 210))
    d.rounded_rectangle((90, 300, 260, 350), 25, fill=(0, 212, 255))
    cols = [(230, 200, 170), (180, 210, 230), (220, 180, 190), (190, 220, 190)]
    for i, c in enumerate(cols):
        x = 40 + i * 305
        d.rounded_rectangle((x, 420, x + 285, 690), 14, fill=(255, 255, 255))
        d.rounded_rectangle((x + 16, 436, x + 269, 600), 10, fill=c)
        d.rounded_rectangle((x + 16, 616, x + 200, 634), 6, fill=(40, 50, 70))
        d.rounded_rectangle((x + 16, 648, x + 110, 666), 6, fill=(0, 150, 220))
    im.save(os.path.join(OUT, 'storefront.png'))


def holo_chart():
    W, H = 640, 400
    im = Image.new('RGB', (W, H), (8, 20, 38))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((6, 6, W - 6, H - 6), 26, outline=(0, 212, 255), width=5)
    d.rounded_rectangle((40, 40, 260, 66), 10, fill=(120, 200, 240))
    d.rounded_rectangle((40, 84, 190, 124), 10, fill=(255, 255, 255))
    pts = [(40, 330), (130, 300), (210, 310), (300, 240), (380, 260), (470, 170), (560, 120), (600, 100)]
    d.polygon(pts + [(600, 360), (40, 360)], fill=(0, 70, 110))
    d.line(pts, fill=(0, 230, 255), width=8, joint='curve')
    for x, y in pts[2::2]:
        d.ellipse((x - 9, y - 9, x + 9, y + 9), fill=(255, 150, 60))
    im.save(os.path.join(OUT, 'holo-chart.png'))


def holo_order():
    W, H = 600, 200
    im = Image.new('RGB', (W, H), (8, 20, 38))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((6, 6, W - 6, H - 6), 30, outline=(0, 212, 255), width=5)
    d.ellipse((34, 44, 146, 156), fill=(20, 170, 120))
    d.line([(64, 100), (86, 124), (120, 76)], fill='white', width=12)
    d.rounded_rectangle((176, 56, 470, 84), 10, fill=(255, 255, 255))
    d.rounded_rectangle((176, 108, 400, 132), 10, fill=(120, 200, 240))
    d.rounded_rectangle((490, 70, 560, 120), 14, fill=(255, 150, 60))
    im.save(os.path.join(OUT, 'holo-order.png'))


def desk_mat():
    W = H = 512
    im = Image.new('RGB', (W, H), (10, 18, 32))
    d = ImageDraw.Draw(im)
    for i in range(0, W, 32):
        d.line([(i, 0), (i, H)], fill=(18, 40, 66), width=2)
        d.line([(0, i), (W, i)], fill=(18, 40, 66), width=2)
    d.rounded_rectangle((6, 6, W - 6, H - 6), 24, outline=(0, 150, 220), width=5)
    im.save(os.path.join(OUT, 'desk-mat.png'))


def gauge():
    im = Image.new('RGB', (256, 256), (8, 20, 38))
    ImageDraw.Draw(im).rounded_rectangle((4, 4, 252, 252), 28, outline=(0, 212, 255), width=5)
    im.save(os.path.join(OUT, 'holo-gauge.png'))


def holo_code():
    """Frame for the floating code window; the page types the code lines."""
    W, H = 360, 240
    im = Image.new('RGB', (W, H), (8, 20, 38))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((4, 4, W - 4, H - 4), 18, outline=(0, 212, 255), width=4)
    for i, c in enumerate([(255, 140, 40), (0, 212, 255), (46, 230, 160)]):
        d.ellipse((20 + i * 20, 18, 32 + i * 20, 30), fill=c)
    for y in range(52, H - 20, 22):
        d.rounded_rectangle((24, y, 24 + (y * 37) % 200 + 60, y + 8), 4, fill=(40, 90, 140))
    im.save(os.path.join(OUT, 'holo-code.png'))


desk_mat()
gauge()
holo_code()
holo_chart()
holo_order()
storefront()
face(cart, 'cube-cart.png')
face(gear, 'cube-gear.png')
face(database, 'cube-db.png')
tablet_ui()
keyboard()
print('textures ok')
