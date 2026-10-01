"""Builds the desktop hero scene in Blender and exports img/hero3d/scene.glb.

Run headless (no UI, no MCP needed):
  blender --background --factory-startup --python 3d/build_scene.py -- [--render preview.png]

Named nodes the page script animates: cube_cart, cube_gear, cube_db,
logo_left/right, holo_*, drone (+ drone_prop_*), bot (+ bot_wheel_*),
rack_led_*. Everything else is static. After export, compress with
gltf-transform (see the note at the export step).
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
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.05, location=(-1.25 + 0.1 * math.cos(a), 0.55 + 0.1 * math.sin(a), 0.3 + 0.03 * (k % 3)), segments=14, ring_count=8)
    lf = bpy.context.object; lf.name = f'leaf_{k}'; lf.scale = (2.4, 0.5, 0.18)
    lf.rotation_euler = (math.radians(20), math.radians(-35), a); lf.data.materials.append(M_LEAF)
bpy.ops.mesh.primitive_cylinder_add(radius=0.012, depth=0.42, location=(1.5, -0.9, 0.015), rotation=(0, math.radians(90), math.radians(8)))
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
# The page spins the halves. Each half mesh hangs under its own empty:
# gltf-transform's quantizer rewrites the transform of mesh nodes, so the
# page only ever rotates/scales empties (pivot stays at the gear centre).
bpy.ops.mesh.primitive_cylinder_add(radius=0.3, depth=0.06, location=(0, 0, 0), rotation=(math.radians(90), 0, 0))
dial = bpy.context.object; dial.name = 'logo_dial'; dial.data.materials.append(M_DIAL)
dial.parent = logo
for nm, m, a0, a1 in (('logo_left', M_CYAN, 92, 268), ('logo_right', M_ORANGE, -88, 88)):
    e = bpy.data.objects.new(nm, None); scene.collection.objects.link(e); e.parent = logo
    g = gear_half(nm + '_mesh', m, math.radians(a0), math.radians(a1)); g.parent = e
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
bpy.ops.mesh.primitive_torus_add(major_radius=0.045, minor_radius=0.012, location=(-0.875, -0.35, 0.08), rotation=(math.radians(90), 0, 0), major_segments=20, minor_segments=8)
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
# top book is blue so the cream dog asleep on it stands out
for i, col in enumerate([(0.85, 0.85, 0.88), (0.9, 0.35, 0.1), (0.05, 0.35, 0.6)]):
    box(f'book_{i}', (0.42, 0.3, 0.05), (0.55, 0.85, 0.028 + i * 0.052), mat(f'book_{i}', col, rough=0.6), bevel=0.006, rot=(0, 0, math.radians(8 - i * 7)))

# headphones, front right
M_HP = mat('headphones', (0.03, 0.03, 0.035), rough=0.35)
bpy.ops.mesh.primitive_torus_add(major_radius=0.16, minor_radius=0.018, location=(1.25, -0.25, 0.03), major_segments=32, minor_segments=8); hp = bpy.context.object; hp.name = 'headphones_band'; hp.scale = (1, 0.75, 1); hp.data.materials.append(M_HP)
for dx in (-0.16, 0.16):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.07, depth=0.05, location=(1.25 + dx, -0.25, 0.03)); c = bpy.context.object; c.data.materials.append(M_HP); c.name = 'headphones_cup'

# floating shopping bag near the cart cube (the page bobs holo_*)
M_BAG = mat('holo_bag_mat', (1.0, 0.5, 0.12), rough=0.4, emit=(1.0, 0.45, 0.1), strength=0.4)
bag = box('holo_bag', (0.2, 0.09, 0.22), (-1.2, 0.35, 1.65), M_BAG, bevel=0.01, rot=(0, 0, math.radians(20)))
bpy.ops.mesh.primitive_torus_add(major_radius=0.05, minor_radius=0.008, location=(-1.2, 0.35, 1.78), rotation=(math.radians(90), 0, math.radians(20)), major_segments=20, minor_segments=8)
hd = bpy.context.object; hd.name = 'bag_handle'; hd.data.materials.append(M_BAG); hd.parent = bag; hd.matrix_parent_inverse = bag.matrix_world.inverted()

# uptime gauge panel (the page draws the ring)
M_GAUGE = mat('holo_gauge', image=os.path.join(TEX, 'holo-gauge.png'), emit_image=True, strength=1.0)
plane('holo_gauge', 0.32, 0.32, (1.75, 0.0, 0.8), (math.radians(90), 0, math.radians(-35)), M_GAUGE)

# ── round 4: moving eCommerce props (the page animates them) ──────────
# Built around the origin under a named empty, then the empty is placed.
# The page moves/rotates the empties only (see the quantizer note above).
def empty(name, loc=(0, 0, 0), par=None):
    e = bpy.data.objects.new(name, None); scene.collection.objects.link(e)
    e.location = loc
    if par: e.parent = par
    return e


def cyl(name, r, depth, loc, m, rot=(0, 0, 0), verts=16):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=verts)
    o = bpy.context.object; o.name = name; o.data.materials.append(m)
    return o


def under(par, *objs):
    for o in objs: o.parent = par


M_ACC_C = mat('accent_cyan', (0.0, 0.5, 0.8), emit=(0.0, 0.8, 1.0), strength=3)
M_ACC_O = mat('accent_orange', (1.0, 0.45, 0.1), emit=(1.0, 0.45, 0.08), strength=3)
M_BOX = mat('parcel', (0.42, 0.27, 0.13), rough=0.8)
M_TAPE = mat('parcel_tape', (0.75, 0.6, 0.4), rough=0.6)
M_LED_C = mat('led_cyan', emit=(0.0, 0.85, 1.0), strength=4)
M_LED_G = mat('led_green', emit=(0.1, 1.0, 0.5), strength=4)
M_LED_O = mat('led_orange', emit=(1.0, 0.5, 0.1), strength=4)

# delivery drone with a parcel (the page flies it round the desk)
drone = empty('drone')
under(drone,
      box('drone_body', (0.16, 0.16, 0.045), (0, 0, 0), M_ALU, bevel=0.012),
      box('drone_top', (0.08, 0.08, 0.018), (0, 0, 0.03), M_ACC_C, bevel=0.006),
      box('drone_box', (0.1, 0.1, 0.08), (0, 0, -0.11), M_BOX, bevel=0.006),
      box('drone_tape', (0.102, 0.022, 0.082), (0, 0, -0.11), M_TAPE, bevel=0),
      cyl('drone_line_a', 0.003, 0.05, (0.03, 0, -0.045), M_DARK, verts=6),
      cyl('drone_line_b', 0.003, 0.05, (-0.03, 0, -0.045), M_DARK, verts=6),
      box('drone_nose', (0.02, 0.05, 0.012), (0.085, 0, 0), M_ACC_O, bevel=0))
for i in range(4):
    a = math.radians(45 + i * 90); ex, ey = 0.12 * math.cos(a), 0.12 * math.sin(a)
    under(drone,
          box(f'drone_arm_{i}', (0.15, 0.018, 0.012), (ex / 2, ey / 2, 0), M_DARK, bevel=0, rot=(0, 0, a)),
          cyl(f'drone_motor_{i}', 0.02, 0.03, (ex, ey, 0.01), M_DARK, verts=12))
    pe = empty(f'drone_prop_{i}', (ex, ey, 0.03), drone)
    # children of a placed empty sit at its origin (parent= keeps local)
    under(pe, box(f'drone_blade_{i}', (0.13, 0.014, 0.003), (0, 0, 0), M_ACC_C if i % 2 else M_DARK, bevel=0))
drone.location = (0.3, -0.75, 1.0)

# server rack beside the tablet, blinking status LEDs (page blinks rack_led_*)
rack = empty('rack')
under(rack, box('rack_frame', (0.26, 0.24, 0.46), (0, 0, 0.23), M_DARK, bevel=0.012),
      box('rack_top', (0.24, 0.012, 0.008), (0, -0.121, 0.455), M_ACC_C, bevel=0))
LEDS = (M_LED_G, M_LED_C, M_LED_O)
for u in range(4):
    z = 0.07 + u * 0.1
    under(rack, box(f'rack_unit_{u}', (0.23, 0.012, 0.08), (0, -0.12, z), M_ALU, bevel=0.004))
    for k in range(3):
        under(rack, box(f'rack_led_{u * 3 + k}', (0.018, 0.006, 0.012), (-0.085 + k * 0.03, -0.127, z + 0.018), LEDS[k], bevel=0))
    under(rack, box(f'rack_slot_{u}', (0.1, 0.004, 0.01), (0.05, -0.127, z - 0.012), M_DARK, bevel=0))
rack.location = (1.66, 0.62, 0.0)
rack.rotation_euler = (0, 0, math.radians(-12))

# little cart robot that shuttles along the front of the desk mat
bot = empty('bot')
under(bot,
      box('bot_body', (0.16, 0.11, 0.05), (0, 0, 0.045), M_ALU, bevel=0.01),
      box('bot_stripe', (0.162, 0.112, 0.01), (0, 0, 0.035), M_ACC_O, bevel=0),
      box('bot_eye', (0.006, 0.07, 0.022), (0.08, 0, 0.055), M_ACC_C, bevel=0),
      box('bot_tray', (0.13, 0.095, 0.01), (0, 0, 0.075), M_DARK, bevel=0.003),
      box('bot_parcel', (0.065, 0.06, 0.05), (-0.01, 0, 0.105), M_BOX, bevel=0.004),
      cyl('bot_mast', 0.004, 0.06, (-0.06, 0.035, 0.1), M_DARK, verts=6))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.01, location=(-0.06, 0.035, 0.135), segments=10, ring_count=6)
bl = bpy.context.object; bl.name = 'bot_led'; bl.data.materials.append(M_LED_O); bl.parent = bot
for i, (wx, wy) in enumerate([(0.05, 0.06), (-0.05, 0.06), (0.05, -0.06), (-0.05, -0.06)]):
    we = empty(f'bot_wheel_{i}', (wx, wy, 0.022), bot)
    under(we, cyl(f'bot_tyre_{i}', 0.022, 0.018, (0, 0, 0), M_DARK, rot=(math.radians(90), 0, 0), verts=12),
          cyl(f'bot_hub_{i}', 0.008, 0.02, (0, 0, 0), M_ACC_C, rot=(math.radians(90), 0, 0), verts=8))
bot.location = (-0.2, -0.47, 0.002)

# floating code window (the page types into it)
M_CODE = mat('holo_code', image=os.path.join(TEX, 'holo-code.png'), emit_image=True, strength=1.0)
plane('holo_code', 0.58, 0.39, (1.15, 0.3, 1.9), (math.radians(90), 0, math.radians(-22)), M_CODE)

# ── round 5: Dumpling, the wall shelf, the label printer ─────────────
def ball(name, r, loc, m, sc=(1, 1, 1), sub=2):
    """Low-poly ball (icosphere) scaled into an ellipsoid; scale applied."""
    bpy.ops.mesh.primitive_ico_sphere_add(radius=r, location=loc, subdivisions=sub)
    o = bpy.context.object; o.name = name; o.scale = sc
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(m); bpy.ops.object.shade_smooth()
    return o


def join(name, objs):
    """Merge meshes into one (one draw call per material, not per ball)."""
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.object; o.name = name
    return o


# Dumpling: pale cream pom x poodle, short clipped curly coat, round
# head, short muzzle, button nose, long straight beige ears hanging like
# a bob, plumed tail, no collar. Asleep, curled on the book stack, head
# on her front paws, tail wrapped round the side facing the camera.
# Each part is a few ellipsoids fused by a voxel remesh into one smooth
# silhouette, then a small noise push along the normals for the curls.
# The page breathes dog_body (scale) and flicks dog_ear_l/r and dog_tail
# (rotation), so each sits under its own empty.
UV_SPAN, CURL_TILES = 0.4, 8.8   # about 22 curl tiles per metre


def fur_mat(name, color, rough=0.92, curl=0.9):
    """Warm cream coat: flat colour + a tiled curl normal map (tex/dog-curls.png)."""
    m = mat(name, color, rough=rough)
    nt = m.node_tree; bsdf = nt.nodes['Principled BSDF']
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(os.path.join(TEX, 'dog-curls.png'), check_existing=True)
    tex.image.colorspace_settings.name = 'Non-Color'
    # UVs span 0-1 over UV_SPAN metres (so they quantize); tiling comes from
    # a Mapping node, exported as KHR_texture_transform
    uvn = nt.nodes.new('ShaderNodeUVMap')
    mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (CURL_TILES, CURL_TILES, 1)
    nt.links.new(uvn.outputs['UV'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], tex.inputs['Vector'])
    nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = curl
    nt.links.new(tex.outputs['Color'], nm.inputs['Color'])
    nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    return m


# one apricot-cream all over (ref #EBD3AE-#F2E0C4), muzzle a shade paler,
# ears a touch more golden (#D9B88A). Values are linear and pushed warm,
# because the cool key light bleaches cream toward white on the page.
M_FUR = fur_mat('dog_fur', (0.78, 0.46, 0.19), curl=1.1)
M_MUZ = fur_mat('dog_muzzle', (0.78, 0.56, 0.32), curl=0.6)
M_EAR = fur_mat('dog_ear', (0.66, 0.33, 0.08), rough=0.9, curl=1.3)
M_NOSE = mat('dog_nose', (0.03, 0.012, 0.006), rough=0.12)
from mathutils import noise as _noise, Vector as _V


def curl_uv(o, k=1 / UV_SPAN, per_vertex=False, off=(0, 0, 0)):
    """Box-projected UVs at a fixed world scale so curls stay the same size
    on every part (the remesh leaves no UVs). per_vertex: project by each
    vertex normal so a small nub never splits vertices (stays cheap)."""
    me = o.data
    uv = me.uv_layers.get('UVMap') or me.uv_layers.new(name='UVMap')
    pick = lambda nrm: [(1, 2), (0, 2), (0, 1)][max(range(3), key=lambda i: abs(nrm[i]))]
    if per_vertex:
        vuv = []
        for v in me.vertices:
            u, w = pick(v.normal); c = v.co + _V(off)
            vuv.append((c[u] * k + 0.5, c[w] * k + 0.5))
        for lp in me.loops: uv.data[lp.index].uv = vuv[lp.vertex_index]
        return
    for p in me.polygons:
        u, w = pick(p.normal)
        for li in p.loop_indices:
            c = me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv = (c[u] * k + 0.5, c[w] * k + 0.5)


def blob(name, specs, m, voxel=0.0045, fur=0.0018, freq=65, ratio=0.2, wave=None,
         nubs=0, nub_r=(0.004, 0.006), keep=None, seed=1, extra=(), nub_mode='ball', hide=None):
    """Fuse (center, radii) ellipsoids into one smooth furry mesh, then stud
    it with `nubs` low-poly curl bumps (where keep(co, normal) is true) so the
    outline reads curly. `extra` = more meshes merged in (toes etc.)."""
    o = join(name, [ball(f'{name}_{k}', 1, c, m, r, 3) for k, (c, r) in enumerate(specs)])
    for typ, kw in (('REMESH', dict(mode='VOXEL', voxel_size=voxel)),
                    ('SMOOTH', dict(factor=0.9, iterations=8))):
        md = o.modifiers.new(typ, typ)
        for k, v in kw.items(): setattr(md, k, v)
        bpy.ops.object.modifier_apply(modifier=md.name)
    o.data.update()
    for v in o.data.vertices:
        q = v.co * freq
        # soft tufts: ridged noise gives a fuzzy, uneven fringe (not big lumps)
        t = 1 - abs(_noise.noise(q * 2.6))
        d = _noise.noise(q) + 0.5 * _noise.noise(q * 2.1) + 0.6 * t * t
        if wave: d += wave[0] * math.sin(v.co.z * wave[1] + v.co.x * 40)
        v.co += v.normal * fur * d
    # curl nubs: packed round bumps pushed out of the dense remeshed surface
    # (before decimation, so they cost no extra vertices) - the outline
    # turns scalloped like a teddy-bear poodle coat
    import random
    from mathutils.kdtree import KDTree
    rnd = random.Random(seed)
    o.data.update()
    pts = [(v.co.copy(), v.normal.copy()) for v in o.data.vertices]
    pts_n = {c.to_tuple(6): n for c, n in pts}
    rnd.shuffle(pts)
    sites = []
    grid = {}
    cell = nub_r[1] * 2.4
    for co, n in pts:
        if len(sites) >= nubs: break
        if keep and not keep(co, n): continue
        r = rnd.uniform(*nub_r)
        key = tuple(int(math.floor(c / cell)) for c in co)
        near = [s for dx in (-1, 0, 1) for dy in (-1, 0, 1) for dz in (-1, 0, 1)
                for s in grid.get((key[0] + dx, key[1] + dy, key[2] + dz), ())]
        if all((co - c).length > (r + rr) * 0.85 for c, rr in near):
            sites.append((co, r)); grid.setdefault(key, []).append((co, r))
    if sites and nub_mode == 'disp':
        kd = KDTree(len(sites))
        for i, (c, _) in enumerate(sites): kd.insert(c, i)
        kd.balance()
        for v in o.data.vertices:
            h = 0.0
            for c, i, dist in kd.find_range(v.co, nub_r[1] * 1.1):
                x = dist / sites[i][1]
                if x < 1: h = max(h, sites[i][1] * 0.62 * (1 - x * x) ** 0.6)
            v.co += v.normal * h
    md = o.modifiers.new('dec', 'DECIMATE'); md.ratio = ratio
    bpy.ops.object.modifier_apply(modifier=md.name)
    if hide is not None:                             # faces nobody sees (on the book)
        bm = bmesh.new(); bm.from_mesh(o.data)
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if hide(f.calc_center_median(), f.normal)], context='FACES')
        bm.to_mesh(o.data); bm.free()
    if not o.data.materials: o.data.materials.append(m)
    curl_uv(o)
    for e in extra: curl_uv(e, per_vertex=True, off=e.location)
    parts = [o] + list(extra)
    if nub_mode == 'ball':
        for k, (co, r) in enumerate(sites):
            n = pts_n[co.to_tuple(6)]
            parts.append(nub(f'{name}_n{k}', co, n, r, m, rnd.random() * 6.3))
    if len(parts) > 1:
        bpy.ops.object.select_all(action='DESELECT')
        for p in parts: p.select_set(True)
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.join(); o = bpy.context.object; o.name = name
    bpy.ops.object.shade_smooth()
    print('DOGTRIS', name, len(sites), sum(len(p.vertices) - 2 for p in o.data.polygons))
    return o


def nub(name, co, n, r, m, spin=0.0):
    """One curl nub: an 11-vertex dome (pole + 2 rings of 5) standing on the
    surface at co along normal n, its rim sunk below the coat."""
    n = n.normalized()
    t = n.orthogonal().normalized(); b = n.cross(t)
    vs = [co + n * r * 0.75]
    for el, rad in ((0.42, 0.78), (-0.25, 1.0)):     # (height, ring radius) x r
        for i in range(5):
            a = spin + i * math.pi * 0.4 + (0.6 if el < 0 else 0)
            vs.append(co + n * r * el + (t * math.cos(a) + b * math.sin(a)) * r * rad)
    fs = [(0, 1 + i, 1 + (i + 1) % 5) for i in range(5)]
    for i in range(5):
        a0, a1 = 1 + i, 1 + (i + 1) % 5
        b0, b1 = 6 + i, 6 + (i + 1) % 5
        fs += [(a0, b0, a1), (a1, b0, b1)]
    me = bpy.data.meshes.new(name); me.from_pydata([tuple(v) for v in vs], [], fs)
    o = bpy.data.objects.new(name, me); scene.collection.objects.link(o)
    me.materials.append(m)
    me.update(); curl_uv(o, per_vertex=True)
    return o


def arc(name, pts, r, m):
    """Thin tube through pts (a closed-eye line or a lash)."""
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'
    cu.bevel_depth = r; cu.bevel_resolution = 1; cu.use_fill_caps = True
    sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for p, c in zip(sp.points, pts): p.co = (*c, 1)
    o = bpy.data.objects.new(name, cu); scene.collection.objects.link(o)
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.convert(target='MESH')
    o = bpy.context.object; o.data.materials.append(m); bpy.ops.object.shade_smooth()
    return o


M_BLUSH = mat('dog_blush', (0.95, 0.32, 0.3), rough=0.8)
M_BLUSH.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value = 0.35
try: M_BLUSH.surface_render_method = 'BLENDED'
except Exception: M_BLUSH.blend_method = 'BLEND'
M_TONGUE = mat('dog_tongue', (0.85, 0.22, 0.25), rough=0.45)


VIEW = _V((0.72, -0.58, 0.39))
rim = lambda n, w=0.5: abs(n.dot(VIEW)) < w     # silhouette band seen from the page camera

dog = empty('dog')
body_e = empty('dog_body', (0, 0, 0), dog)
# chubby, compact puppy body; short stubby legs; round front paws tucked
# under the chin with tiny toe bumps
toes = [ball(f'dog_toe_{s}{k}', 1, (0.121, s * 0.024 + k * 0.0085, 0.009), M_FUR, (0.0065, 0.006, 0.0055), 1)
        for s in (-1, 1) for k in (-1, 0, 1)]
under(body_e, blob('dog_body_mesh', [
    ((0.03, 0.0, 0.046), (0.056, 0.058, 0.047)),     # chest
    ((-0.022, 0.006, 0.052), (0.062, 0.064, 0.052)),  # round back
    ((-0.066, -0.01, 0.046), (0.05, 0.062, 0.046)),   # hips
    ((-0.046, -0.06, 0.028), (0.036, 0.022, 0.028)),  # thigh on the camera side
    ((-0.004, -0.068, 0.011), (0.03, 0.017, 0.011)),  # hind foot tucked forward
    ((0.08, 0.024, 0.014), (0.032, 0.018, 0.014)),    # stubby front leg (far)
    ((0.08, -0.024, 0.014), (0.032, 0.018, 0.014)),   # stubby front leg (near)
    ((0.108, 0.024, 0.013), (0.017, 0.02, 0.013)),    # round paw (far)
    ((0.108, -0.024, 0.013), (0.017, 0.02, 0.013)),   # round paw (near)
], M_FUR, fur=0.0022, freq=90, ratio=0.07, nubs=85, nub_r=(0.0062, 0.0085),
   keep=lambda co, n: n.z > 0.05 and co.x < 0.07 and rim(n), seed=3, extra=toes,
   hide=lambda c, n: n.z < -0.55 and c.z < 0.012))
# big round puppy head (modelled at the old size, scaled 1.3x by its empty),
# resting on the paws, turned a little toward the viewer
head_e = empty('dog_head', (0.118, -0.004, 0.064), dog)
head_e.rotation_euler = (math.radians(-6), math.radians(8), math.radians(-10))
head_e.scale = (1.3, 1.3, 1.3)
hm = blob('dog_head_mesh', [
    ((0, 0, 0), (0.056, 0.06, 0.05)),                # round skull
    ((0.044, 0, -0.018), (0.024, 0.027, 0.019)),     # short round muzzle
    ((0.03, 0.032, -0.014), (0.027, 0.027, 0.024)),  # puffy cheek
    ((0.03, -0.032, -0.014), (0.027, 0.027, 0.024)), # puffy cheek
    # no topknot pompom: the user disliked the ball on her head
], M_FUR, voxel=0.0035, fur=0.0012, freq=100, ratio=0.075, nubs=115, nub_r=(0.0042, 0.0058),
   hide=lambda c, n: n.z < -0.7 and c.z < -0.035,
   keep=lambda co, n: n.z > -0.2 and rim(n, 0.55) and not (co.x > 0.03 and abs(co.y) < 0.045 and co.z < 0.03), seed=5)
hm.data.materials.append(M_MUZ)
for p in hm.data.polygons:                           # paler muzzle
    c = p.center
    if c.x > 0.034 and c.z < 0.0 and abs(c.y) < 0.03: p.material_index = 1
nose = ball('dog_nose', 0.0112, (0.069, 0, -0.012), M_NOSE, (0.9, 1.25, 0.85))
face = [nose, ball('dog_tongue', 1, (0.058, 0.004, -0.035), M_TONGUE, (0.0065, 0.006, 0.0028))]
for s in (-1, 1):
    # happy closed eye: a soft ^ arc with a little lash flick at the outer end
    pts = []
    for i in range(7):
        u = i / 6 * 2 - 1
        y = s * (0.026 + u * 0.0095); z = 0.004 + 0.0045 * (1 - u * u)
        x = 0.0565 * math.sqrt(max(0.0, 1 - (y / 0.06) ** 2 - (z / 0.054) ** 2)) + 0.002
        pts.append((x, y, z))
    face.append(arc(f'dog_eye_{s}', pts, 0.0013, M_NOSE))
    lx, ly, lz = pts[-1]
    face.append(arc(f'dog_lash_{s}', [(lx, ly, lz), (lx - 0.002, ly + s * 0.004, lz - 0.0025)], 0.0009, M_NOSE))
    bl = ball(f'dog_blush_{s}', 1, (0.044, s * 0.04, -0.008), M_BLUSH, (0.006, 0.011, 0.007))
    bl.rotation_euler = (0, 0, math.radians(s * 50)); face.append(bl)
under(head_e, hm, *face)
# curly wavy ears: ringlets hanging beside the face, a touch more golden
for s, nm in ((1, 'dog_ear_l'), (-1, 'dog_ear_r')):
    ee = empty(nm, (0.004, s * 0.052, 0.022), head_e)
    ee.rotation_euler = (math.radians(s * 9), 0, 0)
    under(ee, blob(nm + '_mesh', [
        ((0.004, s * 0.004, -0.008), (0.022, 0.013, 0.022)),
        ((0.008, s * 0.009, -0.03), (0.029, 0.016, 0.026)),
        ((0.012, s * 0.012, -0.055), (0.033, 0.017, 0.027)),
        ((0.016, s * 0.013, -0.077), (0.029, 0.015, 0.018)),
    ], M_EAR, voxel=0.003, fur=0.0026, freq=110, ratio=0.09, wave=(0.5, 260),
       nubs=50, nub_r=(0.0042, 0.0056), keep=lambda co, n, s=s: n.y * s > -0.2 and rim(n, 0.6), seed=7 + s))
# puffy curly pompom plume on the rump
tail_e = empty('dog_tail', (-0.1, -0.025, 0.066), dog)
under(tail_e, blob('dog_tail_mesh', [
    ((0, 0, 0.004), (0.02, 0.02, 0.02)),
    ((0.004, -0.022, 0.018), (0.024, 0.024, 0.026)),
    ((0.024, -0.05, 0.026), (0.042, 0.04, 0.038)),   # the pompom
], M_FUR, voxel=0.0045, fur=0.0015, freq=80, ratio=0.075, nubs=60, nub_r=(0.006, 0.008),
   keep=lambda co, n: rim(n, 0.6) and n.z > -0.3, seed=9))
BOOK_TOP = 0.028 + 2 * 0.052 + 0.025
dog.location = (0.6, 0.83, BOOK_TOP)
dog.rotation_euler = (0, 0, math.radians(-40))
dog.scale = (1.65, 1.65, 1.65)

# small floating wall shelf, back left: a trophy and a "5 stars" plaque
M_TROPHY = mat('trophy', (0.95, 0.62, 0.2), rough=0.3, metal=0.5, emit=(1.0, 0.62, 0.15), strength=0.5)
M_PLAQUE = mat('plaque_face', image=os.path.join(TEX, 'plaque.png'), emit_image=True, strength=0.9)
shelf = empty('shelf')
under(shelf,
      box('shelf_plank', (0.56, 0.14, 0.026), (0, 0, 0), M_ALU, bevel=0.006),
      box('shelf_glow', (0.54, 0.004, 0.006), (0, -0.071, -0.014), M_ACC_C, bevel=0),
      box('shelf_bracket_a', (0.018, 0.12, 0.06), (-0.2, 0.01, -0.042), M_DARK, bevel=0.003),
      box('shelf_bracket_b', (0.018, 0.12, 0.06), (0.2, 0.01, -0.042), M_DARK, bevel=0.003),
      box('trophy_base', (0.07, 0.07, 0.03), (-0.14, 0, 0.028), M_DARK, bevel=0.004),
      cyl('trophy_stem', 0.009, 0.04, (-0.14, 0, 0.062), M_TROPHY, verts=10))
bpy.ops.mesh.primitive_cone_add(radius1=0.016, radius2=0.042, depth=0.062, location=(-0.14, 0, 0.111), vertices=16)
cup = bpy.context.object; cup.name = 'trophy_cup'; cup.data.materials.append(M_TROPHY); cup.parent = shelf
for s in (-1, 1):
    bpy.ops.mesh.primitive_torus_add(major_radius=0.017, minor_radius=0.004, location=(-0.14 + s * 0.042, 0, 0.115), rotation=(math.radians(90), 0, 0), major_segments=12, minor_segments=6)
    hd = bpy.context.object; hd.name = 'trophy_handle'; hd.data.materials.append(M_TROPHY); hd.parent = shelf
pl = box('plaque', (0.21, 0.02, 0.135), (0.08, 0.02, 0.083), M_DARK, bevel=0.004, rot=(math.radians(-8), 0, 0)); pl.parent = shelf
pf = plane('plaque_face', 0.19, 0.118, (0.08, 0.0085, 0.084), (math.radians(82), 0, 0), M_PLAQUE); pf.parent = shelf
shelf.location = (-1.62, 1.1, 1.1)
shelf.scale = (1.05, 1.05, 1.05)
shelf.rotation_euler = (0, 0, math.radians(18))

# label printer by the robot's turn-around point; the page slides the
# label (printer_label) out each time an order pops, then drops it
M_PRN = mat('printer', (0.16, 0.17, 0.2), rough=0.4, metal=0.2)
M_PAPER = mat('label_paper', (0.92, 0.92, 0.9), rough=0.7, emit=(0.8, 0.85, 0.9), strength=0.25)
prn = empty('printer')
under(prn,
      box('printer_body', (0.14, 0.12, 0.07), (0, 0, 0.035), M_PRN, bevel=0.012),
      box('printer_lid', (0.12, 0.08, 0.012), (0, 0.012, 0.072), M_DARK, bevel=0.004),
      box('printer_slot', (0.09, 0.004, 0.008), (0, -0.061, 0.03), M_DARK, bevel=0),
      box('printer_stripe', (0.142, 0.122, 0.006), (0, 0, 0.012), M_ACC_O, bevel=0))
pled = box('printer_led', (0.012, 0.012, 0.004), (0.045, -0.035, 0.072), M_LED_G, bevel=0); pled.parent = prn
lab = empty('printer_label', (0, -0.06, 0.03), prn)
under(lab, box('label_strip', (0.074, 0.1, 0.002), (0, -0.05, 0), M_PAPER, bevel=0),
      box('label_code', (0.05, 0.022, 0.0025), (0, -0.075, 0), M_DARK, bevel=0),
      box('label_addr', (0.04, 0.008, 0.0025), (-0.008, -0.035, 0), M_LED_O, bevel=0))
prn.location = (0.62, -0.22, 0.0)
prn.rotation_euler = (0, 0, math.radians(-25))


# ── round 6: Dumpling's siblings, desk calendar, parcels on a scale ──
# Three sitting pups on the free desk corner, front right. Names live in
# consts (swap here and in 36-hero-3d.js PUPS). Each pup is an empty
# <name> with <name>_body, <name>_head, <name>_eyes (blink = scale),
# <name>_ear_l/_r and <name>_tail under it; the page only moves those
# empties. No collars or harnesses.
MOCHI, TOFU, POCHI = 'mochi', 'tofu', 'pochi'
M_P_WHITE = fur_mat('pup_white', (0.8, 0.78, 0.74), rough=0.85, curl=0.25)
M_P_TAN = fur_mat('pup_tan', (0.6, 0.32, 0.12), rough=0.85, curl=0.25)
M_P_BLACK = fur_mat('pup_black', (0.03, 0.025, 0.025), rough=0.6, curl=0.2)
M_P_CREAM = fur_mat('pup_cream', (0.92, 0.66, 0.32), rough=0.95, curl=0.7)
M_P_GOLD = fur_mat('pup_gold', (0.85, 0.52, 0.2), rough=0.95, curl=0.7)
M_GLINT = mat('pup_glint', (1, 1, 1), emit=(1, 1, 1), strength=1.0)
M_EYE = mat('pup_eye', (0.02, 0.012, 0.008), rough=0.08)


def paint(o, rules):
    """Per-face markings: rules = [(material, test(center, normal))], first
    match wins; centres are in the part's own (spec) space."""
    off = o.location
    for m, _ in rules:
        if m.name not in [x.name for x in o.data.materials if x]: o.data.materials.append(m)
    idx = {x.name: i for i, x in enumerate(o.data.materials)}
    for p in o.data.polygons:
        c = p.center + off
        for m, test in rules:
            if test(c, p.normal): p.material_index = idx[m.name]; break


