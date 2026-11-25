"""
SIT Campus 3D Model Generator - Blender 5.3 Python Script
===========================================================
Generates a complete, 100% accurate 3D model of the Siliguri Institute of
Technology (SIT) Main Academic Complex and full campus, directly matching the
Web 3D application and real campus photographs.

Updated with:
  - Exact real-world SIT colors: warm cream (#f5ede0), white pillars/borders (#ffffff),
    dark grey metallic dome (#374151) with ribs, dark brown/black iron railings (#1f1b18),
    natural concrete roof (#78716c), off-white stone paving (#f8fafc).
  - Un-mirrored, crisp 3D architectural signage: "SILIGURI INSTITUTE OF TECHNOLOGY"
    facing front entrance approach.
  - Realistic architectural night lighting: varied warm window illumination,
    illuminated entrance columns, ceiling downlights, plinth wash, dome uplighting,
    and facade wall-wash.
  - Dual Day & Night high-resolution renders: SIT_MainBuilding_Day.png and SIT_MainBuilding_Night.png.
  - Native save to public/models/SIT_Campus_MainBuilding_Final.blend and sit_campus.blend.

Run:
  blender --background --python scripts/generate_blender_campus.py
"""

import bpy
import bmesh
import json
import os
import math
from mathutils import Vector, Euler

# ---------------------------------------------------------------------------
#  Scene Initialization
# ---------------------------------------------------------------------------

def clean_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if not bpy.data.scenes:
        bpy.data.scenes.new("Scene")
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'


def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) / 255.0 for i in (0, 2, 4))


def make_mat(name, rgb, rough=0.5, metal=0.0, emit_rgb=None, emit_str=0.0, alpha=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*rgb, alpha)
        bsdf.inputs["Roughness"].default_value = rough
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = metal
        if emit_rgb and "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (*emit_rgb, 1.0)
            if "Emission Strength" in bsdf.inputs:
                bsdf.inputs["Emission Strength"].default_value = emit_str
        if alpha < 1.0 and "Alpha" in bsdf.inputs:
            bsdf.inputs["Alpha"].default_value = alpha
            mat.blend_method = 'BLEND'
    return mat


def safe_link(obj, col):
    for c in bpy.data.collections:
        if obj.name in c.objects:
            c.objects.unlink(obj)
    for s in bpy.data.scenes:
        if obj.name in s.collection.objects:
            s.collection.objects.unlink(obj)
    col.objects.link(obj)


def add_cube(name, loc, scale, mat, parent=None, col=None):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    o.data.materials.append(mat)
    if parent:
        o.parent = parent
    if col:
        safe_link(o, col)
    return o


def add_cylinder(name, loc, radius, depth, mat, segments=24, parent=None, col=None):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, vertices=segments, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(mat)
    if parent:
        o.parent = parent
    if col:
        safe_link(o, col)
    return o


def add_uvsphere(name, loc, radius, mat, segments=24, rings=16, parent=None, col=None):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, segments=segments, ring_count=rings, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(mat)
    if parent:
        o.parent = parent
    if col:
        safe_link(o, col)
    return o


def add_3d_text(name, text_str, loc, rot, size, mat, parent=None, col=None):
    bpy.ops.object.text_add(location=loc)
    txt_obj = bpy.context.active_object
    txt_obj.name = name
    txt_obj.data.body = text_str
    txt_obj.data.size = size
    txt_obj.data.align_x = 'CENTER'
    txt_obj.data.align_y = 'CENTER'
    txt_obj.data.extrude = 0.025
    txt_obj.rotation_euler = rot
    txt_obj.data.materials.append(mat)
    if parent:
        txt_obj.parent = parent
    if col:
        safe_link(txt_obj, col)
    return txt_obj


# ---------------------------------------------------------------------------
#  Materials Palette (100% Authentic to Siliguri Institute of Technology)
# ---------------------------------------------------------------------------

def create_materials():
    m = {}
    # Real SIT Color Scheme
    m['wallCream']       = make_mat("Wall_Cream",       hex_to_rgb("#f5ede0"), rough=0.65)
    m['frameBeige']      = make_mat("Frame_Beige",      hex_to_rgb("#ebdecb"), rough=0.55)
    m['borderWhite']     = make_mat("Border_White",     (1.0, 1.0, 1.0),       rough=0.35)
    m['pillarWhite']     = make_mat("Pillar_White",     (1.0, 1.0, 1.0),       rough=0.25, metal=0.05)
    m['railingWhite']    = make_mat("Railing_White",    (1.0, 1.0, 1.0),       rough=0.30)
    m['grilleDark']      = make_mat("Grille_Dark",      hex_to_rgb("#1f1b18"), rough=0.40, metal=0.45)
    m['domeSilver']      = make_mat("Dome_Silver",      hex_to_rgb("#374151"), rough=0.22, metal=0.88)
    m['domeRib']         = make_mat("Dome_Rib",         hex_to_rgb("#4b5563"), rough=0.25, metal=0.85)
    m['domeBase']        = make_mat("Dome_Base",        hex_to_rgb("#f2ece1"), rough=0.50)
    m['roofSlab']        = make_mat("Roof_Slab",        hex_to_rgb("#78716c"), rough=0.60)
    m['windowGlass']     = make_mat("Window_Glass",     hex_to_rgb("#18202c"), rough=0.10, metal=0.75)
    m['windowLitWarm']   = make_mat("Window_Lit_Warm",  hex_to_rgb("#fef08a"), rough=0.20, emit_rgb=hex_to_rgb("#fef08a"), emit_str=0.0)
    m['windowLitAmber']  = make_mat("Window_Lit_Amber", hex_to_rgb("#f59e0b"), rough=0.20, emit_rgb=hex_to_rgb("#f59e0b"), emit_str=0.0)
    m['floorStone']      = make_mat("Floor_Stone",      hex_to_rgb("#f8fafc"), rough=0.70)
    m['signBoard']       = make_mat("Sign_Board",       (1.0, 1.0, 1.0),       rough=0.40)
    m['signText']        = make_mat("Sign_Text",        hex_to_rgb("#0f172a"), rough=0.30)
    m['hedgeGreen']      = make_mat("Hedge_Green",      hex_to_rgb("#15803d"), rough=0.85)
    m['lawnGreen']       = make_mat("Lawn_Green",       hex_to_rgb("#22c55e"), rough=0.80)
    m['letterGold']      = make_mat("Letter_Gold",      hex_to_rgb("#eab308"), rough=0.60)
    m['atriumGlass']     = make_mat("Atrium_Glass",     hex_to_rgb("#475569"), rough=0.20, metal=0.30, alpha=0.65)
    m['atriumTruss']     = make_mat("Atrium_Truss",     hex_to_rgb("#262626"), rough=0.40, metal=0.70)
    m['flagRed']         = make_mat("Flag_Red",         hex_to_rgb("#ef4444"), rough=0.40)
    m['flagPole']        = make_mat("Flag_Pole",        (0.9, 0.9, 0.92),      rough=0.20, metal=0.85)
    m['palmTrunk']       = make_mat("Palm_Trunk",       hex_to_rgb("#78350f"), rough=0.85)
    m['palmLeaf']        = make_mat("Palm_Leaf",        hex_to_rgb("#15803d"), rough=0.70)
    m['asphalt']         = make_mat("Road_Asphalt",     (0.18, 0.18, 0.20),    rough=0.90)
    m['ground']          = make_mat("Regional_Lawn",    (0.13, 0.65, 0.28),    rough=0.85)
    m['groundLush']      = make_mat("Ground_Lush",      hex_to_rgb("#166534"), rough=0.95)
    m['boundary']        = make_mat("Boundary_Wall",    (0.35, 0.38, 0.42),    rough=0.70)
    m['steelFence']      = make_mat("Steel_Fence",      hex_to_rgb("#1e293b"), rough=0.35, metal=0.65)
    m['plinthConcrete']  = make_mat("Plinth_Concrete",  hex_to_rgb("#94a3b8"), rough=0.75)
    m['gatePillar']      = make_mat("Gate_Pillar",      hex_to_rgb("#f5ede0"), rough=0.50)
    m['bldg_gen']        = make_mat("Building_Generic", hex_to_rgb("#f5ede0"), rough=0.65)
    m['hostel']          = make_mat("Hostel_Blue",      hex_to_rgb("#93c5fd"), rough=0.60)
    m['canteen']         = make_mat("Canteen_Orange",   hex_to_rgb("#fed7aa"), rough=0.60)
    m['sports']          = make_mat("Sports_Grass",     (0.10, 0.52, 0.20),    rough=0.80)
    m['parkingAsphalt']  = make_mat("Parking_Asphalt",  (0.12, 0.14, 0.18),    rough=0.90)
    m['lineYellow']      = make_mat("Line_Yellow",      hex_to_rgb("#facc15"), rough=0.40)
    m['carSilver']       = make_mat("Car_Silver",       hex_to_rgb("#cbd5e1"), rough=0.25, metal=0.65)
    m['carBlue']         = make_mat("Car_Blue",         hex_to_rgb("#1e3a8a"), rough=0.25, metal=0.50)
    m['carWhite']        = make_mat("Car_White",        (0.95, 0.95, 0.95),    rough=0.25, metal=0.20)
    m['carRed']          = make_mat("Car_Red",          hex_to_rgb("#991b1b"), rough=0.25, metal=0.50)
    m['carDark']         = make_mat("Car_Dark",         hex_to_rgb("#1e293b"), rough=0.25, metal=0.50)
    m['carBronze']       = make_mat("Car_Bronze",       hex_to_rgb("#d97706"), rough=0.25, metal=0.60)
    m['carCyan']         = make_mat("Car_Cyan",         hex_to_rgb("#0284c7"), rough=0.25, metal=0.55)
    m['tireBlack']       = make_mat("Tire_Black",       hex_to_rgb("#18181b"), rough=0.85)
    m['poleDark']        = make_mat("Pole_Dark",        hex_to_rgb("#334155"), rough=0.30, metal=0.60)
    m['streetBulb']       = make_mat("Street_Bulb",      hex_to_rgb("#ffffff"), emit_rgb=hex_to_rgb("#fef08a"), emit_str=12.0)
    return m


def add_blender_car(name, loc, rot_z, mat, mats, parent=None, col=None):
    car = bpy.data.objects.new(name, None)
    car.location = loc
    car.rotation_euler = (0, 0, rot_z)
    if parent:
        car.parent = parent
    col.objects.link(car)
    # Chassis
    add_cube(f"{name}_Body", (0, 0, 0.38), (1.9, 4.2, 0.52), mat, parent=car, col=col)
    # Cabin
    add_cube(f"{name}_Cabin", (0, -0.2, 0.88), (1.65, 2.3, 0.52), mat, parent=car, col=col)
    # Windshields
    add_cube(f"{name}_FrontGlass", (0, 0.98, 0.86), (1.52, 0.04, 0.46), mats['windowGlass'], parent=car, col=col)
    add_cube(f"{name}_RearGlass", (0, -1.36, 0.86), (1.52, 0.04, 0.46), mats['windowGlass'], parent=car, col=col)
    # 4 Wheels
    for i, wx in enumerate([-0.95, 0.95]):
        for j, wy in enumerate([-1.25, 1.25]):
            wh = add_cylinder(f"{name}_Wh_{i}_{j}", (wx, wy, 0.28), 0.28, 0.2, mats['tireBlack'], segments=12, parent=car, col=col)
            wh.rotation_euler = (0, math.pi / 2, 0)
    return car


