"""Rinomina, ottimizza e applica le immagini sostituite dall'utente."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(r"C:\Users\Eliseo Miraglia\Desktop\BARBERIA GAROFALO SITO\assets\sostituisci-immagini")

HOMEPAGE_MAP = {
    "1-new.jpg": "1.jpg",
    "2-new.jpg": "2.jpg",
    "3-2.jpg": "3.jpg",
    "4-1 (1).jpg": "4-1.jpg",
}


def process_logo(src: Path, out: Path) -> None:
    img = Image.open(src).convert("RGBA")
    gray = img.convert("L")
    edges = gray.filter(ImageFilter.FIND_EDGES)
    edge_px = edges.load()

    for y in range(img.height):
        for x in range(img.width):
            edge_px[x, y] = min(255, edge_px[x, y] * 2)

    px = img.load()
    out_img = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out_px = out_img.load()

    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            lum = (r + g + b) / 3
            edge = edge_px[x, y]

            if lum < 12:
                continue

            keep = lum >= 168 or edge > 40 or (lum < 85 and edge > 18)
            if keep:
                out_px[x, y] = (r, g, b, 255)

    out_img = out_img.filter(ImageFilter.MinFilter(3))
    bbox = out_img.getbbox()
    if bbox:
        pad = 12
        out_img = out_img.crop(
            (
                max(0, bbox[0] - pad),
                max(0, bbox[1] - pad),
                min(img.width, bbox[2] + pad),
                min(img.height, bbox[3] + pad),
            )
        )

    max_w = 420
    if out_img.width > max_w:
        ratio = max_w / out_img.width
        out_img = out_img.resize(
            (max_w, max(1, int(out_img.height * ratio))),
            Image.Resampling.LANCZOS,
        )

    out_img.save(out, "PNG", optimize=True)
    print(f"Logo: {out} ({out_img.width}x{out_img.height})")
    return out_img


def build_favicons(logo: Image.Image, icone_dir: Path) -> None:
    sizes = ((16, "favicon-16.png"), (32, "favicon-32.png"), (180, "apple-touch-icon.png"), (192, "favicon-192.png"))
    ico_images: list[Image.Image] = []

    for size, name in sizes:
        icon = logo.copy()
        target = max(12, int(size * 0.9))
        icon.thumbnail((target, target), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        offset = ((size - icon.width) // 2, (size - icon.height) // 2)
        canvas.paste(icon, offset, icon)
        canvas.save(icone_dir / name, "PNG", optimize=True)
        if size in (16, 32):
            ico_images.append(canvas.convert("RGBA"))
        print(f"Icona: {name} ({size}x{size})")

    if ico_images:
        ico_path = icone_dir / "favicon.ico"
        ico_images[0].save(
            ico_path,
            format="ICO",
            sizes=[(img.width, img.height) for img in ico_images],
            append_images=ico_images[1:],
        )
        print(f"Icona: favicon.ico")


def optimize_whatsapp(src: Path) -> None:
    img = Image.open(src).convert("RGBA")
    if max(img.size) > 256:
        img.thumbnail((256, 256), Image.Resampling.LANCZOS)
    img.save(src, "PNG", optimize=True)
    print(f"WhatsApp: {src.name} ({img.width}x{img.height})")


def optimize_jpeg(src: Path, dst: Path, max_width: int) -> None:
    img = Image.open(src).convert("RGB")
    if img.width > max_width:
        ratio = max_width / img.width
        img = img.resize(
            (max_width, max(1, int(img.height * ratio))),
            Image.Resampling.LANCZOS,
        )
    img.save(dst, "JPEG", quality=86, optimize=True, progressive=True)
    print(f"JPG: {dst.name} -> {img.width}x{img.height}")


def main() -> None:
    homepage = ROOT / "homepage"
    brand = ROOT / "brand"

    for src_name, dst_name in HOMEPAGE_MAP.items():
        src = homepage / src_name
        if not src.exists():
            print(f"SKIP mancante: {src_name}")
            continue
        max_w = 1920 if dst_name == "1.jpg" else 1200
        optimize_jpeg(src, homepage / dst_name, max_w)

    for name in ("4-2.jpg", "4-3.jpg", "4-4.jpg"):
        path = homepage / name
        if path.exists():
            optimize_jpeg(path, path, 1200)

    icone = ROOT / "icone"
    logo_src = icone / "barberia_garofalo.png"
    if not logo_src.exists():
        logo_src = brand / "barberia_garofalo.png"
    if logo_src.exists():
        logo_img = Image.open(logo_src).convert("RGBA")
        build_favicons(logo_img, icone)
        print(f"Logo sito: {icone / 'barberia_garofalo.png'}")
    else:
        print("SKIP logo: barberia_garofalo.png non trovato")

    wa = icone / "whatsapp.png"
    if wa.exists():
        optimize_whatsapp(wa)

    for folder, max_w in (("galleria", 900), ("team", 900)):
        target = ROOT / folder
        if not target.is_dir():
            continue
        for path in sorted(target.glob("*.jpg")):
            optimize_jpeg(path, path, max_w)

    print("Fatto.")


if __name__ == "__main__":
    main()