def pup(name, coat, ear_m, tail_m, shaggy=False, muzzle=0.03, ears='semi', tail='curl',
        body_rules=(), head_rules=(), seed=20):
    root = empty(name)
    fur = dict(fur=0.0042, freq=45, nubs=0, wave=(0.35, 300)) if shaggy else dict(fur=0.0008, freq=40, nubs=0)
    be = empty(name + '_body', (0, 0, 0), root)
    b = blob(name + '_body_mesh', [
        ((-0.01, 0, 0.06), (0.042, 0.042, 0.05)),          # back / belly
        ((0.024, 0, 0.088), (0.034, 0.038, 0.055)),        # upright chest
        ((-0.034, 0, 0.034), (0.042, 0.05, 0.034)),        # rump
        ((-0.012, 0.04, 0.028), (0.04, 0.018, 0.028)),     # thighs
        ((-0.012, -0.04, 0.028), (0.04, 0.018, 0.028)),
        ((0.026, 0.043, 0.007), (0.03, 0.014, 0.008)),     # hind feet
        ((0.026, -0.043, 0.007), (0.03, 0.014, 0.008)),
        ((0.042, 0.017, 0.036), (0.012, 0.012, 0.036)),    # front legs
        ((0.042, -0.017, 0.036), (0.012, 0.012, 0.036)),
        ((0.052, 0.017, 0.007), (0.018, 0.013, 0.008)),    # front paws
        ((0.052, -0.017, 0.007), (0.018, 0.013, 0.008)),
        ((0.03, 0, 0.125), (0.028, 0.032, 0.03)),          # neck
    ], coat, voxel=0.0045, ratio=0.06, seed=seed, keep=lambda co, n: rim(n, 0.6) and n.z > -0.3,
       hide=lambda c, n: n.z < -0.6 and c.z < 0.006, **fur)
    if body_rules: paint(b, body_rules)
    under(be, b)
    he = empty(name + '_head', (0.042, 0, 0.152), root)
    hf = dict(fur=0.0032, freq=50, nubs=0) if shaggy else dict(fur=0.0006, freq=40, nubs=0)
    h = blob(name + '_head_mesh', [
        ((0, 0, 0), (0.045, 0.044, 0.04)),                 # skull
        ((0.01 + muzzle, 0, -0.014), (muzzle, 0.022, 0.018)),  # muzzle
        ((0.022, 0.022, -0.012), (0.02, 0.018, 0.018)),    # cheeks
        ((0.022, -0.022, -0.012), (0.02, 0.018, 0.018)),
    ], coat, voxel=0.0035, ratio=0.07, seed=seed + 1,
       keep=lambda co, n: rim(n, 0.6) and n.z > -0.3 and co.x < 0.025, **hf)
    if head_rules: paint(h, head_rules)
    nx = 0.012 + 2 * muzzle
    face = [ball(name + '_nose', 0.0085, (nx, 0, -0.006), M_NOSE, (0.85, 1.25, 0.85)),
            ball(name + '_tongue', 1, (nx - 0.012, 0, -0.03), M_TONGUE, (0.008, 0.008, 0.0045))]
    for s in (-1, 1):
        face.append(arc(f'{name}_mouth_{s}', [(nx - 0.002, 0, -0.013), (nx - 0.006, s * 0.008, -0.024), (nx - 0.016, s * 0.015, -0.02)], 0.0011, M_NOSE))
    under(he, h, *face)
    ey = empty(name + '_eyes', (0.036, 0, 0.008), he)
    for s in (-1, 1):
        under(ey, ball(f'{name}_eye_{s}', 1, (0, s * 0.02, 0), M_EYE, (0.0055, 0.0075, 0.0085)),
              ball(f'{name}_glint_{s}', 1, (0.004, s * 0.018, 0.003), M_GLINT, (0.0016, 0.0022, 0.0022), sub=1))
    for s, nm in ((1, '_ear_l'), (-1, '_ear_r')):
        ee = empty(name + nm, (-0.006, s * 0.03, 0.028), he)
        if ears == 'soft':     # Tofu: bigger soft ears, tips folded over
            ee.rotation_euler = (math.radians(s * -48), 0, 0)
            sp = [((0, 0, 0.012), (0.011, 0.02, 0.018)), ((0.006, 0, 0.03), (0.009, 0.016, 0.014)),
                  ((0.018, 0, 0.036), (0.014, 0.013, 0.007))]
        elif ears == 'semi':   # upright with the tip folding forward
            ee.rotation_euler = (math.radians(s * -38), 0, 0)
            sp = [((0, 0, 0.012), (0.009, 0.016, 0.017)), ((0.004, 0, 0.03), (0.007, 0.012, 0.014)),
                  ((0.014, 0, 0.038), (0.012, 0.01, 0.006))]
        else:                  # soft floppy ears hanging beside the face
            ee.rotation_euler = (math.radians(s * -62), 0, 0)
            sp = [((0, 0, 0.01), (0.01, 0.018, 0.016)), ((0.01, 0, 0.026), (0.012, 0.016, 0.014)),
                  ((0.022, 0, 0.03), (0.012, 0.013, 0.008))]
        m = ear_m(s) if callable(ear_m) else ear_m
        under(ee, blob(name + nm + '_mesh', sp, m, voxel=0.0028, ratio=0.12, seed=seed + 3 + s,
                       **(dict(fur=0.002, freq=80) if shaggy else dict(fur=0.0004, freq=40))))
    te = empty(name + '_tail', (-0.07, 0, 0.03), root)
    if tail == 'curl':         # aspin tail curled up behind the back
        tsp = [((-0.008, 0, 0.012), (0.011, 0.011, 0.014)), ((-0.016, 0, 0.034), (0.009, 0.009, 0.014)),
               ((-0.008, 0, 0.056), (0.009, 0.009, 0.01)), ((0.004, 0, 0.062), (0.008, 0.008, 0.008))]
    else:                      # fluffy plume swept round the feet
        tsp = [((-0.004, -0.02, 0.008), (0.016, 0.016, 0.01)), ((0.02, -0.05, 0.009), (0.03, 0.016, 0.011)),
               ((0.06, -0.064, 0.009), (0.022, 0.014, 0.009))]
    under(te, blob(name + '_tail_mesh', tsp, tail_m, voxel=0.0035, ratio=0.1, seed=seed + 7,
                   **(dict(fur=0.0035, freq=50) if shaggy else dict(fur=0.0004, freq=40))))
    return root


