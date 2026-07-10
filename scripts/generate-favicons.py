from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance

ROOT = Path(__file__).resolve().parent.parent
SRC_GOLD = ROOT / "assets" / "sostituisci-immagini" / "icone" / "barberia_garofalo-gold.png"
SRC_WHITE = ROOT / "assets" / "sostituisci-immagini" / "icone" / "favicon" / "barberia_garofalo-no-white.png"
OUT_DIRS = [
    ROOT / "assets" / "sostituisci-immagini" / "icone",
    ROOT / "public" / "assets" / "sostituisci-immagini" / "icone",
]
APP_DIR = ROOT / "app"
GOLD = (205, 154, 79, 255)
GOLD_LIGHT = (255, 185, 73, 255)


def strip_near_black(img: Image.Image, threshold: int = 35) -> Image.Image:
    img = img.convert("RGBA")
    px = img.load()
    width, height = img.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = px[x, y]
            if r <= threshold and g <= threshold and b <= threshold:
                px[x, y] = (0, 0, 0, 0)
    return img


def gold_disc(size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    margin = max(1, size // 16)
    draw.ellipse((margin, margin, size - margin - 1, size - margin - 1), fill=GOLD_LIGHT)
    draw.ellipse((margin + 1, margin + 1, size - margin - 2, size - margin - 2), fill=GOLD)
    return canvas


def paste_logo(canvas: Image.Image, logo: Image.Image, fill_ratio: float = 0.78) -> Image.Image:
    size = canvas.size[0]
    logo = logo.copy()
    max_side = int(size * fill_ratio)
    logo.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    x = (size - logo.width) // 2
    y = (size - logo.height) // 2
    canvas.paste(logo, (x, y), logo)
    return canvas


def make_tab_icon(size: int) -> Image.Image:
    canvas = gold_disc(size)
    logo = strip_near_black(Image.open(SRC_WHITE))
    return paste_logo(canvas, logo, 0.82 if size <= 32 else 0.78)


def make_app_icon(size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 255))
    logo = strip_near_black(Image.open(SRC_GOLD), threshold=30)
    rgb = Image.new("RGBA", logo.size)
    rgb.paste(logo, mask=logo.split()[3])
    bright = ImageEnhance.Color(rgb).enhance(1.35)
    bright = ImageEnhance.Contrast(bright).enhance(1.2)
    bright.putalpha(logo.split()[3])
    return paste_logo(canvas, bright, 0.88)


def main() -> None:
    sizes = {
        "favicon.png": 32,
        "favicon-16.png": 16,
        "favicon-32.png": 32,
        "favicon-192.png": 192,
        "apple-touch-icon.png": 180,
    }

    icons = {}
    for name, size in sizes.items():
        icon = make_tab_icon(size) if size <= 48 else make_app_icon(size)
        icons[name] = icon
        for out in OUT_DIRS:
            icon.save(out / name, format="PNG", optimize=True)
        print("saved", name)

    ico_sizes = [make_tab_icon(s) for s in (16, 32, 48)]
    for path in [OUT_DIRS[0] / "favicon.ico", OUT_DIRS[1] / "favicon.ico", APP_DIR / "favicon.ico"]:
        ico_sizes[0].save(path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
        print("saved", path)

    icons["favicon-192.png"].save(APP_DIR / "icon.png", format="PNG", optimize=True)
    make_app_icon(180).save(APP_DIR / "apple-icon.png", format="PNG", optimize=True)
    print("saved", APP_DIR / "icon.png")

    logo = strip_near_black(Image.open(SRC_WHITE))
    bbox = logo.getbbox()
    if bbox:
        logo = logo.crop(bbox)
        target_width = 240
        ratio = target_width / logo.width
        target_height = max(1, int(logo.height * ratio))
        logo = logo.resize((target_width, target_height), Image.Resampling.LANCZOS)
        for out in OUT_DIRS:
            logo.save(out / "email-logo.png", format="PNG", optimize=True)
        print("saved email-logo.png")


if __name__ == "__main__":
    main()