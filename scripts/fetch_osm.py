import urllib.request
import urllib.parse
import json
import os
import time

os.makedirs("data", exist_ok=True)

headers = {'User-Agent': 'SIT3D-CampusMap/1.0 (contact: student@sittechno.org)'}

def search_nominatim():
    url = "https://nominatim.openstreetmap.org/search?q=Siliguri+Institute+of+Technology&format=json&addressdetails=1"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            data = json.loads(res.read().decode('utf-8'))
            print("Nominatim results:", json.dumps(data, indent=2))
            return data
    except Exception as e:
        print("Nominatim error:", e)
        return []

def query_overpass(bbox):
    # bbox: (min_lat, min_lon, max_lat, max_lon)
    query = f"""
[out:json][timeout:35];
(
  node({bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]});
  way({bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]});
  relation({bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]});
);
out body;
>;
out skel qt;
"""
    endpoints = [
        "https://overpass.kumi.systems/api/interpreter",
        "https://overpass.private.coffee/api/interpreter",
        "https://overpass-api.de/api/interpreter"
    ]
    for ep in endpoints:
        print(f"Trying endpoint {ep}...")
        try:
            req = urllib.request.Request(ep, data=urllib.parse.urlencode({'data': query}).encode('utf-8'), headers=headers)
            with urllib.request.urlopen(req, timeout=25) as res:
                data = json.loads(res.read().decode('utf-8'))
                print(f"Success! Elements found: {len(data.get('elements', []))}")
                with open("data/sit_campus_osm.json", "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2)
                return data
        except Exception as e:
            print(f"Failed {ep}: {e}")
            time.sleep(1)
    return None

nom = search_nominatim()
if nom:
    lat = float(nom[0]['lat'])
    lon = float(nom[0]['lon'])
    bb = nom[0]['boundingbox'] # [min_lat, max_lat, min_lon, max_lon]
    min_lat = float(bb[0]) - 0.003
    max_lat = float(bb[1]) + 0.003
    min_lon = float(bb[2]) - 0.003
    max_lon = float(bb[3]) + 0.003
else:
    # Sukna campus coords
    lat, lon = 26.76929, 88.37620
    min_lat, max_lat = lat - 0.005, lat + 0.005
    min_lon, max_lon = lon - 0.005, lon + 0.005

print(f"Bounding box: {min_lat}, {min_lon}, {max_lat}, {max_lon}")
osm_data = query_overpass((min_lat, min_lon, max_lat, max_lon))