# Mochi: white aspin with tan over the head, ears and back; white muzzle,
# blaze and chest. Tofu: shaggy cream retriever mix with soft ears and a
# plume. Pochi: white aspin, black over one eye and ear, a tan cheek.
WHITE_FACE = lambda c, n: c.z < -0.006 or (abs(c.y) < 0.006 and c.x > 0.02 and c.z < 0.03)
mochi = pup(MOCHI, M_P_WHITE, M_P_TAN, M_P_TAN, muzzle=0.03, seed=21,
            body_rules=[(M_P_TAN, lambda c, n: c.x < 0.0 and c.z > 0.05 and n.x < 0.3),
                        (M_P_TAN, lambda c, n: abs(c.y) > 0.026 and c.z > 0.06 and c.x < 0.03),
                        (M_P_TAN, lambda c, n: c.x < -0.03 and c.z > 0.03 and abs(c.y) < 0.03)],
            head_rules=[(M_P_WHITE, WHITE_FACE), (M_P_TAN, lambda c, n: True)])
tofu = pup(TOFU, M_P_CREAM, M_P_GOLD, M_P_CREAM, shaggy=True, muzzle=0.022, ears='soft', tail='plume', seed=31)
pochi = pup(POCHI, M_P_WHITE, lambda s: M_P_BLACK if s < 0 else M_P_WHITE, M_P_WHITE, muzzle=0.028, seed=41,
            head_rules=[(M_P_BLACK, lambda c, n: c.y < -0.004 and c.z > -0.006 and c.x < 0.04),
                        (M_P_TAN, lambda c, n: c.y < -0.012 and c.z > -0.02 and c.x < 0.04)])
