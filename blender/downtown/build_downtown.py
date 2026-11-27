"""Three buildings and street trees around Solara. Solara itself is not rebuilt.

World positions are Three.js meters: +X east, +Z north, +Y up.
Blender stores (x, -z, y). The GLB is placed at the origin in the game.

    blender -b -P blender/downtown/build_downtown.py -- --render --export
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
RENDER_DIR = os.path.join(ROOT, "renders")
BLEND_PATH = os.path.join(ROOT, "downtown-block.blend")
GLB_PATH = os.path.abspath(os.path.join(ROOT, "..", "..", "public", "models", "buildings", "downtown-block.glb"))
METRICS_PATH = os.path.abspath(os.path.join(ROOT, "..", "..", "src", "game", "world", "solara", "downtown-metrics.json"))
SOLARA_BLEND = os.path.abspath(os.path.join(ROOT, "..", "solara", "solara-tower.blend"))

# Centers and heights. Footprints are measured after the outlines are built.
CALIZA = (-80.0, 4.0)
VANTA = (8.0, 68.0)
CAYO = (20.0, -76.0)
CALIZA_H = 144.0
VANTA_H = 112.0
CAYO_H = 35.0


def argv_after_dd() -> list[str]:
    if "--" not in sys.argv:
        return []
    return sys.argv[sys.argv.index("--") + 1 :]


def V(x: float, z: float, y: float) -> Vector:
    return Vector((x, -z, y))


def clamp(v: float, a: float, b: float) -> float:
    return max(a, min(b, v))


def clear_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0


def collection(name: str) -> bpy.types.Collection:
    col = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(col)
    return col


def material(name, color, rough=0.55, metal=0.0, emission=0.0, emit=None, alpha=1.0, coat=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    bsdf.inputs["Coat Weight"].default_value = coat
    bsdf.inputs["Alpha"].default_value = alpha
    bsdf.inputs["IOR"].default_value = 1.5
    bsdf.inputs["Specular IOR Level"].default_value = 0.5
    if emission > 0:
        bsdf.inputs["Emission Color"].default_value = (*(emit or color), 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission
    if alpha < 0.98:
        mat.use_backface_culling = False
        if hasattr(mat, "surface_render_method"):
            mat.surface_render_method = "BLENDED"
    return mat


def make_mats():
    return {
        "stone": material("Caliza_Stone", (0.91, 0.88, 0.82), rough=0.58, coat=0.12),
        "stone_dark": material("Caliza_StoneDark", (0.78, 0.74, 0.68), rough=0.62),
        "bronze": material("Caliza_Bronze", (0.55, 0.38, 0.22), rough=0.32, metal=1.0),
        "glass_a": material("Caliza_Glass", (0.5, 0.64, 0.7), rough=0.06, metal=0.15, coat=0.35),
        "rail": material("Caliza_Rail", (0.82, 0.9, 0.92), rough=0.05, alpha=0.35),
        "plant": material("Leaf", (0.18, 0.36, 0.2), rough=0.72),
        "plant_d": material("LeafDark", (0.1, 0.26, 0.14), rough=0.78),
        "trunk": material("Trunk", (0.42, 0.32, 0.2), rough=0.82),
        "vanta_glass": material("Vanta_Glass", (0.07, 0.16, 0.24), rough=0.04, metal=0.72, coat=0.45),
        "vanta_metal": material("Vanta_Metal", (0.18, 0.2, 0.22), rough=0.28, metal=1.0),
        "vanta_pier": material("Vanta_Pier", (0.8, 0.78, 0.74), rough=0.5),
        "cayo_stucco": material("Cayo_Stucco", (0.93, 0.88, 0.8), rough=0.7),
        "cayo_fin": material("Cayo_Fin", (0.62, 0.42, 0.26), rough=0.45, metal=0.35),
        "cayo_glass": material("Cayo_Glass", (0.75, 0.84, 0.86), rough=0.06, metal=0.05),
        "retail": material("Cayo_Retail", (0.55, 0.7, 0.74), rough=0.04, metal=0.12, alpha=0.28),
        "glow": material("LobbyGlow", (1.0, 0.8, 0.58), rough=0.4, emission=2.4, emit=(1.0, 0.75, 0.5)),
        "soil": material("Soil", (0.28, 0.2, 0.12), rough=0.9),
        "pave": material("PlazaPave", (0.8, 0.77, 0.72), rough=0.78),
        "room": material("Room", (0.45, 0.32, 0.22), rough=0.8, emission=0.35, emit=(0.85, 0.62, 0.38)),
        "asphalt": material("Asphalt", (0.16, 0.17, 0.18), rough=0.92),
        "walk": material("Walk", (0.72, 0.7, 0.66), rough=0.86),
        "paint": material("Paint", (0.9, 0.88, 0.8), rough=0.5),
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
        bmesh.ops.remove_doubles(self.bm, verts=list(self.bm.verts), dist=0.003)
        self.bm.normal_update()
        for edge in self.bm.edges:
            if len(edge.link_faces) == 2:
                edge.smooth = edge.link_faces[0].normal.dot(edge.link_faces[1].normal) > math.cos(math.radians(48))
            else:
                edge.smooth = False
        for face in self.bm.faces:
            face.smooth = True
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


def fan(bucket, pts, y, flip=False):
    accx = sum(p.x for p in pts) / len(pts)
    accy = sum(p.y for p in pts) / len(pts)
    center = Vector((accx, accy, y))
    # pts are blender verts; y here is blender Z
    center = Vector((accx, accy, pts[0].z))
    for i in range(len(pts)):
        j = (i + 1) % len(pts)
        tri = [center, pts[j], pts[i]] if flip else [center, pts[i], pts[j]]
        bucket.face(tri)


def wall_box(bucket, x0, z0, y0, x1, z1, y1):
    corners = [(x0, z0), (x1, z0), (x1, z1), (x0, z1)]
    lower = [V(x, z, y0) for x, z in corners]
    upper = [V(x, z, y1) for x, z in corners]
    bridge(bucket, lower, upper)
    bucket.face(list(reversed(lower)))
    bucket.face(upper)


def cyl(bucket, x, z, radius, y0, y1, sides=12):
    lower, upper = [], []
    for i in range(sides):
        a = (i / sides) * math.tau
        px = x + math.cos(a) * radius
        pz = z + math.sin(a) * radius
        lower.append(V(px, pz, y0))
        upper.append(V(px, pz, y1))
    bridge(bucket, lower, upper)


def outward_normals(pts):
    n = len(pts)
    normals = []
    for i in range(n):
        prev = pts[(i - 1) % n]
        nxt = pts[(i + 1) % n]
        tx = nxt[0] - prev[0]
        tz = nxt[1] - prev[1]
        nx, nz = tz, -tx
        cx = sum(p[0] for p in pts) / n
        cz = sum(p[1] for p in pts) / n
        if nx * (pts[i][0] - cx) + nz * (pts[i][1] - cz) < 0:
            nx, nz = -nx, -nz
        ln = math.hypot(nx, nz) or 1.0
        normals.append((nx / ln, nz / ln))
    return normals


def offset_pts(pts, dist):
    normals = outward_normals(pts)
    return [(p[0] + normals[i][0] * dist, p[1] + normals[i][1] * dist) for i, p in enumerate(pts)]


def move(pts, origin):
    return [(p[0] + origin[0], p[1] + origin[1]) for p in pts]


def bounds(pts):
    xs = [p[0] for p in pts]
    zs = [p[1] for p in pts]
    return min(xs), max(xs), min(zs), max(zs)


def extrude(bucket, pts, y0, y1, cap_top=False, cap_bot=False):
    lower = [V(x, z, y0) for x, z in pts]
    upper = [V(x, z, y1) for x, z in pts]
    bridge(bucket, lower, upper)
    if cap_top:
        bucket.face(upper)
    if cap_bot:
        bucket.face(list(reversed(lower)))


def band_between(bucket, inner, outer, y0, y1):
    """Vertical frame between two plan rings, plus the horizontal soffit at y1 and y0."""
    n = len(inner)
    for i in range(n):
        j = (i + 1) % n
        bucket.face([
            V(*inner[i], y0), V(*inner[j], y0), V(*outer[j], y0), V(*outer[i], y0),
        ])
        bucket.face([
            V(*outer[i], y1), V(*outer[j], y1), V(*inner[j], y1), V(*inner[i], y1),
        ])
        bucket.face([
            V(*outer[i], y0), V(*outer[j], y0), V(*outer[j], y1), V(*outer[i], y1),
        ])
        bucket.face([
            V(*inner[i], y1), V(*inner[j], y1), V(*inner[j], y0), V(*inner[i], y0),
        ])


def super_pts(rx, rz, n_exp, segs, bulge=0.0):
    pts = []
    e = 2.0 / n_exp
    for i in range(segs):
        theta = (i / segs) * math.tau
        c = math.cos(theta)
        s = math.sin(theta)
        x = rx * math.copysign(abs(c) ** e, c) if abs(c) > 1e-8 else 0.0
        z = rz * math.copysign(abs(s) ** e, s) if abs(s) > 1e-8 else 0.0
        if bulge and c > 0 and s < 0:
            w = (c * c) * (s * s) * 4.0
            x += bulge * w
            z -= bulge * 0.45 * w
        pts.append((x, z))
    return pts


def push(p, n, dist):
    return (p[0] + n[0] * dist, p[1] + n[1] * dist)


def prism(bucket, ring, y0, y1, cap=False):
    lower = [V(x, z, y0) for x, z in ring]
    upper = [V(x, z, y1) for x, z in ring]
    bridge(bucket, lower, upper)
    if cap:
        bucket.face(upper)
        bucket.face(list(reversed(lower)))


def fin(bucket, p, n, thick, proud, y0, y1):
    nx, nz = n
    tx, tz = -nz, nx
    a = (p[0] - tx * thick, p[1] - tz * thick)
    b = (p[0] + tx * thick, p[1] + tz * thick)
    c = push(b, (nx, nz), proud)
    d = push(a, (nx, nz), proud)
    prism(bucket, [a, b, c, d], y0, y1, cap=True)


def ledge_span(bucket, a_in, b_in, a_out, b_out, y0, y1):
    bucket.face([V(*a_in, y0), V(*b_in, y0), V(*b_out, y0), V(*a_out, y0)])
    bucket.face([V(*a_out, y1), V(*b_out, y1), V(*b_in, y1), V(*a_in, y1)])
    bucket.face([V(*a_out, y0), V(*b_out, y0), V(*b_out, y1), V(*a_out, y1)])


def lerp2(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def caliza_local():
    # Squarer than Solara's superellipse, with a flat east wall for the trays.
    return super_pts(11.0, 13.6, 4.6, 56, bulge=0.0)


def vanta_local():
    raw = [
        (-14.5, 9.5),
        (1.5, 10.5),
        (9.0, 8.0),
        (13.2, 4.2),
        (9.6, 0.4),
        (14.0, -3.6),
        (10.2, -7.2),
        (4.0, -10.0),
        (-15.0, -8.2),
        (-16.2, 1.5),
    ]
    return subdivide(raw, 2.4)


def subdivide(pts, max_len):
    out = []
    for i, p in enumerate(pts):
        q = pts[(i + 1) % len(pts)]
        dist = math.hypot(q[0] - p[0], q[1] - p[1])
        steps = max(1, int(math.ceil(dist / max_len)))
        for s in range(steps):
            t = s / steps
            out.append((p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t))
    return out


def build_caliza(mats, col):
    """Pale stone residential tower. Balcony trays stack on the east face only
    and belly outward at mid-height. The west face is punched stone, not glass."""
    stone = Bucket("Caliza_Stone", mats["stone"], col)
    dark = Bucket("Caliza_Base", mats["stone_dark"], col)
    glass = Bucket("Caliza_Glass", mats["glass_a"], col)
    bronze = Bucket("Caliza_Bronze", mats["bronze"], col)
    rail = Bucket("Caliza_Rail", mats["rail"], col)
    glow = Bucket("Caliza_Glow", mats["glow"], col)
    plant = Bucket("Caliza_Plant", mats["plant"], col)
    room = Bucket("Caliza_Room", mats["room"], col)
    local = caliza_local()
    origin = CALIZA
    pts = move(local, origin)
    podium = move(offset_pts(local, 4.2), origin)
    normals = outward_normals(pts)
    # Three-storey stone podium. The lobby is a cut in the east face.
    for story in range(3):
        y0 = story * 4.7
        y1 = y0 + 4.7
        extrude(dark if story == 0 else stone, podium, y0, y0 + 0.85)
        extrude(stone, podium, y1 - 0.55, y1)
        inner = move(offset_pts(local, 3.3), origin)
        for i, p in enumerate(podium):
            j = (i + 1) % len(podium)
            ip, iq = inner[i], inner[j]
            east = p[0] > origin[0] + 8 and abs(p[1] - origin[1]) < 5.5
            if story == 0 and east:
                glass.face([V(*ip, 0.2), V(*iq, 0.2), V(*iq, 4.45), V(*ip, 4.45)])
                glow.face([
                    V(ip[0] - 0.35, ip[1], 1.6),
                    V(iq[0] - 0.35, iq[1], 1.6),
                    V(iq[0] - 0.35, iq[1], 3.1),
                    V(ip[0] - 0.35, ip[1], 3.1),
                ])
            else:
                glass.face([V(*ip, y0 + 0.9), V(*iq, y0 + 0.9), V(*iq, y1 - 0.6), V(*ip, y1 - 0.6)])
    corn = move(offset_pts(local, 4.8), origin)
    band_between(stone, podium, corn, 14.1, 14.6)
    # Hedge on the podium roof, set back from the cornice.
    hedge = move(offset_pts(local, 3.6), origin)
    for i, p in enumerate(hedge):
        j = (i + 1) % len(hedge)
        if i % 3 != 0:
            continue
        plant.face([V(*p, 14.6), V(*hedge[j], 14.6), V(*hedge[j], 15.25), V(*p, 15.25)])
    floor_h = 3.55
    floors = 34
    base = 14.6
    for n in range(floors):
        y = base + n * floor_h
        belly = math.sin(math.pi * (n + 0.5) / floors)
        for i, p in enumerate(pts):
            j = (i + 1) % len(pts)
            q = pts[j]
            nx, nz = normals[i]
            east = nx > 0.42
            west = nx < -0.42
            if east:
                depth = 0.85 + 1.55 * belly
                a_out = push(p, (nx, nz), depth)
                b_out = push(q, normals[j], depth)
                ledge_span(stone, p, q, a_out, b_out, y, y + 0.24)
                rail.face([V(*a_out, y + 0.28), V(*b_out, y + 0.28), V(*b_out, y + 1.12), V(*a_out, y + 1.12)])
                bronze.face([V(*a_out, y + 1.08), V(*b_out, y + 1.08), V(*b_out, y + 1.16), V(*a_out, y + 1.16)])
                glass.face([V(*push(p, (nx, nz), -0.08), y + 0.28), V(*push(q, normals[j], -0.08), y + 0.28),
                             V(*push(q, normals[j], -0.08), y + floor_h - 0.02), V(*push(p, (nx, nz), -0.08), y + floor_h - 0.02)])
                if n % 3 == 1 and i % 4 == 0:
                    cx, cz = push(p, (nx, nz), depth * 0.55)
                    wall_box(plant, cx - 0.28, cz - 0.18, y + 0.24, cx + 0.28, cz + 0.18, y + 0.78)
                if n % 2 == 0:
                    room.face([
                        V(*push(p, (nx, nz), -0.7), y + 0.45),
                        V(*push(q, normals[j], -0.7), y + 0.45),
                        V(*push(q, normals[j], -0.7), y + 2.3),
                        V(*push(p, (nx, nz), -0.7), y + 2.3),
                    ])
            elif west:
                # Punched window: stone frame with a reveal, glass at the back of the hole.
                a, b = lerp2(p, q, 0.22), lerp2(p, q, 0.78)
                sill, head = y + 0.55, y + floor_h - 0.42
                stone.face([V(*p, y), V(*a, y), V(*a, y + floor_h), V(*p, y + floor_h)])
                stone.face([V(*b, y), V(*q, y), V(*q, y + floor_h), V(*b, y + floor_h)])
                stone.face([V(*a, y), V(*b, y), V(*b, sill), V(*a, sill)])
                stone.face([V(*a, head), V(*b, head), V(*b, y + floor_h), V(*a, y + floor_h)])
                ai, bi = push(a, (nx, nz), -0.26), push(b, (nx, nz), -0.26)
                stone.face([V(*a, sill), V(*ai, sill), V(*ai, head), V(*a, head)])
                stone.face([V(*bi, sill), V(*b, sill), V(*b, head), V(*bi, head)])
                stone.face([V(*a, sill), V(*b, sill), V(*bi, sill), V(*ai, sill)])
                stone.face([V(*ai, head), V(*bi, head), V(*b, head), V(*a, head)])
                glass.face([V(*ai, sill), V(*bi, sill), V(*bi, head), V(*ai, head)])
            else:
                stone.face([V(*p, y), V(*q, y), V(*q, y + 0.42), V(*p, y + 0.42)])
                glass.face([V(*push(p, (nx, nz), -0.12), y + 0.46), V(*push(q, normals[j], -0.12), y + 0.46),
                             V(*push(q, normals[j], -0.12), y + floor_h - 0.08), V(*push(p, (nx, nz), -0.12), y + floor_h - 0.08)])
                if i % 4 == 0:
                    fin(bronze, p, (nx, nz), 0.045, 0.16, y + 0.46, y + floor_h - 0.08)
    roof = base + floors * floor_h
    mech = move(offset_pts(local, -2.2), origin)
    extrude(stone, pts, roof, roof + 0.3, cap_top=True)
    extrude(glass, mech, roof + 0.3, roof + 3.1)
    extrude(stone, mech, roof + 3.1, roof + 3.45, cap_top=True)
    for x in (-3.5, 0.5, 4.5):
        wall_box(bronze, origin[0] + x - 0.07, origin[1] - 5.2, roof + 3.45, origin[0] + x + 0.07, origin[1] + 5.2, roof + 6.3)
    wall_box(bronze, origin[0] - 5.5, origin[1] - 0.07, roof + 6.1, origin[0] + 5.5, origin[1] + 0.07, roof + 6.35)
    for b in (stone, dark, glass, bronze, rail, glow, plant, room):
        b.finish()
    return podium, roof + 6.35


def build_vanta(mats, col):
    """Angular office tower. Dark blue glass, a commercial spandrel, and
    vertical fins. The roof slopes up to a northeast ridge with a fin comb."""
    glass = Bucket("Vanta_Glass", mats["vanta_glass"], col)
    metal = Bucket("Vanta_Metal", mats["vanta_metal"], col)
    pier = Bucket("Vanta_Pier", mats["vanta_pier"], col)
    glow = Bucket("Vanta_Glow", mats["glow"], col)
    local = vanta_local()
    origin = VANTA
    pts = move(local, origin)
    normals = outward_normals(pts)
    podium = move(offset_pts(local, 2.4), origin)
    extrude(pier, podium, 0.0, 1.35)
    extrude(pier, podium, 9.6, 11.2)
    inner = move(offset_pts(local, 1.5), origin)
    for i, p in enumerate(podium):
        j = (i + 1) % len(podium)
        south = p[1] < origin[1] - 6.5
        if south:
            glass.face([V(*inner[i], 0.25), V(*inner[j], 0.25), V(*inner[j], 9.4), V(*inner[i], 9.4)])
            glow.face([
                V(inner[i][0], inner[i][1] + 0.55, 1.3),
                V(inner[j][0], inner[j][1] + 0.55, 1.3),
                V(inner[j][0], inner[j][1] + 0.55, 2.7),
                V(inner[i][0], inner[i][1] + 0.55, 2.7),
            ])
        else:
            glass.face([V(*inner[i], 1.4), V(*inner[j], 1.4), V(*inner[j], 9.4), V(*inner[i], 9.4)])
            pier.face([V(*p, 1.35), V(*podium[j], 1.35), V(*podium[j], 1.48), V(*p, 1.48)])
    floor_h = 4.15
    floors = 22
    base = 11.2
    for n in range(floors):
        y = base + n * floor_h
        band = y + 0.85
        extrude(metal, pts, y, band)
        for i, p in enumerate(pts):
            j = (i + 1) % len(pts)
            glass.face([V(*p, band), V(*pts[j], band), V(*pts[j], y + floor_h), V(*p, y + floor_h)])
    roof = base + floors * floor_h
    extrude(metal, pts, roof, roof + 0.4, cap_top=True)
    for i, p in enumerate(pts):
        nx, nz = normals[i]
        fin(metal, p, (nx, nz), 0.03, 0.09, base, roof)
        if i % 2 == 0:
            extra = 7.4 if nx < -0.35 else 0.0
            fin(metal, p, (nx, nz), 0.07, 0.72, base, roof + extra)
    # Faceted glass crown on the north half. South edge low, north edge at the ridge.
    wedge = [
        (origin[0] - 6.5, origin[1] + 0.4),
        (origin[0] + 10.5, origin[1] - 0.6),
        (origin[0] + 11.2, origin[1] + 7.2),
        (origin[0] - 7.2, origin[1] + 7.6),
    ]
    low = roof + 2.4

    def wedge_y(z):
        return VANTA_H if z > origin[1] + 3.0 else low

    for i, p in enumerate(wedge):
        q = wedge[(i + 1) % len(wedge)]
        glass.face([
            V(*p, roof + 0.45),
            V(*q, roof + 0.45),
            V(q[0], q[1], wedge_y(q[1])),
            V(p[0], p[1], wedge_y(p[1])),
        ])
    glass.face([V(p[0], p[1], wedge_y(p[1])) for p in wedge])
    metal.face([
        V(wedge[2][0], wedge[2][1], VANTA_H),
        V(wedge[3][0], wedge[3][1], VANTA_H),
        V(wedge[3][0], wedge[3][1], VANTA_H + 0.8),
        V(wedge[2][0], wedge[2][1], VANTA_H + 0.8),
    ])
    for b in (glass, metal, pier, glow):
        b.finish()
    return podium, VANTA_H


def cayo_local():
    # Long bar, round ends. The street face is the long north side.
    return super_pts(21.5, 9.0, 3.2, 52, bulge=0.0)


def build_cayo(mats, col):
    """Horizontal residential bar. Rounded ends, wood fins, planted balconies
    on the street face, a glass retail base, and a solid back."""
    stucco = Bucket("Cayo_Stucco", mats["cayo_stucco"], col)
    wood = Bucket("Cayo_Fin", mats["cayo_fin"], col)
    glass = Bucket("Cayo_Glass", mats["cayo_glass"], col)
    retail = Bucket("Cayo_Retail", mats["retail"], col)
    rail = Bucket("Cayo_Rail", mats["rail"], col)
    glow = Bucket("Cayo_Glow", mats["glow"], col)
    plant = Bucket("Cayo_Plant", mats["plant"], col)
    soil = Bucket("Cayo_Soil", mats["soil"], col)
    room = Bucket("Cayo_Room", mats["room"], col)
    local = cayo_local()
    origin = CAYO
    pts = move(local, origin)
    normals = outward_normals(pts)
    retail_h = 5.1
    inner = move(offset_pts(local, -1.35), origin)
    for i, p in enumerate(inner):
        j = (i + 1) % len(inner)
        north = normals[i][1] > 0.2
        face_mat = retail if north else glass
        face_mat.face([V(*p, 0.12), V(*inner[j], 0.12), V(*inner[j], retail_h - 0.08), V(*p, retail_h - 0.08)])
        if north and i % 8 == 0:
            glow.face([
                V(p[0], p[1] - 0.45, 1.1),
                V(inner[j][0], inner[j][1] - 0.45, 1.1),
                V(inner[j][0], inner[j][1] - 0.45, 2.5),
                V(p[0], p[1] - 0.45, 2.5),
            ])
    # Canopy over the retail sidewalk, and two entrance pairs.
    for i, p in enumerate(pts):
        j = (i + 1) % len(pts)
        if normals[i][1] < 0.45:
            continue
        a = push(p, normals[i], 2.15)
        b = push(pts[j], normals[j], 2.15)
        ledge_span(wood, p, pts[j], a, b, 3.55, 3.78)
    for xoff in (-9.0, 8.5):
        cyl(wood, origin[0] + xoff - 1.15, origin[1] + 7.6, 0.2, 0.0, retail_h, 8)
        cyl(wood, origin[0] + xoff + 1.15, origin[1] + 7.6, 0.2, 0.0, retail_h, 8)
    floor_h = 3.15
    floors = 10
    depth = 1.7
    for i, p in enumerate(pts):
        if normals[i][1] > 0.15 and i % 2 == 0:
            outer = push(p, normals[i], depth - 0.05)
            fin(wood, outer, normals[i], 0.11, 0.34, retail_h + 0.2, retail_h + 0.35 + floors * floor_h)
    for n in range(floors):
        y = retail_h + 0.35 + n * floor_h
        for i, p in enumerate(pts):
            j = (i + 1) % len(pts)
            q = pts[j]
            nx, nz = normals[i]
            street = nz > 0.05 or abs(nx) > 0.72
            if street:
                a_out = push(p, (nx, nz), depth)
                b_out = push(q, normals[j], depth)
                ledge_span(wood, p, q, a_out, b_out, y, y + 0.2)
                rail.face([V(*a_out, y + 0.22), V(*b_out, y + 0.22), V(*b_out, y + 1.05), V(*a_out, y + 1.05)])
                glass.face([
                    V(*push(p, (nx, nz), -0.05), y + 0.25),
                    V(*push(q, normals[j], -0.05), y + 0.25),
                    V(*push(q, normals[j], -0.05), y + floor_h - 0.05),
                    V(*push(p, (nx, nz), -0.05), y + floor_h - 0.05),
                ])
                if n % 2 == 0 and i % 3 == 1:
                    cx, cz = push(p, (nx, nz), depth * 0.45)
                    wall_box(soil, cx - 0.32, cz - 0.16, y + 0.2, cx + 0.32, cz + 0.16, y + 0.48)
                    wall_box(plant, cx - 0.24, cz - 0.12, y + 0.42, cx + 0.24, cz + 0.12, y + 0.95)
                if n % 2 == 0:
                    room.face([
                        V(*push(p, (nx, nz), -0.65), y + 0.4),
                        V(*push(q, normals[j], -0.65), y + 0.4),
                        V(*push(q, normals[j], -0.65), y + 2.15),
                        V(*push(p, (nx, nz), -0.65), y + 2.15),
                    ])
            else:
                stucco.face([V(*p, y), V(*q, y), V(*q, y + 0.7), V(*p, y + 0.7)])
                a, b = lerp2(p, q, 0.18), lerp2(p, q, 0.82)
                glass.face([
                    V(*push(a, (nx, nz), -0.12), y + 0.78),
                    V(*push(b, (nx, nz), -0.12), y + 0.78),
                    V(*push(b, (nx, nz), -0.12), y + floor_h - 0.35),
                    V(*push(a, (nx, nz), -0.12), y + floor_h - 0.35),
                ])
                stucco.face([V(*p, y + floor_h - 0.32), V(*q, y + floor_h - 0.32), V(*q, y + floor_h), V(*p, y + floor_h)])
    roof = retail_h + 0.35 + floors * floor_h
    extrude(stucco, pts, roof, roof + 0.22, cap_top=True)
    terrace = move(offset_pts(local, -0.7), origin)
    for i, p in enumerate(terrace):
        j = (i + 1) % len(terrace)
        rail.face([V(*p, roof + 0.22), V(*terrace[j], roof + 0.22), V(*terrace[j], roof + 1.15), V(*p, roof + 1.15)])
    for x in (-8, -2.5, 3, 8.5):
        wall_box(wood, origin[0] + x - 0.07, origin[1] - 3.4, roof + 0.22, origin[0] + x + 0.07, origin[1] + 3.4, roof + 2.55)
    wall_box(wood, origin[0] - 9, origin[1] - 0.07, roof + 2.4, origin[0] + 9, origin[1] + 0.07, roof + 2.6)
    for b in (stucco, wood, glass, retail, rail, glow, plant, soil, room):
        b.finish()
    return move(offset_pts(local, 2.3), origin), roof + 1.15


def add_palm(mats, col, x, z, scale, yaw):
    trunk = Bucket(f"PalmTrunk_{x:.0f}_{z:.0f}", mats["trunk"], col)
    frond = Bucket(f"PalmFrond_{x:.0f}_{z:.0f}", mats["plant"], col)
    height = 7.2 * scale
    sides = 7
    prev = None
    top = (x, z, height)
    for i in range(8):
        t = i / 7
        r = (0.26 * (1 - t) + 0.1 * t) * scale
        y = t * height
        lean = math.sin(t * math.pi) * 0.28 * scale
        cx = x + math.cos(yaw) * lean
        cz = z + math.sin(yaw) * lean
        loop = []
        for k in range(sides):
            a = (k / sides) * math.tau
            loop.append(V(cx + math.cos(a) * r, cz + math.sin(a) * r, y))
        if prev:
            bridge(trunk, prev, loop)
        prev = loop
        top = (cx, cz, y)
    trunk.finish()
    for f in range(9):
        ang = yaw + (f / 9) * math.tau
        length = 3.8 * scale
        prev_e = None
        for s in range(5):
            t = s / 4
            dist = t * length
            cy = top[2] + math.sin(t * math.pi) * 0.45 * scale - (t * t) * 1.15 * scale
            cx = top[0] + math.cos(ang) * dist
            cz = top[1] + math.sin(ang) * dist
            width = (0.08 + math.sin(t * math.pi) * 0.32) * scale
            side_x = -math.sin(ang) * width
            side_z = math.cos(ang) * width
            a = V(cx - side_x, cz - side_z, cy)
            b = V(cx + side_x, cz + side_z, cy)
            if prev_e:
                frond.face([prev_e[0], prev_e[1], b, a])
                frond.face([prev_e[1], prev_e[0], a, b])
            prev_e = (a, b)
    frond.finish()


def add_light(mats, col, x, z, yaw):
    metal = Bucket(f"Lamp_{x:.0f}_{z:.0f}", mats["vanta_metal"], col)
    glow = Bucket(f"LampGlow_{x:.0f}_{z:.0f}", mats["glow"], col)
    cyl(metal, x, z, 0.09, 0.0, 6.6, 8)
    arm = 2.1
    ax = x + math.cos(yaw) * arm
    az = z + math.sin(yaw) * arm
    wall_box(metal, x - 0.05, z - 0.05, 6.45, ax + 0.05, az + 0.05, 6.62)
    # The arm box above is axis-aligned and wrong for diagonal arms. Use a cylinder lying... keep poles aimed on axis.
    wall_box(glow, ax - 0.35, az - 0.18, 6.15, ax + 0.35, az + 0.18, 6.32)
    metal.finish()
    glow.finish()


def landscape(mats):
    col = collection("Downtown_Landscape")
    hedge = Bucket("Hedges", mats["plant_d"], col)
    pave = Bucket("Forecourts", mats["pave"], col)
    # Forecourts in front of each entrance, kept off the roadway.
    wall_box(pave, -64.2, -2.5, 0.03, -58.6, 10.5, 0.06)  # Caliza east, off the road
    wall_box(pave, -6, 48.5, 0.03, 22, 54.6, 0.06)  # Vanta south
    wall_box(pave, 2, -64.6, 0.03, 38, -61.2, 0.06)  # Cayo north, in front of the retail
    wall_box(hedge, -70.2, -1.6, 0.06, -69.4, 9.5, 0.7)
    wall_box(hedge, -6.2, 53.2, 0.06, 20.5, 54.0, 0.65)
    wall_box(hedge, 4, -67.6, 0.06, 36, -66.9, 0.6)
    hedge.finish()
    pave.finish()
    palms = [
        (-61.5, -14, 1.0, 0.4),
        (-60.2, 20, 0.92, 1.2),
        (-92, -2, 1.05, 2.2),
        (-93, 12, 0.88, 0.6),
        (-4, 54, 0.95, 0.2),
        (22, 53.5, 1.08, 2.6),
        (6, -63.5, 0.9, 1.4),
        (34, -63.2, 1.02, 2.1),
        (-60, -62, 0.85, 0.8),
        (48, 50, 0.98, 1.7),
        (-78, 22, 0.7, 0.3),  # roof of Caliza podium, raised below
    ]
    for x, z, sc, yaw in palms[:-1]:
        add_palm(mats, col, x, z, sc, yaw)
    # Podium roof palms sit on Caliza's podium roof.
    trunk_y = 14.35
    # Reuse add_palm then it starts at y=0. Skip roof palms rather than floating trunks.
    lights = [
        (-64, -18, math.pi),
        (-64, 24, math.pi),
        (-64, 48, math.pi),
        (-100, -50, math.pi / 2),
        (-30, 46, -math.pi / 2),
        (30, 46, -math.pi / 2),
        (70, -50, math.pi / 2),
        (-52, -68, 0),
        (40, -62, math.pi),
        (-52, 55, 0),
    ]
    for x, z, yaw in lights:
        add_light(mats, col, x, z, yaw)


def review_rect(bucket, x, z, w, d, y):
    bucket.face([
        V(x - w / 2, z - d / 2, y),
        V(x + w / 2, z - d / 2, y),
        V(x + w / 2, z + d / 2, y),
        V(x - w / 2, z + d / 2, y),
    ])


def lights_and_world():
    world = bpy.data.worlds.new("DowntownSky")
    bpy.context.scene.world = world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    links = world.node_tree.links
    bg = nodes.get("Background")
    hdr = os.path.abspath(os.path.join(ROOT, "..", "..", "public", "textures", "sky", "kloppenheim_1k.hdr"))
    if bg and os.path.exists(hdr):
        env = nodes.new("ShaderNodeTexEnvironment")
        env.image = bpy.data.images.load(hdr, check_existing=True)
        links.new(env.outputs["Color"], bg.inputs["Color"])
        bg.inputs["Strength"].default_value = 0.55
    elif bg:
        bg.inputs["Color"].default_value = (0.55, 0.74, 0.92, 1.0)
        bg.inputs["Strength"].default_value = 0.7
    sun_data = bpy.data.lights.new("Sun", "SUN")
    sun_data.energy = 3.4
    sun_data.angle = math.radians(1.4)
    sun_data.color = (1.0, 0.96, 0.9)
    sun = bpy.data.objects.new("Sun", sun_data)
    bpy.context.scene.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(54), 0.0, math.radians(28))
    ground = collection("RenderGround")
    mat = material("Ground", (0.62, 0.68, 0.58), rough=0.92)
    bucket = Bucket("RenderGround", mat, ground)
    bucket.face([V(-160, -140, 0), V(140, -140, 0), V(140, 120, 0), V(-160, 120, 0)])
    bucket.finish()
    asphalt = Bucket("ReviewRoads", material("ReviewAsphalt", (0.18, 0.19, 0.2), rough=0.9), ground)
    walks = Bucket("ReviewWalks", material("ReviewWalk", (0.75, 0.73, 0.68), rough=0.86), ground)
    for x, z, w, d in (
        (0, -50, 112, 8),
        (0, 38, 112, 8),
        (52, -6, 8, 96),
        (-52, -6, 8, 96),
        (-83, -50, 54, 8),
        (78, -50, 44, 8),
        (-52, 71, 8, 58),
        (-52, -78, 8, 48),
        (-83, 38, 54, 8),
        (78, 38, 44, 8),
    ):
        review_rect(asphalt, x, z, w, d, 0.02)
    for x, z, w, d in (
        (-83, -43.2, 50, 4),
        (-83, -56.6, 50, 3.6),
        (76, -43.2, 36, 4),
        (76, -56.6, 36, 3.6),
        (-45.2, 71, 4, 50),
        (-58.8, 71, 4, 50),
        (-83, 44.6, 50, 3.6),
        (-45.2, -78, 4, 40),
        (-58.8, -78, 4, 40),
    ):
        review_rect(walks, x, z, w, d, 0.03)
    asphalt.finish()
    walks.finish()


def aabb(pts, pad=0.4):
    x0, x1, z0, z1 = bounds(pts)
    return {
        "x": round((x0 + x1) / 2, 2),
        "z": round((z0 + z1) / 2, 2),
        "hx": round((x1 - x0) / 2 + pad, 2),
        "hz": round((z1 - z0) / 2 + pad, 2),
    }


def write_metrics(caliza_pts, vanta_pts, cayo_pts, heights):
    buildings = []
    for ident, pts, height in (
        ("caliza", caliza_pts, heights[0]),
        ("vanta", vanta_pts, heights[1]),
        ("cayo", cayo_pts, heights[2]),
    ):
        box = aabb(pts)
        box.update({"id": ident, "height": round(height, 2)})
        buildings.append(box)
    data = {
        "buildings": buildings,
        "roads": [
            {"id": "harbor-west", "x": -83, "z": -50, "w": 54, "d": 8},
            {"id": "harbor-east", "x": 78, "z": -50, "w": 44, "d": 8},
            {"id": "west-north", "x": -52, "z": 71, "w": 8, "d": 58},
            {"id": "west-south", "x": -52, "z": -78, "w": 8, "d": 48},
            {"id": "north-west", "x": -83, "z": 38, "w": 54, "d": 8},
            {"id": "north-east", "x": 78, "z": 38, "w": 44, "d": 8},
        ],
        "sidewalks": [
            {"x": -83, "z": -43.2, "w": 50, "d": 4},
            {"x": -83, "z": -56.6, "w": 50, "d": 3.6},
            {"x": 76, "z": -43.2, "w": 36, "d": 4},
            {"x": 76, "z": -56.6, "w": 36, "d": 3.6},
            {"x": -45.2, "z": 71, "w": 4, "d": 50},
            {"x": -58.8, "z": 71, "w": 4, "d": 50},
            {"x": -83, "z": 44.6, "w": 50, "d": 3.6},
            {"x": -58.8, "z": -78, "w": 4, "d": 40},
            {"x": -45.2, "z": -78, "w": 4, "d": 40},
        ],
        "crosswalks": [
            {"x": -52, "z": -50, "along": "x"},
            {"x": -52, "z": 38, "along": "x"},
            {"x": 52, "z": -50, "along": "x"},
            {"x": 0, "z": -50, "along": "x"},
            {"x": 52, "z": 38, "along": "x"},
        ],
        "stalls": [
            {"x": -102, "z": 0, "w": 12, "d": 16},
            {"x": 18, "z": -58.4, "w": 22, "d": 4.6},
        ],
        "note": "Colliders match the generated outlines. Solara is not in this file.",
    }
    os.makedirs(os.path.dirname(METRICS_PATH), exist_ok=True)
    with open(METRICS_PATH, "w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2)
        handle.write("\n")
    print("METRICS", METRICS_PATH)


def export_glb():
    os.makedirs(os.path.dirname(GLB_PATH), exist_ok=True)
    for obj in bpy.data.objects:
        keep = any(col.name.startswith("Downtown_") for col in obj.users_collection)
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


def append_solara():
    with bpy.data.libraries.load(SOLARA_BLEND) as (src, dst):
        skip = {"Cameras", "RenderGround", "ScaleFigure", "Massing"}
        dst.collections = [name for name in src.collections if name not in skip]
    for col in dst.collections:
        if col is None:
            continue
        bpy.context.scene.collection.children.link(col)
    print("APPENDED", [col.name for col in dst.collections if col])


def aim(obj, loc, target, lens=40, ortho=None):
    obj.location = loc
    direction = Vector(target) - Vector(loc)
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    obj.data.clip_end = 2500
    if ortho:
        obj.data.type = "ORTHO"
        obj.data.ortho_scale = ortho
    else:
        obj.data.lens = lens


def render_views():
    os.makedirs(RENDER_DIR, exist_ok=True)
    col = collection("Cameras")
    # Blender location is (threeX, -threeZ, threeY).
    specs = [
        # Blender (threeX, -threeZ, threeY). Aerial frames the whole block.
        ("aerial", (-150, 145, 125), (-5, 5, 48), 22, None),
        # Harbor Avenue, looking west: Caliza ahead, Solara to the right, Cayo behind left.
        ("street", (42, 47, 1.7), (-55, 46, 14), 26, None),
        # Northeast corner, looking southwest at Solara with Caliza beside it.
        ("toward-solara", (32, -44, 2.2), (-8, 6, 55), 20, None),
        # North of Solara, wide enough to hold Vanta and Caliza in one skyline.
        ("from-solara", (24, -18, 6), (-16, -50, 62), 16, None),
    ]
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 800
    scene.eevee.taa_render_samples = 16
    cams = []
    for name, loc, target, lens, ortho in specs:
        data = bpy.data.cameras.new(name)
        obj = bpy.data.objects.new(name, data)
        col.objects.link(obj)
        aim(obj, loc, target, lens, ortho)
        cams.append((name, obj))
    only = None
    view_args = argv_after_dd()
    if "--only" in view_args:
        only = set(view_args[view_args.index("--only") + 1].split(","))
    for name, obj in cams:
        if only and name not in only:
            continue
        scene.camera = obj
        scene.render.filepath = os.path.join(RENDER_DIR, f"{name}.png")
        bpy.ops.render.render(write_still=True)
        print("RENDERED", scene.render.filepath)


def main():
    args = argv_after_dd()
    clear_scene()
    mats = make_mats()
    lights_and_world()
    caliza_col = collection("Downtown_Caliza")
    vanta_col = collection("Downtown_Vanta")
    cayo_col = collection("Downtown_Cayo")
    caliza_pts, caliza_top = build_caliza(mats, caliza_col)
    vanta_pts, vanta_top = build_vanta(mats, vanta_col)
    cayo_pts, cayo_top = build_cayo(mats, cayo_col)
    landscape(mats)
    write_metrics(caliza_pts, vanta_pts, cayo_pts, (caliza_top, vanta_top, cayo_top))
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
    print("SAVED", BLEND_PATH)
    if "--export" in args:
        export_glb()
    if "--render" in args:
        append_solara()
        render_views()


if __name__ == "__main__":
    main()
