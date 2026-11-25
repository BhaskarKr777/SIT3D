import json
import math

with open('public/data/sit_campus_processed.json') as f:
    d = json.load(f)

def pt_seg_dist(px, pz, x1, z1, x2, z2):
    dx = x2 - x1
    dz = z2 - z1
    len_sq = dx*dx + dz*dz
    if len_sq < 0.0001:
        return math.hypot(px - x1, pz - z1)
    t = max(0, min(1, ((px - x1)*dx + (pz - z1)*dz) / len_sq))
    proj_x = x1 + t * dx
    proj_z = z1 + t * dz
    return math.hypot(px - proj_x, pz - proj_z)

road_segs = []
for r in d['roads']:
    pts = r['points']
    for i in range(len(pts) - 1):
        road_segs.append((pts[i][0], pts[i][1], pts[i+1][0], pts[i+1][1]))

def min_road_dist(px, pz):
    return min(pt_seg_dist(px, pz, x1, z1, x2, z2) for x1, z1, x2, z2 in road_segs)

# Test various centers (cx in -48 to -40, cz in -68 to -62)
# and sizes (L in 32 to 38, W in 18 to 22)
best = []
for cx in [-46, -45, -44, -43, -42]:
    for cz in [-68, -67, -66, -65, -64]:
        for ang_deg in [10, 12, 14, 16, 18, 20]:
            ang = math.radians(ang_deg)
            L = 36.0 # Length
            W = 20.0 # Width
            hw, hl = W / 2.0, L / 2.0
            # Local X is width (perp to length), Local Z is length (along court axis)
            corners = [
                (-hw * math.cos(ang) - -hl * math.sin(ang) + cx, -hw * math.sin(ang) + -hl * math.cos(ang) + cz),
                (hw * math.cos(ang) - -hl * math.sin(ang) + cx, hw * math.sin(ang) + -hl * math.cos(ang) + cz),
                (hw * math.cos(ang) - hl * math.sin(ang) + cx, hw * math.sin(ang) + hl * math.cos(ang) + cz),
                (-hw * math.cos(ang) - hl * math.sin(ang) + cx, -hw * math.sin(ang) + hl * math.cos(ang) + cz),
            ]
            min_c = min(min_road_dist(x, z) for x, z in corners)
            best.append((min_c, cx, cz, ang_deg, corners))

best.sort(key=lambda x: x[0], reverse=True)
top = best[0]
print(f"Top configuration:")
print(f"  Clearance to nearest road: {top[0]:.2f}m")
print(f"  Center: [{top[1]}, {top[2]}], Angle: {top[3]}°")
print(f"  Corners:")
for c in top[4]:
    print(f"    [{c[0]:.2f}, {c[1]:.2f}] -> road dist = {min_road_dist(c[0], c[1]):.2f}m")

