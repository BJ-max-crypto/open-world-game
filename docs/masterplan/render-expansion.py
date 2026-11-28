"""Draw the expansion plan from expansion.json. Run from the repo root."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
PLAN = json.loads((ROOT / "expansion.json").read_text())

W, H = 1600, 1680
PAD_L, PAD_T, PAD_R, PAD_B = 70, 86, 280, 430
MAP_W = W - PAD_L - PAD_R
MAP_H = H - PAD_T - PAD_B
BOUNDS = PLAN["bounds"]
SPAN_X = BOUNDS["x1"] - BOUNDS["x0"]
SPAN_Z = BOUNDS["z1"] - BOUNDS["z0"]


def px(x: float, z: float) -> tuple[float, float]:
    u = (x - BOUNDS["x0"]) / SPAN_X
    v = (BOUNDS["z1"] - z) / SPAN_Z
    return PAD_L + u * MAP_W, PAD_T + v * MAP_H


def rect(draw: ImageDraw.ImageDraw, box, fill, outline=None, width=2):
    x0, y0 = px(box["x0"], box["z1"])
    x1, y1 = px(box["x1"], box["z0"])
    draw.rectangle([x0, y0, x1, y1], fill=fill, outline=outline, width=width)


def main() -> None:
    image = Image.new("RGB", (W, H), "#f4f1ea")
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default()
    colors = {
        "downtown": "#8d97a3",
        "urban": "#b7c3cf",
        "lower": "#c6b59a",
        "suburbs": "#b7c49a",
        "luxury": "#e4d2b8",
        "marina": "#9ec8c2",
        "port": "#b7a898",
        "park": "#8fb896",
        "beach": "#efd8b8",
    }
    for water in PLAN["water"]:
        rect(draw, water, "#8eb4d4", "#6e98be", 1)
    for district in PLAN["districts"]:
        rect(draw, district, colors[district["id"]], "#2c3338", 2)
        cx = (district["x0"] + district["x1"]) / 2
        cz = (district["z0"] + district["z1"]) / 2
        label = f"{district['name']}  ·  phase {district['phase']}"
        xy = px(cx, cz)
        draw.text((xy[0] - 70, xy[1] - 6), label, fill="#1c2428", font=font)

    # Phase 1 streets in local meters, drawn in world space.
    anchor = PLAN["anchor"]
    for road in PLAN["phase1"]["localRoads"]:
        wx = road["x"] + anchor["worldX"]
        wz = road["z"] + anchor["worldZ"]
        box = {
            "x0": wx - road["w"] / 2,
            "x1": wx + road["w"] / 2,
            "z0": wz - road["d"] / 2,
            "z1": wz + road["d"] / 2,
        }
        rect(draw, box, "#2a3036")

    # Future connectors, schematic.
    connectors = [
        (-1750, -2600, -1750, 2600),
        (-1750, 738, 1900, 738),
        (470, 496, 1200, 496),
        (-1750, -1400, 400, -1400),
    ]
    for x0, z0, x1, z1 in connectors:
        draw.line([px(x0, z0), px(x1, z1)], fill="#1c2428", width=3)

    for building in PLAN["existingLocal"]:
        wx = building["x"] + anchor["worldX"]
        wz = building["z"] + anchor["worldZ"]
        box = {
            "x0": wx - building["hx"],
            "x1": wx + building["hx"],
            "z0": wz - building["hz"],
            "z1": wz + building["hz"],
        }
        rect(draw, box, "#f7f4ee", "#111111", 2)

    draw.text((PAD_L, 28), "The Coast — expansion plan", fill="#1c2428", font=font)
    draw.text(
        (PAD_L, 48),
        "Phase 1 is the dark street frame around the four built towers. Later districts are outlines only.",
        fill="#3c4650",
        font=font,
    )
    legend_y = PAD_T
    draw.text((W - PAD_R + 24, legend_y), "Later connections", fill="#1c2428", font=font)
    notes = [
        "West along Meridian: mid-rise streets",
        "North of those: older neighborhood",
        "Southwest: canal houses",
        "South wharf: yacht marina",
        "South of the marina: the port",
        "East causeway: barrier-island beach",
        "Atlantic is the far east band",
    ]
    for note in notes:
        legend_y += 28
        draw.text((W - PAD_R + 24, legend_y), note, fill="#3c4650", font=font)
    # Inset of the built downtown, local meters.
    inset = (PAD_L, H - 400, PAD_L + 720, H - 36)
    draw.rectangle(inset, fill="#e7e2d8", outline="#2c3338", width=2)
    draw.text((inset[0] + 12, inset[1] + 8), "Phase 1 downtown, local meters", fill="#1c2428", font=font)
    local = {"x0": -190, "x1": 190, "z0": -160, "z1": 160}

    def ipx(x: float, z: float) -> tuple[float, float]:
        u = (x - local["x0"]) / (local["x1"] - local["x0"])
        v = (local["z1"] - z) / (local["z1"] - local["z0"])
        return inset[0] + 16 + u * 520, inset[1] + 28 + v * 330

    def ibox(x, z, w, d, fill, outline="#1c2428"):
        a = ipx(x - w / 2, z + d / 2)
        b = ipx(x + w / 2, z - d / 2)
        draw.rectangle([a[0], a[1], b[0], b[1]], fill=fill, outline=outline)

    for road in PLAN["phase1"]["localRoads"]:
        ibox(road["x"], road["z"], road["w"], road["d"], "#3a4248")
    # The ring already around Solara.
    for x, z, w, d in ((0, -50, 112, 8), (0, 38, 112, 8), (52, -6, 8, 96), (-52, -6, 8, 96)):
        ibox(x, z, w, d, "#5c656c")
    for building in PLAN["existingLocal"]:
        ibox(building["x"], building["z"], building["hx"] * 2, building["hz"] * 2, "#f7f4ee")
        xy = ipx(building["x"], building["z"])
        draw.text((xy[0] - 16, xy[1] - 4), building["id"], fill="#1c2428", font=font)
    for parcel in PLAN["phase1"]["parcels"]:
        ibox(parcel["x"], parcel["z"], parcel["hx"] * 2, parcel["hz"] * 2, "#d7c4a4", "#6a4b2a")
        xy = ipx(parcel["x"], parcel["z"])
        draw.text((xy[0] - 18, xy[1] - 4), parcel["id"], fill="#3a2a16", font=font)
    draw.text((inset[0] + 560, inset[1] + 36), "Pale: already built", fill="#1c2428", font=font)
    draw.text((inset[0] + 560, inset[1] + 58), "Tan: Phase 1 buildings", fill="#1c2428", font=font)
    draw.text((inset[0] + 560, inset[1] + 80), "Dark: new streets", fill="#1c2428", font=font)
    draw.text((inset[0] + 560, inset[1] + 102), "Gray: Solara's ring", fill="#1c2428", font=font)
    out = ROOT / "expansion-plan.png"
    image.save(out)
    print(out)


if __name__ == "__main__":
    main()