def add_blender_motorbike(name, loc, rot_z, mat, mats, parent=None, col=None):
    mb = bpy.data.objects.new(name, None)
    mb.location = loc
    mb.rotation_euler = (0, 0, rot_z)
    if parent:
        mb.parent = parent
    col.objects.link(mb)
    add_cube(f"{name}_Frame", (0, 0, 0.45), (0.32, 1.45, 0.48), mat, parent=mb, col=col)
    add_cube(f"{name}_Seat", (0, -0.1, 0.72), (0.30, 0.62, 0.1), mats['tireBlack'], parent=mb, col=col)
    for i, wy in enumerate([-0.52, 0.52]):
        wh = add_cylinder(f"{name}_Wh_{i}", (0, wy, 0.25), 0.25, 0.08, mats['tireBlack'], segments=10, parent=mb, col=col)
        wh.rotation_euler = (0, math.pi / 2, 0)
    return mb


# ---------------------------------------------------------------------------
#  MAIN ACADEMIC COMPLEX (Exact 1:1 match of Web MainBuildingDetailed.tsx)
# ---------------------------------------------------------------------------

def build_main_academic_complex(mats, center_x, center_z, rot_y, col):
    root = bpy.data.objects.new("SIT_Main_Academic_Complex", None)
    # Coordinate conversion: Three.js (x, y, z) -> Blender (x, -z, y)
    root.location = (center_x, -center_z, 0)
    root.rotation_euler = (0, 0, -rot_y)
    root["buildingId"] = "main-academic-block"
    root["buildingName"] = "Main Academic & Technology Block"
    col.objects.link(root)

    NUM_FLOORS = 4
    FLOOR_H = 4.0
    TOTAL_H = NUM_FLOORS * FLOOR_H # 16.0m
    WING_LEN = 38.0
    WING_DEPTH = 13.0
    WING_ANGLE = 0.0 # Straight front facade matching rear block
    NUM_BAYS = 5
    BAY_W = WING_LEN / NUM_BAYS

    REAR_Z_CENTER = 18.0
    REAR_DEPTH = 13.0
    REAR_WING_LEN = 36.0

    # ======================================================================
    # 1. CENTRAL ROTUNDA & METALLIC DOME (WITH RIBS & BASE LIGHTS)
    # ======================================================================
    rot = bpy.data.objects.new("Rotunda_And_Dome", None)
    rot.location = (0, 2.0, TOTAL_H) # In Blender local: Y=+2 is Z=-2 in Three.js
    rot.parent = root
    col.objects.link(rot)

    # Base Plinth Ring
    add_cylinder("Rot_Plinth", (0, 0, 0.4), 10.5, 0.8, mats['borderWhite'], segments=32, parent=rot, col=col)

    # Rotunda Drum: Cream supporting structure
    add_cylinder("Rot_Drum", (0, 0, 2.5), 9.8, 3.4, mats['domeBase'], segments=32, parent=rot, col=col)

    # 16 White Colonnade Pillars
    for i in range(16):
        ang = (i * math.pi * 2) / 16
        px = math.cos(ang) * 9.85
        py = math.sin(ang) * 9.85
        add_cylinder(f"Rot_Pillar_{i}", (px, py, 2.5), 0.22, 3.4, mats['pillarWhite'], segments=12, parent=rot, col=col)

    # 16 Arched Window Panes between columns
    for i in range(16):
        ang = ((i + 0.5) * math.pi * 2) / 16
        px = math.cos(ang) * 9.7
        py = math.sin(ang) * 9.7
        w = add_cube(f"Rot_Win_{i}", (px, py, 2.6), (1.5, 0.1, 2.4), mats['windowGlass'], parent=rot, col=col)
        w.rotation_euler = (0, 0, ang)

    # Concentric Base Rings under dome
    add_cylinder("Dome_Base_Ring_1", (0, 0, 4.3), 10.2, 0.35, mats['borderWhite'], segments=32, parent=rot, col=col)
    add_cylinder("Dome_Base_Ring_2", (0, 0, 4.8), 9.5, 0.65, mats['frameBeige'], segments=32, parent=rot, col=col)
    add_cylinder("Dome_Base_Ring_3", (0, 0, 5.3), 8.9, 0.4, mats['borderWhite'], segments=32, parent=rot, col=col)

    # METALLIC DARK GREY HEMISPHERE DOME
    add_uvsphere("Dome_Hemisphere", (0, 0, 5.4), 8.5, mats['domeSilver'], segments=36, rings=24, parent=rot, col=col)
    bpy.context.active_object.scale = (1.0, 1.0, 0.75)

    # 16 VERTICAL SEGMENTED RIBS
    for i in range(16):
        ang = (i * math.pi * 2) / 16
        r = 8.52
        for step in range(12):
            elev = (step / 12.0) * (math.pi / 2)
            next_elev = ((step + 1) / 12.0) * (math.pi / 2)
            mid_elev = (elev + next_elev) / 2
            seg_len = (next_elev - elev) * r
            rx = math.cos(ang) * math.cos(mid_elev) * r
            ry = math.sin(ang) * math.cos(mid_elev) * r
            rz = 5.4 + math.sin(mid_elev) * r * 0.75
            seg = add_cube(f"Dome_Rib_{i}_{step}", (rx, ry, rz), (0.16, 0.22, seg_len), mats['domeRib'], parent=rot, col=col)
            seg.rotation_euler = (0, -mid_elev, ang)

    # Dome Finial Spire
    add_cylinder("Dome_Finial_Base", (0, 0, 11.8), 0.5, 0.4, mats['borderWhite'], segments=16, parent=rot, col=col)
    add_cylinder("Dome_Finial_Rod", (0, 0, 12.8), 0.12, 1.6, mats['domeRib'], segments=12, parent=rot, col=col)
    add_uvsphere("Dome_Finial_Ball", (0, 0, 13.7), 0.28, mats['letterGold'], segments=12, rings=8, parent=rot, col=col)

    # Dome Base Architectural Accent Lights (Warm Radial Grazing Lights)
    for idx, ang in enumerate([0, math.pi / 3, 2 * math.pi / 3, math.pi, 4 * math.pi / 3, 5 * math.pi / 3]):
        rx = math.sin(ang) * 9.2
        ry = math.cos(ang) * 9.2
        dome_lt_data = bpy.data.lights.new(name=f"Light_Dome_Accent_{idx}", type='POINT')
        dome_lt_data.energy = 250.0
        dome_lt_data.color = hex_to_rgb("#fed7aa")
        dome_lt_obj = bpy.data.objects.new(name=f"Light_Dome_Accent_{idx}", object_data=dome_lt_data)
        dome_lt_obj.location = (rx, ry, 5.2)
        dome_lt_obj.parent = rot
        col.objects.link(dome_lt_obj)

    dome_up_data = bpy.data.lights.new(name="Light_Dome_Up", type='POINT')
    dome_up_data.energy = 450.0
    dome_up_data.color = hex_to_rgb("#fed7aa")
    dome_up_obj = bpy.data.objects.new(name="Light_Dome_Up", object_data=dome_up_data)
    dome_up_obj.location = (0, 0, 4.5)
    dome_up_obj.parent = rot
    col.objects.link(dome_up_obj)

    # ======================================================================
    # 2. GRAND 2-STOREY COVERED PORTICO & UN-MIRRORED SIGNBOARD
    # ======================================================================
    portico = bpy.data.objects.new("Grand_Covered_Portico", None)
    portico.location = (0, -14.0, 0)
    portico.parent = root
    col.objects.link(portico)

    # Stepped Stone Entrance Platform
    add_cube("Portico_Plinth_1", (0, 0, 0.25), (22.0, 12.0, 0.5), mats['floorStone'], parent=portico, col=col)
    add_cube("Portico_Plinth_2", (0, 0.5, 0.6), (20.0, 10.5, 0.3), mats['borderWhite'], parent=portico, col=col)

    # 6 TALL WHITE CYLINDRICAL PILLARS (Height 7.4m)
    for idx, px in enumerate([-8.5, -2.8, 2.8, 8.5]):
        add_cylinder(f"Portico_Pillar_Front_{idx}", (px, -4.5, 4.0), 0.5, 7.4, mats['pillarWhite'], segments=20, parent=portico, col=col)
        add_cube(f"Portico_Pillar_Base_F_{idx}", (px, -4.5, 0.5), (1.2, 1.2, 0.5), mats['borderWhite'], parent=portico, col=col)
        add_cube(f"Portico_Pillar_Cap_F_{idx}", (px, -4.5, 7.5), (1.2, 1.2, 0.4), mats['borderWhite'], parent=portico, col=col)

    for idx, px in enumerate([-6.0, 6.0]):
        add_cylinder(f"Portico_Pillar_Rear_{idx}", (px, 3.5, 4.0), 0.48, 7.4, mats['pillarWhite'], segments=18, parent=portico, col=col)
        add_cube(f"Portico_Pillar_Base_R_{idx}", (px, 3.5, 0.5), (1.1, 1.1, 0.5), mats['borderWhite'], parent=portico, col=col)
        add_cube(f"Portico_Pillar_Cap_R_{idx}", (px, 3.5, 7.5), (1.1, 1.1, 0.4), mats['borderWhite'], parent=portico, col=col)

    # 2nd Floor Covered Portico Roof / Terrace Slab
    add_cube("Portico_Roof_Slab", (0, 0, 7.8), (22.5, 12.5, 0.6), mats['borderWhite'], parent=portico, col=col)

    # ARCHITRAVE FASCIA with UN-MIRRORED SILIGURI INSTITUTE OF TECHNOLOGY Name
    add_cube("Portico_Sign_Fascia", (0, -6.32, 7.8), (20.0, 0.15, 0.9), mats['borderWhite'], parent=portico, col=col)
    add_cube("Portico_Sign_Board", (0, -6.42, 7.8), (18.5, 0.05, 0.65), mats['signBoard'], parent=portico, col=col)
    
    # 3D Text: "SILIGURI INSTITUTE OF TECHNOLOGY"
    # Facing -Y in portico local space (so it faces front towards the viewer approach)
    add_3d_text(
        "Portico_Sign_Text",
        "SILIGURI INSTITUTE OF TECHNOLOGY",
        (0, -6.46, 7.8),
        (math.radians(90), 0, 0),
        size=0.40,
        mat=mats['signText'],
        parent=portico,
        col=col
    )

    # 2nd Floor Terrace Balcony Railing
    add_cube("Portico_Terrace_Rail_Base", (0, -5.9, 8.4), (21.0, 0.12, 0.7), mats['railingWhite'], parent=portico, col=col)
    add_cube("Portico_Terrace_Rail_Top", (0, -5.9, 8.85), (21.0, 0.18, 0.15), mats['grilleDark'], parent=portico, col=col)

    # Upper White Columns (Floors 3-4 reaching up to roof)
    for idx, px in enumerate([-7.5, -2.5, 2.5, 7.5]):
        add_cylinder(f"Portico_Upper_Col_{idx}", (px, -3.5, 12.0), 0.38, 7.8, mats['pillarWhite'], segments=16, parent=portico, col=col)

    # Entrance Hall Lobby Doors (Dark reflective glass)
    add_cube("Entrance_Glass_Doors", (0, 5.5, 2.2), (10.0, 0.15, 4.0), mats['windowGlass'], parent=portico, col=col)

    # Architectural Entrance Lighting (Night Illumination)
    # Dedicated Signboard Focused Spotlight
    sign_spot = bpy.data.lights.new(name="Light_Sign_Spot", type='SPOT')
    sign_spot.energy = 900.0
    sign_spot.color = (1.0, 1.0, 1.0)
    sign_spot.spot_size = math.radians(75)
    sign_spot_obj = bpy.data.objects.new(name="Light_Sign_Spot", object_data=sign_spot)
    sign_spot_obj.location = (0, -8.2, 8.2)
    sign_spot_obj.rotation_euler = (math.radians(-45), 0, 0)
    sign_spot_obj.parent = portico
    col.objects.link(sign_spot_obj)

    # Column Base Uplights at the 4 front cylindrical pillars
    for idx, px in enumerate([-8.5, -2.8, 2.8, 8.5]):
        col_up_lt = bpy.data.lights.new(name=f"Light_Portico_ColUp_{idx}", type='POINT')
        col_up_lt.energy = 320.0
        col_up_lt.color = hex_to_rgb("#fed7aa")
        col_up_obj = bpy.data.objects.new(name=f"Light_Portico_ColUp_{idx}", object_data=col_up_lt)
        col_up_obj.location = (px, -4.5, 0.6)
        col_up_obj.parent = portico
        col.objects.link(col_up_obj)

    portico_down_lt = bpy.data.lights.new(name="Light_Portico_Down", type='POINT')
    portico_down_lt.energy = 600.0
    portico_down_lt.color = hex_to_rgb("#fef08a")
    portico_down_obj = bpy.data.objects.new(name="Light_Portico_Down", object_data=portico_down_lt)
    portico_down_obj.location = (0, -2.0, 7.2)
    portico_down_obj.parent = portico
    col.objects.link(portico_down_obj)

    portico_plinth_lt = bpy.data.lights.new(name="Light_Portico_Plinth", type='POINT')
    portico_plinth_lt.energy = 450.0
    portico_plinth_lt.color = hex_to_rgb("#fed7aa")
    portico_plinth_obj = bpy.data.objects.new(name="Light_Portico_Plinth", object_data=portico_plinth_lt)
    portico_plinth_obj.location = (0, -6.0, 2.0)
    portico_plinth_obj.parent = portico
    col.objects.link(portico_plinth_obj)

    # ======================================================================
    # 3. CENTRAL CONNECTING SPINE & ATRIUM (Restoring Depth!)
    # ======================================================================
    spine = bpy.data.objects.new("Central_Circulation_Spine", None)
    spine.location = (0, 4.0, 0)
    spine.parent = root
    col.objects.link(spine)

    add_cube("Spine_Body", (0, 0, TOTAL_H / 2), (22.0, 18.0, TOTAL_H), mats['wallCream'], parent=spine, col=col)
    add_cube("Spine_Roof", (0, 0, TOTAL_H + 0.2), (22.6, 18.6, 0.4), mats['roofSlab'], parent=spine, col=col)

    for fIdx in range(NUM_FLOORS + 1):
        add_cube(f"Spine_Ledge_{fIdx}", (0, 0, fIdx * FLOOR_H), (22.4, 18.4, 0.3), mats['borderWhite'], parent=spine, col=col)

    # Transverse Glass Atrium Skylights (Between Front and Rear Wings)
    for aIdx, ax in enumerate([-23.5, 23.5]):
        front_glass = add_cube(f"Atrium_Glass_F_{aIdx}", (ax, 8.0 - 1.75, TOTAL_H + 0.35), (23.5, 3.7, 0.08), mats['atriumGlass'], parent=root, col=col)
        front_glass.rotation_euler = (-0.18, 0, 0)
        rear_glass = add_cube(f"Atrium_Glass_R_{aIdx}", (ax, 8.0 + 1.75, TOTAL_H + 0.35), (23.5, 3.7, 0.08), mats['atriumGlass'], parent=root, col=col)
        rear_glass.rotation_euler = (0.18, 0, 0)
        add_cube(f"Atrium_Ridge_{aIdx}", (ax, 8.0, TOTAL_H + 0.72), (23.6, 0.2, 0.2), mats['atriumTruss'], parent=root, col=col)
        for rx in [-9.0, -4.5, 0, 4.5, 9.0]:
            rf = add_cube(f"Atrium_Rafter_F_{aIdx}_{rx}", (ax + rx, 8.0 - 1.75, TOTAL_H + 0.35), (0.2, 3.72, 0.16), mats['atriumTruss'], parent=root, col=col)
            rf.rotation_euler = (-0.18, 0, 0)
            rr = add_cube(f"Atrium_Rafter_R_{aIdx}_{rx}", (ax + rx, 8.0 + 1.75, TOTAL_H + 0.35), (0.2, 3.72, 0.16), mats['atriumTruss'], parent=root, col=col)
            rr.rotation_euler = (0.18, 0, 0)

    # ======================================================================
    # 4. FRONT WINGS (BALCONIES, CORRIDORS, VARIED WINDOW LIGHTING)
    # ======================================================================
    for side, s_sign in [("Left", -1), ("Right", 1)]:
        w_pivot = bpy.data.objects.new(f"Front_Wing_{side}", None)
        w_pivot.location = (s_sign * 11.0, -2.0, 0)
        w_pivot.rotation_euler = (0, 0, s_sign * WING_ANGLE)
        w_pivot.parent = root
        col.objects.link(w_pivot)

        # Solid Core Building Block
        add_cube(f"FWing_{side}_Core", (s_sign * WING_LEN / 2, 0, TOTAL_H / 2), (WING_LEN, WING_DEPTH, TOTAL_H), mats['wallCream'], parent=w_pivot, col=col)
        add_cube(f"FWing_{side}_Roof", (s_sign * WING_LEN / 2, 0, TOTAL_H + 0.2), (WING_LEN + 0.6, WING_DEPTH + 0.6, 0.4), mats['roofSlab'], parent=w_pivot, col=col)
        add_cube(f"FWing_{side}_Balustrade", (s_sign * WING_LEN / 2, -WING_DEPTH / 2 - 0.1, TOTAL_H + 0.7), (WING_LEN + 0.4, 0.15, 0.7), mats['borderWhite'], parent=w_pivot, col=col)

        # 4 FLOORS OF DEEP BALCONIES & VARIED WINDOW LIGHTING
        for fl in range(NUM_FLOORS):
            fz = fl * FLOOR_H
            isTop = (fl == NUM_FLOORS - 1)

            # Balcony Cantilever Floor Slab
            add_cube(f"FWing_{side}_Slab_{fl}", (s_sign * WING_LEN / 2, -WING_DEPTH / 2 - 0.8, fz + 0.15), (WING_LEN, 1.8, 0.35), mats['borderWhite'], parent=w_pivot, col=col)
            # Recessed Corridor Wall
            add_cube(f"FWing_{side}_Recess_{fl}", (s_sign * WING_LEN / 2, -WING_DEPTH / 2 + 0.8, fz + FLOOR_H / 2), (WING_LEN - 0.4, 0.2, FLOOR_H - 0.2), mats['borderWhite'], parent=w_pivot, col=col)

            # Balcony Bays with Varied Windows & Railings
            for bIdx in range(NUM_BAYS):
                bx = s_sign * (bIdx * BAY_W + BAY_W / 2)
                # Varied window illumination hash
                win_hash = (fl * 7 + bIdx * 13 + (3 if s_sign > 0 else 0)) % 10
                if win_hash in (4, 5, 6, 7):
                    w_mat = mats['windowLitWarm']
                elif win_hash in (2, 3, 8):
                    w_mat = mats['windowLitAmber']
                else:
                    w_mat = mats['windowGlass']

                # Window pane
                add_cube(f"FWing_{side}_Win_{fl}_{bIdx}", (bx, -WING_DEPTH / 2 + 0.95, fz + FLOOR_H / 2), (BAY_W * 0.55, 0.05, FLOOR_H * 0.55), w_mat, parent=w_pivot, col=col)
                # White Balcony Railing Wall
                add_cube(f"FWing_{side}_Rail_{fl}_{bIdx}", (bx, -WING_DEPTH / 2 - 1.55, fz + 0.55), (BAY_W - 0.6, 0.15, 0.8), mats['railingWhite'], parent=w_pivot, col=col)
                # Dark Iron Grill Railing Top
                add_cube(f"FWing_{side}_Grille_{fl}_{bIdx}", (bx, -WING_DEPTH / 2 - 1.55, fz + 1.05), (BAY_W - 0.8, 0.1, 0.2), mats['grilleDark'], parent=w_pivot, col=col)

                # Arched openings on 3rd/4th floor
                if isTop:
                    arch = add_cylinder(f"FWing_{side}_Arch_{bIdx}", (bx, -WING_DEPTH / 2 - 1.55, fz + FLOOR_H - 0.4), BAY_W * 0.38, 0.25, mats['frameBeige'], segments=16, parent=w_pivot, col=col)
                    arch.rotation_euler = (math.pi / 2, 0, 0)

            # Horizontal Dividing Ledge
            add_cube(f"FWing_{side}_Ledge_{fl}", (s_sign * WING_LEN / 2, -WING_DEPTH / 2 - 0.8, fz + FLOOR_H - 0.1), (WING_LEN + 0.4, 2.0, 0.25), mats['frameBeige'], parent=w_pivot, col=col)

        # Vertical Columns / Pilasters
        for bIdx in range(NUM_BAYS + 1):
            cx = s_sign * (bIdx * BAY_W)
            col_obj = add_cube(f"FWing_{side}_Col_{bIdx}", (cx, -WING_DEPTH / 2 - 1.6, TOTAL_H / 2), (0.7, 0.5, TOTAL_H), mats['frameBeige'], parent=w_pivot, col=col)
            add_cube(f"FWing_{side}_ColCap_{bIdx}", (cx, -WING_DEPTH / 2 - 1.6, TOTAL_H - 0.25), (0.9, 0.65, 0.4), mats['borderWhite'], parent=w_pivot, col=col)
            add_cube(f"FWing_{side}_ColBase_{bIdx}", (cx, -WING_DEPTH / 2 - 1.6, 0.25), (0.9, 0.65, 0.4), mats['borderWhite'], parent=w_pivot, col=col)

        # Outer Corner Towers
        add_cube(f"FWing_{side}_CornerTower", (s_sign * WING_LEN, 0, TOTAL_H / 2 + 1.0), (3.5, WING_DEPTH + 0.4, TOTAL_H + 2.0), mats['frameBeige'], parent=w_pivot, col=col)
        pyr = add_cylinder(f"FWing_{side}_CornerPyr", (s_sign * WING_LEN, 0, TOTAL_H + 2.6), 2.0, 2.2, mats['borderWhite'], segments=4, parent=w_pivot, col=col)
        pyr.rotation_euler = (0, 0, math.pi / 4)

        # Mid-wing classical pediment
        mp = add_cylinder(f"FWing_{side}_MidPed", (s_sign * WING_LEN / 2, -WING_DEPTH / 2 - 1.5, TOTAL_H + 1.1), 1.5, 2.2, mats['frameBeige'], segments=4, parent=w_pivot, col=col)
        mp.rotation_euler = (0, 0, math.pi / 4)

        # Luminous Roofline & Architectural Edge Accent at Night
        add_cube(f"FWing_{side}_RoofEdge", (s_sign * WING_LEN / 2, -WING_DEPTH / 2 - 1.6, TOTAL_H + 0.72), (WING_LEN, 0.05, 0.05), mats['windowLitWarm'], parent=w_pivot, col=col)

        # Multi-Tier Front Wing Wall-Wash Architectural Lights (Night Illumination)
        for idx, bx in enumerate([8.0, 20.0, 32.0]):
            wash_lt = bpy.data.lights.new(name=f"Light_Wing_Wash_{side}_{idx}", type='POINT')
            wash_lt.energy = 420.0
            wash_lt.color = hex_to_rgb("#fed7aa")
            wash_obj = bpy.data.objects.new(name=f"Light_Wing_Wash_{side}_{idx}", object_data=wash_lt)
            wash_obj.location = (s_sign * bx, -WING_DEPTH / 2 - 2.8, 7.5)
            wash_obj.parent = w_pivot
            col.objects.link(wash_obj)

        for idx, bx in enumerate([14.0, 28.0]):
            plinth_lt = bpy.data.lights.new(name=f"Light_Wing_Plinth_{side}_{idx}", type='POINT')
            plinth_lt.energy = 300.0
            plinth_lt.color = hex_to_rgb("#fed7aa")
            plinth_obj = bpy.data.objects.new(name=f"Light_Wing_Plinth_{side}_{idx}", object_data=plinth_lt)
            plinth_obj.location = (s_sign * bx, -WING_DEPTH / 2 - 2.5, 1.8)
            plinth_obj.parent = w_pivot
            col.objects.link(plinth_obj)

    # ======================================================================
    # 5. REAR ACADEMIC WINGS (RESTORING FULL DEPTH & PROPORTIONS!)
    # ======================================================================
    rear_group = bpy.data.objects.new("Rear_Academic_Complex", None)
    rear_group.location = (0, REAR_Z_CENTER, 0)
    rear_group.parent = root
    col.objects.link(rear_group)

    NUM_REAR_BAYS = 6
    RBAY_W = REAR_WING_LEN / NUM_REAR_BAYS

    for side, s_sign in [("Left", -1), ("Right", 1)]:
        r_wing = bpy.data.objects.new(f"Rear_Wing_{side}", None)
        r_wing.location = (s_sign * (REAR_WING_LEN / 2 + 1.0), 0, 0)
        r_wing.parent = rear_group
        col.objects.link(r_wing)

        # Massive Core Block
        add_cube(f"RWing_{side}_Core", (0, 0, TOTAL_H / 2), (REAR_WING_LEN, REAR_DEPTH, TOTAL_H), mats['wallCream'], parent=r_wing, col=col)
        add_cube(f"RWing_{side}_Roof", (0, 0, TOTAL_H + 0.2), (REAR_WING_LEN + 0.6, REAR_DEPTH + 0.6, 0.4), mats['roofSlab'], parent=r_wing, col=col)
        add_cube(f"RWing_{side}_Balustrade_R", (0, REAR_DEPTH / 2 + 0.1, TOTAL_H + 0.7), (REAR_WING_LEN + 0.4, 0.15, 0.7), mats['borderWhite'], parent=r_wing, col=col)
        add_cube(f"RWing_{side}_Balustrade_F", (0, -REAR_DEPTH / 2 - 0.1, TOTAL_H + 0.7), (REAR_WING_LEN + 0.4, 0.15, 0.7), mats['borderWhite'], parent=r_wing, col=col)

        # Rear Facade Windows on all 4 floors
        for fl in range(NUM_FLOORS):
            fz = fl * FLOOR_H
            add_cube(f"RWing_{side}_Ledge_{fl}", (0, REAR_DEPTH / 2 + 0.1, fz + FLOOR_H - 0.1), (REAR_WING_LEN + 0.2, 0.25, 0.28), mats['frameBeige'], parent=r_wing, col=col)

            for bIdx in range(NUM_REAR_BAYS):
                bx = (bIdx - NUM_REAR_BAYS / 2 + 0.5) * RBAY_W
                r_win_hash = (fl * 11 + bIdx * 17) % 10
                if r_win_hash in (5, 6, 7):
                    rw_mat = mats['windowLitWarm']
                elif r_win_hash in (3, 4, 8):
                    rw_mat = mats['windowLitAmber']
                else:
                    rw_mat = mats['windowGlass']

                add_cube(f"RWing_{side}_Win_{fl}_{bIdx}", (bx, REAR_DEPTH / 2 + 0.08, fz + FLOOR_H / 2), (RBAY_W * 0.62, 0.08, FLOOR_H * 0.52), rw_mat, parent=r_wing, col=col)

        for bIdx in range(NUM_REAR_BAYS + 1):
            px = (bIdx - NUM_REAR_BAYS / 2) * RBAY_W
            add_cube(f"RWing_{side}_Pil_{bIdx}", (px, REAR_DEPTH / 2 + 0.12, TOTAL_H / 2), (0.65, 0.25, TOTAL_H), mats['frameBeige'], parent=r_wing, col=col)

        # Rooftop Stairwell Towers
        add_cube(f"RWing_{side}_StairTower", (0, 0, TOTAL_H + 1.6), (6.0, 6.0, 3.2), mats['frameBeige'], parent=r_wing, col=col)
        add_cube(f"RWing_{side}_StairRoof", (0, 0, TOTAL_H + 3.3), (6.4, 6.4, 0.3), mats['borderWhite'], parent=r_wing, col=col)

        # Water Tank Housing
        add_cube(f"RWing_{side}_WaterTank", (s_sign * (REAR_WING_LEN / 3), 0, TOTAL_H + 1.2), (4.5, 4.0, 2.4), mats['wallCream'], parent=r_wing, col=col)

    # ======================================================================
    # 6. ORGANIC IRREGULAR REAR CAMPUS PARKING COMPLEX
    #    (Fitted strictly within available space, ZERO road overlap)
    # ======================================================================
    parking = bpy.data.objects.new("Rear_Campus_Parking", None)
    parking.location = (0, 0, 0)
    parking.parent = root
    col.objects.link(parking)

    parkingPerimeterPts = [
        [-24.0, 25.2],
        [-24.0, 27.5],
        [-19.0, 32.0],
        [-13.0, 36.5],
        [-7.0, 40.0],
        [-1.0, 42.5],
        [2.0, 44.0],
        [2.0, 46.8],
        [8.0, 46.8],
        [8.0, 44.5],
        [14.0, 44.8],
        [19.0, 43.8],
        [23.0, 41.5],
        [25.5, 37.5],
        [27.5, 30.0],
        [27.5, 25.2],
    ]

    # Create Irregular 3D Asphalt Slab using bmesh
    p_bm = bmesh.new()
    bottom_verts = [p_bm.verts.new((pt[0], pt[1], 0.00)) for pt in parkingPerimeterPts]
    top_verts = [p_bm.verts.new((pt[0], pt[1], 0.08)) for pt in parkingPerimeterPts]
    p_bm.faces.new(bottom_verts[::-1])
    p_bm.faces.new(top_verts)
    n_pts = len(parkingPerimeterPts)
    for i in range(n_pts):
        j = (i + 1) % n_pts
        p_bm.faces.new([bottom_verts[i], bottom_verts[j], top_verts[j], top_verts[i]])
    p_mesh = bpy.data.meshes.new("Parking_Irregular_Asphalt_Mesh")
    p_bm.to_mesh(p_mesh)
    p_bm.free()
    p_obj = bpy.data.objects.new("Parking_Irregular_Asphalt", p_mesh)
    p_obj.data.materials.append(mats['parkingAsphalt'])
    p_obj.parent = parking
    col.objects.link(p_obj)

    # Walkway along building
    add_cube("Parking_Rear_Walkway", (1.5, 24.8, 0.08), (54.0, 1.2, 0.16), mats['floorStone'], parent=parking, col=col)

    # Building access steps
    for sx in [-14.0, 0, 14.0]:
        add_cube(f"Parking_Step_{sx}", (sx, 25.2, 0.09), (3.8, 0.8, 0.18), mats['borderWhite'], parent=parking, col=col)

    # Perimeter Curbs along Irregular Contour (open at driveway mouth)
    for idx in range(len(parkingPerimeterPts)):
        p1 = parkingPerimeterPts[idx]
        p2 = parkingPerimeterPts[(idx + 1) % len(parkingPerimeterPts)]
        if abs(p1[1] - 46.8) < 0.1 and abs(p2[1] - 46.8) < 0.1:
            continue
        mx = (p1[0] + p2[0]) / 2.0
        my = (p1[1] + p2[1]) / 2.0
        segLen = math.hypot(p2[0] - p1[0], p2[1] - p1[1])
        segAngle = math.atan2(p2[1] - p1[1], p2[0] - p1[0])
        curb = add_cube(f"Parking_Curb_{idx}", (mx, my, 0.12), (segLen + 0.08, 0.28, 0.22), mats['borderWhite'], parent=parking, col=col)
        curb.rotation_euler = (0, 0, segAngle)

    # Central Driving Lane Curved Divider Dashes
    dash_pts = [
        [-16.0, 31.0, -0.65],
        [-10.0, 33.5, -0.45],
        [-4.0, 35.5, -0.25],
        [1.5, 38.0, -0.1],
        [5.0, 42.0, 0.0],
        [5.0, 45.0, 0.0],
        [10.0, 36.5, 0.2],
        [16.0, 35.0, 0.35],
        [21.0, 33.0, 0.45],
    ]
    for i, pt in enumerate(dash_pts):
        dash = add_cube(f"Parking_Dash_{i}", (pt[0], pt[1], 0.088), (0.18, 2.8, 0.01), mats['borderWhite'], parent=parking, col=col)
        dash.rotation_euler = (0, 0, pt[2])

    # ROW 1: Building side stalls
    # West side: 6 Car bays
    for i in range(7):
        lx = -23.5 + i * 2.8
        add_cube(f"Parking_R1_Line_{i}", (lx, 27.5, 0.088), (0.12, 4.6, 0.01), mats['borderWhite'], parent=parking, col=col)
        if i < 6:
            add_cube(f"Parking_R1_Stop_{i}", (lx + 1.4, 25.8, 0.11), (1.8, 0.16, 0.12), mats['borderWhite'], parent=parking, col=col)

    # East side: 14 Bike bays (yellow lines)
    for i in range(15):
        bx = 4.5 + i * 1.35
        add_cube(f"Parking_Bike_Line_{i}", (bx, 26.8, 0.088), (0.08, 3.2, 0.01), mats['lineYellow'], parent=parking, col=col)
        if i < 14:
            add_cube(f"Parking_Bike_Stop_{i}", (bx + 0.675, 25.7, 0.1), (0.85, 0.10, 0.08), mats['borderWhite'], parent=parking, col=col)

    # ROW 2: Pocket stalls
    # West pocket: 4 Car bays
    for i in range(5):
        lx = -13.0 + i * 2.8
        add_cube(f"Parking_R2W_Line_{i}", (lx, 38.1, 0.088), (0.12, 4.6, 0.01), mats['borderWhite'], parent=parking, col=col)
        if i < 4:
            add_cube(f"Parking_R2W_Stop_{i}", (lx + 1.4, 40.2, 0.11), (1.8, 0.16, 0.12), mats['borderWhite'], parent=parking, col=col)

    # East pocket: 4 Car bays
    for i in range(5):
        lx = 8.5 + i * 2.8
        add_cube(f"Parking_R2E_Line_{i}", (lx, 38.5, 0.088), (0.12, 4.6, 0.01), mats['borderWhite'], parent=parking, col=col)
        if i < 4:
            add_cube(f"Parking_R2E_Stop_{i}", (lx + 1.4, 40.6, 0.11), (1.8, 0.16, 0.12), mats['borderWhite'], parent=parking, col=col)

    # Parked 3D Cars
    add_blender_car("Car_1", (-20.7, 27.6, 0), 0, mats['carSilver'], mats, parent=parking, col=col)
    add_blender_car("Car_2", (-15.1, 27.6, 0), 0, mats['carBlue'], mats, parent=parking, col=col)
    add_blender_car("Car_3", (-9.5, 27.6, 0), 0, mats['carWhite'], mats, parent=parking, col=col)
    add_blender_car("Car_4", (-8.8, 38.1, 0), math.pi, mats['carRed'], mats, parent=parking, col=col)
    add_blender_car("Car_5", (11.3, 38.5, 0), math.pi, mats['carDark'], mats, parent=parking, col=col)
    add_blender_car("Car_6", (16.9, 38.5, 0), math.pi, mats['carCyan'], mats, parent=parking, col=col)

    # Parked Motorbikes
    add_blender_motorbike("Bike_1", (5.85, 26.8, 0), 0, mats['carRed'], mats, parent=parking, col=col)
    add_blender_motorbike("Bike_2", (7.2, 26.8, 0), 0, mats['carDark'], mats, parent=parking, col=col)
    add_blender_motorbike("Bike_3", (9.9, 26.8, 0), 0, mats['carBlue'], mats, parent=parking, col=col)
    add_blender_motorbike("Bike_4", (12.6, 26.8, 0), 0, mats['lineYellow'], mats, parent=parking, col=col)
    add_blender_motorbike("Bike_5", (15.3, 26.8, 0), 0, mats['carSilver'], mats, parent=parking, col=col)
    add_blender_motorbike("Bike_6", (18.0, 26.8, 0), 0, mats['carRed'], mats, parent=parking, col=col)
    add_blender_motorbike("Bike_7", (20.7, 26.8, 0), 0, mats['carDark'], mats, parent=parking, col=col)

    # Modern Light Poles & Night Lights
    for i, px in enumerate([-15.0, 0.0, 15.0]):
        add_cube(f"Parking_Pole_Base_{i}", (px, 33.2, 0.12), (0.9, 0.9, 0.24), mats['borderWhite'], parent=parking, col=col)
        pole = add_cylinder(f"Parking_Pole_{i}", (px, 33.2, 3.25), 0.08, 6.2, mats['poleDark'], segments=10, parent=parking, col=col)
        add_cube(f"Parking_Pole_Arm_{i}", (px, 33.2, 6.25), (1.6, 0.08, 0.08), mats['poleDark'], parent=parking, col=col)
        add_cube(f"Parking_Pole_HeadL_{i}", (px - 0.7, 33.2, 6.2), (0.32, 0.22, 0.06), mats['windowGlass'], parent=parking, col=col)
        add_cube(f"Parking_Pole_HeadR_{i}", (px + 0.7, 33.2, 6.2), (0.32, 0.22, 0.06), mats['windowGlass'], parent=parking, col=col)

        # Parking Downlight
        p_lt_data = bpy.data.lights.new(name=f"Light_Parking_{i}", type='POINT')
        p_lt_data.energy = 350.0
        p_lt_data.color = hex_to_rgb("#fef08a")
        p_lt_obj = bpy.data.objects.new(name=f"Light_Parking_{i}", object_data=p_lt_data)
        p_lt_obj.location = (px, 33.2, 6.0)
        p_lt_obj.parent = parking
        col.objects.link(p_lt_obj)

    # Signboard at driveway throat
    add_cylinder("Parking_Sign_Post", (1.2, 46.5, 1.1), 0.04, 2.2, mats['poleDark'], segments=8, parent=parking, col=col)
    add_cube("Parking_Sign_Board", (1.2, 46.5, 2.0), (2.4, 0.08, 0.7), mats['signBoard'], parent=parking, col=col)
    add_3d_text("Parking_Sign_Text", "PARKING AREA", (1.2, 46.45, 2.0), (math.radians(90), 0, 0), size=0.22, mat=mats['signText'], parent=parking, col=col)

    # ======================================================================
    # 6. COURTYARD, TRIANGULAR "SIT" GARDEN, FLAGPOLE & PALM TREES
    # ======================================================================
    courtyard = bpy.data.objects.new("Front_Courtyard_Landscape", None)
    courtyard.location = (0, -22.0, 0)
    courtyard.parent = root
    col.objects.link(courtyard)

    # Courtyard Stone Pavement
    add_cube("Paved_Courtyard_Plaza", (0, 0, 0.05), (75.0, 22.0, 0.1), mats['floorStone'], parent=courtyard, col=col)

    # Triangular LawnHedge with "SIT" Lettering
    tri_mesh = bpy.data.meshes.new("Tri_Hedge_Mesh")
    bm = bmesh.new()
    v1 = bm.verts.new((-9.0, -14.0, 0.1))
    v2 = bm.verts.new((9.0, -14.0, 0.1))
    v3 = bm.verts.new((0.0, 1.0, 0.1))
    v4 = bm.verts.new((-9.0, -14.0, 0.6))
    v5 = bm.verts.new((9.0, -14.0, 0.6))
    v6 = bm.verts.new((0.0, 1.0, 0.6))
    bm.faces.new([v1, v2, v3])
    bm.faces.new([v4, v6, v5])
    bm.faces.new([v1, v4, v5, v2])
    bm.faces.new([v2, v5, v6, v3])
    bm.faces.new([v3, v6, v4, v1])
    bm.to_mesh(tri_mesh)
    bm.free()

    tri_obj = bpy.data.objects.new("Triangular_Hedge_SIT", tri_mesh)
    tri_obj.data.materials.append(mats['hedgeGreen'])
    tri_obj.parent = courtyard
    col.objects.link(tri_obj)

    # SIT 3D hedge letters
    for lx, char in [(-4.0, "S"), (0.0, "I"), (4.0, "T")]:
        add_3d_text(f"Hedge_Letter_{char}", char, (lx, -7.0, 0.68), (0, 0, 0), size=2.8, mat=mats['letterGold'], parent=courtyard, col=col)

    # Flagpole with Flag
    add_cylinder("Campus_Flagpole", (0.0, -2.0, 4.5), 0.07, 9.0, mats['flagPole'], segments=12, parent=courtyard, col=col)
    add_cube("Campus_Flag", (0.9, -2.0, 8.4), (1.8, 0.03, 1.1), mats['flagRed'], parent=courtyard, col=col)

    # Palm Trees along Courtyard Entrance
    for px in [-24.0, -18.0, 18.0, 24.0]:
        add_cylinder(f"Palm_Trunk_{px}", (px, -8.0, 2.7), 0.22, 5.4, mats['palmTrunk'], segments=8, parent=courtyard, col=col)
        add_uvsphere(f"Palm_Crown_{px}", (px, -8.0, 5.8), 1.9, mats['palmLeaf'], segments=12, rings=8, parent=courtyard, col=col)

    return root


