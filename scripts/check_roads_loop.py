import json

with open('public/data/sit_campus_processed.json') as f:
    d = json.load(f)

for r in d['roads']:
    for p in r['points']:
        if -90 <= p[0] <= -20 and -90 <= p[1] <= -40:
            print(f"Road {r['id']} ({r.get('name', 'unnamed')}) passes through: [{p[0]:.1f}, {p[1]:.1f}]")

