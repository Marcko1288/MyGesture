"""
Genera le immagini PWA a partire da public/icons/icon-512.png (sfondo trasparente):
- apple-touch-icon 180x180 opaca (iOS riempie di nero le parti trasparenti);
- icone "maskable" con l'immagine dentro la zona sicura (80%);
- schermate di avvio iOS (apple-touch-startup-image) per i principali iPhone, chiare e scure.
Uso: python3 scripts/generate-pwa-assets.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / "public" / "icons"
SPLASH = ROOT / "public" / "splash"
SOURCE = Image.open(ICONS / "icon-512.png").convert("RGBA")
LIGHT, DARK = (242, 242, 247), (0, 0, 0)

# (larghezza, altezza in punti CSS, pixel ratio) dei principali iPhone, in verticale.
DEVICES = [
    (320, 568, 2),  # SE 1ª gen.
    (375, 667, 2),  # SE 2ª/3ª gen., 8
    (375, 812, 3),  # X, XS, 11 Pro, 12/13 mini
    (414, 896, 2),  # XR, 11
    (414, 896, 3),  # XS Max, 11 Pro Max
    (390, 844, 3),  # 12, 13, 14, 16e
    (428, 926, 3),  # 12/13 Pro Max, 14 Plus
    (393, 852, 3),  # 14 Pro, 15, 15 Pro, 16
    (430, 932, 3),  # 14 Pro Max, 15 Plus/Pro Max, 16 Plus
    (402, 874, 3),  # 16 Pro, 17
    (440, 956, 3),  # 16 Pro Max, 17 Pro Max
]


def on_background(size: int, scale: float, background) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), background + (255,))
    inner = int(size * scale)
    icon = SOURCE.resize((inner, inner), Image.LANCZOS)
    canvas.alpha_composite(icon, ((size - inner) // 2, (size - inner) // 2))
    return canvas.convert("RGB")


def main():
    on_background(180, 0.86, (255, 255, 255)).save(ICONS / "apple-touch-icon-180.png", optimize=True)
    for size in (192, 512):
        on_background(size, 0.72, (255, 255, 255)).save(ICONS / f"icon-maskable-{size}.png", optimize=True)
    SPLASH.mkdir(exist_ok=True)
    for width, height, ratio in DEVICES:
        for mode, color in (("light", LIGHT), ("dark", DARK)):
            w, h = width * ratio, height * ratio
            canvas = Image.new("RGB", (w, h), color)
            icon_size = int(min(w, h) * 0.32)
            icon = SOURCE.resize((icon_size, icon_size), Image.LANCZOS)
            canvas.paste(icon, ((w - icon_size) // 2, (h - icon_size) // 2), icon)
            canvas.save(SPLASH / f"splash-{w}x{h}-{mode}.png", optimize=True)
    print("ok")


if __name__ == "__main__":
    main()
