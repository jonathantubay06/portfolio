"""Builds the desktop hero scene in Blender and exports img/hero3d/scene.glb.

Run headless (no UI, no MCP needed):
  blender --background --factory-startup --python 3d/build_scene.py -- [--render preview.png]

Named nodes the page script animates: cube_cart, cube_gear, cube_db,
wire_*, logo_ring. Everything else is static.
"""
import bpy, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TEX = os.path.join(HERE, 'tex')
IMG = os.path.join(ROOT, 'img')
OUT_DIR = os.path.join(IMG, 'hero3d')
os.makedirs(OUT_DIR, exist_ok=True)
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
RENDER = argv[argv.index('--render') + 1] if '--render' in argv else None

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


# ── materials ────────────────────────────────────────────────────────
def mat(name, color=(0.02, 0.03, 0.05), rough=0.5, metal=0.0, emit=None, strength=0.0, image=None, emit_image=False):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    if image:
        tex = m.node_tree.nodes.new('ShaderNodeTexImage')
        tex.image = bpy.data.images.load(image)
        m.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
        if emit_image:
            m.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Emission Color'])
            bsdf.inputs['Emission Strength'].default_value = strength or 0.8
    elif emit:
        bsdf.inputs['Emission Color'].default_value = (*emit, 1)
        bsdf.inputs['Emission Strength'].default_value = strength
    return m


M_DESK = mat('desk', (0.015, 0.022, 0.04), rough=0.35, metal=0.3)
M_ALU = mat('aluminium', (0.07, 0.08, 0.1), rough=0.3, metal=0.9)
M_DARK = mat('bezel', (0.01, 0.012, 0.016), rough=0.4)
M_EDGE = mat('edge_glow', emit=(0.0, 0.55, 1.0), strength=6)
M_WIRE = mat('wire', emit=(0.2, 0.85, 1.0), strength=5)
M_KEYS = mat('keyboard', image=os.path.join(TEX, 'keyboard.png'), rough=0.6)
M_SCREEN = mat('screen', image=os.path.join(TEX, 'storefront.png'), emit_image=True, strength=0.9)
M_TABLET = mat('tablet_ui', image=os.path.join(TEX, 'tablet.png'), emit_image=True, strength=0.9)
M_POT = mat('pot', (0.02, 0.02, 0.025), rough=0.6)
M_LEAF = mat('leaf', (0.03, 0.12, 0.05), rough=0.5)
M_PEN = mat('pen', (0.02, 0.02, 0.02), rough=0.25, metal=0.6)
M_GOLD = mat('pen_tip', (0.8, 0.55, 0.25), rough=0.2, metal=1.0)