# facing the page camera (it looks from about -83deg); Pochi turns a bit
# toward Dumpling on the books
for o, loc, rz, sc, head_z in ((mochi, (1.08, -0.62), -70, 1.46, 0), (tofu, (1.34, -0.73), -86, 1.36, 12),
                               (pochi, (1.6, -0.6), -100, 1.38, 30)):
    o.location = (*loc, 0.0); o.rotation_euler = (0, 0, math.radians(rz)); o.scale = (sc,) * 3
    bpy.data.objects[o.name + '_head'].rotation_euler = (0, 0, math.radians(head_z))

# stand-up flip calendar, front right; the page draws the notes on
# cal_page and swings cal_flip (hinged at the top ring) over the back
# image only so the UVs survive gltf-transform's prune (the page paints it)
M_CAL = mat('cal_paper', rough=0.7, image=os.path.join(TEX, 'desk-mat.png'), emit_image=True, strength=0.3)
cal = empty('cal')
under(cal, box('cal_base', (0.17, 0.08, 0.018), (0, 0, 0.009), M_DARK, bevel=0.004))
tilt = empty('cal_tilt', (0, 0.012, 0.018), cal); tilt.rotation_euler = (math.radians(-14), 0, 0)
under(tilt, box('cal_back', (0.156, 0.006, 0.135), (0, 0.006, 0.0675), M_ALU, bevel=0.003),
      plane('cal_page', 0.146, 0.116, (0, -0.001, 0.062), (math.radians(90), 0, 0), M_CAL))
