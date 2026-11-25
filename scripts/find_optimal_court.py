import json
import math

with open('public/data/sit_campus_processed.json') as f:
    d = json.load(f)

# Distance from point to line segment
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
        p1, p2 = pts[i], pts[i+1]
        if (-100 <= p1[0] <= 10 or -100 <= p2[0] <= 10) and (-110 <= p1[1] <= 10 or -110 <= p2[1] <= 10):
            road_segs.append((p1[0], p1[1], p2[0], p2[1], r['id']))

def min_road_dist(px, pz):
    return min(pt_seg_dist(px, pz, x1, z1, x2, z2) for x1, z1, x2, z2, _ in road_segs)

# Grid search for the maximum inscribed clearance center in this field
best_dist = 0
best_pt = None

for x_i in range(-65, -25):
    for z_i in range(-85, -45):
        dist = min_road_dist(x_i, z_i)
        if dist > best_dist:
            best_dist = dist
            best_pt = (x_i, z_i)

print(f"Optimal Field Center with MAXIMUM road clearance: {best_pt}")
print(f"Distance to nearest road: {best_dist:.2f} meters")

# Check clearances around best_pt for a court
# Standard FIBA basketball court is 28m x 15m (or with perimeter run-off and fencing: 34m x 20m)
# Or dual/enlarged championship sports complex: 36m x 22m or 38m x 24m
for angle_deg in [0, 10, 15, 20, 25, 30, -10, -15, -20, -25]:
    ang = math.radians(angle_deg)
    # Court dimensions: length along local Z, width along local X (or vice-versa)
    L, W = 38.0, 22.0 # Significantly enlarged high-grade court with apron & seating
    hw, hl = W / 2.0, L / 2.0
    corners = [
        (-hw * math.cos(ang) - -hl * math.sin(ang) + best_pt[0], -hw * math.sin(ang) + -hl * math.cos(ang) + best_pt[1]),
        (hw * math.cos(ang) - -hl * math.sin(ang) + best_pt[0], hw * math.sin(ang) + -hl * math.cos(ang) + best_pt[1]),
        (hw * math.cos(ang) - hl * math.sin(ang) + best_pt[0], hw * math.sin(ang) + hl * math.cos(ang) + best_pt[1]),
        (-hw * math.cos(ang) - hl * math.sin(ang) + best_pt[0], -hw * math.sin(ang) + hl * math.cos(ang) + best_pt[1]),
    ]
    min_corner_dist = min(min_road_dist(cx, cz) for cx, cz in corners)
    print(f"Angle {angle_deg:3d}°: Min corner road clearance = {min_corner_dist:.2f}m")

