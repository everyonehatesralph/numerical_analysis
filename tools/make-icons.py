"""Draws the app icons (blue tile with an italic f) into src/web/.
Run:  python tools/make-icons.py   (needs Pillow and the Windows Georgia font)"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'src', 'web')
FONT = r'C:\Windows\Fonts\georgiaz.ttf'  # Georgia Bold Italic
BLUE = (40, 81, 200, 255)


def icon(size, maskable=False):
    scale = 4  # draw big, then shrink for smooth edges
    s = size * scale
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if maskable:
        d.rectangle([0, 0, s, s], fill=BLUE)  # full bleed: the OS cuts its own shape
        glyph = int(s * 0.5)
    else:
        d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.22), fill=BLUE)
        glyph = int(s * 0.68)
    font = ImageFont.truetype(FONT, glyph)
    box = d.textbbox((0, 0), 'f', font=font)
    w, h = box[2] - box[0], box[3] - box[1]
    d.text(((s - w) / 2 - box[0], (s - h) / 2 - box[1]), 'f', font=font, fill=(255, 255, 255, 255))
    return img.resize((size, size), Image.LANCZOS)


os.makedirs(OUT, exist_ok=True)
icon(192).save(os.path.join(OUT, 'icon-192.png'))
icon(512).save(os.path.join(OUT, 'icon-512.png'))
icon(512, maskable=True).save(os.path.join(OUT, 'icon-maskable-512.png'))
icon(180, maskable=True).save(os.path.join(OUT, 'apple-touch-icon.png'))
print('icons written to', os.path.normpath(OUT))
