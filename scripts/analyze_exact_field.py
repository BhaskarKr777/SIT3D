import json
import math

with open('public/data/sit_campus_processed.json') as f:
    d = json.load(f)

# Old court:
# center: [-45.23, -59.79]
# polygon:
#   [-56.06, -49.65] (top-left)
#   [-59.98, -68.58] (bottom-left)
#   [-28.98, -75.02] (bottom-right)
#   [-25.06, -56.07] (top-right)

# Let's inspect the roads:
# Road 1469221645:
#   [-8.80, -60.61]
#   [-15.85, -56.13]
#   [-23.32, -52.35]
#   [-30.07, -49.69]
#   [-37.01, -47.62]
#   [-44.11, -46.15]
#   [-51.31, -45.28]
#   [-63.56, -44.19]
#   [-69.70, -44.02]
#
# Road 1469221646:
#   [-8.80, -60.61]
#   [-14.52, -69.29]
#   [-37.72, -90.74]
#   [-68.37, -89.01]

# Notice:
# At X = -45:
# North road (1469221645): Z is around -46.0
# South road (1469221646): Z is around -90.0
# Height along Z is from -46.0 to -90.0 -> Span of 44 meters!
#
# Along X:
# At Z = -68:
# East road (1469221646): X is around -14.0
# West road (1469221645): X is around -75.0
# Width along X is from -14.0 to -75.0 -> Span of 61 meters!

print("Field extent at center:")
print("  Z span (North-South): ~44m (from Z = -46 to Z = -90)")
print("  X span (East-West):   ~60m (from X = -15 to X = -75)")

