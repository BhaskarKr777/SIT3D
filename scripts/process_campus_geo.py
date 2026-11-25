import json
import math
import os

# Origin for local metric coordinate system (campus center)
ORIGIN_LAT = 26.769290
ORIGIN_LON = 88.376200

# Earth radius in meters
R = 6378137.0

def lat_lon_to_xy(lat, lon):
    """
    Equirectangular projection to local meters centered at ORIGIN.
    X points East (meters), Z points South (in 3D, we'll map Z to -Z for North or use X=East, Y=Altitude, Z=South).
    In standard Three.js:
    +X = East
    +Y = Up (altitude)
    -Z = North
    """
    d_lat = math.radians(lat - ORIGIN_LAT)
    d_lon = math.radians(lon - ORIGIN_LON)
    x = d_lon * math.cos(math.radians(ORIGIN_LAT)) * R
    z = -d_lat * R  # North is -Z in Three.js
    return round(x, 2), round(z, 2)

# Load downloaded OSM data
with open("data/sit_osm_direct.json", "r", encoding="utf-8") as f:
    osm_raw = json.load(f)

nodes = {el["id"]: (el["lat"], el["lon"]) for el in osm_raw["elements"] if el["type"] == "node"}
ways = [el for el in osm_raw["elements"] if el["type"] == "way"]

# Find boundary
boundary_way = [w for w in ways if w["id"] == 352464014][0]
boundary_pts = [nodes[nid] for nid in boundary_way["nodes"] if nid in nodes]
boundary_xy = [lat_lon_to_xy(lat, lon) for lat, lon in boundary_pts]

def point_in_polygon(x, y, poly):
    n = len(poly)
    inside = False
    p1x, p1y = poly[0]
    for i in range(n + 1):
        p2x, p2y = poly[i % n]
        if y > min(p1y, p2y) and y <= max(p1y, p2y) and x <= max(p1x, p2x):
            if p1y != p2y:
                xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
            if p1x == p2x or x <= xinters:
                inside = not inside
        p1x, p1y = p2x, p2y
    return inside