for dx in (-0.04, 0.04):
    under(tilt, cyl('cal_ring', 0.006, 0.008, (dx, -0.003, 0.124), M_ALU, rot=(0, math.radians(90), 0), verts=10))
fl = empty('cal_flip', (0, -0.003, 0.12), tilt)
under(fl, plane('cal_flip_page', 0.146, 0.116, (0, 0, -0.058), (math.radians(90), 0, 0), M_CAL))
cal.location = (1.72, -0.24, 0.0); cal.rotation_euler = (0, 0, math.radians(6)); cal.scale = (1.3, 1.3, 1.3)

# little parcel stack on a digital scale beside the label printer; the
# page draws the weight on scale_lcd and bumps parcel_top each order
M_LCD = mat('scale_lcd', rough=0.4, image=os.path.join(TEX, 'desk-mat.png'), emit_image=True, strength=1.0)
pk = empty('parcels')


def parcel(nm, size, loc, rz=0.0, par=pk):
    sx, sy, sz = size
    e = empty(nm, loc, par); e.rotation_euler = (0, 0, math.radians(rz))
    under(e, box(nm + '_box', size, (0, 0, sz / 2), M_BOX, bevel=0.004),
          box(nm + '_tape', (sx + 0.002, 0.016, sz + 0.002), (0, 0, sz / 2), M_TAPE, bevel=0),
          box(nm + '_label', (sx * 0.42, 0.003, sz * 0.42), (sx * 0.2, -sy / 2 - 0.001, sz * 0.5), M_PAPER, bevel=0),
          box(nm + '_code', (sx * 0.3, 0.004, sz * 0.08), (sx * 0.2, -sy / 2 - 0.001, sz * 0.38), M_DARK, bevel=0))
    return e


