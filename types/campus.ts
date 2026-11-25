export type BuildingCategory =
  | 'academic'
  | 'administrative'
  | 'canteen'
  | 'hostel'
  | 'sports'
  | 'utility'
  | 'entrance';

export interface Room {
  code: string;
  name: string;
  type: 'department' | 'lab' | 'classroom' | 'faculty' | 'office' | 'hall' | 'workshop' | 'facility' | 'library' | 'canteen' | 'hostel' | 'research';
}

export interface Floor {
  level: number;
  name: string;
  rooms: Room[];
}

export interface BuildingTransform {
  position?: [number, number, number]; // [x, y, z] in world meters
  rotation?: [number, number, number]; // [rx, ry, rz] in radians
  scale?: [number, number, number];    // [sx, sy, sz]
}

export interface Building {
  id: string;
  osmId: number;
  name: string;
  shortName: string;
  category: BuildingCategory;
  levels: number;
  height: number;
  color: string;
  accentColor: string;
  description: string;
  floors: Floor[];
  center: [number, number]; // [x, z] in local meters
  centerGeo: [number, number]; // [lat, lon]
  polygon: [number, number][]; // contour vertices [x, z]
  entrance: [number, number]; // [x, z]
  navNodeId?: string;
  elevation: number;
  visible?: boolean;
  transform?: BuildingTransform;
  isCustom?: boolean;
}

export interface Amenity {
  id: string;
  osmId: number;
  name: string;
  category: string;
  color: string;
  center: [number, number];
  centerGeo: [number, number];
  polygon: [number, number][];
  entrance?: [number, number];
  navNodeId?: string;
}

export interface RoadSegment {
  id: number;
  type: string;
  name: string;
  points: [number, number][];
}

export interface TreeInstance {
  id?: string;
  position: [number, number, number];
  type: number;
  scale: number;
}

export interface TourStop {
  id: string;
  step: number;
  title: string;
  buildingId: string;
  cameraPosition: [number, number, number];
  targetPosition: [number, number, number];
  description: string;
  highlights: string[];
}

export interface CampusData {
  center: [number, number];
  boundary: [number, number][];
  boundaryGeo: [number, number][];
  buildings: Building[];
  amenities: Amenity[];
  roads: RoadSegment[];
  paths: RoadSegment[];
  trees: TreeInstance[];
  tourStops: TourStop[];
}

export interface NavNode {
  id: string;
  x: number;
  z: number;
  buildingId?: string;
  amenityId?: string;
}

export interface NavEdge {
  from: string;
  to: string;
  weight: number;
}

export interface NavAdjacencyItem {
  to: string;
  weight: number;
}

export interface NavGraph {
  nodes: Record<string, NavNode>;
  adjacency: Record<string, NavAdjacencyItem[]>;
}

export interface RouteStep {
  instruction: string;
  distance: number; // meters
  coordinate: [number, number];
}

export interface RouteResult {
  path: [number, number][]; // [[x, z], ...]
  totalDistance: number; // meters
  estimatedMinutes: number; // minutes at walking speed
  steps: RouteStep[];
  originName: string;
  destinationName: string;
}
