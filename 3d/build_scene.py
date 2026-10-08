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
M_POT = mat('pot', (0.09, 0.06, 0.05), rough=0.6)
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
tab = box('tablet', (0.53, 0.03, 0.72), (1.22, 0.32, 0.43), M_DARK, bevel=0.02, rot=(math.radians(-12), 0, math.radians(-28)))
# Screen placed in the tablet's own frame, then baked to world space.
from mathutils import Matrix, Euler
tui = plane('tablet_screen', 0.48, 0.67, (0, 0, 0), (0, 0, 0), M_TABLET)
bpy.context.view_layer.update()
tui.matrix_world = tab.matrix_world @ Matrix.Translation((0, -0.017, 0)) @ Euler((math.radians(90), 0, 0)).to_matrix().to_4x4()
box('tablet_stand', (0.26, 0.26, 0.05), (1.28, 0.42, 0.03), M_ALU, bevel=0.01, rot=(0, 0, math.radians(-28)))

# (2026-10-07: the three screenshot cards at the desk lip were removed;
# blurry, cropped by the canvas, and the Work section shows the real ones)

# ── plant + pen ──────────────────────────────────────────────────────
bpy.ops.mesh.primitive_cylinder_add(radius=0.11, depth=0.2, location=(-1.25, 0.55, 0.1), vertices=32); p = bpy.context.object; p.name = 'pot'; p.data.materials.append(M_POT)
_b = p.modifiers.new('bevel', 'BEVEL'); _b.width = 0.008; _b.segments = 3; bpy.ops.object.shade_smooth()
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
    # bake the bevel first, so the UV pass sees the bevel strips and can
    # give them a blank spot instead of a stretched slice of the icon
    bpy.ops.object.select_all(action='DESELECT'); c.select_set(True); bpy.context.view_layer.objects.active = c
    bpy.ops.object.modifier_apply(modifier='bevel')
    # The cube primitive's UVs are a cross layout; give every face the
    # whole icon instead.
    import bmesh
    bm = bmesh.new(); bm.from_mesh(c.data)
    uv = bm.loops.layers.uv.verify()
    from mathutils import Vector
    up = Vector((0, 0, 1))
    for f in bm.faces:
        n = f.normal
        # icon only on the front (toward the camera, -y) and the top flat
        # faces; bevel strips, sides, back and bottom sample a blank texel
        if not ((n.z > 0.97) or (n.y < -0.97)):
            for lp in f.loops: lp[uv].uv = (0.02, 0.02)
            continue
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
M_ORANGE = mat('logo_orange', (1.0, 0.5, 0.14), rough=0.35, metal=0.2, emit=(1.0, 0.45, 0.1), strength=0.3)
M_CYAN = mat('logo_cyan', (0.1, 0.6, 0.9), rough=0.35, metal=0.3, emit=(0.0, 0.55, 0.95), strength=0.3)
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
    bev = o.modifiers.new('bevel', 'BEVEL'); bev.width = 0.02; bev.segments = 3
    o.data.materials.append(m)
    return o

logo = bpy.data.objects.new('logo_gear', None)
scene.collection.objects.link(logo)
logo.location = (-0.25, 2.15, 1.45)
# The page spins the halves. Each half mesh hangs under its own empty:
# gltf-transform's quantizer rewrites the transform of mesh nodes, so the
# page only ever rotates/scales empties (pivot stays at the gear centre).
bpy.ops.mesh.primitive_cylinder_add(radius=0.3, depth=0.06, location=(0, 0, 0), rotation=(math.radians(90), 0, 0))
dial = bpy.context.object; dial.name = 'logo_dial'; dial.data.materials.append(M_DIAL)
dial.parent = logo
for nm, m, a0, a1 in (('logo_left', M_CYAN, 92, 268), ('logo_right', M_ORANGE, -88, 88)):
    e = bpy.data.objects.new(nm, None); scene.collection.objects.link(e); e.parent = logo
    g = gear_half(nm + '_mesh', m, math.radians(a0), math.radians(a1)); g.parent = e
logo.scale = (0.6, 0.6, 0.6)
# face the page camera, which sits ~18deg to the right of front
logo.rotation_euler = (0, 0, math.radians(18))