def box(name, size, loc, m, bevel=0.01, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = o.modifiers.new('bevel', 'BEVEL')
        mod.width = bevel
        mod.segments = 3
    o.data.materials.append(m)
    bpy.ops.object.shade_smooth()
    return o


def plane(name, w, h, loc, rot, m):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.scale = (w, h, 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(m)
    return o


def parent(child, par):
    child.parent = par
    child.matrix_parent_inverse = par.matrix_world.inverted()


# ── desk ─────────────────────────────────────────────────────────────
box('desk', (3.6, 2.2, 0.1), (0.1, 0.1, -0.05), M_DESK, bevel=0.02)
box('desk_edge_front', (3.6, 0.012, 0.012), (0.1, -1.0, 0.0), M_EDGE, bevel=0)
box('desk_edge_right', (0.012, 2.2, 0.012), (1.9, 0.1, 0.0), M_EDGE, bevel=0)

# ── laptop ───────────────────────────────────────────────────────────
base = box('laptop_base', (1.3, 0.88, 0.035), (-0.15, 0.05, 0.02), M_ALU, bevel=0.012)
plane('laptop_keys', 1.18, 0.5, (-0.15, 0.14, 0.039), (0, 0, 0), M_KEYS)
hinge = (-0.15, 0.49, 0.04)
lid = box('laptop_lid', (1.3, 0.025, 0.84), (hinge[0], hinge[1], hinge[2] + 0.42), M_DARK, bevel=0.01)
scr = plane('laptop_screen', 1.2, 0.74, (hinge[0], hinge[1] - 0.014, hinge[2] + 0.43), (math.radians(90), 0, 0), M_SCREEN)
parent(scr, lid)
# tilt the lid back ~15deg about the hinge
bpy.context.scene.cursor.location = hinge
for o in (lid,):
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    o.rotation_euler[0] = math.radians(-14)

# ── tablet on a stand, turned toward the laptop ──────────────────────
tab = box('tablet', (0.66, 0.03, 0.9), (1.2, 0.3, 0.52), M_DARK, bevel=0.02, rot=(math.radians(-12), 0, math.radians(-28)))
# Screen placed in the tablet's own frame, then baked to world space.
from mathutils import Matrix, Euler
tui = plane('tablet_screen', 0.6, 0.84, (0, 0, 0), (0, 0, 0), M_TABLET)
bpy.context.view_layer.update()
tui.matrix_world = tab.matrix_world @ Matrix.Translation((0, -0.017, 0)) @ Euler((math.radians(90), 0, 0)).to_matrix().to_4x4()
box('tablet_stand', (0.3, 0.3, 0.05), (1.28, 0.42, 0.03), M_ALU, bevel=0.01, rot=(0, 0, math.radians(-28)))

# ── project cards on the desk (real work) ────────────────────────────
for i, name in enumerate(['moev', 'sapmok', 'Deirdre']):
    m = mat('card_' + name, image=os.path.join(IMG, f'preview-{name}-360w.webp'), emit_image=True, strength=0.6)
    x = -1.35 + i * 0.52
    box('card_frame_' + name, (0.48, 0.32, 0.02), (x, -0.72, 0.012), M_DARK, bevel=0.006, rot=(0, 0, math.radians(-8)))
    plane('card_' + name, 0.44, 0.27, (x, -0.72, 0.024), (0, 0, math.radians(-8)), m)

# ── plant + pen ──────────────────────────────────────────────────────
bpy.ops.mesh.primitive_cylinder_add(radius=0.11, depth=0.2, location=(-1.25, 0.55, 0.1)); p = bpy.context.object; p.name = 'pot'; p.data.materials.append(M_POT)
for k in range(9):
    a = k * 2 * math.pi / 9
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.05, location=(-1.25 + 0.1 * math.cos(a), 0.55 + 0.1 * math.sin(a), 0.3 + 0.03 * (k % 3)))
    lf = bpy.context.object; lf.name = f'leaf_{k}'; lf.scale = (2.4, 0.5, 0.18)
    lf.rotation_euler = (math.radians(20), math.radians(-35), a); lf.data.materials.append(M_LEAF)
bpy.ops.mesh.primitive_cylinder_add(radius=0.012, depth=0.42, location=(1.35, -0.62, 0.015), rotation=(0, math.radians(90), math.radians(28)))
pen = bpy.context.object; pen.name = 'pen'; pen.data.materials.append(M_PEN)

# ── floating icon cubes ──────────────────────────────────────────────
CUBES = [('cube_cart', 'cube-cart.png', (-0.75, 0.45, 1.45)),
         ('cube_gear', 'cube-gear.png', (0.1, 0.6, 1.62)),
         ('cube_db', 'cube-db.png', (0.95, 0.35, 1.45))]
for name, tex, loc in CUBES:
    m = mat(name + '_mat', image=os.path.join(TEX, tex), emit_image=True, strength=1.2)
    c = box(name, (0.3, 0.3, 0.3), loc, m, bevel=0.035)
    c.rotation_euler = (0, 0, math.radians(8))
    # The cube primitive's UVs are a cross layout; give every face the
    # whole icon instead.
    import bmesh
    bm = bmesh.new(); bm.from_mesh(c.data)
    uv = bm.loops.layers.uv.verify()
    from mathutils import Vector
    up = Vector((0, 0, 1))
    for f in bm.faces:
        n = f.normal
        # upright icon on the sides; top/bottom use x/y
        if abs(n.z) > 0.9:
            ax, ay = Vector((1, 0, 0)), Vector((0, 1 if n.z > 0 else -1, 0))
        else:
            ax, ay = up.cross(n).normalized() * -1, up
        for lp in f.loops:
            co = lp.vert.co
            lp[uv].uv = (co.dot(ax) / 0.3 + 0.5, co.dot(ay) / 0.3 + 0.5)
    bm.to_mesh(c.data); bm.free()

# ── glowing wires (cubes to cubes, down to laptop and tablet) ────────
def wire(name, pts):
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = 0.011
    cu.bevel_resolution = 3
    sp = cu.splines.new('NURBS')
    sp.order_u = 3
    sp.use_endpoint_u = True
    sp.resolution_u = 16
    sp.points.add(len(pts) - 1)
    for i, p in enumerate(pts):
        sp.points[i].co = (*p, 1)
    o = bpy.data.objects.new(name, cu)
    scene.collection.objects.link(o)
    o.data.materials.append(M_WIRE)
    return o


# Wires between the cubes were dropped (2026-09-28): they read as clutter.
# Smooth arcs from face to face: cart -> gear -> database, then the gear
# drops a line to the laptop lid and the database one to the tablet.
# wire('wire_1', [(-0.6, 0.47, 1.47), (-0.32, 0.55, 1.62), (-0.05, 0.6, 1.63)])
# wire('wire_2', [(0.25, 0.6, 1.63), (0.55, 0.47, 1.6), (0.8, 0.37, 1.47)])
# wire('wire_3', [(0.1, 0.6, 1.47), (0.05, 0.64, 1.15), (-0.12, 0.68, 0.88)])
# wire('wire_4', [(0.95, 0.35, 1.3), (1.12, 0.37, 1.12), (1.18, 0.38, 0.98)])


# ── extra set dressing (2026-09-28 round 2) ──────────────────────────
# 3D version of the gear logo (seen from the front, +x is the viewer's
# left here, hence cyan on 'left' = orange on screen-left): two half rings with teeth, orange + cyan,
# floating behind the laptop. The page spins it.
M_ORANGE = mat('logo_orange', (1.0, 0.45, 0.08), rough=0.3, metal=0.3, emit=(1.0, 0.4, 0.05), strength=0.6)
M_CYAN = mat('logo_cyan', (0.1, 0.7, 1.0), rough=0.3, metal=0.3, emit=(0.0, 0.6, 1.0), strength=0.6)
M_DIAL = mat('logo_dial', (0.02, 0.05, 0.1), rough=0.4, emit=(0.0, 0.3, 0.6), strength=0.3)
import bmesh
def gear_half(name, m, a0, a1, teeth=6):
    bm = bmesh.new()
    R_in, R_out, R_tip, depth = 0.34, 0.5, 0.6, 0.1
    steps = teeth * 4
    ring = []
    for i in range(steps + 1):
        a = a0 + (a1 - a0) * i / steps
        tooth = (i % 4) in (1, 2)
        r = R_tip if tooth else R_out
        ring.append((a, r))
    verts = []
    for a, r in ring:
        for z in (-depth / 2, depth / 2):
            verts.append(bm.verts.new((r * math.cos(a), 0, r * math.sin(a) + z * 0)))
    bm.free()
    # simpler, robust route: a flat polygon, extruded by a solidify modifier
    me = bpy.data.meshes.new(name)
    outer = [(r * math.cos(a), r * math.sin(a)) for a, r in ring]
    inner = [(R_in * math.cos(a0 + (a1 - a0) * i / steps), R_in * math.sin(a0 + (a1 - a0) * i / steps)) for i in range(steps, -1, -1)]
    poly = outer + inner
    me.from_pydata([(x, 0, z) for x, z in poly], [], [list(range(len(poly)))])
    o = bpy.data.objects.new(name, me)
    scene.collection.objects.link(o)
    sol = o.modifiers.new('solid', 'SOLIDIFY'); sol.thickness = 0.1
    bev = o.modifiers.new('bevel', 'BEVEL'); bev.width = 0.012; bev.segments = 2
    o.data.materials.append(m)
    return o

logo = bpy.data.objects.new('logo_gear', None)
scene.collection.objects.link(logo)
logo.location = (-0.25, 1.75, 1.3)
g1 = gear_half('logo_left', M_CYAN, math.radians(92), math.radians(268))
g2 = gear_half('logo_right', M_ORANGE, math.radians(-88), math.radians(88))
bpy.ops.mesh.primitive_cylinder_add(radius=0.3, depth=0.06, location=(0, 0, 0), rotation=(math.radians(90), 0, 0))
dial = bpy.context.object; dial.name = 'logo_dial'; dial.data.materials.append(M_DIAL)
for o in (g1, g2, dial):
    o.parent = logo
logo.scale = (1.0, 1.0, 1.0)
# face the page camera, which sits ~18deg to the right of front
logo.rotation_euler = (0, 0, math.radians(18))

# floating holographic panels (the page bobs them)
M_CHART = mat('holo_chart', image=os.path.join(TEX, 'holo-chart.png'), emit_image=True, strength=1.0)
M_ORDER = mat('holo_order', image=os.path.join(TEX, 'holo-order.png'), emit_image=True, strength=1.0)
plane('holo_chart', 0.64, 0.4, (-1.15, -0.05, 1.05), (math.radians(90), 0, math.radians(25)), M_CHART)
plane('holo_order', 0.6, 0.2, (1.55, -0.35, 1.3), (math.radians(90), 0, math.radians(-30)), M_ORDER)

# phone + coffee mug on the desk
box('phone', (0.2, 0.4, 0.02), (0.75, -0.55, 0.012), M_DARK, bevel=0.02, rot=(0, 0, math.radians(20)))
M_PHONE = mat('phone_screen', emit=(0.0, 0.5, 0.9), strength=0.6)
plane('phone_screen', 0.18, 0.37, (0.75, -0.55, 0.024), (0, 0, math.radians(20)), M_PHONE)
bpy.ops.mesh.primitive_cylinder_add(radius=0.07, depth=0.16, location=(-0.95, -0.35, 0.08))
mug = bpy.context.object; mug.name = 'mug'; mug.data.materials.append(mat('mug', (0.9, 0.9, 0.92), rough=0.3))
bpy.ops.mesh.primitive_torus_add(major_radius=0.045, minor_radius=0.012, location=(-0.875, -0.35, 0.08), rotation=(math.radians(90), 0, 0))
bpy.context.object.name = 'mug_handle'; bpy.context.object.data.materials.append(bpy.data.materials['mug'])

# ── round 3 set dressing ─────────────────────────────────────────────
# glowing desk mat under the laptop
M_MAT = mat('desk_mat', image=os.path.join(TEX, 'desk-mat.png'), emit_image=True, strength=0.5)
plane('desk_mat', 1.7, 1.15, (-0.15, 0.05, 0.002), (0, 0, 0), M_MAT)

# desk lamp, back left, warm bulb
M_LAMP = mat('lamp_body', (0.05, 0.05, 0.06), rough=0.3, metal=0.8)
M_BULB = mat('lamp_bulb', emit=(1.0, 0.7, 0.35), strength=8)
bpy.ops.mesh.primitive_cylinder_add(radius=0.12, depth=0.03, location=(-1.6, 0.2, 0.015)); bpy.context.object.data.materials.append(M_LAMP); bpy.context.object.name = 'lamp_base'
bpy.ops.mesh.primitive_cylinder_add(radius=0.015, depth=0.7, location=(-1.58, 0.22, 0.36), rotation=(math.radians(0), math.radians(8), 0)); bpy.context.object.data.materials.append(M_LAMP); bpy.context.object.name = 'lamp_arm'
bpy.ops.mesh.primitive_cone_add(radius1=0.13, radius2=0.05, depth=0.16, location=(-1.45, 0.1, 0.7), rotation=(math.radians(-35), math.radians(30), 0)); bpy.context.object.data.materials.append(M_LAMP); bpy.context.object.name = 'lamp_head'
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.045, location=(-1.42, 0.07, 0.64)); bpy.context.object.data.materials.append(M_BULB); bpy.context.object.name = 'lamp_bulb'