# ---------------------------------------------------------------------------
#  OTHER CAMPUS BUILDINGS (All 18 Real Campus Buildings)
# ---------------------------------------------------------------------------

def build_other_buildings(campus, mats, col):
    for b in campus.get("buildings", []):
        bid = b.get("id")
        if bid in ["main-academic-block", "main-building"]:
            continue

        bname = b.get("name", "Building")
        h = b.get("height", 12.0)
        poly = b.get("polygon", [])
        if poly and len(poly) >= 3:
            xs = [p[0] for p in poly]
            ys = [p[1] for p in poly]
            bw = max(max(xs) - min(xs), 6.0)
            bd = max(max(ys) - min(ys), 6.0)
            bx = (max(xs) + min(xs)) / 2.0
            by = -((max(ys) + min(ys)) / 2.0)
        else:
            pos = b.get("center", [0, 0])
            bx, by = pos[0], -pos[1]
            bw, bd = 20.0, 15.0

        bz = h / 2.0

        if "hostel" in bid:
            mat = mats['hostel']
        elif "canteen" in bid or "food" in bid:
            mat = mats['canteen']
        else:
            mat = mats['bldg_gen']

        bldg = add_cube(f"Bldg_{bid}", (bx, by, bz), (bw, bd, h), mat, col=col)
        bldg["buildingId"] = bid
        bldg["buildingName"] = bname

        # Dressed Concrete Foundation Plinth (anchors building firmly into terrain)
        add_cube(f"Bldg_{bid}_Plinth", (bx, by, -0.15), (bw + 0.4, bd + 0.4, 0.4), mats['poleDark'], parent=bldg, col=col)

        # Roof slab & parapet
        add_cube(f"Bldg_{bid}_Roof", (bx, by, h + 0.15), (bw + 0.4, bd + 0.4, 0.3), mats['roofSlab'], parent=bldg, col=col)