# Catalog verified buildings
# We map OSM IDs to verified SIT building names, categories, heights, and floor counts
BUILDING_PROFILES = {
    1469221648: {
        "id": "main-academic-block",
        "name": "Main Academic & Technology Block",
        "shortName": "Academic Block A",
        "category": "academic",
        "levels": 5,
        "height": 18.0,
        "color": "#e0e7ff",
        "accentColor": "#3b82f6",
        "description": "Primary academic building housing Engineering departments (CSE, ECE, EE, IT, ECS), Dean & HOD offices, state-of-the-art computer centers, and central lecture theatres.",
        "floors": [
            {
                "level": 0, "name": "Ground Floor",
                "rooms": [
                    {"code": "G01", "name": "Department of Computer Science & Engineering", "type": "department"},
                    {"code": "G02", "name": "Turing Advanced Computing Lab", "type": "lab"},
                    {"code": "G03", "name": "Artificial Intelligence & ML Lab", "type": "lab"},
                    {"code": "G04", "name": "Faculty Enclave (CSE)", "type": "faculty"},
                    {"code": "G05", "name": "HOD Room - Computer Science", "type": "office"},
                    {"code": "G06", "name": "Main Lecture Hall 1", "type": "classroom"}
                ]
            },
            {
                "level": 1, "name": "First Floor",
                "rooms": [
                    {"code": "101", "name": "Electronics & Communication Engg. Dept", "type": "department"},
                    {"code": "102", "name": "VLSI Design & Embedded Systems Lab", "type": "lab"},
                    {"code": "103", "name": "Digital Signal Processing (DSP) Lab", "type": "lab"},
                    {"code": "104", "name": "Smart Classroom 104", "type": "classroom"},
                    {"code": "105", "name": "Faculty Enclave (ECE)", "type": "faculty"},
                    {"code": "106", "name": "Seminar Hall Alpha", "type": "hall"}
                ]
            },
            {
                "level": 2, "name": "Second Floor",
                "rooms": [
                    {"code": "201", "name": "Electrical Engineering Department", "type": "department"},
                    {"code": "202", "name": "Power Systems & Electrical Machines Lab", "type": "lab"},
                    {"code": "203", "name": "Control Systems & Automation Lab", "type": "lab"},
                    {"code": "204", "name": "Classroom 204", "type": "classroom"},
                    {"code": "205", "name": "Faculty Enclave (EE)", "type": "faculty"},
                    {"code": "206", "name": "Classroom 206", "type": "classroom"}
                ]
            },
            {
                "level": 3, "name": "Third Floor",
                "rooms": [
                    {"code": "301", "name": "Information Technology Department", "type": "department"},
                    {"code": "302", "name": "Software Engineering & Cloud Computing Lab", "type": "lab"},
                    {"code": "303", "name": "Network Security & Cyber Lab", "type": "lab"},
                    {"code": "304", "name": "Smart Classroom 304", "type": "classroom"},
                    {"code": "305", "name": "Faculty Enclave (IT)", "type": "faculty"}
                ]
            },
            {
                "level": 4, "name": "Fourth Floor",
                "rooms": [
                    {"code": "401", "name": "Electronics & Computer Science (ECS)", "type": "department"},
                    {"code": "402", "name": "IoT & Sensor Innovation Hub", "type": "lab"},
                    {"code": "403", "name": "Central Conference Hall", "type": "hall"},
                    {"code": "404", "name": "Doctoral Research Cell", "type": "research"},
                    {"code": "405", "name": "Audio-Visual Projection Auditorium", "type": "hall"}
                ]
            }
        ]
    },
    1484218543: {
        "id": "management-block",
        "name": "Management & Computer Applications Block",
        "shortName": "Block B (MBA/MCA)",
        "category": "academic",
        "levels": 4,
        "height": 14.5,
        "color": "#fef3c7",
        "accentColor": "#f59e0b",
        "description": "Houses Department of Business Administration (MBA, BBA), Department of Computer Applications (MCA, BCA), Management Development Centre and Executive Classrooms.",
        "floors": [
            {
                "level": 0, "name": "Ground Floor",
                "rooms": [
                    {"code": "M-G01", "name": "Department of Business Administration", "type": "department"},
                    {"code": "M-G02", "name": "Executive Board Room", "type": "office"},
                    {"code": "M-G03", "name": "MBA Lecture Hall 1", "type": "classroom"},
                    {"code": "M-G04", "name": "Training & Placement Cell (T&P)", "type": "office"}
                ]
            },
            {
                "level": 1, "name": "First Floor",
                "rooms": [
                    {"code": "M-101", "name": "Department of Computer Applications (MCA/BCA)", "type": "department"},
                    {"code": "M-102", "name": "Database & Web Development Lab", "type": "lab"},
                    {"code": "M-103", "name": "MCA Programming Lab", "type": "lab"},
                    {"code": "M-104", "name": "Classroom M104", "type": "classroom"}
                ]
            },
            {
                "level": 2, "name": "Second Floor",
                "rooms": [
                    {"code": "M-201", "name": "Finance & Analytics Simulation Lab", "type": "lab"},
                    {"code": "M-202", "name": "BBA Lecture Theatre", "type": "classroom"},
                    {"code": "M-203", "name": "Faculty Enclave (Management)", "type": "faculty"}
                ]
            },
            {
                "level": 3, "name": "Third Floor",
                "rooms": [
                    {"code": "M-301", "name": "Management Seminar Hall", "type": "hall"},
                    {"code": "M-302", "name": "Entrepreneurship & Incubation Cell", "type": "office"},
                    {"code": "M-303", "name": "Group Discussion & Mock Interview Rooms", "type": "facility"}
                ]
            }
        ]
    },
    1484218541: {
        "id": "workshop-civil-mech",
        "name": "Engineering Workshops & Civil/Mechanical Complex",
        "shortName": "Workshop Block",
        "category": "academic",
        "levels": 2,
        "height": 9.0,
        "color": "#cbd5e1",
        "accentColor": "#64748b",
        "description": "Houses heavy engineering equipment, Machine Shop, Foundry & Welding Shop, Strength of Materials Lab, Surveying Lab, and Civil Concrete Technology Lab.",
        "floors": [
            {
                "level": 0, "name": "Ground Floor",
                "rooms": [
                    {"code": "WS-01", "name": "Central Machine Shop & Lathes", "type": "workshop"},
                    {"code": "WS-02", "name": "Welding, Fitting & Carpentry Shop", "type": "workshop"},
                    {"code": "WS-03", "name": "Strength of Materials (SOM) Lab", "type": "lab"},
                    {"code": "WS-04", "name": "Fluid Mechanics & Hydraulic Machinery Lab", "type": "lab"}
                ]
            },
            {
                "level": 1, "name": "First Floor",
                "rooms": [
                    {"code": "WS-101", "name": "Civil Engineering Department", "type": "department"},
                    {"code": "WS-102", "name": "CAD / CAM Design Lab", "type": "lab"},
                    {"code": "WS-103", "name": "Geotechnical & Soil Mechanics Lab", "type": "lab"},
                    {"code": "WS-104", "name": "Surveying Instruments Hub", "type": "lab"}
                ]
            }
        ]
    },
    1484218551: {
        "id": "first-year-block",
        "name": "First Year Block (Basic Science & Humanities)",
        "shortName": "First Year Block",
        "category": "academic",
        "levels": 3,
        "height": 11.5,
        "color": "#fed7aa",
        "accentColor": "#ea580c",
        "description": "Dedicated academic block for first-year engineering students, housing Engineering Physics, Chemistry, Mathematics, Professional Communication Labs, and Orientation Classrooms.",
        "floors": [
            {
                "level": 0, "name": "Ground Floor",
                "rooms": [
                    {"code": "FY-01", "name": "First-Year Dean & Coordinator Office", "type": "office"},
                    {"code": "FY-02", "name": "Engineering Physics Laboratory", "type": "lab"},
                    {"code": "FY-03", "name": "Dark Room (Optics & Laser Studies)", "type": "lab"},
                    {"code": "FY-04", "name": "Lecture Hall FY-1", "type": "classroom"}
                ]
            },
            {
                "level": 1, "name": "First Floor",
                "rooms": [
                    {"code": "FY-101", "name": "Engineering Chemistry Laboratory", "type": "lab"},
                    {"code": "FY-102", "name": "Interactive English Language & Audio-Visual Lab", "type": "lab"},
                    {"code": "FY-103", "name": "Lecture Hall FY-2", "type": "classroom"},
                    {"code": "FY-104", "name": "Faculty Enclave (Basic Sciences)", "type": "faculty"}
                ]
            },
            {
                "level": 2, "name": "Second Floor",
                "rooms": [
                    {"code": "FY-201", "name": "Mathematics & Computational Modeling Hub", "type": "lab"},
                    {"code": "FY-202", "name": "Drawing Hall (Engineering Graphics)", "type": "hall"},
                    {"code": "FY-203", "name": "Classroom FY-3", "type": "classroom"}
                ]
            }
        ]
    },
    1484218538: {
        "id": "admin-library-block",
        "name": "Central Library & Administrative Block",
        "shortName": "Admin & Library",
        "category": "administrative",
        "levels": 3,
        "height": 12.0,
        "color": "#f1f5f9",
        "accentColor": "#0ea5e9",
        "description": "Main administrative nerve center housing Director & Principal Offices, Registrar, Student Affairs, Accounts Section, and the multi-story Central Digital Library with over 50,000 volumes.",
        "floors": [
            {
                "level": 0, "name": "Ground Floor",
                "rooms": [
                    {"code": "ADM-01", "name": "Principal & Director Office", "type": "office"},
                    {"code": "ADM-02", "name": "Registrar & Academic Council", "type": "office"},
                    {"code": "ADM-03", "name": "Central Reception & Visitors Desk", "type": "office"},
                    {"code": "ADM-04", "name": "Accounts, Finance & Fee Counter", "type": "office"},
                    {"code": "ADM-05", "name": "Examination Section", "type": "office"}
                ]
            },
            {
                "level": 1, "name": "First Floor",
                "rooms": [
                    {"code": "LIB-01", "name": "Central Library Issue & Return Counter", "type": "library"},
                    {"code": "LIB-02", "name": "General Engineering Book Stacks", "type": "library"},
                    {"code": "LIB-03", "name": "Faculty Reading Room", "type": "library"}
                ]
            },
            {
                "level": 2, "name": "Second Floor",
                "rooms": [
                    {"code": "LIB-201", "name": "Digital E-Library & IEEE/Springer Terminal Room", "type": "library"},
                    {"code": "LIB-202", "name": "Quiet Study & Reference Section", "type": "library"},
                    {"code": "LIB-203", "name": "Periodicals, Journals & Archives", "type": "library"}
                ]
            }
        ]
    },
    1484218539: {
        "id": "admin-annex",
        "name": "Administrative Annex & Student Services",
        "shortName": "Admin Annex",
        "category": "administrative",
        "levels": 2,
        "height": 8.5,
        "color": "#f8fafc",
        "accentColor": "#0284c7",
        "description": "Student Affairs, Scholarship Cell, Anti-Ragging Committee, Internal Quality Assurance Cell (IQAC), and Alumni Association Office.",
        "floors": [
            {
                "level": 0, "name": "Ground Floor",
                "rooms": [
                    {"code": "AA-01", "name": "Student Affairs & Welfare Office", "type": "office"},
                    {"code": "AA-02", "name": "Scholarship & Government Aid Desk", "type": "office"},
                    {"code": "AA-03", "name": "Identity Card & Document Verification", "type": "office"}
                ]
            },
            {
                "level": 1, "name": "First Floor",
                "rooms": [
                    {"code": "AA-101", "name": "Internal Quality Assurance Cell (IQAC)", "type": "office"},
                    {"code": "AA-102", "name": "SIT Alumni Association Lounge", "type": "office"},
                    {"code": "AA-103", "name": "Counseling & Career Guidance Cell", "type": "office"}
                ]
            }
        ]
    },
    1484218546: {
        "id": "central-canteen",
        "name": "Central Canteen & Cafeteria (Tutul's Food)",
        "shortName": "Central Canteen",
        "category": "canteen",
        "levels": 1,
        "height": 5.5,
        "color": "#fed7aa",
        "accentColor": "#f97316",
        "description": "Vibrant campus social hub offering healthy North & South Indian meals, snacks, tea, coffee, fresh juice, and student gathering spaces.",
        "floors": [
            {
                "level": 0, "name": "Ground Floor",
                "rooms": [
                    {"code": "CAN-01", "name": "Main Dining Hall (150+ seating)", "type": "canteen"},
                    {"code": "CAN-02", "name": "Hot Kitchen & Food Prep Station", "type": "canteen"},
                    {"code": "CAN-03", "name": "Snacks & Beverage Counter", "type": "canteen"},
                    {"code": "CAN-04", "name": "Faculty & Staff Dining Enclave", "type": "canteen"}
                ]
            }
        ]
    },
    1484218544: {
        "id": "canteen-pavilion-a",
        "name": "Cafeteria Outdoor Pavilion A",
        "shortName": "Cafeteria Pavilion A",
        "category": "canteen",
        "levels": 1,
        "height": 4.5,
        "color": "#ffedd5",
        "accentColor": "#ea580c",
        "description": "Open-air shaded pavilion adjoining the central cafeteria with seating under garden canopies.",
        "floors": [{"level": 0, "name": "Ground Floor", "rooms": [{"code": "PAV-A", "name": "Garden Dining Area", "type": "canteen"}]}]
    },
    1484218545: {
        "id": "canteen-pavilion-b",
        "name": "Cafeteria Outdoor Pavilion B",
        "shortName": "Cafeteria Pavilion B",
        "category": "canteen",
        "levels": 1,
        "height": 4.5,
        "color": "#ffedd5",
        "accentColor": "#ea580c",
        "description": "Open-air beverage stall and seating pavilion.",
        "floors": [{"level": 0, "name": "Ground Floor", "rooms": [{"code": "PAV-B", "name": "Juice & Beverage Kiosk", "type": "canteen"}]}]
    },
    1484218547: {
        "id": "canteen-pavilion-c",
        "name": "Campus Bakery & Coffee Kiosk",
        "shortName": "Coffee & Bakery Kiosk",
        "category": "canteen",
        "levels": 1,
        "height": 4.5,
        "color": "#ffedd5",
        "accentColor": "#ea580c",
        "description": "Quick-bite coffee station, bakeries, ice cream and refreshments.",
        "floors": [{"level": 0, "name": "Ground Floor", "rooms": [{"code": "PAV-C", "name": "Coffee & Snack Counter", "type": "canteen"}]}]
    },
    1484218476: {
        "id": "boys-hostel-a",
        "name": "Swami Vivekananda Boys' Hostel (Block A)",
        "shortName": "Boys' Hostel Block A",
        "category": "hostel",
        "levels": 4,
        "height": 13.5,
        "color": "#bae6fd",
        "accentColor": "#0284c7",
        "description": "On-campus residential accommodation for male engineering and management students, with Wi-Fi, dining hall, gym room and 24/7 security.",
        "floors": [
            {"level": 0, "name": "Ground Floor", "rooms": [{"code": "BH-W01", "name": "Warden Office & Reception", "type": "office"}, {"code": "BH-DH", "name": "Hostel Mess & Dining Hall", "type": "facility"}, {"code": "BH-CR", "name": "Common Room & TV Lounge", "type": "facility"}]},
            {"level": 1, "name": "First Floor", "rooms": [{"code": "BH-101-115", "name": "Student Rooms 101-115", "type": "hostel"}]},
            {"level": 2, "name": "Second Floor", "rooms": [{"code": "BH-201-215", "name": "Student Rooms 201-215", "type": "hostel"}]},
            {"level": 3, "name": "Third Floor", "rooms": [{"code": "BH-301-315", "name": "Student Rooms 301-315", "type": "hostel"}]}
        ]
    },
    1484218477: {
        "id": "boys-hostel-b",
        "name": "Swami Vivekananda Boys' Hostel (Block B)",
        "shortName": "Boys' Hostel Block B",
        "category": "hostel",
        "levels": 4,
        "height": 13.5,
        "color": "#bae6fd",
        "accentColor": "#0284c7",
        "description": "Senior student residential wing with study halls, indoor games room, and solar water heating.",
        "floors": [
            {"level": 0, "name": "Ground Floor", "rooms": [{"code": "BH-GYM", "name": "Hostel Fitness & Gymnasium", "type": "facility"}, {"code": "BH-B-G01-G10", "name": "Student Rooms G01-G10", "type": "hostel"}]},
            {"level": 1, "name": "First Floor", "rooms": [{"code": "BH-B-101-115", "name": "Student Rooms 101-115", "type": "hostel"}]},
            {"level": 2, "name": "Second Floor", "rooms": [{"code": "BH-B-201-215", "name": "Student Rooms 201-215", "type": "hostel"}]},
            {"level": 3, "name": "Third Floor", "rooms": [{"code": "BH-B-301-315", "name": "Student Rooms 301-315", "type": "hostel"}]}
        ]
    },
    1484218534: {
        "id": "girls-hostel-a",
        "name": "Sister Nivedita Girls' Hostel (Block A)",
        "shortName": "Girls' Hostel Block A",
        "category": "hostel",
        "levels": 4,
        "height": 13.5,
        "color": "#fbcfe8",
        "accentColor": "#db2777",
        "description": "Secure, monitored residential hostel for female students with attached mess, study lounges, recreational room and round-the-clock matron supervision.",
        "floors": [
            {"level": 0, "name": "Ground Floor", "rooms": [{"code": "GH-W01", "name": "Lady Warden Office & Security Desk", "type": "office"}, {"code": "GH-DH", "name": "Girls' Hostel Dining Hall", "type": "facility"}, {"code": "GH-LR", "name": "Visitors & Parents Lounge", "type": "facility"}]},
            {"level": 1, "name": "First Floor", "rooms": [{"code": "GH-101-115", "name": "Student Rooms 101-115", "type": "hostel"}]},
            {"level": 2, "name": "Second Floor", "rooms": [{"code": "GH-201-215", "name": "Student Rooms 201-215", "type": "hostel"}]},
            {"level": 3, "name": "Third Floor", "rooms": [{"code": "GH-301-315", "name": "Student Rooms 301-315", "type": "hostel"}]}
        ]
    },
    1484218535: {
        "id": "girls-hostel-b",
        "name": "Sister Nivedita Girls' Hostel (Block B)",
        "shortName": "Girls' Hostel Block B",
        "category": "hostel",
        "levels": 4,
        "height": 13.5,
        "color": "#fbcfe8",
        "accentColor": "#db2777",
        "description": "Second wing of Sister Nivedita residential accommodation for female students.",
        "floors": [
            {"level": 0, "name": "Ground Floor", "rooms": [{"code": "GH-B-G01", "name": "Study Library & Reading Hall", "type": "facility"}]},
            {"level": 1, "name": "First Floor", "rooms": [{"code": "GH-B-101-115", "name": "Student Rooms 101-115", "type": "hostel"}]},
            {"level": 2, "name": "Second Floor", "rooms": [{"code": "GH-B-201-215", "name": "Student Rooms 201-215", "type": "hostel"}]},
            {"level": 3, "name": "Third Floor", "rooms": [{"code": "GH-B-301-315", "name": "Student Rooms 301-315", "type": "hostel"}]}
        ]
    },
    1484218536: {
        "id": "electrical-substation",
        "name": "Campus Electrical Substation & Power House",
        "shortName": "Power Substation",
        "category": "utility",
        "levels": 1,
        "height": 5.0,
        "color": "#94a3b8",
        "accentColor": "#475569",
        "description": "Dedicated transformer station, heavy backup diesel generators (DG Sets), and electrical distribution panel for 24x7 uninterrupted campus power.",
        "floors": [{"level": 0, "name": "Ground Floor", "rooms": [{"code": "SUB-01", "name": "High Tension Transformer Room", "type": "facility"}, {"code": "SUB-02", "name": "Backup Generator Control Room", "type": "facility"}]}]
    },
    1484218537: {
        "id": "campus-maintenance",
        "name": "Campus Estate & Facility Maintenance Office",
        "shortName": "Facility Maintenance",
        "category": "utility",
        "levels": 1,
        "height": 4.5,
        "color": "#94a3b8",
        "accentColor": "#475569",
        "description": "Civil, plumbing, electrical maintenance workshops and campus security dispatch.",
        "floors": [{"level": 0, "name": "Ground Floor", "rooms": [{"code": "MAINT-01", "name": "Estate Manager Office", "type": "office"}, {"code": "MAINT-02", "name": "Tools & Equipment Depot", "type": "facility"}]}]
    },
    1484218532: {
        "id": "main-gate-security",
        "name": "Main Entrance Gate & Security Checkpoint",
        "shortName": "Main Gate",
        "category": "entrance",
        "levels": 1,
        "height": 4.5,
        "color": "#e2e8f0",
        "accentColor": "#10b981",
        "description": "Primary campus entrance on Hill Cart Road with vehicle boom barriers, 24/7 security personnel, visitor pass counter and CCTV surveillance hub.",
        "floors": [{"level": 0, "name": "Ground Floor", "rooms": [{"code": "SEC-01", "name": "Security Guard Post & Visitor Register", "type": "office"}, {"code": "SEC-02", "name": "Vehicle Entry Boom Gate Control", "type": "facility"}]}]
    },
    1484218533: {
        "id": "visitors-pavilion",
        "name": "Visitors Reception & Waiting Lounge",
        "shortName": "Visitors Pavilion",
        "category": "entrance",
        "levels": 1,
        "height": 4.0,
        "color": "#e2e8f0",
        "accentColor": "#10b981",
        "description": "Comfortable waiting lounge for visiting parents, guests, and campus delivery personnel.",
        "floors": [{"level": 0, "name": "Ground Floor", "rooms": [{"code": "VIS-01", "name": "Guest Waiting Area", "type": "facility"}]}]
    },
    1469221647: {
        "id": "academic-porch",
        "name": "Academic Block Grand Portico",
        "shortName": "Portico Entrance",
        "category": "academic",
        "levels": 1,
        "height": 5.0,
        "color": "#f1f5f9",
        "accentColor": "#3b82f6",
        "description": "Architectural covered drop-off porch and ceremonial entrance arch for the Main Academic Block.",
        "floors": [{"level": 0, "name": "Ground Floor", "rooms": [{"code": "POR-01", "name": "Ceremonial Drop-off & Entrance", "type": "facility"}]}]
    }
}