# floating holographic panels (the page bobs them)
M_CHART = mat('holo_chart', image=os.path.join(TEX, 'holo-chart.png'), emit_image=True, strength=1.0)
M_ORDER = mat('holo_order', image=os.path.join(TEX, 'holo-order.png'), emit_image=True, strength=1.0)
plane('holo_chart', 0.64, 0.4, (-1.15, -0.05, 1.05), (math.radians(90), 0, math.radians(25)), M_CHART)
plane('holo_order', 0.6, 0.2, (1.55, -0.35, 1.3), (math.radians(90), 0, math.radians(-30)), M_ORDER)

# coffee mug on the desk
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
bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=0.13, radius2=0.05, depth=0.16, location=(-1.45, 0.1, 0.7), rotation=(math.radians(-35), math.radians(30), 0)); bpy.context.object.data.materials.append(M_LAMP); bpy.context.object.name = 'lamp_head'
_b = bpy.context.object.modifiers.new('bevel', 'BEVEL'); _b.width = 0.004; _b.segments = 2; bpy.ops.object.shade_smooth()
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.036, location=(-1.43, 0.08, 0.655)); bpy.context.object.data.materials.append(M_BULB); bpy.context.object.name = 'lamp_bulb'

# stack of books, back right of the laptop
# top book is blue so the cream dog asleep on it stands out
for i, col in enumerate([(0.85, 0.85, 0.88), (0.9, 0.35, 0.1), (0.05, 0.35, 0.6)]):
    box(f'book_{i}', (0.42, 0.3, 0.05), (0.55, 0.85, 0.028 + i * 0.052), mat(f'book_{i}', col, rough=0.6), bevel=0.006, rot=(0, 0, math.radians(8 - i * 7)))

# (headphones and the floating bag removed 2026-10-07: clutter)

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


# ── round 5: Dumpling ──────────────────────────────────────────────
# (the earlier procedural fur dog - fur_mat/blob/nub/arc - lives in git
# history before 2026-10-07; the dogs are photo cut-outs for now)


# Dumpling herself: a cut-out billboard of her approved Pixar-style still
# (tex/dumpling-cutout.png, standing 3/4 to the left, tail plume up; the
# real photo read pasted onto the cartoon desk, 2026-10-08) on the book stack. A vertical
# plane facing -Y (the page camera), bottom edge on the book; the page
# breathes dog_body (scale) and yaw-follows `dog` a little. dog_shadow is
# a soft blob under her feet. `dog` stays the root (the Contact section
# clones it).
def png_size(png):
    im = bpy.data.images.load(os.path.join(TEX, png), check_existing=True)
    return tuple(im.size)


# body sizes follow real weight (body length ~ cube root of mass, judged
# on head width / eye spacing in each photo): Dumpling 7 kg = 1, Pochi
# 8 kg ~1.05, Tofu 11-12 kg ~1.18, Mochi 15 kg ~1.29. The family was
# scaled down as a group (Dumpling 0.72 of her first card) so the pups
# still fit their corner.
CUT_PX = png_size('dumpling-body.png')   # make_dog_layers.py trims to the lowest paw
CUT_K = 0.34 / 512 * 0.72                # world units per cut-out px
CUT_H = CUT_K * CUT_PX[1]
CUT_W = CUT_K * CUT_PX[0]
SH_X, SH_F, SH_B = 0.7, 0.3, 0.9         # = cutout_fx.py: shadow texture extent in card widths


def shadow_mat(name, png):
    m = mat(name, (0, 0, 0), rough=1.0, image=os.path.join(TEX, png))
    b = m.node_tree.nodes['Principled BSDF']
    t = [n for n in m.node_tree.nodes if n.type == 'TEX_IMAGE'][0]
    m.node_tree.links.remove(b.inputs['Base Color'].links[0]); b.inputs['Base Color'].default_value = (0, 0, 0, 1)
    m.node_tree.links.new(t.outputs['Alpha'], b.inputs['Alpha'])
    try: m.surface_render_method = 'BLENDED'
    except Exception: m.blend_method = 'BLEND'
    return m


