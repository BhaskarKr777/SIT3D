import json

with open('public/data/sit_campus_processed.json') as f:
    d = json.load(f)

print('=== Surrounding Buildings in Area (X: -120 to 20, Z: -120 to 10) ===')
for b in d['buildings']:
    cx, cz = b['center']
    if -130 <= cx <= 30 and -130 <= cz <= 20:
        print(f"Building: {b['id']:<24} center=[{cx:6.1f}, {cz:6.1f}]")

print('\n=== Surrounding Roads ===')
for r in d['roads']:
    pts_in = [p for p in r['points'] if -110 <= p[0] <= 15 and -120 <= p[1] <= 15]
    if len(pts_in) >= 2:
        print(f"Road {r['id']} ({r.get('name', 'unnamed')}):")
        for pt in pts_in:
            print(f"   [{pt[0]:6.1f}, {pt[1]:6.1f}]")

print('\n=== Current Basketball Court Amenity ===')
for a in d['amenities']:
    if 'Basketball' in a['name']:
        print(f"Name: {a['name']}, Center: {a['center']}")
        print(f"Polygon: {a['polygon']}")

print('\n=== Trees in the vicinity ===')
trees_in_area = [t for t in d['trees'] if -80 <= t['position'][0] <= -10 and -90 <= t['position'][2] <= -30]
print(f"Total trees in area: {len(trees_in_area)}")
for t in trees_in_area:
    print(f"   pos: [{t['position'][0]:6.1f}, {t['position'][2]:6.1f}]")