# stack of books, back right of the laptop
for i, col in enumerate([(0.9, 0.35, 0.1), (0.05, 0.35, 0.6), (0.85, 0.85, 0.88)]):
    box(f'book_{i}', (0.42, 0.3, 0.05), (0.55, 0.85, 0.028 + i * 0.052), mat(f'book_{i}', col, rough=0.6), bevel=0.006, rot=(0, 0, math.radians(8 - i * 7)))

# headphones, front right
M_HP = mat('headphones', (0.03, 0.03, 0.035), rough=0.35)
bpy.ops.mesh.primitive_torus_add(major_radius=0.16, minor_radius=0.018, location=(1.25, -0.25, 0.03)); hp = bpy.context.object; hp.name = 'headphones_band'; hp.scale = (1, 0.75, 1); hp.data.materials.append(M_HP)
for dx in (-0.16, 0.16):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.07, depth=0.05, location=(1.25 + dx, -0.25, 0.03)); c = bpy.context.object; c.data.materials.append(M_HP); c.name = 'headphones_cup'

# floating shopping bag near the cart cube (the page bobs holo_*)
M_BAG = mat('holo_bag_mat', (1.0, 0.5, 0.12), rough=0.4, emit=(1.0, 0.45, 0.1), strength=0.4)
bag = box('holo_bag', (0.2, 0.09, 0.22), (-1.2, 0.35, 1.65), M_BAG, bevel=0.01, rot=(0, 0, math.radians(20)))
bpy.ops.mesh.primitive_torus_add(major_radius=0.05, minor_radius=0.008, location=(-1.2, 0.35, 1.78), rotation=(math.radians(90), 0, math.radians(20)))
hd = bpy.context.object; hd.name = 'bag_handle'; hd.data.materials.append(M_BAG); hd.parent = bag; hd.matrix_parent_inverse = bag.matrix_world.inverted()