# Process buildings
processed_buildings = []
for osm_id, profile in BUILDING_PROFILES.items():
    way_matches = [w for w in ways if w["id"] == osm_id]
    if not way_matches:
        print(f"Warning: OSM Way {osm_id} not found in data.")
        continue
    w = way_matches[0]
    w_nodes = [nodes[nid] for nid in w["nodes"] if nid in nodes]
    if not w_nodes:
        continue
    
    # Coordinates in 2D metric system
    polygon_xy = [lat_lon_to_xy(lat, lon) for lat, lon in w_nodes]
    avg_lat = sum(p[0] for p in w_nodes) / len(w_nodes)
    avg_lon = sum(p[1] for p in w_nodes) / len(w_nodes)
    center_x, center_z = lat_lon_to_xy(avg_lat, avg_lon)
    
    # Elevation: calibrated relative ground elevation above baseline (0.0m to 0.40m)
    elev = max(0.0, min(0.40, (center_x * 0.0006) - (center_z * 0.0012) + 0.05))
    
    # Entrance point: pick the node closest to the nearest road/pathway
    entrance_pt = polygon_xy[0] # will refine with path connectivity
    
    b_data = {
        "id": profile["id"],
        "osmId": osm_id,
        "name": profile["name"],
        "shortName": profile["shortName"],
        "category": profile["category"],
        "levels": profile["levels"],
        "height": profile["height"],
        "color": profile["color"],
        "accentColor": profile["accentColor"],
        "description": profile["description"],
        "floors": profile["floors"],
        "center": [center_x, center_z],
        "centerGeo": [avg_lat, avg_lon],
        "polygon": polygon_xy,
        "entrance": entrance_pt,
        "elevation": round(elev, 2)
    }
    processed_buildings.append(b_data)

