from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "sostituisci-immagini" / "icone" / "barberia_garofalo.png"
OUT = ROOT / "assets" / "sostituisci-immagini" / "icone"


def make_square_icon(size: int, padding_ratio: float = 0.08) -> Image.Image:
    logo = Image.open(SRC).convert("RGBA")
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 255))

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

    icons = []
    for name, size in sizes.items():
        icon = make_square_icon(size)
        icon.save(OUT / name, format="PNG", optimize=True)
        icons.append(icon)
        print("saved", name)

if __name__ == "__main__":
    main()