# ---------------------------------------------------------------------------
#  TERRAIN, ROADS, CONTINUOUS BOUNDARY SECURITY FENCE & ENTRANCE GATES
# ---------------------------------------------------------------------------

def build_terrain_and_amenities(campus, mats, col):
    # Main Regional Lush Ground Plane (Chamtaguri Tea Gardens)
    ground_wide = add_cube("Campus_Regional_Ground", (0, 0, -0.4), (1000, 1000, 0.4), mats['groundLush'], col=col)

    # Campus Interior Ground Plane
    ground = add_cube("Campus_Ground_Terrain", (0, 0, -0.1), (340, 300, 0.2), mats['ground'], col=col)

    # Basketball Court Facility (Centered in field between campus roads at [-44.0, -64.0] / Blender (-44.0, 64.0))
    bball_court = add_cube("Sports_Court_BBall", (-44.0, 64.0, 0.05), (32.0, 19.0, 0.12), mats['sports'], col=col)
    bball_court.rotation_euler = (0, 0, 11.5 * 3.14159 / 180)

    # ======================================================================
    # CONTINUOUS SECURITY FENCE (120-Point Exact SIT Campus Perimeter)
    # ======================================================================
    boundary_pts = campus.get("boundary", [])
    if len(boundary_pts) >= 3:
        plinth_bm = bmesh.new()
        fence_bm = bmesh.new()

        for idx in range(len(boundary_pts)):
            p1_raw = boundary_pts[idx]
            p2_raw = boundary_pts[(idx + 1) % len(boundary_pts)]

            # Convert to Blender coords (x, -z)
            p1 = (p1_raw[0], -p1_raw[1])
            p2 = (p2_raw[0], -p2_raw[1])

            # Check road crossings to leave entrance gates open
            is_main_gate = math.hypot(p1[0] - 155.01, p1[1] - 111.17) < 7.0
            is_north_gate = math.hypot(p1[0] - 34.34, p1[1] - (-119.55)) < 6.0
            if is_main_gate or is_north_gate:
                continue

            dx = p2[0] - p1[0]
            dy = p2[1] - p1[1]
            seg_len = math.hypot(dx, dy)
            if seg_len < 0.1:
                continue

            # Unit normals
            nx = -dy / seg_len
            ny = dx / seg_len

            # 1. Concrete Plinth Base (Width 0.35m, Height 0.35m)
            pw = 0.175
            b_v1 = plinth_bm.verts.new((p1[0] + nx * pw, p1[1] + ny * pw, 0.0))
            b_v2 = plinth_bm.verts.new((p1[0] - nx * pw, p1[1] - ny * pw, 0.0))
            b_v3 = plinth_bm.verts.new((p2[0] - nx * pw, p2[1] - ny * pw, 0.0))
            b_v4 = plinth_bm.verts.new((p2[0] + nx * pw, p2[1] + ny * pw, 0.0))
            t_v1 = plinth_bm.verts.new((p1[0] + nx * pw, p1[1] + ny * pw, 0.35))
            t_v2 = plinth_bm.verts.new((p1[0] - nx * pw, p1[1] - ny * pw, 0.35))
            t_v3 = plinth_bm.verts.new((p2[0] - nx * pw, p2[1] - ny * pw, 0.35))
            t_v4 = plinth_bm.verts.new((p2[0] + nx * pw, p2[1] + ny * pw, 0.35))
            plinth_bm.faces.new([b_v1, b_v2, b_v3, b_v4])
            plinth_bm.faces.new([t_v4, t_v3, t_v2, t_v1])
            plinth_bm.faces.new([b_v1, t_v1, t_v4, b_v4])
            plinth_bm.faces.new([b_v2, b_v3, t_v3, t_v2])
            plinth_bm.faces.new([b_v1, b_v2, t_v2, t_v1])
            plinth_bm.faces.new([b_v4, t_v4, t_v3, b_v3])

            # 2. Steel Rails (Top at 2.35m, Bottom at 0.50m)
            rw = 0.025
            for r_z in [0.50, 2.35]:
                rb1 = fence_bm.verts.new((p1[0] + nx * rw, p1[1] + ny * rw, r_z - 0.025))
                rb2 = fence_bm.verts.new((p1[0] - nx * rw, p1[1] - ny * rw, r_z - 0.025))
                rb3 = fence_bm.verts.new((p2[0] - nx * rw, p2[1] - ny * rw, r_z - 0.025))
                rb4 = fence_bm.verts.new((p2[0] + nx * rw, p2[1] + ny * rw, r_z - 0.025))
                rt1 = fence_bm.verts.new((p1[0] + nx * rw, p1[1] + ny * rw, r_z + 0.025))
                rt2 = fence_bm.verts.new((p1[0] - nx * rw, p1[1] - ny * rw, r_z + 0.025))
                rt3 = fence_bm.verts.new((p2[0] - nx * rw, p2[1] - ny * rw, r_z + 0.025))
                rt4 = fence_bm.verts.new((p2[0] + nx * rw, p2[1] + ny * rw, r_z + 0.025))
                fence_bm.faces.new([rb1, rb2, rb3, rb4])
                fence_bm.faces.new([rt4, rt3, rt2, rt1])
                fence_bm.faces.new([rb1, rt1, rt4, rb4])
                fence_bm.faces.new([rb2, rb3, rt3, rt2])

            # 3. Steel Fence Posts every ~3.5m
            num_posts = max(1, round(seg_len / 3.5))
            post_w = 0.04
            for post_idx in range(num_posts + 1):
                t = post_idx / num_posts
                px = p1[0] + t * dx
                py = p1[1] + t * dy
                pb1 = fence_bm.verts.new((px - post_w, py - post_w, 0.35))
                pb2 = fence_bm.verts.new((px + post_w, py - post_w, 0.35))
                pb3 = fence_bm.verts.new((px + post_w, py + post_w, 0.35))
                pb4 = fence_bm.verts.new((px - post_w, py + post_w, 0.35))
                pt1 = fence_bm.verts.new((px - post_w, py - post_w, 2.45))
                pt2 = fence_bm.verts.new((px + post_w, py - post_w, 2.45))
                pt3 = fence_bm.verts.new((px + post_w, py + post_w, 2.45))
                pt4 = fence_bm.verts.new((px - post_w, py + post_w, 2.45))
                fence_bm.faces.new([pb1, pb2, pb3, pb4])
                fence_bm.faces.new([pt4, pt3, pt2, pt1])
                fence_bm.faces.new([pb1, pt1, pt2, pb2])
                fence_bm.faces.new([pb2, pt2, pt3, pb3])
                fence_bm.faces.new([pb3, pt3, pt4, pb4])
                fence_bm.faces.new([pb4, pt4, pt1, pb1])

            # 4. Vertical Pickets spaced ~0.45m
            num_pickets = max(1, round(seg_len / 0.45))
            pic_w = 0.015
            for pic_idx in range(num_pickets):
                t = (pic_idx + 0.5) / num_pickets
                px = p1[0] + t * dx
                py = p1[1] + t * dy
                pb1 = fence_bm.verts.new((px - pic_w, py - pic_w, 0.50))
                pb2 = fence_bm.verts.new((px + pic_w, py - pic_w, 0.50))
                pb3 = fence_bm.verts.new((px + pic_w, py + pic_w, 0.50))
                pb4 = fence_bm.verts.new((px - pic_w, py + pic_w, 0.50))
                pt1 = fence_bm.verts.new((px - pic_w, py - pic_w, 2.35))
                pt2 = fence_bm.verts.new((px + pic_w, py - pic_w, 2.35))
                pt3 = fence_bm.verts.new((px + pic_w, py + pic_w, 2.35))
                pt4 = fence_bm.verts.new((px - pic_w, py + pic_w, 2.35))
                fence_bm.faces.new([pb1, pt1, pt2, pb2])
                fence_bm.faces.new([pb2, pt2, pt3, pb3])
                fence_bm.faces.new([pb3, pt3, pt4, pb4])
                fence_bm.faces.new([pb4, pt4, pt1, pb1])

        # Plinth Mesh Object
        plinth_mesh = bpy.data.meshes.new("Campus_Boundary_Plinth_Mesh")
        plinth_bm.to_mesh(plinth_mesh)
        plinth_bm.free()
        plinth_obj = bpy.data.objects.new("Campus_Boundary_Plinth", plinth_mesh)
        plinth_obj.data.materials.append(mats['plinthConcrete'])
        col.objects.link(plinth_obj)

        # Fence Mesh Object
        fence_mesh = bpy.data.meshes.new("Campus_Security_Fence_Mesh")
        fence_bm.to_mesh(fence_mesh)
        fence_bm.free()
        fence_obj = bpy.data.objects.new("Campus_Security_Fence", fence_mesh)
        fence_obj.data.materials.append(mats['steelFence'])
        col.objects.link(fence_obj)

    # ======================================================================
    # ARCHITECTURAL ENTRANCE GATES
    # ======================================================================
    # 1. Main South-East Highway Entrance Gate (Hill Cart Road at [155.01, 111.17])
    main_gate = bpy.data.objects.new("Main_Highway_Entrance_Gate", None)
    main_gate.location = (155.01, 111.17, 0)
    main_gate.rotation_euler = (0, 0, 0.65)
    col.objects.link(main_gate)

    # Masonry Gate Pillars (Warm cream stone)
    add_cube("MainGate_Pillar_L", (-4.2, 0, 2.4), (1.4, 1.4, 4.8), mats['gatePillar'], parent=main_gate, col=col)
    add_cube("MainGate_Cap_L", (-4.2, 0, 4.95), (1.6, 1.6, 0.3), mats['borderWhite'], parent=main_gate, col=col)
    pyr_l = add_cylinder("MainGate_Finial_L", (-4.2, 0, 5.3), 0.9, 0.5, mats['borderWhite'], segments=4, parent=main_gate, col=col)
    pyr_l.rotation_euler = (0, 0, math.pi / 4)

    add_cube("MainGate_Pillar_R", (4.2, 0, 2.4), (1.4, 1.4, 4.8), mats['gatePillar'], parent=main_gate, col=col)
    add_cube("MainGate_Cap_R", (4.2, 0, 4.95), (1.6, 1.6, 0.3), mats['borderWhite'], parent=main_gate, col=col)
    pyr_r = add_cylinder("MainGate_Finial_R", (4.2, 0, 5.3), 0.9, 0.5, mats['borderWhite'], segments=4, parent=main_gate, col=col)
    pyr_r.rotation_euler = (0, 0, math.pi / 4)

    # Overhead Entrance Arch Beam
    add_cube("MainGate_Arch_Beam", (0, 0, 4.8), (9.8, 0.6, 0.7), mats['steelFence'], parent=main_gate, col=col)
    add_3d_text("MainGate_Sign_Text", "SILIGURI INSTITUTE OF TECHNOLOGY", (0, -0.32, 4.8), (math.radians(90), 0, 0), size=0.32, mat=mats['signText'], parent=main_gate, col=col)

    # Open Security Wing Gates
    gate_l = add_cube("MainGate_Wing_L", (-2.8, 0.8, 1.6), (2.5, 0.08, 2.8), mats['steelFence'], parent=main_gate, col=col)
    gate_l.rotation_euler = (0, 0, 0.8)
    gate_r = add_cube("MainGate_Wing_R", (2.8, 0.8, 1.6), (2.5, 0.08, 2.8), mats['steelFence'], parent=main_gate, col=col)
    gate_r.rotation_euler = (0, 0, -0.8)

    # 2. North Secondary Campus Gate (at [34.34, -119.55])
    north_gate = bpy.data.objects.new("North_Secondary_Gate", None)
    north_gate.location = (34.34, -119.55, 0)
    north_gate.rotation_euler = (0, 0, -0.25)
    col.objects.link(north_gate)

    add_cube("NorthGate_Pillar_L", (-3.6, 0, 2.0), (1.1, 1.1, 4.0), mats['gatePillar'], parent=north_gate, col=col)
    add_cube("NorthGate_Cap_L", (-3.6, 0, 4.15), (1.25, 1.25, 0.25), mats['borderWhite'], parent=north_gate, col=col)
    add_cube("NorthGate_Pillar_R", (3.6, 0, 2.0), (1.1, 1.1, 4.0), mats['gatePillar'], parent=north_gate, col=col)
    add_cube("NorthGate_Cap_R", (3.6, 0, 4.15), (1.25, 1.25, 0.25), mats['borderWhite'], parent=north_gate, col=col)

    # Campus Road Network
    for idx, rd in enumerate(campus.get("roads", [])):
        pts = rd.get("points", [])
        if len(pts) < 2:
            continue
        bm_r = bmesh.new()
        width = rd.get("width", 5.5) / 2.0
        for p_idx in range(len(pts) - 1):
            p1 = pts[p_idx]
            p2 = pts[p_idx + 1]
            z1 = p1[1] if len(p1) > 1 else 0
            z2 = p2[1] if len(p2) > 1 else 0
            x1, y1 = p1[0], -z1
            x2, y2 = p2[0], -z2
            dx, dy = x2 - x1, y2 - y1
            l = math.hypot(dx, dy)
            if l < 0.001:
                continue
            nx, ny = -dy / l * width, dx / l * width
            v1 = bm_r.verts.new((x1 + nx, y1 + ny, 0.04))
            v2 = bm_r.verts.new((x1 - nx, y1 - ny, 0.04))
            v3 = bm_r.verts.new((x2 - nx, y2 - ny, 0.04))
            v4 = bm_r.verts.new((x2 + nx, y2 + ny, 0.04))
            bm_r.faces.new([v1, v2, v3, v4])
        rm = bpy.data.meshes.new(f"Road_Mesh_{idx}")
        bm_r.to_mesh(rm)
        bm_r.free()
        robj = bpy.data.objects.new(f"Road_{idx}", rm)
        robj.data.materials.append(mats['asphalt'])
        col.objects.link(robj)

    # ======================================================================
    # CAMPUS-WIDE STREETLIGHT NETWORK (Covering All Internal Roads)
    # ======================================================================
    st_group = bpy.data.objects.new("Campus_Streetlight_Network", None)
    col.objects.link(st_group)

    raw_poles = []
    for r_idx, rd in enumerate(campus.get("roads", [])):
        pts = rd.get("points", [])
        if len(pts) < 2:
            continue
        w = (rd.get("width", 5.5)) / 2.0 + 1.25
        for i in range(len(pts) - 1):
            p1 = pts[i]
            p2 = pts[i + 1]
            z1 = p1[1] if len(p1) > 1 else 0
            z2 = p2[1] if len(p2) > 1 else 0
            x1, y1 = p1[0], -z1
            x2, y2 = p2[0], -z2
            dx, dy = x2 - x1, y2 - y1
            seg_len = math.hypot(dx, dy)
            if seg_len < 0.01:
                continue
            nx, ny = -dy / seg_len, dx / seg_len
            side = 1 if ((i + r_idx) % 2 == 0) else -1
            steps = max(1, round(seg_len / 30.0))
            for s in range(steps):
                t = (s + 0.5) / steps
                px = x1 + t * dx + nx * w * side
                py = y1 + t * dy + ny * w * side
                # Exclude main building footprint
                if -38 <= px <= 38 and -46 <= py <= 16:
                    continue
                arm_dir = (-nx * side, -ny * side)
                raw_poles.append((px, py, arm_dir))

    # Deduplicate poles within 16m
    filtered_poles = []
    for p in raw_poles:
        if not any(math.hypot(p[0] - q[0], p[1] - q[1]) < 16.0 for q in filtered_poles):
            filtered_poles.append(p)

    # Build batched streetlights in bmesh for blazing fast performance
    sl_bm = bmesh.new()
    bulb_bm = bmesh.new()

    for p_idx, p in enumerate(filtered_poles):
        px, py, (ax, ay) = p
        # Pole mast
        pw = 0.08
        b1 = sl_bm.verts.new((px - pw, py - pw, 0.0))
        b2 = sl_bm.verts.new((px + pw, py - pw, 0.0))
        b3 = sl_bm.verts.new((px + pw, py + pw, 0.0))
        b4 = sl_bm.verts.new((px - pw, py + pw, 0.0))
        t1 = sl_bm.verts.new((px - pw, py - pw, 6.2))
        t2 = sl_bm.verts.new((px + pw, py - pw, 6.2))
        t3 = sl_bm.verts.new((px + pw, py + pw, 6.2))
        t4 = sl_bm.verts.new((px - pw, py + pw, 6.2))
        sl_bm.faces.new([b1, b2, b3, b4])
        sl_bm.faces.new([t4, t3, t2, t1])
        sl_bm.faces.new([b1, t1, t2, b2])
        sl_bm.faces.new([b2, t2, t3, b3])
        sl_bm.faces.new([b3, t3, t4, b4])
        sl_bm.faces.new([b4, t4, t1, b1])

        # Arm & Head
        hx = px + ax * 1.35
        hy = py + ay * 1.35
        hb1 = sl_bm.verts.new((px, py, 6.1))
        hb2 = sl_bm.verts.new((hx, hy, 6.25))
        hb3 = sl_bm.verts.new((hx, hy, 6.35))
        hb4 = sl_bm.verts.new((px, py, 6.25))
        sl_bm.faces.new([hb1, hb2, hb3, hb4])

        # 3D Glowing Luminaire Bulb
        bw, bl, bh = 0.12, 0.22, 0.06
        bv1 = bulb_bm.verts.new((hx - bw, hy - bl, 6.16))
        bv2 = bulb_bm.verts.new((hx + bw, hy - bl, 6.16))
        bv3 = bulb_bm.verts.new((hx + bw, hy + bl, 6.16))
        bv4 = bulb_bm.verts.new((hx - bw, hy + bl, 6.16))
        bv5 = bulb_bm.verts.new((hx - bw, hy - bl, 6.24))
        bv6 = bulb_bm.verts.new((hx + bw, hy - bl, 6.24))
        bv7 = bulb_bm.verts.new((hx + bw, hy + bl, 6.24))
        bv8 = bulb_bm.verts.new((hx - bw, hy + bl, 6.24))
        bulb_bm.faces.new([bv1, bv2, bv3, bv4])
        bulb_bm.faces.new([bv8, bv7, bv6, bv5])
        bulb_bm.faces.new([bv1, bv5, bv6, bv2])
        bulb_bm.faces.new([bv2, bv6, bv7, bv3])
        bulb_bm.faces.new([bv3, bv7, bv8, bv4])
        bulb_bm.faces.new([bv4, bv8, bv5, bv1])

    sl_mesh = bpy.data.meshes.new("Campus_Streetlights_Mesh")
    sl_bm.to_mesh(sl_mesh)
    sl_bm.free()
    sl_obj = bpy.data.objects.new("Campus_Streetlights", sl_mesh)
    sl_obj.data.materials.append(mats['poleDark'])
    sl_obj.parent = st_group
    col.objects.link(sl_obj)

    bulb_mesh = bpy.data.meshes.new("Campus_Streetlight_Bulbs_Mesh")
    bulb_bm.to_mesh(bulb_mesh)
    bulb_bm.free()
    bulb_obj = bpy.data.objects.new("Campus_Streetlight_Bulbs", bulb_mesh)
    bulb_obj.data.materials.append(mats['streetBulb'])
    bulb_obj.parent = st_group
    col.objects.link(bulb_obj)

    # Key junction dynamic point lights
    junction_coords = [
        (155.0, 111.2, 6.2),   # Main Highway Gate
        (34.3, -119.5, 6.2),   # North Secondary Gate
        (18.0, 16.0, 6.2),     # Central Garden front approach
        (-16.0, 18.0, 6.2),    # West Approach
        (-42.0, 8.0, 6.2),     # Admin Annex Road
        (48.0, -5.0, 6.2),     # Workshop Road
        (5.0, -48.0, 6.2),     # Rear Parking Entrance
        (-22.0, -46.0, 6.2),   # Rear West Loop
        (26.0, -45.0, 6.2),    # Rear East Loop
        (-55.0, -45.0, 6.2),   # Hostels Junction
        (-30.0, -85.0, 6.2),   # North Hostels
        (58.0, -160.0, 6.2),   # Sports Ground
        (42.0, 75.0, 6.2),     # South Highway Access
    ]
    for j_idx, (jx, jy, jz) in enumerate(junction_coords):
        j_lt = bpy.data.lights.new(name=f"Light_Street_Junction_{j_idx}", type='POINT')
        j_lt.energy = 550.0
        j_lt.color = hex_to_rgb("#fef9c3")
        j_obj = bpy.data.objects.new(name=f"Light_Street_Junction_{j_idx}", object_data=j_lt)
        j_obj.location = (jx, jy, jz)
        j_obj.parent = st_group
        col.objects.link(j_obj)


