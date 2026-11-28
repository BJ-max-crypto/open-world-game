"""Phase 1 downtown blocks. Does not modify Solara, Caliza, Vanta, or Cayo.

    blender -b -P blender/downtown/build_phase1.py -- --render --export
"""

from __future__ import annotations

import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

ROOT = os.path.dirname(os.path.abspath(__file__))
RENDER_DIR = os.path.join(ROOT, "renders", "phase1")
BLEND_PATH = os.path.join(ROOT, "downtown-phase1.blend")
GLB_PATH = os.path.abspath(os.path.join(ROOT, "..", "..", "public", "models", "buildings", "downtown-phase1.glb"))
METRICS_PATH = os.path.abspath(os.path.join(ROOT, "..", "..", "src", "game", "world", "solara", "phase1-metrics.json"))
SOLARA_BLEND = os.path.abspath(os.path.join(ROOT, "..", "solara", "solara-tower.blend"))
DOWNTOWN_BLEND = os.path.join(ROOT, "downtown-block.blend")
HDR = os.path.abspath(os.path.join(ROOT, "..", "..", "public", "textures", "sky", "kloppenheim_1k.hdr"))

LUMEN = (90.0, 76.0)
BRISA = (92.0, -4.0)
MERCADO = (-98.0, -86.0)
NAVE = (-98.0, 78.0)


def argv_after_dd() -> list[str]:
    if "--" not in sys.argv:
        return []
    return sys.argv[sys.argv.index("--") + 1 :]


def V(x: float, z: float, y: float) -> Vector:
    return Vector((x, -z, y))


def clear_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system = "METRIC"
    bpy.context.scene.unit_settings.scale_length = 1.0


def collection(name: str):
    col = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(col)
    return col


