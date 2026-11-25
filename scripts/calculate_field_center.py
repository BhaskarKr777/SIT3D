import json
import math

with open('public/data/sit_campus_processed.json') as f:
    d = json.load(f)

# Surrounding roads:
# 1. Road 1469221645:
#    [-8.8, -60.6] -> [-23.3, -52.4] -> [-37.0, -47.6] -> [-51.3, -45.3] -> [-63.6, -44.2] -> [-75.8, -43.6]
# 2. Road 1469221643:
#    [-51.3, -45.3] -> [-32.65, 21.35]
# 3. Road 1469221646:
#    [-8.8, -60.6] -> [-14.5, -69.3] -> [-37.7, -90.7] -> [-68.4, -89.0]
# 4. Management road to the west:
#    Road 1469221645 past [-63.6, -44.2] to [-104.3, -37.8]

# Let's inspect the open space between:
# North Road: Z around -44 to -48
# South Road: Z around -85 to -92
# East Road: X around -8 to -15
# West Road: X around -70 to -80

print("Bounding box of surrounding road centerlines:")
print("  X min ~ -72 (west bend of road 1469221646)")
print("  X max ~ -12 (east road 1469221646 near main complex)")
print("  Z min ~ -88 (south road 1469221646)")
print("  Z max ~ -44 (north road 1469221645)")

field_width_x = abs(-12 - (-72))
field_depth_z = abs(-44 - (-88))
center_x = (-72 + -12) / 2.0
center_z = (-88 + -44) / 2.0

print(f"Total field span: {field_width_x:.1f}m (X) x {field_depth_z:.1f}m (Z)")
print(f"Geometric Center: [{center_x:.2f}, {center_z:.2f}]")