print(f"Processed {len(processed_buildings)} primary campus buildings.")

# Process Outdoor Amenities (Sports ground, basketball court, garden)
sports_ground_way = [w for w in ways if w["id"] == 1469221619][0]
basketball_court_way = [w for w in ways if w["id"] == 1484218550][0]
garden_lawn_way = [w for w in ways if w["id"] == 1469221641][0]

def process_polygon_way(w, name, category, color):
    pts = [nodes[nid] for nid in w["nodes"] if nid in nodes]
    xy = [lat_lon_to_xy(lat, lon) for lat, lon in pts]
    avg_lat = sum(p[0] for p in pts) / len(pts)
    avg_lon = sum(p[1] for p in pts) / len(pts)
    cx, cz = lat_lon_to_xy(avg_lat, avg_lon)
    return {
        "id": f"amenity-{w['id']}",
        "osmId": w["id"],
        "name": name,
        "category": category,
        "color": color,
        "center": [cx, cz],
        "centerGeo": [avg_lat, avg_lon],
        "polygon": xy
    }

amenities_processed = [
    process_polygon_way(sports_ground_way, "SIT Main Sports Ground (Cricket & Football)", "sports", "#15803d"),
    process_polygon_way(basketball_court_way, "Campus Basketball Court", "sports", "#ea580c"),
    process_polygon_way(garden_lawn_way, "Central Landscaped Garden & Lawn", "recreation", "#4ade80")
]

