"""Draws the app icons into src/web/: a smooth curve through three points on a dark
tile, the last point in yellow like a boxed answer. Same shape as UI.logo in
src/js/ui.js (64 x 64 grid) -- change both together.
Run:  python tools/make-icons.py   (needs Pillow)"""
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'src', 'web')

LIGHT = {'tile': (17, 17, 17), 'ink': (251, 251, 250), 'hl': (242, 201, 76)}
DARK = {'tile': (237, 237, 236), 'ink': (25, 25, 25), 'hl': (212, 150, 31)}

# the curve: a smooth wave in three cubic pieces; it passes through (12,42) (32,32) (52,22)
PIECES = [
    ((12, 42), (15, 30), (19, 22), (24, 22)),
    ((24, 22), (29, 22), (35, 42), (40, 42)),
    ((40, 42), (45, 42), (49, 34), (52, 22)),
]
NODES = [(12, 42), (32, 32)]
LAST = (52, 22)


def bezier(p0, p1, p2, p3, n=120):
    for i in range(n + 1):
        t = i / n
        u = 1 - t
        yield (u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
               u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1])


def icon(size, colors=LIGHT, rounded=True, zoom=1.0):
    """rounded=False fills the square edge to edge (iOS and Android cut their own shape);
    zoom shrinks or grows the drawing around the centre."""
    ss = 8  # draw big, then shrink for smooth edges
    s = size * ss
    k = s / 64

    def P(pt):
        return (s / 2 + (pt[0] - 32) * zoom * k, s / 2 + (pt[1] - 32) * zoom * k)

    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(14 * k), fill=colors['tile'])
    else:
        d.rectangle([0, 0, s, s], fill=colors['tile'])

    def dot(pt, r, fill):
        x, y = P(pt)
        r = r * zoom * k
        d.ellipse([x - r, y - r, x + r, y + r], fill=fill)

    # a thick line drawn as overlapping discs: smooth edges and round ends, unlike Pillow's wide lines
    for piece in PIECES:
        for pt in bezier(*piece, n=900):
            dot(pt, 1.9, colors['ink'])
    for n in NODES:
        dot(n, 4, colors['ink'])
    dot(LAST, 5, colors['hl'])
    return img.resize((size, size), Image.LANCZOS)


os.makedirs(OUT, exist_ok=True)
icon(192).save(os.path.join(OUT, 'icon-192.png'))
icon(512).save(os.path.join(OUT, 'icon-512.png'))
icon(512, rounded=False, zoom=0.82).save(os.path.join(OUT, 'icon-maskable-512.png'))
icon(180, rounded=False, zoom=1.08).save(os.path.join(OUT, 'apple-touch-icon.png'))
icon(32).save(os.path.join(OUT, 'favicon-32.png'))
icon(32, DARK).save(os.path.join(OUT, 'favicon-32-dark.png'))
print('icons written to', os.path.normpath(OUT))