# uptime gauge panel (the page draws the ring)
M_GAUGE = mat('holo_gauge', image=os.path.join(TEX, 'holo-gauge.png'), emit_image=True, strength=1.0)
plane('holo_gauge', 0.32, 0.32, (1.75, 0.0, 0.8), (math.radians(90), 0, math.radians(-35)), M_GAUGE)

# ── lights (exported as KHR punctual; the page adds its own too) ─────
def light(kind, loc, energy, color, size=1.0):
    ld = bpy.data.lights.new(kind + '_l', kind)
    ld.energy = energy
    ld.color = color
    if kind == 'AREA':
        ld.size = size
    o = bpy.data.objects.new(kind + '_light', ld)
    o.location = loc
    scene.collection.objects.link(o)
    return o


key = light('AREA', (-1.5, -2.2, 3.0), 400, (0.75, 0.88, 1.0), 3)
key.rotation_euler = (math.radians(50), 0, math.radians(-30))
light('POINT', (0.2, 0.2, 1.9), 60, (0.2, 0.75, 1.0))
light('POINT', (1.6, -0.6, 0.8), 25, (1.0, 0.55, 0.2))

# ── export ───────────────────────────────────────────────────────────
for o in scene.objects:
    for m in o.modifiers:
        pass
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT_DIR, 'scene.glb'), export_format='GLB',
                          export_apply=True, export_image_format='WEBP', export_image_quality=80,
                          export_lights=False, export_yup=True)
print('exported', os.path.getsize(os.path.join(OUT_DIR, 'scene.glb')) // 1024, 'KB')

# ── optional preview render ──────────────────────────────────────────
if RENDER:
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    scene.collection.objects.link(cam)
    cam.location = (3.3, -3.6, 2.9)
    tr = cam.constraints.new('TRACK_TO')
    tgt = bpy.data.objects.new('tgt', None); scene.collection.objects.link(tgt); tgt.location = (0.1, 0.2, 0.7)
    tr.target = tgt
    cam.data.lens = 42
    scene.camera = cam
    scene.world = bpy.data.worlds.new('w'); scene.world.color = (0.005, 0.01, 0.02)
    scene.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE'
    scene.render.resolution_x, scene.render.resolution_y = 1200, 1030
    scene.render.filepath = RENDER
    bpy.ops.render.render(write_still=True)
    print('rendered', RENDER)
