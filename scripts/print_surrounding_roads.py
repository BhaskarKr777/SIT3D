import json

with open('public/data/sit_campus_processed.json') as f:
    d = json.load(f)

for r in d['roads']:
    if r['id'] in [1469221642, 1469221643, 1469221644, 1469221645, 1469221646]:
        print(f"=== Road {r['id']} ({len(r['points'])} pts) ===")
        for p in r['points']:
            print(f"  [{p[0]:6.2f}, {p[1]:6.2f}]")