under(pk, box('scale_base', (0.15, 0.14, 0.018), (0, 0, 0.009), M_ALU, bevel=0.005),
      box('scale_plate', (0.13, 0.12, 0.006), (0, 0, 0.021), M_DARK, bevel=0.002),
      plane('scale_lcd', 0.07, 0.014, (0, -0.0705, 0.009), (math.radians(90), 0, 0), M_LCD))
parcel('parcel_top', (0.1, 0.09, 0.07), (0, 0, 0.024), 4)
parcel('parcel_a', (0.13, 0.11, 0.085), (0.15, 0.03, 0), -10)
parcel('parcel_b', (0.09, 0.08, 0.06), (0.15, 0.03, 0.085), 14)
pk.location = (0.86, -0.1, 0.0); pk.rotation_euler = (0, 0, math.radians(8))


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
# Blender writes an uncompressed 3d/scene.raw.glb (git-ignored); then
# gltf-transform packs it into img/hero3d/scene.glb: meshopt geometry
# (the page wires MeshoptDecoder), WebP textures capped at 512px. The
# scene graph is kept as is (no flatten/join/instance/palette), because
# the page animates nodes and tunes materials by name.
RAW = os.path.join(HERE, 'scene.raw.glb')
GLB = os.path.join(OUT_DIR, 'scene.glb')
bpy.ops.export_scene.gltf(filepath=RAW, export_format='GLB',
                          export_apply=True, export_image_format='WEBP', export_image_quality=80,
                          export_lights=False, export_yup=True, export_tangents=False)