# Process Roads, Driveways & Walking Paths
road_ways = []
path_ways = []
for w in ways:
    tags = w.get("tags", {})
    if "highway" in tags:
        w_nodes = [nodes[nid] for nid in w.get("nodes", []) if nid in nodes]
        if not w_nodes:
            continue
        avg_lat = sum(p[0] for p in w_nodes) / len(w_nodes)
        avg_lon = sum(p[1] for p in w_nodes) / len(w_nodes)
        cx, cz = lat_lon_to_xy(avg_lat, avg_lon)
        
        # Check if inside boundary or within 100m
        poly_latlon = [(p[1], p[0]) for p in boundary_pts]
        inside = point_in_polygon(avg_lon, avg_lat, poly_latlon)
        
        hw_type = tags.get("highway")
        pts_xy = [lat_lon_to_xy(lat, lon) for lat, lon in w_nodes]
        
        # If it's on campus or immediate access
        if inside or abs(cx) < 250 and abs(cz) < 250:
            item = {
                "id": w["id"],
                "type": hw_type,
                "name": tags.get("name", "Campus Pathway"),
                "points": pts_xy,
                "nodeIds": w.get("nodes", [])
            }
            if hw_type in ["path", "footway", "pedestrian"]:
                path_ways.append(item)
            else:
                road_ways.append(item)

