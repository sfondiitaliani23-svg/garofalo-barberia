"""Remove white glow from logo and export transparent PNG."""
from PIL import Image, ImageFilter

SRC = r"C:\Users\Eliseo Miraglia\Desktop\BARBERIA GAROFALO SITO\assets\sostituisci-immagini\brand\logo-originale.jpg"
OUT = r"C:\Users\Eliseo Miraglia\Desktop\BARBERIA GAROFALO SITO\assets\sostituisci-immagini\brand\logo.png"


def remove_glow(src: Image.Image) -> Image.Image:
    src = src.convert("RGBA")
    gray = src.convert("L")
    edges = gray.filter(ImageFilter.FIND_EDGES)
    edge_px = edges.load()

    for y in range(src.height):
        for x in range(src.width):
            edge_px[x, y] = min(255, edge_px[x, y] * 2)

    w, h = src.size
    src_px = src.load()
    gray_px = gray.load()
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out_px = out.load()

    for y in range(h):
        for x in range(w):
            r, g, b, _ = src_px[x, y]
            lum = (r + g + b) / 3
            edge = edge_px[x, y]

            if lum < 12:
                continue

            keep = lum >= 168 or edge > 40 or (lum < 85 and edge > 18)
            if keep:
                out_px[x, y] = (r, g, b, 255)

    out = out.filter(ImageFilter.MinFilter(3))
    bbox = out.getbbox()
    if bbox:
        pad = 10
        out = out.crop(
            (
                max(0, bbox[0] - pad),
                max(0, bbox[1] - pad),
                min(w, bbox[2] + pad),
                min(h, bbox[3] + pad),
            )
        )
    return out


def main() -> None:
    result = remove_glow(Image.open(SRC))
    result.save(OUT, "PNG", optimize=True)
    print(f"Saved {OUT} ({result.width}x{result.height})")


if __name__ == "__main__":
    main()