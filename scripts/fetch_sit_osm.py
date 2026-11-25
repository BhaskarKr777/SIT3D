import urllib.request
import json
import os

os.makedirs("data", exist_ok=True)

# Fetch map data directly from OpenStreetMap API for the SIT campus bounding box:
# Bbox: min_lon, min_lat, max_lon, max_lat
bbox = "88.3730,26.7660,88.3800,26.7720"
url = f"https://api.openstreetmap.org/api/0.6/map.json?bbox={bbox}"
headers = {'User-Agent': 'SIT3D-CampusMap/1.0 (contact: sit3d@example.edu)'}

print(f"Requesting OSM data from {url}...")
req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req, timeout=20) as res:
        data = json.loads(res.read().decode('utf-8'))
        elements = data.get("elements", [])
        print(f"Downloaded {len(elements)} elements.")
        with open("data/sit_osm_direct.json", "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

        # Inspect elements
        nodes = {}
        ways = []
        relations = []
        for el in elements:
            if el["type"] == "node":
                nodes[el["id"]] = (el["lat"], el["lon"])
            elif el["type"] == "way":
                ways.append(el)
            elif el["type"] == "relation":
                relations.append(el)

        print(f"Summary: {len(nodes)} nodes, {len(ways)} ways, {len(relations)} relations.")
        print("\nWays with tags:")
        for w in ways:
            tags = w.get("tags", {})
            if tags:
                print(f"ID {w['id']}: tags = {tags}")
except Exception as e:
    print("Error:", e)