print('exported raw', os.path.getsize(RAW) // 1024, 'KB')
import subprocess
cmd = (f'npx -y @gltf-transform/cli@4 optimize "{RAW}" "{GLB}" --compress meshopt --texture-compress webp '
       '--texture-size 512 --flatten false --join false --instance false --palette false --simplify false')
if subprocess.run(cmd, shell=True).returncode == 0:
    print('compressed', os.path.getsize(GLB) // 1024, 'KB')
else:
    print('gltf-transform failed; run by hand:', cmd)

# ── optional preview render ──────────────────────────────────────────
# --cam page  matches the page camera (36-hero-3d.js camBase/target, fov 30)
# --cam dog   close-up on Dumpling;  default: the wide 3/4 studio view
CAMV = argv[argv.index('--cam') + 1] if '--cam' in argv else 'studio'
if RENDER:
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    scene.collection.objects.link(cam)
    tr = cam.constraints.new('TRACK_TO')
    tgt = bpy.data.objects.new('tgt', None); scene.collection.objects.link(tgt)
    tr.target = tgt
    scene.render.resolution_x, scene.render.resolution_y = 1200, 1030
    if CAMV == 'page':
        cam.location = (2.0, -6.3, 3.2); tgt.location = (0.2, 0.1, 0.62)
        cam.data.sensor_fit = 'VERTICAL'; cam.data.angle = math.radians(30)
        scene.render.resolution_x, scene.render.resolution_y = 975, 837
    elif CAMV == 'pups':
        tgt.location = (1.33, -0.6, 0.17)
        cam.location = tgt.location + __import__('mathutils').Vector((0.45, -1.9, 0.75))
        cam.data.lens = 60
        scene.render.resolution_x, scene.render.resolution_y = 900, 560
    elif CAMV == 'dog':
        tgt.location = dog.location + __import__('mathutils').Vector((0.02, -0.02, 0.06))
        cam.location = tgt.location + __import__('mathutils').Vector((0.24, -1.0, 0.47))
        cam.data.lens = 60
        scene.render.resolution_x, scene.render.resolution_y = 800, 600
    else:
        cam.location = (3.3, -3.6, 2.9); tgt.location = (0.1, 0.2, 0.7)
        cam.data.lens = 42
    scene.camera = cam
    scene.world = bpy.data.worlds.new('w'); scene.world.color = (0.005, 0.01, 0.02)
    scene.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE'
    scene.render.filepath = RENDER
    if CAMV == 'page':
        # where named props land on the page (canvas box 498,31 975x837 at 1440x900)
        from bpy_extras.object_utils import world_to_camera_view
        bpy.context.view_layer.update()
        for nm in ('dog', 'shelf', 'printer', 'bot', 'holo_bag', 'cube_cart', 'holo_chart', 'lamp_bulb', 'book_2', 'mochi', 'tofu', 'pochi', 'cal', 'parcels', 'mug'):
            o = bpy.data.objects.get(nm)
            if o:
                c = world_to_camera_view(scene, cam, o.matrix_world.translation)
                print('PROJ', nm, round(498 + c.x * 975), round(31 + (1 - c.y) * 837))
    bpy.ops.render.render(write_still=True)
    print('rendered', RENDER)