# ---------------------------------------------------------------------------
#  LIGHTING & CAMERA SETUP
# ---------------------------------------------------------------------------

def setup_lighting_and_camera(col):
    # Main Sun Light (Warm afternoon Siliguri sun)
    sun_data = bpy.data.lights.new(name="Sun_Siliguri", type='SUN')
    sun_data.energy = 3.5
    sun_data.color = (1.0, 0.96, 0.90)
    sun_obj = bpy.data.objects.new(name="Sun_Siliguri", object_data=sun_data)
    sun_obj.location = (50, -60, 80)
    sun_obj.rotation_euler = (math.radians(48), math.radians(18), math.radians(-32))
    col.objects.link(sun_obj)

    # Ambient Sky Fill
    fill_data = bpy.data.lights.new(name="Sky_Fill", type='SUN')
    fill_data.energy = 1.0
    fill_data.color = (0.75, 0.85, 1.0)
    fill_obj = bpy.data.objects.new(name="Sky_Fill", object_data=fill_data)
    fill_obj.location = (-40, 50, 60)
    fill_obj.rotation_euler = (math.radians(60), 0, math.radians(140))
    col.objects.link(fill_obj)

    # Main Architectural Camera (Carefully framed showing Main Building, Portico, Dome, Courtyard)
    cam_data = bpy.data.cameras.new(name="Campus_Camera")
    cam_data.lens = 42
    cam_data.clip_start = 0.5
    cam_data.clip_end = 2000
    cam_obj = bpy.data.objects.new(name="Campus_Camera", object_data=cam_data)
    cam_obj.location = (28, -55, 26)
    col.objects.link(cam_obj)

    tgt = bpy.data.objects.new("Camera_Target", None)
    tgt.location = (8.0, -4.0, 8.5)
    col.objects.link(tgt)

    track = cam_obj.constraints.new(type='TRACK_TO')
    track.target = tgt
    track.track_axis = 'TRACK_NEGATIVE_Z'
    track.up_axis = 'UP_Y'

    # Rear Architectural Camera (Framing the Rear Parking Complex & Rear Facade)
    rear_cam_data = bpy.data.cameras.new(name="Rear_Parking_Camera")
    rear_cam_data.lens = 38
    rear_cam_data.clip_start = 0.5
    rear_cam_data.clip_end = 2000
    rear_cam_obj = bpy.data.objects.new(name="Rear_Parking_Camera", object_data=rear_cam_data)
    rear_cam_obj.location = (-48.0, 62.0, 26.0)
    col.objects.link(rear_cam_obj)

    rear_tgt = bpy.data.objects.new("Rear_Camera_Target", None)
    rear_tgt.location = (-16.6, 31.0, 3.5)
    col.objects.link(rear_tgt)

    rear_track = rear_cam_obj.constraints.new(type='TRACK_TO')
    rear_track.target = rear_tgt
    rear_track.track_axis = 'TRACK_NEGATIVE_Z'
    rear_track.up_axis = 'UP_Y'

    # Aerial Boundary Fence Camera (Framing complete campus security perimeter & gates)
    fence_cam_data = bpy.data.cameras.new(name="Fence_Aerial_Camera")
    fence_cam_data.lens = 28
    fence_cam_data.clip_start = 1.0
    fence_cam_data.clip_end = 3000
    fence_cam_obj = bpy.data.objects.new(name="Fence_Aerial_Camera", object_data=fence_cam_data)
    fence_cam_obj.location = (175.0, -170.0, 140.0)
    col.objects.link(fence_cam_obj)

    fence_tgt = bpy.data.objects.new("Fence_Camera_Target", None)
    fence_tgt.location = (15.0, 0.0, 5.0)
    col.objects.link(fence_tgt)

    fence_track = fence_cam_obj.constraints.new(type='TRACK_TO')
    fence_track.target = fence_tgt
    fence_track.track_axis = 'TRACK_NEGATIVE_Z'
    fence_track.up_axis = 'UP_Y'

    bpy.context.scene.camera = cam_obj
    return sun_data, fill_data, cam_obj, rear_cam_obj, fence_cam_obj