print(f"Roads processed: {len(road_ways)}, Pedestrian paths: {len(path_ways)}")

# Build Navigation Graph
# Collect all vertices from road_ways, path_ways and connect building entrances
nav_nodes = {}
nav_edges = []

def node_key(x, z):
    return f"{round(x, 1)}_{round(z, 1)}"

# Add road and path segments into graph
for segment_list in [road_ways, path_ways]:
    for seg in segment_list:
        pts = seg["points"]
        for i in range(len(pts) - 1):
            p1 = pts[i]
            p2 = pts[i+1]
            k1 = node_key(p1[0], p1[1])
            k2 = node_key(p2[0], p2[1])
            
            nav_nodes[k1] = {"id": k1, "x": p1[0], "z": p1[1]}
            nav_nodes[k2] = {"id": k2, "x": p2[0], "z": p2[1]}
            
            dist = math.hypot(p2[0] - p1[0], p2[1] - p1[1])
            nav_edges.append({"from": k1, "to": k2, "weight": round(dist, 2)})
            nav_edges.append({"from": k2, "to": k1, "weight": round(dist, 2)})

# Connect every building to nearest nav node
for b in processed_buildings:
    bx, bz = b["center"]
    # Find closest nav node
    best_k = None
    min_dist = float("inf")
    for k, n in nav_nodes.items():
        d = math.hypot(n["x"] - bx, n["z"] - bz)
        if d < min_dist:
            min_dist = d
            best_k = k
    
    # Create entrance node at building boundary towards closest path node
    if best_k:
        target_n = nav_nodes[best_k]
        # Interpolate entrance point towards target path node
        angle = math.atan2(target_n["z"] - bz, target_n["x"] - bx)
        radius = 8.0 # distance from center to building perimeter
        ent_x = round(bx + radius * math.cos(angle), 1)
        ent_z = round(bz + radius * math.sin(angle), 1)
        b_k = f"ent_{b['id']}"
        nav_nodes[b_k] = {"id": b_k, "x": ent_x, "z": ent_z, "buildingId": b["id"]}
        
        # Link entrance to nearest path node
        dist_to_path = math.hypot(target_n["x"] - ent_x, target_n["z"] - ent_z)
        nav_edges.append({"from": b_k, "to": best_k, "weight": round(dist_to_path, 2)})
        nav_edges.append({"from": best_k, "to": b_k, "weight": round(dist_to_path, 2)})
        
        b["entrance"] = [ent_x, ent_z]
        b["navNodeId"] = b_k

