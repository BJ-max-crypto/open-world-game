"""Solara Tower — architectural generator for The Coast.

Blender Z-up meters. glTF export maps (x, y, z) to (x, z, -y), so the entrance
on +Y faces three.js -Z, where the player stands.

    blender -b -P blender/solara/build_solara.py -- --stage massing --render
    blender -b -P blender/solara/build_solara.py -- --stage full --render --export
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
BLEND_PATH = os.path.join(ROOT, "solara-tower.blend")
GLB_PATH = os.path.abspath(os.path.join(ROOT, "..", "..", "public", "models", "buildings", "solara-tower.glb"))
METRICS_PATH = os.path.join(ROOT, "metrics.json")

# 48 floors: 5 podium + 43 tower. Roof at 173 m, crown reaches 180 m.
PODIUM_FLOORS = 5
PODIUM_H = 4.5
TOWER_FLOORS = 43
TOWER_H = 3.5
ROOF_Z = PODIUM_FLOORS * PODIUM_H + TOWER_FLOORS * TOWER_H  # 173
CROWN_TOP = 180.0
SLAB = 0.32

RX = 14.2
RY = 10.8
POD_RX = 22.4
POD_RY = 16.2
N_TOWER = 2.35
N_POD = 2.7
SEG = 84

SWOOSH_CENTER = math.pi / 2 + 0.58
ENTRANCE_HALF_X = 4.3
ENTRANCE_TOP = 7.55
CANOPY_DEPTH = 5.4

STEP_SCALE = {46: 0.93, 47: 0.84, 48: 0.72}


def argv_after_dd() -> list[str]:
    if "--" not in sys.argv:
        return []
    return sys.argv[sys.argv.index("--") + 1 :]


def clamp(v: float, a: float, b: float) -> float:
    return max(a, min(b, v))


def angle_diff(a: float, b: float) -> float:
    d = (a - b + math.pi) % math.tau - math.pi
    return d


def smooth(edge0: float, edge1: float, x: float) -> float:
    if edge1 == edge0:
        return 1.0 if x >= edge1 else 0.0
    t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def floor_level(n: int) -> float:
    """Walking surface of floor n (1-based)."""
    if n <= 1:
        return 0.0
    if n <= PODIUM_FLOORS + 1:
        return (n - 1) * PODIUM_H
    return PODIUM_FLOORS * PODIUM_H + (n - (PODIUM_FLOORS + 1)) * TOWER_H


def super_raw(theta: float, rx: float, ry: float, n: float) -> Vector:
    c = math.cos(theta)
    s = math.sin(theta)
    e = 2.0 / n
    x = rx * math.copysign(abs(c) ** e, c) if abs(c) > 1e-8 else 0.0
    y = ry * math.copysign(abs(s) ** e, s) if abs(s) > 1e-8 else 0.0
    return Vector((x, y, 0.0))


def ring(rx: float, ry: float, n: float, indent_at, scale: float = 1.0) -> list[tuple[Vector, Vector, float]]:
    """Points, outward normals, theta. indent_at(theta) pulls inward along the normal."""
    raw = []
    for i in range(SEG):
        theta = (i / SEG) * math.tau
        p = super_raw(theta, rx * scale, ry * scale, n)
        raw.append((p, theta))
    out = []
    for i, (p, theta) in enumerate(raw):
        prv = raw[(i - 1) % SEG][0]
        nxt = raw[(i + 1) % SEG][0]
        tangent = nxt - prv
        normal = Vector((tangent.y, -tangent.x, 0.0))
        if normal.dot(p) < 0:
            normal.negate()
        if normal.length < 1e-8:
            normal = Vector((0, 1, 0))
        normal.normalize()
        indent = indent_at(theta)
        pos = p - normal * indent
        out.append((pos, normal, theta))
    return out


def swoosh_indent(theta: float, floor_n: int) -> float:
    if floor_n < 12 or floor_n > 44:
        return 0.0
    rise = smooth(12, 18, floor_n)
    fall = smooth(44, 40, floor_n)
    ang = angle_diff(theta, SWOOSH_CENTER)
    lobe = math.exp(-(ang * ang) / (2 * 0.20 * 0.20))
    return 2.55 * rise * fall * lobe


def balcony_depth(theta: float, floor_n: int, normal: Vector) -> float:
    if floor_n <= PODIUM_FLOORS:
        return 0.0
    if floor_n <= 13:
        return 0.16
    front = clamp(normal.y, 0.0, 1.0)
    depth = 0.72 + 1.05 * front
    if floor_n % 9 == 6:
        depth += 0.38
    ang = abs(angle_diff(theta, SWOOSH_CENTER))
    if ang < 0.5:
        depth *= smooth(0.16, 0.5, ang)
    if floor_n >= 46:
        depth *= 0.72
    return depth


def plan_scale(floor_n: int) -> float:
    return STEP_SCALE.get(floor_n, 1.0)


def tower_ring(floor_n: int) -> list[tuple[Vector, Vector, float]]:
    return ring(RX, RY, N_TOWER, lambda t: swoosh_indent(t, floor_n), plan_scale(floor_n))


def clear_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    scene.render.fps = 24


def collection(name: str) -> bpy.types.Collection:
    col = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(col)
    return col


def material(name: str, color, rough=0.55, metal=0.0, transmission=0.0, emission=0.0, emit_color=None, coat=0.0, alpha=1.0) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    bsdf.inputs["Transmission Weight"].default_value = transmission
    bsdf.inputs["IOR"].default_value = 1.52
    bsdf.inputs["Coat Weight"].default_value = coat
    bsdf.inputs["Specular IOR Level"].default_value = 0.5
    bsdf.inputs["Alpha"].default_value = alpha
    if emission > 0:
        bsdf.inputs["Emission Color"].default_value = (*(emit_color or color), 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission
    if alpha < 0.98 or transmission > 0.2:
        mat.use_backface_culling = False
        if hasattr(mat, "surface_render_method"):
            mat.surface_render_method = "BLENDED"
    return mat


def make_mats() -> dict[str, bpy.types.Material]:
    return {
        "stone": material("Solara_Stone", (0.90, 0.87, 0.82), rough=0.62),
        "white": material("Solara_White", (0.96, 0.95, 0.92), rough=0.48, coat=0.15),
        "glass": material("Solara_Glass", (0.62, 0.76, 0.84), rough=0.045, metal=0.04, coat=0.35),
        "glass_dark": material("Solara_GlassDark", (0.16, 0.24, 0.30), rough=0.04, metal=0.55, coat=0.4),
        "lobby_glass": material("Solara_LobbyGlass", (0.78, 0.88, 0.92), rough=0.04, alpha=0.18),
        "metal": material("Solara_Champagne", (0.78, 0.64, 0.40), rough=0.28, metal=1.0),
        "rail": material("Solara_RailGlass", (0.82, 0.91, 0.94), rough=0.05, alpha=0.38),
        "wood": material("Solara_Wood", (0.55, 0.38, 0.24), rough=0.42),
        "floor": material("Solara_Floor", (0.82, 0.78, 0.72), rough=0.4),
        "plant": material("Solara_Plant", (0.20, 0.38, 0.22), rough=0.7),
        "plant_dark": material("Solara_PlantDark", (0.12, 0.28, 0.16), rough=0.75),
        "trunk": material("Solara_Trunk", (0.45, 0.34, 0.22), rough=0.8),
        "water": material("Solara_Water", (0.05, 0.18, 0.22), rough=0.04, metal=0.15, transmission=0.55),
        "pave": material("Solara_Pave", (0.78, 0.75, 0.70), rough=0.78),
        "soil": material("Solara_Soil", (0.25, 0.18, 0.12), rough=0.9),
        "glow": material("Solara_Glow", (1.0, 0.82, 0.62), rough=0.4, emission=3.5, emit_color=(1.0, 0.78, 0.55)),
        "core": material("Solara_Core", (0.72, 0.70, 0.66), rough=0.55),
        "mass": material("Solara_Mass", (0.82, 0.84, 0.86), rough=0.45),
    }


class Bucket:
    def __init__(self, name: str, mat: bpy.types.Material, col: bpy.types.Collection):
        self.bm = bmesh.new()
        self.name = name
        self.mat = mat
        self.col = col

    def face(self, pts: list[Vector]) -> None:
        verts = [self.bm.verts.new(p) for p in pts]
        try:
            self.bm.faces.new(verts)
        except ValueError:
            pass

    def finish(self) -> bpy.types.Object | None:
        if not self.bm.faces:
            self.bm.free()
            return None
        bmesh.ops.remove_doubles(self.bm, verts=list(self.bm.verts), dist=0.004)
        self.bm.normal_update()
        for edge in self.bm.edges:
            if len(edge.link_faces) == 2:
                n1 = edge.link_faces[0].normal
                n2 = edge.link_faces[1].normal
                edge.smooth = n1.dot(n2) > math.cos(math.radians(42))
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


def bridge(bucket: Bucket, lower: list[Vector], upper: list[Vector], flip=False) -> None:
    n = len(lower)
    for i in range(n):
        j = (i + 1) % n
        quad = [lower[i], lower[j], upper[j], upper[i]]
        if flip:
            quad.reverse()
        bucket.face(quad)


def fan(bucket: Bucket, pts: list[Vector], z: float, flip=False) -> None:
    center = Vector((0, 0, z))
    # keep the fan inside the ring average so a notch still caps
    acc = Vector((0, 0, z))
    for p in pts:
        acc.x += p.x
        acc.y += p.y
    center = Vector((acc.x / len(pts), acc.y / len(pts), z))
    for i in range(len(pts)):
        j = (i + 1) % len(pts)
        tri = [center, pts[j], pts[i]] if flip else [center, pts[i], pts[j]]
        bucket.face(tri)


def disk(bucket: Bucket, pts: list[Vector], z_top: float, thickness: float) -> None:
    top = [Vector((p.x, p.y, z_top)) for p in pts]
    bot = [Vector((p.x, p.y, z_top - thickness)) for p in pts]
    fan(bucket, top, z_top, flip=False)
    fan(bucket, bot, z_top - thickness, flip=True)
    bridge(bucket, bot, top)


def wall_box(bucket: Bucket, x0, y0, z0, x1, y1, z1) -> None:
    a = Vector((x0, y0, z0))
    b = Vector((x1, y0, z0))
    c = Vector((x1, y1, z0))
    d = Vector((x0, y1, z0))
    e = Vector((x0, y0, z1))
    f = Vector((x1, y0, z1))
    g = Vector((x1, y1, z1))
    h = Vector((x0, y1, z1))
    bucket.face([a, b, f, e])
    bucket.face([b, c, g, f])
    bucket.face([c, d, h, g])
    bucket.face([d, a, e, h])
    bucket.face([e, f, g, h])
    bucket.face([d, c, b, a])


def cyl(bucket: Bucket, origin: Vector, radius: float, z0: float, z1: float, sides=16) -> None:
    lower, upper = [], []
    for i in range(sides):
        a = (i / sides) * math.tau
        x = origin.x + math.cos(a) * radius
        y = origin.y + math.sin(a) * radius
        lower.append(Vector((x, y, z0)))
        upper.append(Vector((x, y, z1)))
    bridge(bucket, lower, upper)
    fan(bucket, upper, z1, flip=False)
    fan(bucket, lower, z0, flip=True)


def add_lights_and_world() -> None:
    world = bpy.data.worlds.new("SolaraSky")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (0.55, 0.74, 0.92, 1.0)
        bg.inputs["Strength"].default_value = 0.85
    sun_data = bpy.data.lights.new("Sun", "SUN")
    sun_data.energy = 4.2
    sun_data.angle = math.radians(1.6)
    sun_data.color = (1.0, 0.96, 0.90)
    sun = bpy.data.objects.new("Sun", sun_data)
    bpy.context.scene.collection.objects.link(sun)
    # South-east, 38 degrees up, so balcony undersides take a shadow.
    sun.rotation_euler = (math.radians(52), math.radians(0), math.radians(32))
    fill_data = bpy.data.lights.new("Fill", "AREA")
    fill_data.energy = 2500
    fill_data.size = 40
    fill_data.color = (0.75, 0.84, 0.95)
    fill = bpy.data.objects.new("Fill", fill_data)
    bpy.context.scene.collection.objects.link(fill)
    fill.location = (-30, -20, 40)
    direction = Vector((0, 0, 20)) - fill.location
    fill.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def ground_plane(mats) -> None:
    col = collection("RenderGround")
    bucket = Bucket("RenderGround", mats["pave"], col)
    s = 80
    bucket.face([Vector((-s, -s, 0)), Vector((s, -s, 0)), Vector((s, s, 0)), Vector((-s, s, 0))])
    bucket.finish()


def scale_figure(col, mats) -> None:
    """1.83 m figure at the entrance, render reference only."""
    body = Bucket("ScaleFigure", mats["mass"], col)
    cyl(body, Vector((0, POD_RY + 8.5, 0)), 0.22, 0.0, 1.55, 12)
    # head
    head_z = 1.72
    rings = []
    for i in range(8):
        z = head_z - 0.12 + (i / 7) * 0.24
        t = (i / 7) * math.pi
        r = math.sin(t) * 0.11
        rings.append((z, r))
    prev = None
    for z, r in rings:
        loop = []
        for k in range(10):
            a = (k / 10) * math.tau
            loop.append(Vector((math.cos(a) * r, POD_RY + 8.5 + math.sin(a) * r, z)))
        if prev:
            bridge(body, prev, loop)
        prev = loop
    body.finish()


def build_massing(mats) -> None:
    col = collection("Massing")
    shell = Bucket("MassingShell", mats["mass"], col)
    pod = ring(POD_RX, POD_RY, N_POD, lambda _t: 0.0)
    pod_pts = [p for p, _n, _t in pod]
    disk(shell, pod_pts, PODIUM_FLOORS * PODIUM_H, PODIUM_FLOORS * PODIUM_H)
    for n in range(6, 49):
        level = floor_level(n)
        pts = [p for p, _n, _t in tower_ring(n)]
        disk(shell, pts, level + TOWER_H, TOWER_H)
    crown = ring(RX * 0.78, RY * 0.78, N_TOWER, lambda _t: 0.0)
    disk(shell, [p for p, _n, _t in crown], CROWN_TOP, CROWN_TOP - ROOF_Z)
    shell.finish()
    scale_figure(col, mats)


def podium_opening(theta: float, x: float, y: float) -> bool:
    return y > POD_RY * 0.72 and abs(x) < ENTRANCE_HALF_X + 0.4


def build_podium(mats, cols) -> None:
    stone = Bucket("Podium_Stone", mats["stone"], cols["Podium"])
    white = Bucket("Podium_White", mats["white"], cols["Podium"])
    glass = Bucket("Podium_Glass", mats["glass"], cols["Glass"])
    metal = Bucket("Podium_Metal", mats["metal"], cols["Podium"])
    lobby_glass = Bucket("Lobby_Glass", mats["lobby_glass"], cols["Lobby"])

    outer = ring(POD_RX, POD_RY, N_POD, lambda _t: 0.0)
    inner = ring(POD_RX - 0.55, POD_RY - 0.45, N_POD, lambda _t: 0.0)
    outer_pts = [p for p, _n, _t in outer]
    # Plinth, broken at the entrance.
    plinth_top = 0.42
    for i, (p, normal, theta) in enumerate(outer):
        j = (i + 1) % SEG
        q = outer[j][0]
        if podium_opening(theta, p.x, p.y) and podium_opening(outer[j][2], q.x, q.y):
            continue
        a = p + normal * 1.35
        b = q + outer[j][1] * 1.35
        stone.face([Vector((b.x, b.y, 0)), Vector((a.x, a.y, 0)), Vector((p.x, p.y, 0)), Vector((q.x, q.y, 0))])
        bridge_pair(stone, [a, q * 0 + b], 0, plinth_top) if False else None
        stone.face([
            Vector((a.x, a.y, 0)), Vector((b.x, b.y, 0)),
            Vector((b.x, b.y, plinth_top)), Vector((a.x, a.y, plinth_top)),
        ])
        stone.face([
            Vector((b.x, b.y, plinth_top)), Vector((q.x, q.y, plinth_top)),
            Vector((p.x, p.y, plinth_top)), Vector((a.x, a.y, plinth_top)),
        ])
        stone.face([
            Vector((q.x, q.y, plinth_top)), Vector((b.x, b.y, plinth_top)),
            Vector((b.x, b.y, 0)), Vector((q.x, q.y, 0)),
        ])

    # Story bands. The entrance is a two-story glass wall. Every other bay is a recessed window.
    for story in range(PODIUM_FLOORS):
        z0 = story * PODIUM_H
        z1 = z0 + PODIUM_H
        sill = z0 + 0.85
        head = z1 - 0.7
        for i, (p, normal, theta) in enumerate(outer):
            j = (i + 1) % SEG
            q, nq, tq = outer[j]
            ip = inner[i][0]
            iq = inner[j][0]
            entrance = podium_opening(theta, p.x, p.y) or podium_opening(tq, q.x, q.y)
            if entrance and z0 < ENTRANCE_TOP:
                if story == 0:
                    lobby_glass.face([
                        Vector((ip.x, ip.y, 0.05)), Vector((iq.x, iq.y, 0.05)),
                        Vector((iq.x, iq.y, ENTRANCE_TOP)), Vector((ip.x, ip.y, ENTRANCE_TOP)),
                    ])
                    stone.face([
                        Vector((p.x, p.y, 0.05)), Vector((ip.x, ip.y, 0.05)),
                        Vector((ip.x, ip.y, ENTRANCE_TOP)), Vector((p.x, p.y, ENTRANCE_TOP)),
                    ])
                if z1 > ENTRANCE_TOP:
                    stone.face([
                        Vector((p.x, p.y, ENTRANCE_TOP)), Vector((q.x, q.y, ENTRANCE_TOP)),
                        Vector((q.x, q.y, z1)), Vector((p.x, p.y, z1)),
                    ])
                continue
            stone.face([
                Vector((p.x, p.y, z0)), Vector((q.x, q.y, z0)),
                Vector((q.x, q.y, sill)), Vector((p.x, p.y, sill)),
            ])
            glass.face([
                Vector((ip.x, ip.y, sill)), Vector((iq.x, iq.y, sill)),
                Vector((iq.x, iq.y, head)), Vector((ip.x, ip.y, head)),
            ])
            stone.face([
                Vector((p.x, p.y, sill)), Vector((ip.x, ip.y, sill)),
                Vector((ip.x, ip.y, head)), Vector((p.x, p.y, head)),
            ])
            stone.face([
                Vector((p.x, p.y, head)), Vector((q.x, q.y, head)),
                Vector((q.x, q.y, z1)), Vector((p.x, p.y, z1)),
            ])
            metal.face([
                Vector((p.x, p.y, head - 0.06)), Vector((q.x, q.y, head - 0.06)),
                Vector((q.x, q.y, head)), Vector((p.x, p.y, head)),
            ])

    # Vertical fins on the long sides, proud of the stone.
    for i, (p, normal, theta) in enumerate(outer):
        if i % 6 != 0:
            continue
        if podium_opening(theta, p.x, p.y):
            continue
        tangent = Vector((-normal.y, normal.x, 0))
        half = 0.28
        proud = 0.42
        a = p - tangent * half
        b = p + tangent * half
        c = b + normal * proud
        d = a + normal * proud
        bridge(stone, [
            Vector((a.x, a.y, plinth_top)), Vector((b.x, b.y, plinth_top)),
            Vector((c.x, c.y, plinth_top)), Vector((d.x, d.y, plinth_top)),
        ], [
            Vector((a.x, a.y, ROOF_Z * 0 + PODIUM_FLOORS * PODIUM_H)),
            Vector((b.x, b.y, PODIUM_FLOORS * PODIUM_H)),
            Vector((c.x, c.y, PODIUM_FLOORS * PODIUM_H)),
            Vector((d.x, d.y, PODIUM_FLOORS * PODIUM_H)),
        ])

    # Cornice
    cornice = []
    for p, normal, _t in outer:
        cornice.append(p + normal * 1.15)
    disk_ring(white, [p for p, _n, _t in outer], cornice, PODIUM_FLOORS * PODIUM_H, 0.48)

    # Canopy
    y0 = POD_RY - 0.2
    y1 = POD_RY + CANOPY_DEPTH
    xh = ENTRANCE_HALF_X + 2.4
    zc = ENTRANCE_TOP
    wall_box(white, -xh, y0, zc, xh, y1, zc + 0.26)
    wall_box(metal, -xh, y1 - 0.08, zc - 0.05, xh, y1, zc + 0.26)
    # Two round columns
    for sx in (-3.15, 3.15):
        cyl(stone, Vector((sx, y1 - 0.55, 0)), 0.36, 0.0, zc, 18)
        cyl(metal, Vector((sx, y1 - 0.55, 0)), 0.4, zc - 0.08, zc + 0.02, 18)

    stone.finish()
    white.finish()
    glass.finish()
    metal.finish()
    lobby_glass.finish()


def bridge_pair(bucket, lower, z0, z1):
    pass


def disk_ring(bucket: Bucket, inner: list[Vector], outer: list[Vector], z: float, thickness: float) -> None:
    top_i = [Vector((p.x, p.y, z)) for p in inner]
    top_o = [Vector((p.x, p.y, z)) for p in outer]
    bot_i = [Vector((p.x, p.y, z - thickness)) for p in inner]
    bot_o = [Vector((p.x, p.y, z - thickness)) for p in outer]
    n = len(inner)
    for i in range(n):
        j = (i + 1) % n
        bucket.face([top_i[i], top_i[j], top_o[j], top_o[i]])
        bucket.face([bot_o[i], bot_o[j], bot_i[j], bot_i[i]])
    bridge(bucket, bot_o, top_o)
    bridge(bucket, top_i, bot_i)


def build_tower(mats, cols) -> None:
    white = Bucket("Tower_White", mats["white"], cols["Balconies"])
    glass = Bucket("Tower_Glass", mats["glass"], cols["Glass"])
    dark = Bucket("Tower_GlassDark", mats["glass_dark"], cols["Glass"])
    metal = Bucket("Tower_Metal", mats["metal"], cols["Metal"])
    rail = Bucket("Tower_Rails", mats["rail"], cols["Railings"])
    plant = Bucket("Tower_Planters", mats["plant"], cols["Landscape"])
    soil = Bucket("Tower_Soil", mats["soil"], cols["Landscape"])

    rings = {n: tower_ring(n) for n in range(6, 49)}

    for n in range(6, 49):
        level = floor_level(n)
        current = rings[n]
        wall_pts = [p for p, _normal, _theta in current]
        outer_pts = []
        depths = []
        for p, normal, theta in current:
            depth = balcony_depth(theta, n, normal)
            depths.append(depth)
            outer_pts.append(p + normal * depth)
        # Fascia always at least a nose so the floor plate reads.
        nose = [p + current[i][1] * max(depths[i], 0.12) for i, p in enumerate(wall_pts)]
        disk_ring(white, wall_pts, nose, level, SLAB)

        above = n + 1
        if above <= 48:
            z_glass0 = level + 0.02
            z_glass1 = floor_level(above) - SLAB
            g_bucket = dark if n <= 13 else glass
            lower = [Vector((p.x, p.y, z_glass0)) for p in wall_pts]
            upper = [Vector((p.x, p.y, z_glass1)) for p in wall_pts]
            bridge(g_bucket, lower, upper)
            # Mullions
            for i in range(0, SEG, 4):
                p, normal, _theta = current[i]
                tangent = Vector((-normal.y, normal.x, 0.0))
                half_t = 0.035
                proud = 0.07
                a = p - tangent * half_t + normal * 0.02
                b = p + tangent * half_t + normal * 0.02
                c = b + normal * proud
                d = a + normal * proud
                bridge(metal, [
                    Vector((a.x, a.y, z_glass0)), Vector((b.x, b.y, z_glass0)),
                    Vector((c.x, c.y, z_glass0)), Vector((d.x, d.y, z_glass0)),
                ], [
                    Vector((a.x, a.y, z_glass1)), Vector((b.x, b.y, z_glass1)),
                    Vector((c.x, c.y, z_glass1)), Vector((d.x, d.y, z_glass1)),
                ])
        # Railings where the balcony is deep enough to stand on.
        rail_z0 = level + 0.04
        rail_z1 = level + 1.08
        cap0 = level + 1.05
        cap1 = level + 1.11
        for i, depth in enumerate(depths):
            if depth < 0.55:
                continue
            j = (i + 1) % SEG
            if depths[j] < 0.55:
                continue
            n0 = current[i][1]
            n1 = current[j][1]
            o0 = outer_pts[i] - n0 * 0.05
            o1 = outer_pts[j] - n1 * 0.05
            i0 = o0 - n0 * 0.018
            i1 = o1 - n1 * 0.018
            rail.face([
                Vector((i0.x, i0.y, rail_z0)), Vector((i1.x, i1.y, rail_z0)),
                Vector((o1.x, o1.y, rail_z1)), Vector((o0.x, o0.y, rail_z1)),
            ])
            rail.face([
                Vector((o0.x, o0.y, rail_z0)), Vector((o1.x, o1.y, rail_z0)),
                Vector((i1.x, i1.y, rail_z1)), Vector((i0.x, i0.y, rail_z1)),
            ])
            metal.face([
                Vector((i0.x, i0.y, cap0)), Vector((i1.x, i1.y, cap0)),
                Vector((o1.x, o1.y, cap1)), Vector((o0.x, o0.y, cap1)),
            ])
        # Amenity planters on the front balcony.
        if n > 13 and n % 9 == 6:
            for p, normal, theta in current:
                if normal.y < 0.65 or balcony_depth(theta, n, normal) < 1.0:
                    continue
                if abs(p.x) < 2.2 or abs(p.x) > 9.5:
                    continue
                if int(abs(p.x) * 2) % 3 != 0:
                    continue
                center = p + normal * (balcony_depth(theta, n, normal) * 0.45)
                wall_box(soil, center.x - 0.55, center.y - 0.28, level, center.x + 0.55, center.y + 0.28, level + 0.42)
                wall_box(plant, center.x - 0.48, center.y - 0.22, level + 0.32, center.x + 0.48, center.y + 0.22, level + 0.85)

    # Vertical fins on the rounded ends, grouped so they are not a barcode.
    fin_groups = ((16, 21), (28, 33), (38, 42))
    for i, (p, normal, theta) in enumerate(rings[20]):
        if abs(normal.x) < 0.72:
            continue
        if i % 7 != 0:
            continue
        tangent = Vector((-normal.y, normal.x, 0))
        for a_floor, b_floor in fin_groups:
            z0 = floor_level(a_floor)
            z1 = floor_level(b_floor)
            half = 0.06
            proud = 0.38
            a = p - tangent * half
            b = p + tangent * half
            c = b + normal * proud
            d = a + normal * proud
            bridge(white, [
                Vector((a.x, a.y, z0)), Vector((b.x, b.y, z0)),
                Vector((c.x, c.y, z0)), Vector((d.x, d.y, z0)),
            ], [
                Vector((a.x, a.y, z1)), Vector((b.x, b.y, z1)),
                Vector((c.x, c.y, z1)), Vector((d.x, d.y, z1)),
            ])

    white.finish()
    glass.finish()
    dark.finish()
    metal.finish()
    rail.finish()
    plant.finish()
    soil.finish()
    build_crown(mats, cols, rings[48])


def crown_height(theta: float) -> float:
    ang = angle_diff(theta, SWOOSH_CENTER)
    opening = math.exp(-(ang * ang) / (2 * 0.34 * 0.34))
    side = abs(math.sin(theta - math.pi / 2))
    return 2.4 + 4.6 * (0.35 + 0.65 * side) * (1.0 - 0.82 * opening)


def build_crown(mats, cols, roof_ring) -> None:
    white = Bucket("Crown_White", mats["white"], cols["Crown"])
    metal = Bucket("Crown_Metal", mats["metal"], cols["Crown"])
    glass = Bucket("Crown_Glass", mats["glass"], cols["Glass"])
    base = [p for p, _n, _t in roof_ring]
    outer = []
    inner = []
    top_o = []
    top_i = []
    lip = []
    for p, normal, theta in roof_ring:
        h = crown_height(theta)
        o = p + normal * 0.35
        inn = p - normal * 1.35
        outer.append(Vector((o.x, o.y, ROOF_Z)))
        inner.append(Vector((inn.x, inn.y, ROOF_Z)))
        top_o.append(Vector((o.x, o.y, ROOF_Z + h)))
        top_i.append(Vector((inn.x, inn.y, ROOF_Z + h - 0.35)))
        lip.append(Vector(( (o + normal * 0.12).x, (o + normal * 0.12).y, ROOF_Z + h + 0.12)))
    # Parapet ring
    n = len(outer)
    for i in range(n):
        j = (i + 1) % n
        white.face([outer[i], outer[j], top_o[j], top_o[i]])
        white.face([top_i[i], top_i[j], inner[j], inner[i]])
        white.face([top_o[i], top_o[j], top_i[j], top_i[i]])
        metal.face([top_o[i], lip[i], lip[j], top_o[j]])
    # Roof terrace
    fan(white, [Vector((p.x, p.y, ROOF_Z)) for p in base], ROOF_Z, flip=False)
    # Glass drum inside the crown
    drum = ring(RX * 0.62, RY * 0.62, N_TOWER, lambda _t: 0.0, STEP_SCALE[48])
    dpts = [p for p, _n, _t in drum]
    bridge(glass, [Vector((p.x, p.y, ROOF_Z)) for p in dpts], [Vector((p.x, p.y, ROOF_Z + 5.2)) for p in dpts])
    white.finish()
    metal.finish()
    glass.finish()


def build_lobby(mats, cols) -> None:
    floor = Bucket("Lobby_Floor", mats["floor"], cols["Lobby"])
    stone = Bucket("Lobby_Stone", mats["stone"], cols["Lobby"])
    wood = Bucket("Lobby_Wood", mats["wood"], cols["Lobby"])
    core = Bucket("Lobby_Core", mats["core"], cols["Lobby"])
    glow = Bucket("Lobby_Glow", mats["glow"], cols["Lobby"])
    metal = Bucket("Lobby_Metal", mats["metal"], cols["Lobby"])
    # Inlay
    wall_box(floor, -7.2, 4.0, 0.02, 7.2, POD_RY - 0.8, 0.05)
    wall_box(stone, -4.6, 6.2, 0.05, 4.6, 9.4, 0.07)
    # Core
    wall_box(core, -3.4, -2.6, 0.0, 3.4, 3.2, PODIUM_FLOORS * PODIUM_H)
    # Desk
    wall_box(stone, -2.3, 7.4, 0.07, 2.3, 8.7, 0.78)
    wall_box(wood, -2.15, 7.55, 0.78, 2.15, 8.55, 0.92)
    # Columns
    for sx, sy in ((-6.2, 8.5), (6.2, 8.5), (-6.2, 4.2), (6.2, 4.2)):
        cyl(stone, Vector((sx, sy, 0)), 0.34, 0.0, ENTRANCE_TOP, 16)
        cyl(metal, Vector((sx, sy, 0)), 0.38, ENTRANCE_TOP - 0.06, ENTRANCE_TOP, 16)
    # Ceiling
    wall_box(stone, -10, 2.5, ENTRANCE_TOP - 0.16, 10, POD_RY - 1.0, ENTRANCE_TOP)
    # Ring light
    ring_pts = []
    for i in range(28):
        a = (i / 28) * math.tau
        ring_pts.append(Vector((math.cos(a) * 2.4, 8.2 + math.sin(a) * 1.3, ENTRANCE_TOP - 0.22)))
    inner = []
    for i in range(28):
        a = (i / 28) * math.tau
        inner.append(Vector((math.cos(a) * 2.05, 8.2 + math.sin(a) * 1.05, ENTRANCE_TOP - 0.22)))
    for i in range(28):
        j = (i + 1) % 28
        glow.face([inner[i], inner[j], ring_pts[j], ring_pts[i]])
    # Rear feature wall
    wall_box(wood, -3.2, 3.25, 0.4, 3.2, 3.45, 3.4)
    floor.finish()
    stone.finish()
    wood.finish()
    core.finish()
    glow.finish()
    metal.finish()


def add_palm(cols, mats, x: float, y: float, scale: float, yaw: float) -> None:
    trunk = Bucket(f"PalmTrunk_{x:.1f}_{y:.1f}", mats["trunk"], cols["Landscape"])
    frond = Bucket(f"PalmFrond_{x:.1f}_{y:.1f}", mats["plant"], cols["Landscape"])
    rings_l = []
    rings_u = []
    height = 7.4 * scale
    segs_z = 9
    sides = 8
    for i in range(segs_z):
        t = i / (segs_z - 1)
        r = (0.30 * (1 - t) + 0.11 * t) * scale
        z = t * height
        lean = math.sin(t * math.pi) * 0.35 * scale
        cx = x + math.cos(yaw) * lean
        cy = y + math.sin(yaw) * lean
        loop = []
        for k in range(sides):
            a = (k / sides) * math.tau
            loop.append(Vector((cx + math.cos(a) * r, cy + math.sin(a) * r, z)))
        if rings_l:
            bridge(trunk, rings_l, loop)
        rings_l = loop
        rings_u.append((cx, cy, z))
    trunk.finish()
    top = rings_u[-1]
    count = 11
    for f in range(count):
        ang = yaw + (f / count) * math.tau
        length = (4.6 + (f % 3) * 0.35) * scale
        steps = 6
        prev = None
        for s in range(steps):
            t = s / (steps - 1)
            droop = (t * t) * 1.7 * scale
            rise = math.sin(t * math.pi) * 0.7 * scale
            dist = t * length
            cx = top[0] + math.cos(ang) * dist
            cy = top[1] + math.sin(ang) * dist
            cz = top[2] + rise - droop
            width = (0.12 + math.sin(t * math.pi) * 0.42) * scale * (1 - 0.45 * t)
            side = Vector((-math.sin(ang), math.cos(ang), 0))
            a = Vector((cx, cy, cz)) - side * width
            b = Vector((cx, cy, cz)) + side * width
            if prev:
                frond.face([prev[0], prev[1], b, a])
                frond.face([prev[1], prev[0], a, b])
            prev = (a, b)
    frond.finish()


def build_landscape(mats, cols) -> None:
    pave = Bucket("Plaza", mats["pave"], cols["Landscape"])
    stone = Bucket("Planters", mats["stone"], cols["Landscape"])
    plant = Bucket("Hedges", mats["plant"], cols["Landscape"])
    plant_d = Bucket("HedgeDark", mats["plant_dark"], cols["Landscape"])
    water = Bucket("Pools", mats["water"], cols["Landscape"])
    metal = Bucket("Bollards", mats["metal"], cols["Landscape"])
    # Apron in front of the entrance, plus side and rear walks that stay outside the podium.
    apron_y = POD_RY + 0.4
    wall_box(pave, -32, apron_y, 0.02, 32, 40, 0.05)
    wall_box(pave, -36, -POD_RY - 4, 0.02, -POD_RX - 1.4, apron_y, 0.05)
    wall_box(pave, POD_RX + 1.4, -POD_RY - 4, 0.02, 36, apron_y, 0.05)
    wall_box(pave, -36, -POD_RY - 8, 0.02, 36, -POD_RY - 0.6, 0.05)
    for x in range(-28, 29, 4):
        wall_box(stone, x - 0.03, apron_y, 0.05, x + 0.03, 36, 0.065)
    for y in range(18, 37, 4):
        wall_box(stone, -28, y - 0.03, 0.05, 28, y + 0.03, 0.065)
    # Flanking pools
    for sx in (-11.5, 11.5):
        wall_box(stone, sx - 3.4, 18.2, 0.04, sx + 3.4, 23.6, 0.38)
        wall_box(water, sx - 3.05, 18.55, 0.28, sx + 3.05, 23.25, 0.34)
    # Entry planters
    for sx in (-6.4, 6.4):
        wall_box(stone, sx - 1.3, 14.2, 0.04, sx + 1.3, 16.6, 0.55)
        wall_box(plant, sx - 1.15, 14.35, 0.5, sx + 1.15, 16.45, 1.05)
        wall_box(plant_d, sx - 0.7, 14.6, 0.9, sx + 0.7, 16.2, 1.35)
    # Bollards along the walk
    for y in (20.5, 26.5, 32.5):
        for sx in (-2.6, 2.6):
            cyl(metal, Vector((sx, y, 0)), 0.08, 0.04, 0.92, 8)
    pave.finish()
    stone.finish()
    plant.finish()
    plant_d.finish()
    water.finish()
    metal.finish()
    palms = [
        (-12.5, 20.0, 1.05, 0.4),
        (12.2, 19.4, 0.96, 2.4),
        (-18.0, 15.0, 1.12, 0.2),
        (17.4, 14.2, 1.0, 2.8),
        (-9.0, 28.5, 0.88, 0.8),
        (9.4, 29.2, 0.92, 2.2),
        (-22.0, 26.0, 1.08, -0.3),
        (21.5, 25.0, 0.84, 3.0),
        (-14.0, 33.0, 0.78, 0.6),
        (15.0, 33.5, 0.9, 2.5),
        # Roof garden
        (-4.2, 3.2, 0.55, 0.5),
        (4.6, 2.4, 0.5, 2.0),
        (0.4, -3.5, 0.46, 1.2),
    ]
    roof_z_shift = PODIUM_FLOORS * PODIUM_H
    for i, (x, y, sc, yaw) in enumerate(palms):
        if i >= 10:
            add_palm_at(cols, mats, x, y, sc, yaw, roof_z_shift)
        else:
            add_palm(cols, mats, x, y, sc, yaw)


def add_palm_at(cols, mats, x, y, scale, yaw, z_base) -> None:
    """Palm whose trunk starts at z_base (roof garden)."""
    # Reuse add_palm by temporarily... easiest to duplicate with a z offset in a local variant.
    trunk = Bucket(f"RoofPalmTrunk_{x:.1f}", mats["trunk"], cols["Landscape"])
    frond = Bucket(f"RoofPalmFrond_{x:.1f}", mats["plant"], cols["Landscape"])
    height = 5.2 * scale
    sides = 7
    prev = None
    top = (x, y, z_base + height)
    segs_z = 7
    for i in range(segs_z):
        t = i / (segs_z - 1)
        r = (0.22 * (1 - t) + 0.09 * t) * scale
        z = z_base + t * height
        loop = []
        for k in range(sides):
            a = (k / sides) * math.tau
            loop.append(Vector((x + math.cos(a) * r, y + math.sin(a) * r, z)))
        if prev:
            bridge(trunk, prev, loop)
        prev = loop
        top = (x, y, z)
    trunk.finish()
    for f in range(8):
        ang = yaw + (f / 8) * math.tau
        length = 3.1 * scale
        prev_e = None
        for s in range(5):
            t = s / 4
            dist = t * length
            cz = top[2] + math.sin(t * math.pi) * 0.4 * scale - (t * t) * 1.1 * scale
            cx = x + math.cos(ang) * dist
            cy = y + math.sin(ang) * dist
            width = (0.08 + math.sin(t * math.pi) * 0.28) * scale
            side = Vector((-math.sin(ang), math.cos(ang), 0))
            a = Vector((cx, cy, cz)) - side * width
            b = Vector((cx, cy, cz)) + side * width
            if prev_e:
                frond.face([prev_e[0], prev_e[1], b, a])
                frond.face([prev_e[1], prev_e[0], a, b])
            prev_e = (a, b)
    frond.finish()


def aim_camera(obj, loc, target, lens=50, ortho=None) -> None:
    obj.location = loc
    direction = Vector(target) - Vector(loc)
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    if ortho:
        obj.data.type = "ORTHO"
        obj.data.ortho_scale = ortho
    else:
        obj.data.type = "PERSP"
        obj.data.lens = lens


def build_cameras() -> list[tuple[str, bpy.types.Object]]:
    col = collection("Cameras")
    specs = [
        # Ortho scale is the view width. 1280x800 needs ~360 m of width to fit 180 m of height.
        ("front", (0, 160, 90), (0, 0, 90), 50, 360),
        ("side", (180, 6, 90), (0, 0, 90), 50, 360),
        ("three-quarter", (78, 100, 42), (0, 0, 62), 45, None),
        ("ground", (1.4, 72, 1.7), (0, 8, 28), 26, None),
        ("facade", (7, 28, 52), (-2, 4, 56), 70, None),
        ("roof", (26, 34, 198), (0, 0, 168), 32, None),
    ]
    cams = []
    for name, loc, target, lens, ortho in specs:
        data = bpy.data.cameras.new(name)
        data.clip_end = 800
        obj = bpy.data.objects.new(name, data)
        col.objects.link(obj)
        aim_camera(obj, loc, target, lens, ortho)
        cams.append((name, obj))
    return cams


def render_all(cams) -> None:
    os.makedirs(RENDER_DIR, exist_ok=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 800
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    scene.eevee.taa_render_samples = 24
    if hasattr(scene.eevee, "use_shadows"):
        scene.eevee.use_shadows = True
    for name, obj in cams:
        scene.camera = obj
        scene.render.filepath = os.path.join(RENDER_DIR, f"{name}.png")
        bpy.ops.render.render(write_still=True)
        print("RENDERED", scene.render.filepath)


def export_glb() -> None:
    os.makedirs(os.path.dirname(GLB_PATH), exist_ok=True)
    skip_collections = {"RenderGround", "Massing", "Cameras", "ScaleFigure"}
    for obj in bpy.data.objects:
        helper = obj.type in {"CAMERA", "LIGHT"} or any(col.name in skip_collections for col in obj.users_collection)
        obj.select_set(not helper)
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


def write_metrics() -> None:
    data = {
        "height": CROWN_TOP,
        "roof": ROOF_Z,
        "floors": 48,
        "podiumFloors": PODIUM_FLOORS,
        "podiumHeight": PODIUM_FLOORS * PODIUM_H,
        "podium": {"rx": POD_RX, "ry": POD_RY, "n": N_POD},
        "tower": {"rx": RX, "ry": RY, "n": N_TOWER},
        "entrance": {
            "halfWidth": ENTRANCE_HALF_X,
            "height": ENTRANCE_TOP,
            "face": "-Z",
            "blenderFace": "+Y",
        },
        "columns": [{"x": -3.15, "z": -(POD_RY + CANOPY_DEPTH - 0.55), "r": 0.36}, {"x": 3.15, "z": -(POD_RY + CANOPY_DEPTH - 0.55), "r": 0.36}],
        "pools": [{"x": -11.5, "z": -20.9, "hx": 3.4, "hz": 2.7}, {"x": 11.5, "z": -20.9, "hx": 3.4, "hz": 2.7}],
        "core": {"hx": 3.4, "hz": 2.9, "z": -0.3},
        "note": "glTF (x, y, z) = Blender (x, z, -y). Entrance faces three.js -Z.",
    }
    # Pool center y in blender is (18.2+23.6)/2 = 20.9, glTF z = -20.9. Half depth (23.6-18.2)/2 = 2.7.
    with open(METRICS_PATH, "w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2)
        handle.write("\n")


def main() -> None:
    args = argv_after_dd()
    stage = "full"
    do_render = False
    do_export = False
    if "--stage" in args:
        stage = args[args.index("--stage") + 1]
    do_render = "--render" in args
    do_export = "--export" in args
    clear_scene()
    mats = make_mats()
    add_lights_and_world()
    ground_plane(mats)
    if stage == "massing":
        build_massing(mats)
    else:
        cols = {
            name: collection(name)
            for name in ("Podium", "Balconies", "Glass", "Railings", "Metal", "Crown", "Lobby", "Landscape")
        }
        build_podium(mats, cols)
        build_tower(mats, cols)
        build_lobby(mats, cols)
        build_landscape(mats, cols)
        scale_col = collection("ScaleFigure")
        scale_figure(scale_col, mats)
    cams = build_cameras()
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
    print("SAVED", BLEND_PATH)
    write_metrics()
    if do_export and stage != "massing":
        export_glb()
    if do_render:
        render_all(cams)


if __name__ == "__main__":
    main()