def shadow_plane(name, w, m, z=0.002):
    """contact shadow under a card of width w (pads + ambient pool, cutout_fx.shadow)"""
    return plane(name, w * 2 * SH_X, w * (SH_F + SH_B), (0, w * (SH_B - SH_F) / 2, z), (0, 0, 0), m)


def cut_mat(name, png):
    m = mat(name, image=os.path.join(TEX, png), emit_image=True, strength=0.35, rough=1.0)
    b = m.node_tree.nodes['Principled BSDF']
    t = [n for n in m.node_tree.nodes if n.type == 'TEX_IMAGE'][0]
    m.node_tree.links.new(t.outputs['Alpha'], b.inputs['Alpha'])
    try: m.surface_render_method = 'DITHERED'
    except Exception: m.blend_method = 'HASHED'
    return m


# ── photo cards that sit in 3D (2026-10-08) ─────────────────────────
# Each cut-out is a grid mesh, not a flat quad: a slight cylindrical bend
# (centre toward the camera) plus a dome from the alpha's distance field
# (thick fur parts bulge, thin legs and the silhouette stay flat), so the
# scene lights shade the coat and the page's rim light catches the edge.
# COLOR_0 is a baked ground AO (darker toward the feet); the page reads
# it (cardFx in 36-hero-3d.js / 39-section-3d.js). Silhouette = alpha clip.
import numpy as np
_HF = {}