def material(name, color, rough=0.55, metal=0.0, emission=0.0, emit=None, alpha=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    bsdf.inputs["Alpha"].default_value = alpha
    if emission > 0:
        bsdf.inputs["Emission Color"].default_value = (*(emit or color), 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission
    if alpha < 0.98 and hasattr(mat, "surface_render_method"):
        mat.surface_render_method = "BLENDED"
    return mat


def make_mats():
    return {
        "stone": material("P1_Stone", (0.86, 0.82, 0.74), rough=0.62),
        "limestone": material("P1_Lime", (0.9, 0.86, 0.78), rough=0.5),
        "stucco": material("P1_Stucco", (0.9, 0.78, 0.66), rough=0.72),
        "coral": material("P1_Coral", (0.72, 0.34, 0.28), rough=0.55),
        "wood": material("P1_Wood", (0.55, 0.38, 0.24), rough=0.48, metal=0.15),
        "concrete": material("P1_Concrete", (0.72, 0.71, 0.68), rough=0.78),
        "dark": material("P1_Dark", (0.22, 0.23, 0.24), rough=0.45, metal=0.4),
        "glass": material("P1_Glass", (0.55, 0.7, 0.74), rough=0.06, metal=0.12),
        "glass_g": material("P1_GreenGlass", (0.45, 0.62, 0.6), rough=0.05, metal=0.2),
        "rail": material("P1_Rail", (0.82, 0.88, 0.9), rough=0.08, alpha=0.4),
        "water": material("P1_Pool", (0.25, 0.55, 0.62), rough=0.08, metal=0.05),
        "plant": material("P1_Plant", (0.16, 0.38, 0.2), rough=0.7),
        "trunk": material("P1_Trunk", (0.42, 0.32, 0.2), rough=0.82),
        "glow": material("P1_Glow", (1.0, 0.78, 0.55), rough=0.4, emission=1.6, emit=(1.0, 0.72, 0.45)),
        "pave": material("P1_Pave", (0.78, 0.75, 0.7), rough=0.8),
        "asphalt": material("P1_Asphalt", (0.18, 0.19, 0.2), rough=0.92),
        "walk": material("P1_Walk", (0.74, 0.72, 0.67), rough=0.86),
    }


class Bucket:
    def __init__(self, name, mat, col):
        self.bm = bmesh.new()
        self.name = name
        self.mat = mat
        self.col = col

    def face(self, pts):
        verts = [self.bm.verts.new(p) for p in pts]
        try:
            self.bm.faces.new(verts)
        except ValueError:
            pass

    def finish(self):
        if not self.bm.faces:
            self.bm.free()
            return None
        bmesh.ops.remove_doubles(self.bm, verts=list(self.bm.verts), dist=0.004)
        self.bm.normal_update()
        mesh = bpy.data.meshes.new(self.name)
        self.bm.to_mesh(mesh)
        self.bm.free()
        obj = bpy.data.objects.new(self.name, mesh)
        obj.data.materials.append(self.mat)
        self.col.objects.link(obj)
        return obj


def bridge(bucket, lower, upper):
    n = len(lower)
    for i in range(n):
        j = (i + 1) % n
        bucket.face([lower[i], lower[j], upper[j], upper[i]])


def extrude(bucket, pts, y0, y1, cap_top=False):
    lower = [V(x, z, y0) for x, z in pts]
    upper = [V(x, z, y1) for x, z in pts]
    bridge(bucket, lower, upper)
    if cap_top:
        bucket.face(upper)


def wall_box(bucket, x0, z0, y0, x1, z1, y1):
    corners = [(x0, z0), (x1, z0), (x1, z1), (x0, z1)]
    extrude(bucket, corners, y0, y1, cap_top=True)
    bucket.face([V(x, z, y0) for x, z in reversed(corners)])


def move(pts, origin):
    return [(p[0] + origin[0], p[1] + origin[1]) for p in pts]


def bounds(pts):
    xs = [p[0] for p in pts]
    zs = [p[1] for p in pts]
    return min(xs), max(xs), min(zs), max(zs)


def chamfer_rect(hx, hz, cut):
    return [
        (-hx, -hz + cut),
        (-hx, hz),
        (hx - cut, hz),
        (hx, hz - cut),
        (hx, -hz),
        (hx - cut, -hz),
        (-hx + cut, -hz),
    ]


def rect(hx, hz):
    return [(-hx, -hz), (hx, -hz), (hx, hz), (-hx, hz)]


def build_lumen(mats, col):
    """Hotel. Chamfered slab, south balconies, a pool deck on the setback."""
    stone = Bucket("Lumen_Stone", mats["limestone"], col)
    glass = Bucket("Lumen_Glass", mats["glass_g"], col)
    rail = Bucket("Lumen_Rail", mats["rail"], col)
    wood = Bucket("Lumen_Wood", mats["wood"], col)
    pool = Bucket("Lumen_Pool", mats["water"], col)
    glow = Bucket("Lumen_Glow", mats["glow"], col)
    local = chamfer_rect(13.5, 9.5, 6.0)
    pts = move(local, LUMEN)
    podium = move(chamfer_rect(15.2, 11.0, 5.0), LUMEN)
    extrude(stone, podium, 0.0, 1.2)
    extrude(stone, podium, 7.2, 8.2)
    for i, p in enumerate(podium):
        j = (i + 1) % len(podium)
        q = podium[j]
        south = p[1] < LUMEN[1] - 6
        if south:
            glass.face([V(p[0], p[1] + 0.4, 0.3), V(q[0], q[1] + 0.4, 0.3), V(q[0], q[1] + 0.4, 7.0), V(p[0], p[1] + 0.4, 7.0)])
            glow.face([V(p[0], p[1] + 0.8, 1.2), V(q[0], q[1] + 0.8, 1.2), V(q[0], q[1] + 0.8, 2.4), V(p[0], p[1] + 0.8, 2.4)])
        else:
            glass.face([V(*p, 1.4), V(*q, 1.4), V(*q, 6.9), V(*p, 6.9)])
    floor_h = 3.45
    floors = 16
    base = 8.2
    for n in range(floors):
        y = base + n * floor_h
        extrude(stone, pts, y, y + 0.42)
        for i, p in enumerate(pts):
            q = pts[(i + 1) % len(pts)]
            south = p[1] < LUMEN[1] - 4 and q[1] < LUMEN[1] - 4
            if south:
                a = (p[0], p[1] - 1.25)
                b = (q[0], q[1] - 1.25)
                stone.face([V(*p, y + 0.42), V(*q, y + 0.42), V(*b, y + 0.42), V(*a, y + 0.42)])
                stone.face([V(*a, y + 0.42), V(*b, y + 0.42), V(*b, y + 0.62), V(*a, y + 0.62)])
                rail.face([V(*a, y + 0.62), V(*b, y + 0.62), V(*b, y + 1.45), V(*a, y + 1.45)])
                glass.face([V(*p, y + 0.5), V(*q, y + 0.5), V(*q, y + floor_h - 0.05), V(*p, y + floor_h - 0.05)])
            else:
                glass.face([V(*p, y + 0.45), V(*q, y + 0.45), V(*q, y + floor_h - 0.05), V(*p, y + floor_h - 0.05)])
                if i % 2 == 0:
                    wood.face([
                        V(p[0] - 0.06, p[1] - 0.06, y + 0.45),
                        V(p[0] + 0.06, p[1] + 0.06, y + 0.45),
                        V(p[0] + 0.06, p[1] + 0.06, y + floor_h),
                        V(p[0] - 0.06, p[1] - 0.06, y + floor_h),
                    ])
    roof = base + floors * floor_h
    upper = move(chamfer_rect(8.5, 6.0, 3.5), LUMEN)
    extrude(stone, pts, roof, roof + 0.4, cap_top=True)
    extrude(glass, upper, roof + 0.4, roof + 6.2)
    extrude(stone, upper, roof + 6.2, roof + 6.6, cap_top=True)
    pool.face([
        V(LUMEN[0] - 5, LUMEN[1] - 3, roof + 0.55),
        V(LUMEN[0] + 4, LUMEN[1] - 3, roof + 0.55),
        V(LUMEN[0] + 4, LUMEN[1] + 2.5, roof + 0.55),
        V(LUMEN[0] - 5, LUMEN[1] + 2.5, roof + 0.55),
    ])
    for x in (-4, 0, 4):
        wall_box(wood, LUMEN[0] + x - 0.08, LUMEN[1] - 5, roof + 6.6, LUMEN[0] + x + 0.08, LUMEN[1] + 5, roof + 9.2)
    for bucket in (stone, glass, rail, wood, pool, glow):
        bucket.finish()
    return podium, roof + 9.2


def build_brisa(mats, col):
    """Three setbacks. Balconies only on the south of each tier."""
    stone = Bucket("Brisa_Stone", mats["stone"], col)
    glass = Bucket("Brisa_Glass", mats["glass"], col)
    wood = Bucket("Brisa_Wood", mats["wood"], col)
    rail = Bucket("Brisa_Rail", mats["rail"], col)
    plant = Bucket("Brisa_Plant", mats["plant"], col)
    tiers = [(11.2, 8.4, 0.0, 20.0), (8.0, 6.0, 20.0, 38.0), (5.2, 4.0, 38.0, 54.0)]
    base_pts = move(rect(tiers[0][0], tiers[0][1]), BRISA)
    for hx, hz, y0, y1 in tiers:
        pts = move(rect(hx, hz), BRISA)
        floors = int(round((y1 - y0) / 3.2))
        floor_h = (y1 - y0) / floors
        for n in range(floors):
            y = y0 + n * floor_h
            extrude(stone, pts, y, y + 0.35)
            south = [p for p in pts if p[1] < BRISA[1]]
            # South edge is the two corners at -hz.
            a = (BRISA[0] - hx, BRISA[1] - hz)
            b = (BRISA[0] + hx, BRISA[1] - hz)
            nose_a = (a[0], a[1] - 1.35)
            nose_b = (b[0], b[1] - 1.35)
            stone.face([V(*a, y + 0.35), V(*b, y + 0.35), V(*nose_b, y + 0.35), V(*nose_a, y + 0.35)])
            stone.face([V(*nose_a, y + 0.35), V(*nose_b, y + 0.35), V(*nose_b, y + 0.55), V(*nose_a, y + 0.55)])
            rail.face([V(*nose_a, y + 0.55), V(*nose_b, y + 0.55), V(*nose_b, y + 1.35), V(*nose_a, y + 1.35)])
            wood.face([V(*nose_a, y + 0.28), V(*nose_b, y + 0.28), V(*b, y + 0.28), V(*a, y + 0.28)])
            glass.face([V(*a, y + 0.45), V(*b, y + 0.45), V(*b, y + floor_h - 0.08), V(*a, y + floor_h - 0.08)])
            for edge_a, edge_b in (
                ((BRISA[0] - hx, BRISA[1] - hz), (BRISA[0] - hx, BRISA[1] + hz)),
                ((BRISA[0] + hx, BRISA[1] - hz), (BRISA[0] + hx, BRISA[1] + hz)),
                ((BRISA[0] - hx, BRISA[1] + hz), (BRISA[0] + hx, BRISA[1] + hz)),
            ):
                glass.face([
                    V(*edge_a, y + 0.45),
                    V(*edge_b, y + 0.45),
                    V(*edge_b, y + floor_h - 0.08),
                    V(*edge_a, y + floor_h - 0.08),
                ])
            if n % 2 == 0:
                wall_box(plant, BRISA[0] - 0.4, BRISA[1] - hz - 0.9, y + 0.55, BRISA[0] + 0.4, BRISA[1] - hz - 0.2, y + 1.15)
        extrude(stone, pts, y1 - 0.25, y1, cap_top=True)
    for bucket in (stone, glass, wood, rail, plant):
        bucket.finish()
    return base_pts, 54.0


def build_mercado(mats, col):
    """Long retail block. Arcade, coral awnings, punched upper windows."""
    stucco = Bucket("Mercado_Stucco", mats["stucco"], col)
    coral = Bucket("Mercado_Coral", mats["coral"], col)
    glass = Bucket("Mercado_Glass", mats["glass"], col)
    stone = Bucket("Mercado_Stone", mats["stone"], col)
    glow = Bucket("Mercado_Glow", mats["glow"], col)
    hx, hz = 20.0, 7.6
    pts = move(rect(hx, hz), MERCADO)
    inner = move(rect(hx - 1.6, hz - 1.5), MERCADO)
    retail_h = 4.8
    # Arcade on the north face, toward Harbor Avenue.
    extrude(stucco, pts, retail_h, retail_h + 0.4)
    for i in range(-4, 5):
        x = MERCADO[0] + i * 4.2
        wall_box(stone, x - 0.22, MERCADO[1] + hz - 0.3, 0.0, x + 0.22, MERCADO[1] + hz + 0.15, retail_h)
    glass.face([
        V(MERCADO[0] - hx + 1.8, MERCADO[1] + hz - 1.5, 0.2),
        V(MERCADO[0] + hx - 1.8, MERCADO[1] + hz - 1.5, 0.2),
        V(MERCADO[0] + hx - 1.8, MERCADO[1] + hz - 1.5, retail_h - 0.15),
        V(MERCADO[0] - hx + 1.8, MERCADO[1] + hz - 1.5, retail_h - 0.15),
    ])
    glow.face([
        V(MERCADO[0] - 6, MERCADO[1] + hz - 1.9, 1.1),
        V(MERCADO[0] + 6, MERCADO[1] + hz - 1.9, 1.1),
        V(MERCADO[0] + 6, MERCADO[1] + hz - 1.9, 2.3),
        V(MERCADO[0] - 6, MERCADO[1] + hz - 1.9, 2.3),
    ])
    for i, color_shift in enumerate((-8, 0, 8)):
        z0 = MERCADO[1] + hz
        z1 = z0 + 1.6
        x = MERCADO[0] + color_shift
        coral.face([
            V(x - 3.2, z0, 3.15),
            V(x + 3.2, z0, 3.15),
            V(x + 3.2, z1, 3.35),
            V(x - 3.2, z1, 3.35),
        ])
    # Other three faces of the shopfront, set back.
    for a, b in (
        ((MERCADO[0] - hx + 0.4, MERCADO[1] - hz + 1.4), (MERCADO[0] + hx - 0.4, MERCADO[1] - hz + 1.4)),
        ((MERCADO[0] - hx + 1.4, MERCADO[1] - hz + 1.4), (MERCADO[0] - hx + 1.4, MERCADO[1] + hz - 1.4)),
        ((MERCADO[0] + hx - 1.4, MERCADO[1] - hz + 1.4), (MERCADO[0] + hx - 1.4, MERCADO[1] + hz - 1.4)),
    ):
        glass.face([V(*a, 0.3), V(*b, 0.3), V(*b, retail_h - 0.2), V(*a, retail_h - 0.2)])
    floor_h = 3.35
    floors = 4
    for n in range(floors):
        y = retail_h + 0.4 + n * floor_h
        extrude(stucco, pts, y, y + 0.7)
        extrude(stucco, pts, y + floor_h - 0.45, y + floor_h)
        # Windows in bays, not a continuous band. Wider bay every third.
        for i in range(-4, 5):
            half = 0.85 if i % 3 else 1.25
            x = MERCADO[0] + i * 4.2
            for z, sign in ((MERCADO[1] + hz, 1), (MERCADO[1] - hz, -1)):
                glass.face([
                    V(x - half, z - sign * 0.15, y + 0.8),
                    V(x + half, z - sign * 0.15, y + 0.8),
                    V(x + half, z - sign * 0.15, y + floor_h - 0.5),
                    V(x - half, z - sign * 0.15, y + floor_h - 0.5),
                ])
                if i % 2 == 0 and sign == 1:
                    rail_z = z + 0.55
                    stone.face([
                        V(x - half, z, y + 0.75),
                        V(x + half, z, y + 0.75),
                        V(x + half, rail_z, y + 0.75),
                        V(x - half, rail_z, y + 0.75),
                    ])
    roof = retail_h + 0.4 + floors * floor_h
    extrude(stucco, pts, roof, roof + 0.7, cap_top=True)
    wall_box(stone, MERCADO[0] + 10, MERCADO[1] - 2, roof + 0.7, MERCADO[0] + 14, MERCADO[1] + 2, roof + 3.1)
    for bucket in (stucco, coral, glass, stone, glow):
        bucket.finish()
    return pts, roof + 3.1


def build_nave(mats, col):
    """Parking structure. Open decks, a shopfront on the east side, a planted screen."""
    concrete = Bucket("Nave_Concrete", mats["concrete"], col)
    dark = Bucket("Nave_Dark", mats["dark"], col)
    glass = Bucket("Nave_Glass", mats["glass"], col)
    plant = Bucket("Nave_Plant", mats["plant"], col)
    glow = Bucket("Nave_Glow", mats["glow"], col)
    hx, hz = 17.5, 11.5
    pts = move(rect(hx, hz), NAVE)
    retail = 4.2
    extrude(concrete, pts, 0.0, 0.4)
    extrude(concrete, pts, retail - 0.35, retail)
    # East shopfront.
    glass.face([
        V(NAVE[0] + hx - 0.3, NAVE[1] - hz + 1.5, 0.3),
        V(NAVE[0] + hx - 0.3, NAVE[1] + hz - 1.5, 0.3),
        V(NAVE[0] + hx - 0.3, NAVE[1] + hz - 1.5, retail - 0.4),
        V(NAVE[0] + hx - 0.3, NAVE[1] - hz + 1.5, retail - 0.4),
    ])
    glow.face([
        V(NAVE[0] + hx - 0.7, NAVE[1] - 4, 1.0),
        V(NAVE[0] + hx - 0.7, NAVE[1] + 4, 1.0),
        V(NAVE[0] + hx - 0.7, NAVE[1] + 4, 2.2),
        V(NAVE[0] + hx - 0.7, NAVE[1] - 4, 2.2),
    ])
    decks = 5
    deck_h = 3.05
    for n in range(decks):
        y = retail + n * deck_h
        extrude(concrete, pts, y, y + 0.28, cap_top=True)
        # Parapet with a gap so the deck reads as open. Posts every 4 m.
        for face_name, axis in (("n", 1), ("s", -1)):
            z = NAVE[1] + axis * hz
            for i in range(-3, 4):
                x = NAVE[0] + i * 4.4
                wall_box(concrete, x - 0.18, z - 0.16, y + 0.28, x + 0.18, z + 0.16, y + 1.35)
            dark.face([
                V(NAVE[0] - hx, z, y + deck_h - 0.45),
                V(NAVE[0] + hx, z, y + deck_h - 0.45),
                V(NAVE[0] + hx, z, y + deck_h - 0.08),
                V(NAVE[0] - hx, z, y + deck_h - 0.08),
            ])
        # Planted screen on the west face, every other bay.
        for i in range(-3, 4):
            if i % 2:
                continue
            z = NAVE[1] + i * 3.2
            wall_box(plant, NAVE[0] - hx - 0.15, z - 0.8, y + 0.4, NAVE[0] - hx + 0.15, z + 0.8, y + deck_h - 0.1)
        # Ramp hint on the south end: a darker sloping band approximated as steps.
        if n < decks - 1:
            rise = deck_h / 4
            for step in range(4):
                z0 = NAVE[1] - hz + 1.2 + step * 1.6
                wall_box(dark, NAVE[0] + hx - 4.2, z0, y + step * rise, NAVE[0] + hx - 0.8, z0 + 1.5, y + (step + 1) * rise)
    roof = retail + decks * deck_h
    extrude(concrete, pts, roof, roof + 0.3, cap_top=True)
    for bucket in (concrete, dark, glass, plant, glow):
        bucket.finish()
    return pts, roof + 0.3


def add_palm(mats, col, x, z):
    trunk = Bucket(f"PalmTrunk_{x:.0f}_{z:.0f}", mats["trunk"], col)
    frond = Bucket(f"PalmFrond_{x:.0f}_{z:.0f}", mats["plant"], col)
    sides = 6
    prev = None
    top = (x, z, 7.0)
    for i in range(7):
        t = i / 6
        r = 0.22 * (1 - t) + 0.08 * t
        y = t * 7.0
        loop = []
        for k in range(sides):
            a = (k / sides) * math.tau
            loop.append(V(x + math.cos(a) * r, z + math.sin(a) * r, y))
        if prev:
            bridge(trunk, prev, loop)
        prev = loop
        top = (x, z, y)
    trunk.finish()
    for f in range(8):
        ang = (f / 8) * math.tau
        prev_e = None
        for s in range(4):
            t = s / 3
            dist = t * 3.2
            cy = top[2] + math.sin(t * math.pi) * 0.4 - t * t * 0.9
            cx = top[0] + math.cos(ang) * dist
            cz = top[1] + math.sin(ang) * dist
            width = 0.08 + math.sin(t * math.pi) * 0.28
            a = V(cx - math.sin(ang) * width, cz + math.cos(ang) * width, cy)
            b = V(cx + math.sin(ang) * width, cz - math.cos(ang) * width, cy)
            if prev_e:
                frond.face([prev_e[0], prev_e[1], b, a])
            prev_e = (a, b)
    frond.finish()


def add_light(mats, col, x, z):
    metal = Bucket(f"Lamp_{x:.0f}_{z:.0f}", mats["dark"], col)
    glow = Bucket(f"LampGlow_{x:.0f}_{z:.0f}", mats["glow"], col)
    wall_box(metal, x - 0.08, z - 0.08, 0.0, x + 0.08, z + 0.08, 6.4)
    wall_box(metal, x - 0.08, z - 0.08, 6.25, x + 1.6, z + 0.08, 6.42)
    wall_box(glow, x + 1.15, z - 0.22, 6.0, x + 1.85, z + 0.22, 6.22)
    metal.finish()
    glow.finish()


def landscape(mats):
    col = collection("Phase1_Landscape")
    pave = Bucket("Phase1_Plaza", mats["pave"], col)
    hedge = Bucket("Phase1_Hedge", mats["plant"], col)
    # Southeast plaza, open toward the future marina.
    wall_box(pave, 64, -112, 0.03, 118, -62, 0.06)
    wall_box(hedge, 68, -108, 0.06, 114, -106.5, 0.55)
    wall_box(hedge, 68, -68, 0.06, 114, -66.6, 0.55)
    pave.finish()
    hedge.finish()
    palms = [
        (70, 58), (108, 58), (70, 96), (108, 96),
        (70, 12), (112, 12), (70, -20), (112, -20),
        (-78, -70), (-118, -70), (-78, -102), (-118, -102),
        (-78, 60), (-118, 60), (-78, 96),
        (80, -90), (104, -90),
        (-60, 110), (40, 110), (100, -116),
    ]
    for x, z in palms:
        add_palm(mats, col, x, z)
    for x, z in ((-142, -20), (-142, 20), (130, -20), (130, 40), (20, 118), (-20, -124), (60, -124)):
        add_light(mats, col, x, z)


def review_ground(mats):
    col = collection("RenderGround")
    asphalt = Bucket("ReviewRoads", mats["asphalt"], col)
    walks = Bucket("ReviewWalks", mats["walk"], col)
    ground = Bucket("ReviewGround", mats["pave"], col)
    ground.face([V(-200, -180, 0), V(200, -180, 0), V(200, 170, 0), V(-200, 170, 0)])
    ground.finish()

    def rect_face(bucket, x, z, w, d, y):
        bucket.face([
            V(x - w / 2, z - d / 2, y),
            V(x + w / 2, z - d / 2, y),
            V(x + w / 2, z + d / 2, y),
            V(x - w / 2, z + d / 2, y),
        ])

    for x, z, w, d in (
        (0, -50, 112, 8), (0, 38, 112, 8), (52, -6, 8, 96), (-52, -6, 8, 96),
        (-6, -124, 284, 12), (-5, 118, 330, 18),
        (-142, -86, 12, 64), (-142, -6, 12, 80), (-142, 75.5, 12, 67),
        (130, -86, 12, 64), (130, -6, 12, 80), (130, 75.5, 12, 67),
        (-129, -50, 38, 8), (118, -50, 36, 8), (-129, 38, 38, 8), (118, 38, 36, 8),
        (-52, -110, 8, 16), (-52, 104.5, 8, 9), (52, -86, 8, 64), (52, 75.5, 8, 67),
    ):
        rect_face(asphalt, x, z, w, d, 0.02)
    asphalt.finish()
    walks.finish()


def aabb(pts, height, ident):
    x0, x1, z0, z1 = bounds(pts)
    return {
        "id": ident,
        "x": round((x0 + x1) / 2, 2),
        "z": round((z0 + z1) / 2, 2),
        "hx": round((x1 - x0) / 2 + 0.4, 2),
        "hz": round((z1 - z0) / 2 + 0.4, 2),
        "height": round(height, 2),
    }


def write_metrics(buildings):
    data = {
        "buildings": buildings,
        "roads": [
            {"id": "wharf", "x": -6, "z": -124, "w": 284, "d": 12},
            {"id": "meridian", "x": -5, "z": 118, "w": 330, "d": 18},
            {"id": "palm-south", "x": -142, "z": -86, "w": 12, "d": 64},
            {"id": "palm-mid", "x": -142, "z": -6, "w": 12, "d": 80},
            {"id": "palm-north", "x": -142, "z": 75.5, "w": 12, "d": 67},
            {"id": "bay-south", "x": 130, "z": -86, "w": 12, "d": 64},
            {"id": "bay-mid", "x": 130, "z": -6, "w": 12, "d": 80},
            {"id": "bay-north", "x": 130, "z": 75.5, "w": 12, "d": 67},
            {"id": "harbor-far-west", "x": -129, "z": -50, "w": 38, "d": 8},
            {"id": "harbor-far-east", "x": 118, "z": -50, "w": 36, "d": 8},
            {"id": "north-far-west", "x": -129, "z": 38, "w": 38, "d": 8},
            {"id": "north-far-east", "x": 118, "z": 38, "w": 36, "d": 8},
            {"id": "west-to-wharf", "x": -52, "z": -110, "w": 8, "d": 16},
            {"id": "west-to-meridian", "x": -52, "z": 104.5, "w": 8, "d": 9},
            {"id": "east-to-wharf", "x": 52, "z": -86, "w": 8, "d": 64},
            {"id": "east-to-meridian", "x": 52, "z": 75.5, "w": 8, "d": 67},
        ],
        "sidewalks": [
            {"x": -96, "z": -114.5, "w": 80, "d": 3.6},
            {"x": 0, "z": -114.5, "w": 96, "d": 3.6},
            {"x": 90, "z": -114.5, "w": 68, "d": 3.6},
            {"x": -6, "z": -133.5, "w": 260, "d": 3.6},
            {"x": -96, "z": 105.5, "w": 80, "d": 4},
            {"x": 0, "z": 105.5, "w": 96, "d": 4},
            {"x": 90, "z": 105.5, "w": 68, "d": 4},
            {"x": -132.5, "z": -86, "w": 3.6, "d": 60},
            {"x": -132.5, "z": -6, "w": 3.6, "d": 80},
            {"x": -132.5, "z": 75.5, "w": 3.6, "d": 67},
            {"x": -151.5, "z": -4, "w": 3.6, "d": 220},
            {"x": 120.5, "z": -86, "w": 3.6, "d": 60},
            {"x": 120.5, "z": -6, "w": 3.6, "d": 80},
            {"x": 120.5, "z": 75.5, "w": 3.6, "d": 67},
            {"x": 139.5, "z": -4, "w": 3.6, "d": 220},
        ],
        "crosswalks": [
            {"x": -142, "z": -124},
            {"x": -52, "z": -124},
            {"x": 52, "z": -124},
            {"x": 130, "z": -124},
            {"x": -142, "z": -50},
            {"x": 130, "z": -50},
            {"x": -142, "z": 38},
            {"x": 130, "z": 38},
            {"x": -142, "z": 118},
            {"x": -52, "z": 118},
            {"x": 52, "z": 118},
            {"x": 130, "z": 118},
        ],
        "stalls": [
            {"x": 148, "z": 16, "w": 10, "d": 22},
        ],
        "note": "Phase 1 only. Solara, Caliza, Vanta, and Cayo are not in this file.",
    }
    os.makedirs(os.path.dirname(METRICS_PATH), exist_ok=True)
    with open(METRICS_PATH, "w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2)
        handle.write("\n")
    print("METRICS", METRICS_PATH)


def export_glb():
    os.makedirs(os.path.dirname(GLB_PATH), exist_ok=True)
    for obj in bpy.data.objects:
        keep = any(col.name.startswith("Phase1_") or col.name.startswith("Lumen_") or col.name.startswith("Brisa_") or col.name.startswith("Mercado_") or col.name.startswith("Nave_") for col in obj.users_collection)
        # Buildings live in Phase1_* collections. Select by collection prefix.
        keep = any(col.name.startswith("Phase1_") for col in obj.users_collection)
        obj.select_set(keep)
    bpy.ops.export_scene.gltf(
        filepath=GLB_PATH,
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        use_selection=True,
        export_cameras=False,
        export_lights=False,
        export_materials="EXPORT",
    )
    print("EXPORTED", GLB_PATH, os.path.getsize(GLB_PATH))


def append_context():
    for path in (SOLARA_BLEND, DOWNTOWN_BLEND):
        if not os.path.exists(path):
            print("MISSING", path)
            continue
        with bpy.data.libraries.load(path) as (src, dst):
            skip = {"Cameras", "RenderGround", "ScaleFigure", "Massing"}
            dst.collections = [name for name in src.collections if name not in skip]
        for col in dst.collections:
            if col is None:
                continue
            bpy.context.scene.collection.children.link(col)
        print("APPENDED", path)


def render_views():
    os.makedirs(RENDER_DIR, exist_ok=True)
    world = bpy.data.worlds.new("PhaseSky")
    bpy.context.scene.world = world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    links = world.node_tree.links
    bg = nodes.get("Background")
    if bg and os.path.exists(HDR):
        env = nodes.new("ShaderNodeTexEnvironment")
        env.image = bpy.data.images.load(HDR, check_existing=True)
        links.new(env.outputs["Color"], bg.inputs["Color"])
        bg.inputs["Strength"].default_value = 0.5
    sun_data = bpy.data.lights.new("Sun", "SUN")
    sun_data.energy = 3.2
    sun_data.color = (1.0, 0.96, 0.9)
    sun = bpy.data.objects.new("Sun", sun_data)
    bpy.context.scene.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(54), 0.0, math.radians(28))
    specs = [
        ("aerial", (-40, 30, 150), (10, 10, 30), 18),
        ("street", (-20, 70, 1.7), (70, -10, 12), 24),
        ("blocks", (40, 140, 1.8), (20, 20, 16), 22),
    ]
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 800
    scene.eevee.taa_render_samples = 12
    only = None
    args = argv_after_dd()
    if "--only" in args:
        only = set(args[args.index("--only") + 1].split(","))
    for name, loc, target, lens in specs:
        if only and name not in only:
            continue
        data = bpy.data.cameras.new(name)
        obj = bpy.data.objects.new(name, data)
        bpy.context.scene.collection.objects.link(obj)
        obj.location = loc
        direction = Vector(target) - Vector(loc)
        obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
        obj.data.lens = lens
        obj.data.clip_end = 2500
        scene.camera = obj
        scene.render.filepath = os.path.join(RENDER_DIR, f"{name}.png")
        bpy.ops.render.render(write_still=True)
        print("RENDERED", scene.render.filepath)


def main():
    args = argv_after_dd()
    clear_scene()
    mats = make_mats()
    review_ground(mats)
    lumen_col = collection("Phase1_Lumen")
    brisa_col = collection("Phase1_Brisa")
    mercado_col = collection("Phase1_Mercado")
    nave_col = collection("Phase1_Nave")
    lumen_pts, lumen_h = build_lumen(mats, lumen_col)
    brisa_pts, brisa_h = build_brisa(mats, brisa_col)
    mercado_pts, mercado_h = build_mercado(mats, mercado_col)
    nave_pts, nave_h = build_nave(mats, nave_col)
    landscape(mats)
    write_metrics([
        aabb(lumen_pts, lumen_h, "lumen"),
        aabb(brisa_pts, brisa_h, "brisa"),
        aabb(mercado_pts, mercado_h, "mercado"),
        aabb(nave_pts, nave_h, "nave"),
    ])
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
    print("SAVED", BLEND_PATH)
    if "--export" in args:
        export_glb()
    if "--render" in args:
        append_context()
        render_views()


if __name__ == "__main__":
    main()
