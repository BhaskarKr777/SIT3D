# SIT 3D — Siliguri Institute of Technology Campus Navigation & Digital Twin

A production-grade, interactive 3D digital twin and campus navigation web application for **Siliguri Institute of Technology (SIT), Salbari, West Bengal, India**.

Inspired by modern geospatial digital twins (such as the IIIT Kottayam 3D Campus project), this web application provides students, freshers, faculty, and campus visitors with an immersive, browser-based 3D environment for exploration, building and floor inspection, and graph-based walking route calculation.

---

## 🌟 Key Features

### 1. Interactive 3D Campus Map
- Recreated to scale using verified OpenStreetMap (OSM) building footprint polygons and boundaries (Way `352464014`).
- Centered at Siliguri Institute of Technology: `26.76929° N, 88.37620° E` at ~144m AMSL.
- Includes 19 primary campus facilities (Main Academic Block, Management & BCA Block, Engineering Workshops, First Year Block, Central Library, Hostels, Canteen, Substation, Entrance Gate).
- Surrounding terrain features: Chamtaguri Tea Gardens, Hill Cart Road (NH110), and the historic Darjeeling Himalayan Railway (narrow-gauge toy train tracks).
- Instanced 3D foliage (160+ trees) optimized for high frame rates on average Android smartphones and low-power devices.

### 2. Search & Location Intelligence
- Real-time search across:
  - Building names (e.g. *Main Academic Block*, *Central Library*, *Hostels*)
  - Academic departments (e.g. *CSE*, *ECE*, *EE*, *IT*, *ECS*, *MBA*, *MCA*)
  - Laboratories (e.g. *Turing Computing Lab*, *AI & ML Lab*, *VLSI Lab*, *SOM Lab*, *Physics Lab*)
  - Classrooms and specific room numbers (*G01*, *104*, *201*, *WS-01*, *FY-02*)
  - Outdoor sports and recreational amenities (*Cricket/Football Ground*, *Basketball Court*)
- Interactive category filtering pills: **All**, **Academic**, **Labs**, **Food**, **Hostels**, **Sports**.
- Automatic camera smooth lerp focus on search selection.

### 3. Walking Navigation Engine (A* Pathfinding)
- Graph-based pathfinding across 260+ path nodes and 530+ edge links following verified campus walkways and roads.
- Computes:
  - Precise walking distance (meters)
  - Estimated walking time at 1.2 m/s standard walking speed (minutes)
  - Turn-by-turn navigation instructions
- Displays an animated glowing 3D walking route ribbon with an origin green beacon and an animated floating destination pin.

### 4. Building & Floor Explorer
- Interactive floor selector tabs for multi-level buildings (Ground Floor through 4th Floor).
- Room directory with room codes, category badges (Department, Lab, Classroom, Faculty Enclave, Office, Hall), and directional guidance.
- "Navigate Here" action button seamlessly opens the A* walking router to the selected building.

### 5. Fresher Orientation Tour
- 9-stop guided orientation tour curated for incoming engineering and management freshers:
  1. Main Entrance & Security Gate
  2. Central Reception & Administration Block
  3. Central Digital Library
  4. Main Academic & Technology Block
  5. Advanced Computing & AI Laboratories
  6. First Year Induction Block
  7. Central Canteen & Cafeteria (Tutul's Food)
  8. Campus Hostels & Residential Enclave
  9. SIT Main Sports Ground & Courts
- Step-by-step camera flythrough with narrative descriptions and highlight tags.
- Auto-play mode with pause and manual navigation.

### 6. Dynamic Himalayan Lighting & Day/Night Mode
- Dynamic sunlight calculation based on local time in Siliguri, West Bengal (IST, UTC+5:30).
- Day mode: Himalayan warm sunlight, realistic building shadows, and sky atmospheric fog.
- Night mode: Cool moonlight, illuminated building windows with warm interior glow, and sodium vapor streetlights along pathways.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **3D Graphics**: Three.js, React Three Fiber (`@react-three/fiber`), Drei (`@react-three/drei`)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Geospatial Pipeline**: Python, OpenStreetMap Overpass & Map API, Open-Elevation SRTM API

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (tested on Node v22)
- npm 9+

### Installation & Run

1. Clone or navigate to the repository:
   ```bash
   cd c:\MyCode\SIT3D
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your web browser.

4. Build for production:
   ```bash
   npm run build
   npm start
   ```

---

## 📁 Project Structure

```
├── app/
│   ├── globals.css              # Global styles, Tailwind directives, dark theme
│   ├── layout.tsx               # Root HTML metadata & viewport configuration
│   └── page.tsx                 # Main application page & state coordinator
├── components/
│   ├── canvas/
│   │   ├── AmenitiesMesh.tsx    # Sports ground, basketball court, central garden
│   │   ├── BuildingMesh.tsx     # Procedural 3D buildings with floors & night glow
│   │   ├── CameraController.tsx # Smooth camera lerp transitions & OrbitControls
│   │   ├── CampusCanvas.tsx     # WebGL canvas wrapper with shadow settings
│   │   ├── CampusScene.tsx      # Main 3D scene composition
│   │   ├── CampusTerrain.tsx    # Ground mesh, boundary wall, tea gardens, toy train rails
│   │   ├── EnvironmentLighting.tsx # Sunlight, moonlight, shadows, streetlamps
│   │   ├── FoliageInstanced.tsx # InstancedMesh rendering for 160+ trees
│   │   └── RouteRibbon.tsx      # Animated glowing walking route tube & pins
│   └── ui/
│       ├── BuildingDetailSheet.tsx # Building info, floor selector, room directory
│       ├── CampusLegend.tsx     # Color-coded facility category legend
│       ├── Header.tsx           # Logo, Siliguri live time, actions, day/night toggle
│       ├── MapControls.tsx      # Zoom +/-, Reset North, 2D/3D toggle, Overview
│       ├── NavigationDrawer.tsx # A* route planner with metrics & directions
│       ├── SearchBar.tsx        # Fuzzy search & category filter pills
│       └── TourPlayer.tsx       # Fresher orientation tour controller
├── lib/
│   ├── pathfinding.ts          # Graph-based A* pathfinding algorithm
│   ├── sunPosition.ts          # Solar calculation for Siliguri coordinates (IST)
│   └── utils.ts                # Class merging utility
├── public/
│   └── data/
│       ├── nav_graph.json      # 266 path nodes and 536 directed walking edges
│       └── sit_campus_processed.json # 19 buildings, footprints, amenities, tour stops
├── scripts/
│   ├── fetch_sit_osm.py        # Fetches raw OSM data from OpenStreetMap API
│   └── process_campus_geo.py   # Projects lat/lon to meters, extracts graph & metadata
└── types/
    └── campus.ts               # Core TypeScript data contracts
```

---

## 🧭 Data Correction & Regeneration Pipeline

To update or add new buildings, rooms, or walkways without modifying geometry code:

1. Update `scripts/process_campus_geo.py`:
   - Add new OSM way IDs and floor configurations into `BUILDING_PROFILES`.
2. Re-run the python pipeline:
   ```bash
   python scripts/process_campus_geo.py
   ```
3. Re-build the application:
   ```bash
   npm run build
   ```
