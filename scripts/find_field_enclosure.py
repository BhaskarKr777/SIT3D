import json

with open('public/data/sit_campus_processed.json') as f:
    d = json.load(f)

# Find all road points around X in [-110, 10], Z in [-110, 0]
print("All roads in the region:")
for r in d['roads']:
    pts = r['points']
    in_box = [p for p in pts if -110 <= p[0] <= 10 and -110 <= p[1] <= 10]
    if len(in_box) >= 2:
        print(f"Road ID {r['id']} ({len(in_box)} of {len(pts)} pts):")
        print(f"  First: {pts[0]}, Last: {pts[-1]}")
        for p in in_box:
            print(f"    [{p[0]:6.2f}, {p[1]:6.2f}]")