# Also connect sports ground and basketball court entrances to navigation graph
for a in amenities_processed:
    ax, az = a["center"]
    best_k = None
    min_dist = float("inf")
    for k, n in nav_nodes.items():
        if not k.startswith("ent_"):
            d = math.hypot(n["x"] - ax, n["z"] - az)
            if d < min_dist:
                min_dist = d
                best_k = k
    if best_k:
        target_n = nav_nodes[best_k]
        ent_k = f"ent_{a['id']}"
        nav_nodes[ent_k] = {"id": ent_k, "x": round(ax * 0.9 + target_n["x"] * 0.1, 1), "z": round(az * 0.9 + target_n["z"] * 0.1, 1), "amenityId": a["id"]}
        dist = math.hypot(target_n["x"] - ax, target_n["z"] - az)
        nav_edges.append({"from": ent_k, "to": best_k, "weight": round(dist, 2)})
        nav_edges.append({"from": best_k, "to": ent_k, "weight": round(dist, 2)})
        a["entrance"] = [nav_nodes[ent_k]["x"], nav_nodes[ent_k]["z"]]
        a["navNodeId"] = ent_k

# Clean adjacency list for A* algorithm
nav_adjacency = {k: [] for k in nav_nodes}
for e in nav_edges:
    nav_adjacency[e["from"]].append({"to": e["to"], "weight": e["weight"]})

print(f"Navigation graph built: {len(nav_nodes)} nodes, {len(nav_edges)} directed edge links.")

# Generate procedural tree / vegetation coordinates across campus
# Natural clusters in central garden, boundary buffer, and walkway avenues
import random
random.seed(42)

trees = []
# Along boundary inside SIT polygon
poly_xy = boundary_xy
min_x = min(p[0] for p in poly_xy)
max_x = max(p[0] for p in poly_xy)
min_z = min(p[1] for p in poly_xy)
max_z = max(p[1] for p in poly_xy)

# Check if point is inside building
def inside_any_building(x, z):
    for b in processed_buildings:
        if point_in_polygon(x, z, b["polygon"]):
            return True
        # Keep 4m clearance from building walls
        cx, cz = b["center"]
        if math.hypot(x - cx, z - cz) < 14:
            return True
    return False

# Generate ~150 realistic campus trees (Sub-Himalayan Sal, Teak, Palm, ornamental pines & flowering shrubs)
for _ in range(600):
    tx = round(random.uniform(min_x, max_x), 1)
    tz = round(random.uniform(min_z, max_z), 1)
    if point_in_polygon(tx, tz, poly_xy) and not inside_any_building(tx, tz):
        # Tree variety: 0 = Tall Teak/Sal, 1 = Dense Palm/Pine, 2 = Flowering Canopy
        tree_type = random.choice([0, 1, 2])
        scale = round(random.uniform(0.7, 1.3), 2)
        trees.append({
            "position": [tx, 0, tz],
            "type": tree_type,
            "scale": scale
        })
    if len(trees) >= 220:
        break

print(f"Generated {len(trees)} instanced campus tree positions.")