def alpha_height(png, open_top=False, extra=()):
    """dome height field 0..1 from the png alpha, rows bottom-up (Blender order).
    open_top: the top edge is a crop (paw layers), not fur silhouette, so the
    dome carries on past it instead of curling away (no seam at the overlap).
    extra: (png, left, top) layers merged into the alpha first, so a body's
    dome runs smoothly down through its paw layers (call before any use)"""
    if png in _HF: return _HF[png]
    im = bpy.data.images.load(os.path.join(TEX, png), check_existing=True)
    w, h = im.size
    px = np.empty(w * h * 4, np.float32); im.pixels.foreach_get(px)
    a = px.reshape(h, w, 4)[..., 3]
    if extra:
        a = a[::-1].copy()                             # top-down to place layers
        for epng, l, t in extra:
            ei = bpy.data.images.load(os.path.join(TEX, epng), check_existing=True)
            ew, eh = ei.size
            ep = np.empty(ew * eh * 4, np.float32); ei.pixels.foreach_get(ep)
            ea = ep.reshape(eh, ew, 4)[::-1, :, 3]
            hh_, ww_ = min(eh, h - t), min(ew, w - l)
            a[t:t + hh_, l:l + ww_] = np.maximum(a[t:t + hh_, l:l + ww_], ea[:hh_, :ww_])
        a = a[::-1]
    f = 3
    hh, ww = h // f, w // f
    a = a[:hh * f, :ww * f].reshape(hh, f, ww, f).mean((1, 3))
    m = a > 0.5
    PAD = 0
    if open_top:
        k = max(2, hh // 6)
        base = m[-k:].any(axis=0) | m[-k - 1]
        m[-k:] |= base
        PAD = hh // 2
        m = np.vstack([m, np.repeat(base[None], PAD, 0)])
    d = np.zeros(m.shape, np.float32); cur = m.copy()
    while cur.any():
        d += cur
        q = np.pad(cur, 1)
        cur = cur & q[:-2, 1:-1] & q[2:, 1:-1] & q[1:-1, :-2] & q[1:-1, 2:]
    t = d / max(d.max(), 1.0)
    hf = np.sqrt(np.clip(t * (2 - t), 0, 1))          # circular profile
    if PAD: hf = hf[:-PAD]
    for _ in range(4):                                 # soften the ridge
        q = np.pad(hf, 1, mode='edge')
        hf = (q[:-2, 1:-1] + q[2:, 1:-1] + q[1:-1, :-2] + q[1:-1, 2:] + 2 * hf) / 6
    _HF[png] = hf
    return hf


def sample(hf, u, v):
    hh, ww = hf.shape
    x, y = min(max(u, 0), 1) * (ww - 1), min(max(v, 0), 1) * (hh - 1)
    x0, y0 = int(x), int(y); x1, y1 = min(x0 + 1, ww - 1), min(y0 + 1, hh - 1); fx, fy = x - x0, y - y0
    return (hf[y0, x0] * (1 - fx) + hf[y0, x1] * fx) * (1 - fy) + (hf[y1, x0] * (1 - fx) + hf[y1, x1] * fx) * fy


def card_depth(png, w, u, v, bulge, sag):
    """how far (world) a card point stands toward the camera"""
    return bulge * w * sample(alpha_height(png, '-paw-' in png), u, v) + sag * w * (1 - (2 * u - 1) ** 2)


def hug(body_png, BW, BH, ox, oz, png, w, bulge=0.1):
    """depth fn for a paw layer whose empty sits at body-frame (ox, oz) and
    already stands at the body's depth there: follow the body surface
    (+ a hair) so the overlap band lines up from every angle, and let the
    paw's own small dome grow only toward its lower end; the body's dome
    already includes the paws (alpha_height extra), so one smooth surface"""
    d0 = card_depth(body_png, BW, ox / BW + 0.5, oz / BH, 0.12, 0.04)
    def f(x, z, u, v):
        bu, bv = (x + ox) / BW + 0.5, (z + oz) / BH
        return card_depth(body_png, BW, bu, bv, 0.12, 0.04) - d0
    return f


def card(name, w, h, cx, cz, png, m, bulge=0.12, sag=0.04, zbase=0.0, n=26, dfn=None):
    """vertical card facing -Y, centre (cx, cz) in its parent frame;
    zbase = parent-frame height of the feet (for the ground AO);
    dfn(x, z, u, v) overrides the depth (layers that hug the body)"""
    nx, ny = (n, max(6, round(n * h / w))) if w >= h else (max(6, round(n * w / h)), n)
    vs, uvs, ao = [], [], []
    for j in range(ny + 1):
        for i in range(nx + 1):
            u, v = i / nx, j / ny
            x, z = cx + (u - 0.5) * w, cz + (v - 0.5) * h
            vs.append((x, -(dfn(x, z, u, v) if dfn else card_depth(png, w, u, v, bulge, sag)), z)); uvs.append((u, v))
            g = min(max((z - zbase) / 0.05, 0), 1); g = g * g * (3 - 2 * g)
            ao.append(0.55 + 0.45 * g)
    fs = [(j * (nx + 1) + i, j * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i) for j in range(ny) for i in range(nx)]
    me = bpy.data.meshes.new(name); me.from_pydata(vs, [], fs); me.update()
    uvl = me.uv_layers.new(name='UVMap')
    for poly in me.polygons:
        for li in poly.loop_indices:
            uvl.data[li].uv = uvs[me.loops[li].vertex_index]
    ca = me.color_attributes.new('ao', 'FLOAT_COLOR', 'POINT')
    for k, c in enumerate(ao): ca.data[k].color = (c, c, c, 1)
    me.color_attributes.active_color = ca
    for poly in me.polygons: poly.use_smooth = True
    o = bpy.data.objects.new(name, me); scene.collection.objects.link(o)
    me.materials.append(m)
    return o


# body and tail plume are separate layers (3d/make_dog_layers.py splits
# tex/dumpling-cutout.png); the page wags the `dog_tail` empty round the
# plane normal at the tail base.
M_CUT = cut_mat('dog_cutout', 'dumpling-body.png')
M_TAIL = cut_mat('dog_tail_cutout', 'dumpling-tail.png')
M_PAW_L = cut_mat('dog_paw_l_cutout', 'dumpling-paw-l.png')
M_PAW_R = cut_mat('dog_paw_r_cutout', 'dumpling-paw-r.png')
dog = empty('dog')
body_e = empty('dog_body', (0, 0, 0), dog)
alpha_height('dumpling-body.png', extra=(('dumpling-paw-l.png', 30, 306), ('dumpling-paw-r.png', 96, 300)))
under(body_e, card('dog_body_mesh', CUT_W, CUT_H, 0, CUT_H / 2, 'dumpling-body.png', M_CUT, n=28))
# depth of the body card at a source px (paws stand in front of it, the tail behind)
_bd = lambda x, y: card_depth('dumpling-body.png', CUT_W, x / CUT_PX[0], 1 - y / CUT_PX[1], 0.12, 0.04)
_px = lambda x, y: ((x / CUT_PX[0] - 0.5) * CUT_W, (1 - y / CUT_PX[1]) * CUT_H)   # source pixel -> plane x, z


def layer(name, parent, pivot, box, m, dy, png, bulge, hugs=False):
    """A cut-out layer on its own empty (pivot in source px, crop box l,t,r,b)."""
    pv, l, t, r, b = _px(*pivot), *box
    b = min(b, CUT_PX[1])                             # the card is trimmed to the lowest paw
    c = _px((l + r) / 2, (t + b) / 2)
    e = empty(name, (pv[0], dy, pv[1]), parent)       # dy: depth layer (- = toward the camera)
    w = CUT_W * (r - l) / CUT_PX[0]
    under(e, card(name + '_mesh', w, CUT_H * (b - t) / CUT_PX[1],
                  c[0] - pv[0], c[1] - pv[1], png, m, bulge=bulge, sag=0.02, zbase=-pv[1], n=12,
                  dfn=hug('dumpling-body.png', CUT_W, CUT_H, pv[0], pv[1], png, w, bulge) if hugs else None))
    return e


# make_dog_layers.py: TAIL_PIVOT/TAIL_BOX, PAW_*_PIVOT/PAW_*_BOX
# the tail a step behind the body's silhouette plane (its base hides behind the rump)
tail_e = layer('dog_tail', body_e, (218, 176), (196, 108, 315, 258), M_TAIL, 0.006, 'dumpling-tail.png', 0.1)
# front paws: dog_paws (shared pivot at the chest, spreads/tilts both) ->
# dog_paw_l / dog_paw_r (elbow pivots; the page pats them in turn)
paws_e = empty('dog_paws', (_px(111, 320)[0], -0.002 - _bd(111, 320), _px(111, 320)[1]), body_e)
for nm, pv, bx in (('dog_paw_l', (80, 322), (30, 306, 124, 427)), ('dog_paw_r', (142, 318), (96, 300, 192, 427))):
    # paws stand proud of the chest (body depth at the elbow + a step)
    e = layer(nm, body_e, pv, bx, M_PAW_L if nm.endswith('l') else M_PAW_R, -0.002 - _bd(*pv) - (0.001 if nm.endswith('l') else 0),
              'dumpling-paw-%s.png' % nm[-1], 0.1, hugs=True)
    # re-parent under dog_paws keeping the world spot
    e.location = (e.location[0] - paws_e.location[0], e.location[1] - paws_e.location[1], e.location[2] - paws_e.location[2])
    e.parent = paws_e
under(dog, shadow_plane('dog_shadow', CUT_W, shadow_mat('dog_shadow', 'dumpling-shadow.png')))
BOOK_TOP = 0.028 + 2 * 0.052 + 0.025
dog.location = (0.6, 0.8, BOOK_TOP)
# face the page camera (it sits ~11deg right of straight-on from here)
dog.rotation_euler = (0, 0, math.radians(11))




# ── round 6: Dumpling's siblings, desk calendar, parcels on a scale ──
# Three photo cut-out billboards on the free desk corner, front right,
# built like Dumpling (3d/make_pup_layers.py splits tex/<pup>-cutout.png).
# Names live in consts (swap here and in 36-hero-3d.js PUPS). Per pup:
# <name> (root, yaw-follow) -> <name>_body (breath/hop, pivot at the feet)
# -> body card, <name>_tail (wag about the card normal), <name>_paws ->
# <name>_paw_l/_r (pats); <name>_shadow is a soft blob. The page only
# moves those empties (meshopt bakes mesh-node transforms).
MOCHI, TOFU, POCHI = 'mochi', 'tofu', 'pochi'
# world units per px (sizes by weight, see CUT_K), paw (box, pivot) x2,
# tail: (crop box, pivot in tail px, pivot in cut px, dy) or None. None of
# the hero photos shows a tail (a drawn one read fake), so each is cut from
# another photo of that dog (3d/make_tail_cutouts.py), base tucked behind
# the hip so the join hides in fur. Pochi lies down.
PUP_CUTS = {
    # Mochi's white curl rises behind his right hip and hooks out over it
    MOCHI: (0.377 / 710, (((50, 600, 136, 710), (92, 604)), ((164, 600, 254, 710), (208, 604))),
            ((0, 0, 169, 146), (60, 140), (254, 468), 0.006)),
    # Tofu's plume lies out to his right, sweeping up, base behind his haunch
    TOFU: (0.27 / 590, (((26, 470, 112, 590), (68, 474)), ((114, 470, 204, 590), (160, 474))),
           ((0, 0, 183, 178), (0, 134), (198, 537), 0.006)),
    # Pochi's tail is his raised one from a standing photo (pochi-tail-cutout.png), base tucked behind his rump
    POCHI: (0.064 / 95, (((40, 212, 92, 262), (66, 216)), ((88, 212, 140, 262), (114, 216))),
            ((0, 0, 108, 122), (74, 110), (300, 160), 0.006)),
}


def pup(name):
    k, paws, tl = PUP_CUTS[name]
    pw, ph = png_size(name + '-body.png')     # make_pup_layers.py trims to the lowest paw
    W, H = k * pw, k * ph
    px = lambda x, y: ((x / pw - 0.5) * W, (1 - y / ph) * H)
    root = empty(name)
    be = empty(name + '_body', (0, 0, 0), root)
    alpha_height(name + '-body.png', extra=tuple((f'{name}-paw-{sd}.png', bx[0], bx[1]) for sd, (bx, _) in zip('lr', paws)))
    under(be, card(name + '_body_mesh', W, H, 0, H / 2, name + '-body.png', cut_mat(name + '_cutout', name + '-body.png'), n=28))
    bd = lambda x, y: card_depth(name + '-body.png', W, x / pw, 1 - y / ph, 0.12, 0.04)

    def lcard(nm, parent, at, size, pv, m, dy, png, hugs=False):
        """empty at cut px `at`; card of `size` px with its pivot px `pv`"""
        a = px(*at); sw, sh = size[0] * W / pw, size[1] * H / ph
        e = empty(nm, (a[0], dy, a[1]), parent)
        cx, cz = (size[0] / 2 - pv[0]) * W / pw, (pv[1] - size[1] / 2) * H / ph
        under(e, card(nm + '_mesh', sw, sh, cx, cz, png, m, bulge=0.1, sag=0.02, zbase=-a[1], n=12,
                      dfn=hug(name + '-body.png', W, H, a[0], a[1], png, sw) if hugs else None))
        return e

    if tl:
        (l, t, r, b), tpv, tat, tdy = tl
        lcard(name + '_tail', be, tat, (r - l, b - t), tpv, cut_mat(name + '_tail_cutout', name + '-tail.png'), tdy, name + '-tail.png')
    mid = ((paws[0][1][0] + paws[1][1][0]) / 2, paws[0][1][1])
    m = px(*mid); pe = empty(name + '_paws', (m[0], -0.002 - bd(*mid), m[1]), be)
    for side, (bx, pv) in zip('lr', paws):
        l, t, r, b = bx; b = min(b, ph)
        e = lcard(f'{name}_paw_{side}', be, pv, (r - l, b - t), (pv[0] - l, pv[1] - t),
                  cut_mat(f'{name}_paw_{side}_cutout', f'{name}-paw-{side}.png'), -0.002 - bd(*pv) - (0.001 if side == 'l' else 0),
                  f'{name}-paw-{side}.png', hugs=True)
        e.location = (e.location[0] - pe.location[0], e.location[1] - pe.location[1], e.location[2] - pe.location[2])
        e.parent = pe
    sh = shadow_plane(name + '_shadow', W, shadow_mat(name + '_shadow', name + '-shadow.png'))
    sh.parent = root
    return root


mochi, tofu, pochi = pup(MOCHI), pup(TOFU), pup(POCHI)
# same corner as before; the cards face the page camera (it sits a few
# degrees right of straight-on from here)
# a step forward of the parcels so Mochi (now the biggest) does not hide
# them, and pulled in toward the canvas centre (its edge feather)
for o, loc, rz in ((mochi, (1.0, -0.57), 10), (tofu, (1.25, -0.6), 8), (pochi, (1.48, -0.55), 5)):
    o.location = (*loc, 0.0); o.rotation_euler = (0, 0, math.radians(rz))


# stand-up flip calendar, front right; the page draws the notes on
# cal_page and swings cal_flip (hinged at the top ring) over the back
# image only so the UVs survive gltf-transform's prune (the page paints it)
M_CAL = mat('cal_paper', rough=0.7, image=os.path.join(TEX, 'desk-mat.png'), emit_image=True, strength=0.65)
cal = empty('cal')
under(cal, box('cal_base', (0.17, 0.08, 0.018), (0, 0, 0.009), M_DARK, bevel=0.004))
tilt = empty('cal_tilt', (0, 0.012, 0.018), cal); tilt.rotation_euler = (math.radians(-14), 0, 0)
under(tilt, box('cal_back', (0.156, 0.006, 0.135), (0, 0.006, 0.0675), M_ALU, bevel=0.003),
      plane('cal_page', 0.146, 0.116, (0, -0.001, 0.062), (math.radians(90), 0, 0), M_CAL))
for dx in (-0.04, 0.04):
    under(tilt, cyl('cal_ring', 0.006, 0.008, (dx, -0.003, 0.124), M_ALU, rot=(0, math.radians(90), 0), verts=10))
fl = empty('cal_flip', (0, -0.003, 0.12), tilt)
under(fl, plane('cal_flip_page', 0.146, 0.116, (0, 0, -0.058), (math.radians(90), 0, 0), M_CAL))
# back of the flipping sheet: blank paper (the page draws the front single-sided)
M_CALB = mat('cal_back_paper', (0.8, 0.78, 0.74), rough=0.8, emit=(0.8, 0.78, 0.74), strength=0.25)
under(fl, plane('cal_flip_back', 0.146, 0.116, (0, 0.0006, -0.058), (math.radians(-90), 0, 0), M_CALB))
cal.location = (1.55, 0.12, 0.0); cal.rotation_euler = (0, 0, math.radians(-12)); cal.scale = (1.55, 1.55, 1.55)

# little parcel stack on a digital scale beside the label printer; the
# page draws the weight on scale_lcd and bumps parcel_top each order
M_PAPER = mat('label_paper', (0.92, 0.92, 0.9), rough=0.7, emit=(0.8, 0.85, 0.9), strength=0.25)
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
                          export_lights=False, export_yup=True, export_tangents=False,
                          export_vertex_color='ACTIVE')   # the dog cards' baked AO (COLOR_0)
