/**
 * Terrain Elevation & Ground-Alignment Utilities for SIT 3D Campus Twin
 * 
 * Provides terrain-aware ground elevation calculations for all campus buildings,
 * ensuring zero floating gaps, visually grounded concrete plinths, and realistic
 * foothill topography integration.
 */

import { Building } from '@/types/campus';

/**
 * Returns the ground elevation at any (x, z) coordinate on the SIT campus.
 * Calibrated to the gentle Himalayan foothill slope (Salbari / Sukna region):
 * - Base highway entrance on Hill Cart Road: Y ~ 0.0m
 * - Higher northern and western grounds (workshops, hostels): Y ~ 0.15m to 0.45m
 * - All internal campus roads: Y = 0.04m
 */
export function getTerrainHeightAt(x: number, z: number): number {
  // Gentle gradient across campus terrain: +0.0008m per meter east, -0.0015m per meter south
  const rawSlope = (x * 0.0006) - (z * 0.0012);
  // Keep ground elevation securely bounded between 0.0m and 0.40m
  return Math.max(0.0, Math.min(0.40, rawSlope + 0.05));
}

/**
 * Computes the optimal grounded Y position for any building by evaluating
 * multiple points across its footprint contour and entrance.
 */
export function getBuildingGroundHeight(building: Building): number {
  // 1. If building has a user-defined transform with a valid ground Y (< 50m)
  if (building.transform?.position && typeof building.transform.position[1] === 'number') {
    const userY = building.transform.position[1];
    if (userY >= -2.0 && userY < 20.0) {
      return userY;
    }
  }

  // 2. Main Academic Complex has its calibrated baseline at Y = 0.0
  if (building.id === 'main-academic-block') {
    return 0.0;
  }

  // 3. Inspect multiple sample points across the building's footprint
  const pts = building.polygon;
  if (!pts || pts.length === 0) {
    const [cx, cz] = building.center;
    return getTerrainHeightAt(cx, cz);
  }

  let minElev = Infinity;
  let maxElev = -Infinity;
  let sumElev = 0;

  for (let i = 0; i < pts.length; i++) {
    const elev = getTerrainHeightAt(pts[i][0], pts[i][1]);
    if (elev < minElev) minElev = elev;
    if (elev > maxElev) maxElev = elev;
    sumElev += elev;
  }

  // Also include centroid
  const [cx, cz] = building.center;
  const centerElev = getTerrainHeightAt(cx, cz);
  sumElev += centerElev;

  const avgElev = sumElev / (pts.length + 1);

  // Seat the building base at the minimum terrain elevation beneath its footprint
  // so the building is firmly seated on the ground and NEVER floats above the surface.
  // The foundation plinth will seamlessly fill any depth down to minElev - 0.4m.
  const groundedY = Math.max(0.0, Math.min(0.35, minElev));
  return parseFloat(groundedY.toFixed(2));
}

/**
 * Returns the recommended foundation depth for a building to ensure zero gaps
 * with uneven terrain or road embankments.
 */
export function getRecommendedFoundationDepth(building: Building): number {
  const pts = building.polygon;
  if (!pts || pts.length === 0) return 0.45;

  let minElev = Infinity;
  let maxElev = -Infinity;

  for (let i = 0; i < pts.length; i++) {
    const elev = getTerrainHeightAt(pts[i][0], pts[i][1]);
    if (elev < minElev) minElev = elev;
    if (elev > maxElev) maxElev = elev;
  }

  const terrainVariance = Math.max(0.1, maxElev - minElev);
  return parseFloat((terrainVariance + 0.35).toFixed(2));
}