# ---------------------------------------------------------------------------
#  DAY, NIGHT, REAR PARKING & BOUNDARY FENCE RENDERING PIPELINE
# ---------------------------------------------------------------------------

def render_previews(mats, sun_data, fill_data, cam_obj, rear_cam_obj, fence_cam_obj, day_img_path, night_img_path, rear_img_path, fence_img_path):
    scene = bpy.context.scene
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'

    # Ensure World exists
    if not scene.world:
        scene.world = bpy.data.worlds.new("World")
    scene.world.use_nodes = True
    bg_node = scene.world.node_tree.nodes.get("Background")

    # ==========================
    # 1. DAYTIME FRONT RENDER
    # ==========================
    print("\n--- Starting Day Front Render Pass ---")
    scene.camera = cam_obj
    sun_data.energy = 3.5
    sun_data.color = (1.0, 0.96, 0.90)
    fill_data.energy = 1.0
    fill_data.color = (0.75, 0.85, 1.0)
    if bg_node:
        bg_node.inputs["Color"].default_value = (0.45, 0.65, 0.90, 1.0)
        bg_node.inputs["Strength"].default_value = 1.0

    if mats['windowLitWarm'].node_tree.nodes.get("Principled BSDF"):
        mats['windowLitWarm'].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 0.0
    if mats['windowLitAmber'].node_tree.nodes.get("Principled BSDF"):
        mats['windowLitAmber'].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 0.0

    scene.render.filepath = day_img_path
    bpy.ops.render.render(write_still=True)
    print(f"Day render saved to: {day_img_path}")

    # ==========================
    # 2. REAR PARKING AREA RENDER
    # ==========================
    print("\n--- Starting Rear Parking Render Pass ---")
    scene.camera = rear_cam_obj
    scene.render.filepath = rear_img_path
    bpy.ops.render.render(write_still=True)
    print(f"Rear parking render saved to: {rear_img_path}")

    # ==========================
    # 3. CAMPUS BOUNDARY FENCE AERIAL RENDER
    # ==========================
    print("\n--- Starting Campus Boundary Fence Render Pass ---")
    scene.camera = fence_cam_obj
    scene.render.filepath = fence_img_path
    bpy.ops.render.render(write_still=True)
    print(f"Campus boundary fence render saved to: {fence_img_path}")

    # ==========================
    # 4. NIGHTTIME FRONT RENDER
    # ==========================
    print("\n--- Starting Night Front Render Pass ---")
    scene.camera = cam_obj
    sun_data.energy = 0.55
    sun_data.color = hex_to_rgb("#a5c9fd") # soft silver-blue moonlight
    fill_data.energy = 0.35
    fill_data.color = hex_to_rgb("#24334f") # luminous deep midnight ambient
    if bg_node:
        bg_node.inputs["Color"].default_value = (0.045, 0.08, 0.15, 1.0)
        bg_node.inputs["Strength"].default_value = 0.65

    if mats['windowLitWarm'].node_tree.nodes.get("Principled BSDF"):
        mats['windowLitWarm'].node_tree.nodes["Principled BSDF"].inputs["Emission Color"].default_value = (*hex_to_rgb("#fef08a"), 1.0)
        mats['windowLitWarm'].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 7.5
    if mats['windowLitAmber'].node_tree.nodes.get("Principled BSDF"):
        mats['windowLitAmber'].node_tree.nodes["Principled BSDF"].inputs["Emission Color"].default_value = (*hex_to_rgb("#f59e0b"), 1.0)
        mats['windowLitAmber'].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 5.0

    scene.render.filepath = night_img_path
    bpy.ops.render.render(write_still=True)
    print(f"Night render saved to: {night_img_path}")


