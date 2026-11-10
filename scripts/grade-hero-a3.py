"""Grade the owner-chosen hero drawing (candidate A3) into the Family Core warm palette and export
the 360x200 hero card slot as a 2x JPEG (720x400).

Source (not in this repo — kept in the team archive, see the PR description):
  /home/team/shared/refs/hero-options-2026-10-01/a-i-03-verytight-overlapping.jpg  (1200x800)
Override with HEROC_SRC=/path/to/file.

Run (needs Pillow + numpy):
  python3 -m venv /tmp/imgvenv && /tmp/imgvenv/bin/pip install Pillow numpy
  /tmp/imgvenv/bin/python scripts/grade-hero-a3.py

What it does, in order:
  1. tone curve: floors the deepest ink at the text token #1A1A1A (26) so nothing is crushed black,
     lifts the paper without blowing it out, and keeps the drawing's midtone structure intact
  2. lightness-dependent chroma cut: the amber cast goes from the paper (highlights) hardest and the
     ink washes least, so it stays a warm multi-tone drawing rather than sepia monochrome
  3. highlight hue pull toward the cream axis, then a final lift of the paper into the
     #F5F0EB / #E8D5C0 family
  4. the two emotional anchors are pulled onto their brand families: the rust/plaid sleeve toward
     the terracotta highlight #D4845A, the dark cuff toward the accent forest green #3A6B4A
  5. crop to exactly 1.8:1 (the hero slot) with both hands, both sleeves and clear margins in frame
"""
import os

import numpy as np
from PIL import Image

SRC = os.environ.get(
    "HEROC_SRC",
    "/home/team/shared/refs/hero-options-2026-10-01/a-i-03-verytight-overlapping.jpg",
)
DST = os.path.join(os.path.dirname(__file__), "..", "public", "hero", "hand-on-hand.jpg")

LUMA = np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
FLOOR = 26.0 / 255.0                       # #1A1A1A
CREAM = np.array([245.0, 240.0, 235.0])    # #F5F0EB
INK_WARM = np.array([28.0, 25.0, 22.0])     # the #1A1A1A ink token, warmed a touch

# crop in source pixels: 1044x580 = exactly 1.8:1, hands centred with clear top/bottom margins
CROP = (138, 88, 1182, 668)
OUT_SIZE = (720, 400)                      # 2x the 360x200 slot

P = dict(
    black_in=0.05, white_in=0.86, gamma=1.0, knee=0.90, shoulder=0.80, white_top=0.955,
    k_shadow=0.85, k_high=0.22, lo=0.10, hi=0.62,
    pull_from=0.58, pull=0.45,
    rust_target=(212, 132, 90), rust_hue_span=26, rust_amount=0.9, rust_sat=1.10,
    rust_lift=0.06, rust_Lmax=100,
    green_target=(58, 107, 74), green_hue_span=45, green_amount=0.95, green_sat=1.8,
    green_lift=0.04, green_Lmax=80,
    hue_pull=0.6, chroma=1.0, paper_tint=0.4, tint_from=0.60,
)


def srgb_to_linear(x):
    return np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)


def linear_to_srgb(x):
    x = np.clip(x, 0, 1)
    return np.where(x <= 0.0031308, x * 12.92, 1.055 * x ** (1 / 2.4) - 0.055)


def rgb_to_lab(rgb):
    lin = srgb_to_linear(np.clip(rgb, 0, 1))
    m = np.array([[0.4124564, 0.3575761, 0.1804375],
                  [0.2126729, 0.7151522, 0.0721750],
                  [0.0193339, 0.1191920, 0.9503041]])
    t = (lin @ m.T) / np.array([0.95047, 1.0, 1.08883])
    d = 6 / 29
    f = np.where(t > d ** 3, np.cbrt(np.clip(t, 0, None)), t / (3 * d * d) + 4 / 29)
    return np.stack([116 * f[..., 1] - 16,
                     500 * (f[..., 0] - f[..., 1]),
                     200 * (f[..., 1] - f[..., 2])], -1)


def lab_to_rgb(lab):
    L, a, b = lab[..., 0], lab[..., 1], lab[..., 2]
    fy = (L + 16) / 116
    d = 6 / 29

    def finv(t):
        return np.where(t > d, t ** 3, 3 * d * d * (t - 4 / 29))

    xyz = np.stack([finv(fy + a / 500), finv(fy), finv(fy - b / 200)], -1) \
        * np.array([0.95047, 1.0, 1.08883])
    m = np.array([[3.2404542, -1.5371385, -0.4985314],
                  [-0.9692660, 1.8760108, 0.0415560],
                  [0.0556434, -0.2040259, 1.0572252]])
    return linear_to_srgb(xyz @ m.T)


