import json
import math

with open("data/sit_osm_direct.json", "r", encoding="utf-8") as f:
    data = json.load(f)

nodes = {}
for el in data["elements"]:
    if el["type"] == "node":
        nodes[el["id"]] = (el["lat"], el["lon"])

ways = [el for el in data["elements"] if el["type"] == "way"]

# Find SIT campus boundary (Way 352464014)
sit_boundary_way = None
for w in ways:
    if w.get("tags", {}).get("name") == "Siliguri Institute of Technology" or w["id"] == 352464014:
        sit_boundary_way = w
        break

print("SIT Boundary Way:", sit_boundary_way["id"] if sit_boundary_way else "Not found")

def point_in_polygon(x, y, poly):
    n = len(poly)
    inside = False
    p1x, p1y = poly[0]
    for i in range(n + 1):
        p2x, p2y = poly[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside

poly_coords = []
if sit_boundary_way:
    poly_coords = [(nodes[nid][1], nodes[nid][0]) for nid in sit_boundary_way["nodes"] if nid in nodes]
    lons = [p[0] for p in poly_coords]
    lats = [p[1] for p in poly_coords]
    min_lon, max_lon = min(lons), max(lons)
    min_lat, max_lat = min(lats), max(lats)
    print(f"SIT boundary polygon vertices: {len(poly_coords)}")
    print(f"Bounds: Lon [{min_lon:.6f}, {max_lon:.6f}], Lat [{min_lat:.6f}, {max_lat:.6f}]")

inside_features = []
nearby_features = []

for w in ways:
    tags = w.get("tags", {})
    way_nodes = [nodes[nid] for nid in w.get("nodes", []) if nid in nodes]
    if not way_nodes:
        continue
    
    avg_lat = sum(p[0] for p in way_nodes) / len(way_nodes)
    avg_lon = sum(p[1] for p in way_nodes) / len(way_nodes)
    
    is_inside = point_in_polygon(avg_lon, avg_lat, poly_coords) if poly_coords else False
    
    # Check if roughly in bounding box with small buffer
    in_bbox = (min_lon - 0.0008 <= avg_lon <= max_lon + 0.0008) and (min_lat - 0.0008 <= avg_lat <= max_lat + 0.0008)
    
    info = {
        "id": w["id"],
        "tags": tags,
        "is_inside": is_inside,
        "in_bbox": in_bbox,
        "center": [avg_lat, avg_lon],
        "node_ids": w.get("nodes", []),
        "node_count": len(way_nodes)
    }
    
    if is_inside or in_bbox:
        inside_features.append(info)

print(f"\nTotal features in campus bbox or inside boundary: {len(inside_features)}")
buildings = []
highways = []
amenities = []
for feat in inside_features:
    tags = feat["tags"]
    if "building" in tags:
        buildings.append(feat)
    if "highway" in tags:
        highways.append(feat)
    if "amenity" in tags or "leisure" in tags:
        amenities.append(feat)

print(f"Buildings found: {len(buildings)}")
for b in buildings:
    print(f"  Building ID {b['id']}: inside={b['is_inside']}, tags={b['tags']}, center={b['center']}")

print(f"\nHighways/Paths found: {len(highways)}")
for h in highways:
    print(f"  Highway ID {h['id']}: inside={h['is_inside']}, tags={h['tags']}")

print(f"\nAmenities/Leisure found: {len(amenities)}")
for a in amenities:
    print(f"  Amenity ID {a['id']}: inside={a['is_inside']}, tags={a['tags']}")

