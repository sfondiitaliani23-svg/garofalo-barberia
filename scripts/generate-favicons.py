from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "sostituisci-immagini" / "icone" / "favicon" / "barberia_garofalo-no-white.png"
OUT_DIRS = [
    ROOT / "assets" / "sostituisci-immagini" / "icone",
    ROOT / "public" / "assets" / "sostituisci-immagini" / "icone",
]
APP_DIR = ROOT / "app"
TRANSPARENT = (0, 0, 0, 0)
WHITE = (255, 255, 255, 255)
CORE_LUMINANCE = 118


def strip_glow_keep_core(img: Image.Image) -> Image.Image:
    """Toglie alone/glow grigio e mantiene solo il nucleo bianco del logo."""
    img = img.convert("RGBA")
    px = img.load()
    width, height = img.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = px[x, y]
            if a == 0 or max(r, g, b) < CORE_LUMINANCE:
                px[x, y] = TRANSPARENT
            else:
                px[x, y] = WHITE
    return img


def clean_edges(img: Image.Image, passes: int = 1) -> Image.Image:
    """Rimuove pixel isolati del glow residuo con erosione leggera."""
    alpha = img.split()[3]
    for _ in range(passes):
        alpha = alpha.filter(ImageFilter.MinFilter(3))
    cleaned = Image.new("RGBA", img.size, TRANSPARENT)
    cleaned.paste(WHITE, mask=alpha)
    return cleaned


def load_logo() -> Image.Image:
    logo = Image.open(SRC).convert("RGBA")
    if max(logo.size) > 768:
        ratio = 768 / max(logo.size)
        logo = logo.resize(
            (max(1, int(logo.width * ratio)), max(1, int(logo.height * ratio))),
            Image.Resampling.LANCZOS,
        )
    logo = strip_glow_keep_core(logo)
    logo = clean_edges(logo, passes=1)
    bbox = logo.getbbox()
    if not bbox:
        raise RuntimeError(f"No visible pixels in {SRC}")
    return logo.crop(bbox)


def solid_white(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    px = img.load()
    width, height = img.size
    for y in range(height):
        for x in range(width):
            if px[x, y][3] > 16:
                px[x, y] = WHITE
            else:
                px[x, y] = TRANSPARENT
    return img


def make_icon(size: int, padding_ratio: float = 0.02) -> Image.Image:
    logo = load_logo()
    canvas = Image.new("RGBA", (size, size), TRANSPARENT)
    max_side = int(size * (1 - padding_ratio * 2))
    scaled = logo.copy()
    scaled.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    scaled = solid_white(scaled)
    x = (size - scaled.width) // 2
    y = (size - scaled.height) // 2
    canvas.paste(scaled, (x, y), scaled)
    return solid_white(canvas)


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
        icon = make_icon(size)
        icons[name] = icon
        for out in OUT_DIRS:
            icon.save(out / name, format="PNG", optimize=True)
        print("saved", name)

    ico_16 = make_icon(16)
    for path in [OUT_DIRS[0] / "favicon.ico", OUT_DIRS[1] / "favicon.ico", APP_DIR / "favicon.ico"]:
        ico_16.save(path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
        print("saved", path)

    icons["favicon-192.png"].save(APP_DIR / "icon.png", format="PNG", optimize=True)
    make_icon(180).save(APP_DIR / "apple-icon.png", format="PNG", optimize=True)
    print("saved", APP_DIR / "icon.png")

    logo = load_logo()
    target_width = 240
    ratio = target_width / logo.width
    target_height = max(1, int(logo.height * ratio))
    email_logo = solid_white(logo.resize((target_width, target_height), Image.Resampling.LANCZOS))
    for out in OUT_DIRS:
        email_logo.save(out / "email-logo.png", format="PNG", optimize=True)
    print("saved email-logo.png")


if __name__ == "__main__":
    main()