def smoothstep(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def hue_of(rgb):
    t = rgb_to_lab(np.array(rgb, dtype=np.float32) / 255.0)
    return np.degrees(np.arctan2(t[2], t[1])) % 360


def grade(img):
    a = np.asarray(img).astype(np.float32) / 255.0
    L0 = np.clip(a @ LUMA, 0, 1)
    lab = rgb_to_lab(a)

    # 1. tone curve — floor the blacks, keep the midtone structure
    x = np.clip((L0 - P["black_in"]) / (P["white_in"] - P["black_in"]), 0, 1) ** P["gamma"]
    x = np.where(x > P["knee"], P["knee"] + (x - P["knee"]) * P["shoulder"], x)
    lab[..., 0] = np.clip((FLOOR + x * (P["white_top"] - FLOOR)) * 100, 0, 100)

    # 2. lightness-dependent chroma cut + highlight hue pull
    C = np.hypot(lab[..., 1], lab[..., 2])
    hue = np.arctan2(lab[..., 2], lab[..., 1])
    C = C * (P["k_shadow"] + (P["k_high"] - P["k_shadow"]) * smoothstep((L0 - P["lo"]) / P["hi"]))
    h_cream = hue_of(CREAM)
    pull = smoothstep((L0 - P["pull_from"]) / (1 - P["pull_from"])) * P["pull"]
    hue = hue + np.radians(((np.degrees(hue) - h_cream + 180) % 360 - 180) * -pull)

    # 3. anchors: rust sleeve -> #D4845A family, cuff -> #3A6B4A family
    h_rust, h_green = hue_of(P["rust_target"]), hue_of(P["green_target"])
    hdeg, Ln = np.degrees(hue) % 360, lab[..., 0]
    m_rust = np.exp(-(((np.abs(((hdeg - h_rust + 180) % 360) - 180)) / P["rust_hue_span"]) ** 2)) \
        * smoothstep((C - 5) / 14) * smoothstep((P["rust_Lmax"] - Ln) / 45) * P["rust_amount"]
    m_green = np.exp(-(((np.abs(((hdeg - h_green + 180) % 360) - 180)) / P["green_hue_span"]) ** 2)) \
        * smoothstep((C - 2) / 7) * smoothstep((P["green_Lmax"] - Ln) / 30) * P["green_amount"]
    for m, h_t, sat, lift in ((m_rust, h_rust, P["rust_sat"], P["rust_lift"]),
                              (m_green, h_green, P["green_sat"], P["green_lift"])):
        dd = np.radians(((h_t - hdeg + 180) % 360) - 180)
        hit = m > 0.02
        hue = np.where(hit, hue + m * P["hue_pull"] * dd, hue)
        C = np.where(hit, C * (1 + m * (sat - 1)), C)
        lab[..., 0] = np.where(hit, np.clip(lab[..., 0] * (1 + m * lift), 0, 100), lab[..., 0])
    lab[..., 1], lab[..., 2] = C * np.cos(hue) * P["chroma"], C * np.sin(hue) * P["chroma"]
    out = lab_to_rgb(lab)

    # 4. final lift of the paper into the warm cream family
    hi = smoothstep((L0 - P["tint_from"]) / (1 - P["tint_from"]))[..., None]
    out = out * (1 - hi * P["paper_tint"]) + (CREAM / 255.0) * hi * P["paper_tint"]

    # 5. shadow floor: nothing darker than the #1A1A1A text token
    out = shadow_floor(out)
    return (np.clip(out, 0, 1) * 255).astype(np.uint8)


def shadow_floor(out):
    """Blend the deepest tones onto the (slightly warmed) #1A1A1A ink token.

    The darkest ink strokes come out of the re-encode a hair under the token, and Lanczos
    resampling rings a channel negative right on the stroke edges — which would show up as a
    crushed, clinical black. This pulls them back onto the palette's ink colour instead.
    """
    lum = np.clip(out, 0, 1) @ LUMA
    w = smoothstep((FLOOR * 1.9 - lum) / (FLOOR * 1.9))[..., None]
    return out * (1 - w) + (INK_WARM / 255.0) * w


def main():
    graded = Image.fromarray(grade(Image.open(SRC).convert("RGB")))
    hero = graded.crop(CROP).resize(OUT_SIZE, Image.LANCZOS)
    # the resample can ring a channel below zero on the darkest stroke edges: floor once more
    hero = Image.fromarray((shadow_floor(np.asarray(hero).astype(np.float32) / 255.0) * 255)
                           .round().clip(0, 255).astype(np.uint8))
    os.makedirs(os.path.dirname(os.path.abspath(DST)), exist_ok=True)
    hero.save(DST, quality=90, optimize=True, progressive=True, subsampling=0)

    a = np.asarray(Image.open(DST).convert("RGB")).astype(int)
    lum = a.reshape(-1, 3) @ LUMA
    dark = a.reshape(-1, 3)[lum.argmin()]
    paper = a[: int(0.12 * a.shape[0])].reshape(-1, 3).mean(0).round(0)
    print(f"wrote {os.path.abspath(DST)}  {os.path.getsize(DST) / 1024:.0f} KB  {hero.size[0]}x{hero.size[1]}")
    print(f"darkest pixel rgb{tuple(int(v) for v in dark)}  (pure black would be 0,0,0)")
    print(f"channels at zero: {int((a == 0).any(2).sum())}")
    print(f"top 12% (paper) mean rgb{tuple(int(v) for v in paper)}")


if __name__ == "__main__":
    main()
