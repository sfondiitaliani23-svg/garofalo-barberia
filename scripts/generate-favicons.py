from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "sostituisci-immagini" / "icone" / "favicon" / "barberia_garofalo-no-white.png"
OUT_DIRS = [
    ROOT / "assets" / "sostituisci-immagini" / "icone",
    ROOT / "public" / "assets" / "sostituisci-immagini" / "icone",
]
APP_DIR = ROOT / "app"


def square_icon(size: int, padding_ratio: float = 0.06) -> Image.Image:
    logo = Image.open(SRC).convert("RGBA")
    bbox = logo.getbbox()
    if not bbox:
        raise RuntimeError(f"No visible pixels in {SRC}")

    logo = logo.crop(bbox)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    max_side = int(size * (1 - padding_ratio * 2))
    logo.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    x = (size - logo.width) // 2
    y = (size - logo.height) // 2
    canvas.paste(logo, (x, y), logo)
    return canvas


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
        icon = square_icon(size)
        icons[name] = icon
        for out in OUT_DIRS:
            icon.save(out / name, format="PNG", optimize=True)
        print("saved", name)

    ico_sizes = [square_icon(s) for s in (16, 32, 48)]
    for path in [OUT_DIRS[0] / "favicon.ico", OUT_DIRS[1] / "favicon.ico", APP_DIR / "favicon.ico"]:
        ico_sizes[0].save(path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
        print("saved", path)

    icons["favicon-192.png"].save(APP_DIR / "icon.png", format="PNG", optimize=True)
    square_icon(180).save(APP_DIR / "apple-icon.png", format="PNG", optimize=True)
    print("saved", APP_DIR / "icon.png")

    logo = Image.open(SRC).convert("RGBA")
    bbox = logo.getbbox()
    if bbox:
        logo = logo.crop(bbox)
        target_width = 240
        ratio = target_width / logo.width
        target_height = max(1, int(logo.height * ratio))
        logo = logo.resize((target_width, target_height), Image.Resampling.LANCZOS)
        for out in OUT_DIRS:
            logo.save(out / "email-logo.png", format="PNG", optimize=True)
        logo.save(ROOT / "public" / "assets" / "sostituisci-immagini" / "icone" / "email-logo.png", format="PNG", optimize=True)
        print("saved email-logo.png")


if __name__ == "__main__":
    main()