import json

with open('public/data/sit_campus_processed.json', 'r') as f:
    d = json.load(f)

print(f"Total buildings: {len(d['buildings'])}")
for i, b in enumerate(d['buildings']):
    xs = [p[0] for p in b['polygon']]
    zs = [p[1] for p in b['polygon']]
    w = max(xs) - min(xs)
    l = max(zs) - min(zs)
    print(f"{i+1:2d}. [{b['id']:<24}] {b['name']}")
    print(f"    Center: [{b['center'][0]:6.2f}, {b['center'][1]:6.2f}], Size: {w:5.1f}m x {l:5.1f}m, H: {b['height']:4.1f}m, L: {b['levels']}, Elev: {b.get('elevation', 0)}")