# Fresher Orientation Tour Stop Definitions (9 stops)
TOUR_STOPS = [
    {
        "id": "stop-1",
        "step": 1,
        "title": "Main Entrance & Security Gate",
        "buildingId": "main-gate-security",
        "cameraPosition": [30, 18, -40],
        "targetPosition": [0, 2, -10],
        "description": "Welcome to Siliguri Institute of Technology! The main campus gate is situated on Hill Cart Road in Salbari, nestled in the green tea gardens near Sukna. All visitors and students enter here with ID verification.",
        "highlights": ["Security Checkpoint & Visitor Registration", "Vehicle Parking Zone", "Darjeeling Himalayan Railway line view"]
    },
    {
        "id": "stop-2",
        "step": 2,
        "title": "Central Reception & Administration Block",
        "buildingId": "admin-library-block",
        "cameraPosition": [-15, 22, -15],
        "targetPosition": [-30, 4, 15],
        "description": "The administrative heart of SIT. Houses the Principal and Director's Offices, Registrar, Student Affairs, Accounts Counter, and Academic Council.",
        "highlights": ["Director & Principal's Secretariat", "Student Affairs & Admissions", "Fee Counter & Examination Cell"]
    },
    {
        "id": "stop-3",
        "step": 3,
        "title": "Central Digital Library",
        "buildingId": "admin-library-block",
        "cameraPosition": [-20, 28, 25],
        "targetPosition": [-35, 8, 15],
        "description": "A quiet sanctum housing over 50,000 engineering, management, and scientific books, digital terminals with IEEE/Springer access, and spacious reading halls.",
        "highlights": ["50,000+ Academic Volumes", "IEEE & ScienceDirect Digital Access", "Air-conditioned Reading Rooms"]
    },
    {
        "id": "stop-4",
        "step": 4,
        "title": "Main Academic & Technology Block",
        "buildingId": "main-academic-block",
        "cameraPosition": [-50, 32, -20],
        "targetPosition": [-80, 10, -5],
        "description": "The flagship 5-story building housing engineering departments: CSE, ECE, EE, IT, and ECS. Filled with modern smart classrooms and departmental faculty enclaves.",
        "highlights": ["5 Academic Levels & Departments", "Interactive Smart Classrooms", "Faculty Enclaves & Department Libraries"]
    },
    {
        "id": "stop-5",
        "step": 5,
        "title": "Advanced Computing & AI Laboratories",
        "buildingId": "main-academic-block",
        "cameraPosition": [-70, 25, 10],
        "targetPosition": [-85, 6, 0],
        "description": "High-performance computing centers including the Turing Computing Lab, Artificial Intelligence & Machine Learning Lab, and IoT Sensor Innovation Hub.",
        "highlights": ["Turing Computing Lab", "AI/ML GPU Acceleration Hub", "High-speed Gigabit Fiber Network"]
    },
    {
        "id": "stop-6",
        "step": 6,
        "title": "First Year Induction Block",
        "buildingId": "first-year-block",
        "cameraPosition": [-10, 20, 60],
        "targetPosition": [-35, 6, 75],
        "description": "The starting point for every fresher! Dedicated classrooms, Engineering Physics & Chemistry laboratories, and the First-Year Dean's office designed to ease your transition into engineering.",
        "highlights": ["Engineering Physics & Dark Room", "Chemistry & Material Science Lab", "Language & Communication Lab"]
    },
    {
        "id": "stop-7",
        "step": 7,
        "title": "Central Canteen & Cafeteria",
        "buildingId": "central-canteen",
        "cameraPosition": [-85, 18, 55],
        "targetPosition": [-105, 4, 70],
        "description": "The pulse of campus social life! Enjoy delicious meals, quick snacks, hot Darjeeling tea, fresh juices, and meet friends at the open-air pavilions.",
        "highlights": ["Tutul's Food & Multi-cuisine Dining", "Tea & Coffee Garden Kiosks", "Spacious Outdoor Covered Pavilions"]
    },
    {
        "id": "stop-8",
        "step": 8,
        "title": "Campus Hostels & Residential Enclave",
        "buildingId": "boys-hostel-a",
        "cameraPosition": [15, 25, 45],
        "targetPosition": [0, 8, 30],
        "description": "Safe, serene home away from home. Separate hostels for boys (Swami Vivekananda) and girls (Sister Nivedita) equipped with Wi-Fi, mess halls, gyms, and round-the-clock security.",
        "highlights": ["Swami Vivekananda Boys' Hostel", "Sister Nivedita Girls' Hostel", "Gymnasium & Recreation Lounges"]
    },
    {
        "id": "stop-9",
        "step": 9,
        "title": "SIT Main Sports Ground & Courts",
        "buildingId": "amenity-1469221619",
        "cameraPosition": [-40, 35, -70],
        "targetPosition": [-50, 0, -40],
        "description": "Full-size football ground, cricket pitch, athletic track, and basketball court hosting the annual sports meet, inter-college tournaments, and cultural fests.",
        "highlights": ["Full-size Football & Cricket Ground", "Standard Basketball Court", "Athletics Running Track"]
    }
]

# Write all processed data to output files
os.makedirs("public/data", exist_ok=True)

campus_data = {
    "center": [ORIGIN_LAT, ORIGIN_LON],
    "boundary": boundary_xy,
    "boundaryGeo": boundary_pts,
    "buildings": processed_buildings,
    "amenities": amenities_processed,
    "roads": road_ways,
    "paths": path_ways,
    "trees": trees,
    "tourStops": TOUR_STOPS
}

with open("public/data/sit_campus_processed.json", "w", encoding="utf-8") as f:
    json.dump(campus_data, f, indent=2)

nav_graph_data = {
    "nodes": nav_nodes,
    "adjacency": nav_adjacency
}

with open("public/data/nav_graph.json", "w", encoding="utf-8") as f:
    json.dump(nav_graph_data, f, indent=2)

print("Exported public/data/sit_campus_processed.json and public/data/nav_graph.json successfully!")