print('exported raw', os.path.getsize(RAW) // 1024, 'KB')
import subprocess
cmd = (f'npx -y @gltf-transform/cli@4 optimize "{RAW}" "{GLB}" --compress meshopt --texture-compress webp '
       '--texture-size 512 --flatten false --join false --instance false --palette false --simplify false')
if subprocess.run(cmd, shell=True).returncode == 0:
    print('compressed', os.path.getsize(GLB) // 1024, 'KB')
else:
    print('gltf-transform failed; run by hand:', cmd)

# ── hero poster (img/hero3d/hero-poster-*.webp) ──────────────────────
# Not rendered here: Eevee lights differ from the page. After changing
# the scene, capture the live canvas instead: serve dist/, open it at
# 1920x1080 DPR 1.5 in Chromium on a GPU with preserveDrawingBuffer
# forced on the .hero-3d canvas, wait ~9 s, canvas.toDataURL(); save
# 1600w/1000w as is, and crop x 18-118/132, y 16-116/132 (the scene
# box) for m930w/m720w/m480w (WebP q70, alpha q60). Re-measure the
# phone hotspots (hero.html --l/--t/--w/--h) from the cube bounds.

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
        for nm in ('dog', 'bot', 'cube_cart', 'holo_chart', 'lamp_bulb', 'book_2', 'mochi', 'tofu', 'pochi', 'cal', 'parcels', 'mug'):
            o = bpy.data.objects.get(nm)
            if o:
                c = world_to_camera_view(scene, cam, o.matrix_world.translation)
                print('PROJ', nm, round(498 + c.x * 975), round(31 + (1 - c.y) * 837))
    bpy.ops.render.render(write_still=True)
    print('rendered', RENDER)