# ---------------------------------------------------------------------------
#  MAIN ENTRY POINT
# ---------------------------------------------------------------------------

def main():
    print("=" * 70)
    print("SIT Campus 3D Architecture Model Generator for Blender 5.3")
    print("=" * 70)

    clean_scene()
    mats = create_materials()

    data_path = os.path.abspath("public/data/sit_campus_processed.json")
    with open(data_path, "r", encoding="utf-8") as f:
        campus = json.load(f)

    # Collections hierarchy
    campus_col = bpy.data.collections.new("SIT_Campus")
    bpy.context.scene.collection.children.link(campus_col)

    main_col = bpy.data.collections.new("01_Main_Academic_Complex")
    campus_col.children.link(main_col)

    bldg_col = bpy.data.collections.new("02_Campus_Buildings")
    campus_col.children.link(bldg_col)

    env_col = bpy.data.collections.new("03_Roads_And_Environment")
    campus_col.children.link(env_col)

    light_col = bpy.data.collections.new("04_Lighting_And_Camera")
    campus_col.children.link(light_col)

    # Real-world calibrated world placement matching Next.js 3D application
    MAIN_X = 3.18
    MAIN_Z = -4.25
    ROT_Y = -0.637

    print("Building 100% accurate SIT Main Academic Complex with authentic colors & un-mirrored signage...")
    build_main_academic_complex(mats, MAIN_X, MAIN_Z, ROT_Y, main_col)

    print("Building other campus structures...")
    build_other_buildings(campus, mats, bldg_col)

    print("Building terrain, roads, continuous boundary security fence, entrance gates...")
    build_terrain_and_amenities(campus, mats, env_col)

    print("Setting up camera, sun lighting, and render settings...")
    sun_data, fill_data, cam_obj, rear_cam_obj, fence_cam_obj = setup_lighting_and_camera(light_col)

    # Output paths
    os.makedirs("public/models", exist_ok=True)
    blend_final_path = os.path.abspath("public/models/SIT_Campus_MainBuilding_Final.blend")
    blend_path = os.path.abspath("public/models/sit_campus.blend")
    glb_path = os.path.abspath("public/models/sit_campus.glb")
    day_img_path = os.path.abspath("public/models/SIT_MainBuilding_Day.png")
    night_img_path = os.path.abspath("public/models/SIT_MainBuilding_Night.png")
    rear_img_path = os.path.abspath("public/models/SIT_MainBuilding_Rear_Parking.png")
    fence_img_path = os.path.abspath("public/models/SIT_Campus_Boundary_Fence.png")

    print("\nRendering Day, Rear Parking, Boundary Fence, and Night photorealistic previews...")
    render_previews(mats, sun_data, fill_data, cam_obj, rear_cam_obj, fence_cam_obj, day_img_path, night_img_path, rear_img_path, fence_img_path)

    print(f"\nSaving native Blender (.blend) file: {blend_final_path}")
    bpy.ops.wm.save_as_mainfile(filepath=blend_final_path)

    # Also update sit_campus.blend
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)

    print(f"Exporting glTF 2.0 (.glb) file: {glb_path}")
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format='GLB',
        export_materials='EXPORT',
        export_attributes=True,
        export_extras=True,
        export_normals=True,
        export_apply=True,
        export_yup=True
    )

    total_verts = sum(len(m.vertices) for m in bpy.data.meshes)
    total_faces = sum(len(m.polygons) for m in bpy.data.meshes)
    size_mb = os.path.getsize(blend_final_path) / 1024
    print(f"\nSUCCESS: Blender Model Ready: {total_verts} verts, {total_faces} faces, Blend Size: {size_mb:.0f} KB")


if __name__ == "__main__":
    main()
