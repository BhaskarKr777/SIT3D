import { NavGraph, RouteResult, RouteStep } from '@/types/campus';

export function calculateAStarRoute(
  navGraph: NavGraph,
  startNodeId: string,
  targetNodeId: string,
  originName: string,
  destinationName: string
): RouteResult | null {
  const { nodes, adjacency } = navGraph;
  const start = nodes[startNodeId];
  const target = nodes[targetNodeId];

  if (!start || !target) {
    return null;
  }

  // Heuristic: Euclidean distance
  const heuristic = (nId: string): number => {
    const n = nodes[nId];
    if (!n) return 0;
    return Math.hypot(n.x - target.x, n.z - target.z);
  };

  const openSet = new Set<string>([startNodeId]);
  const cameFrom: Record<string, string> = {};

  const gScore: Record<string, number> = {};
  gScore[startNodeId] = 0;

  const fScore: Record<string, number> = {};
  fScore[startNodeId] = heuristic(startNodeId);

  while (openSet.size > 0) {
    // Find node in openSet with lowest fScore
    let current: string | null = null;
    let lowestF = Infinity;
    for (const node of Array.from(openSet)) {
      const f = fScore[node] ?? Infinity;
      if (f < lowestF) {
        lowestF = f;
        current = node;
      }
    }

    if (!current) break;

    // Check if reached destination
    if (current === targetNodeId) {
      // Reconstruct path
      const pathIds = [current];
      let currId = current;
      while (cameFrom[currId]) {
        currId = cameFrom[currId];
        pathIds.unshift(currId);
      }

      const pathCoords: [number, number][] = pathIds.map((id) => [
        nodes[id].x,
        nodes[id].z,
      ]);

      // Calculate total distance & steps
      let totalDist = 0;
      const steps: RouteStep[] = [];
      steps.push({
        instruction: `Start at ${originName}`,
        distance: 0,
        coordinate: pathCoords[0],
      });

      for (let i = 0; i < pathCoords.length - 1; i++) {
        const p1 = pathCoords[i];
        const p2 = pathCoords[i + 1];
        const dist = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
        totalDist += dist;

        // Group into meaningful navigation intervals
        if (i === 0 || i === pathCoords.length - 2 || dist > 20) {
          const bearing = (Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * 180) / Math.PI;
          let dir = 'forward';
          if (bearing > -45 && bearing <= 45) dir = 'east';
          else if (bearing > 45 && bearing <= 135) dir = 'south';
          else if (bearing > -135 && bearing <= -45) dir = 'north';
          else dir = 'west';

          steps.push({
            instruction: `Walk ${Math.round(dist)}m along the campus pathway`,
            distance: Math.round(dist),
            coordinate: p2,
          });
        }
      }

      steps.push({
        instruction: `Arrive at ${destinationName}`,
        distance: 0,
        coordinate: pathCoords[pathCoords.length - 1],
      });

      // Average walking speed = 1.2 m/s -> 72 m/min
      const walkingSpeedMeterPerMin = 72;
      const estimatedMinutes = Math.max(1, Math.round((totalDist / walkingSpeedMeterPerMin) * 10) / 10);

      return {
        path: pathCoords,
        totalDistance: Math.round(totalDist),
        estimatedMinutes,
        steps,
        originName,
        destinationName,
      };
    }

    openSet.delete(current);
    const neighbors = adjacency[current] || [];

    for (const edge of neighbors) {
      const neighbor = edge.to;
      const tentativeG = (gScore[current] ?? Infinity) + edge.weight;

      if (tentativeG < (gScore[neighbor] ?? Infinity)) {
        cameFrom[neighbor] = current;
        gScore[neighbor] = tentativeG;
        fScore[neighbor] = tentativeG + heuristic(neighbor);
        openSet.add(neighbor);
      }
    }
  }

  // Fallback if no direct graph connection: create direct walkable path between start and target
  const directDist = Math.hypot(target.x - start.x, target.z - start.z);
  return {
    path: [
      [start.x, start.z],
      [target.x, target.z],
    ],
    totalDistance: Math.round(directDist),
    estimatedMinutes: Math.max(1, Math.round(directDist / 72)),
    steps: [
      { instruction: `Start at ${originName}`, distance: 0, coordinate: [start.x, start.z] },
      { instruction: `Walk straight towards ${destinationName}`, distance: Math.round(directDist), coordinate: [target.x, target.z] },
      { instruction: `Arrive at ${destinationName}`, distance: 0, coordinate: [target.x, target.z] },
    ],
    originName,
    destinationName,
  };
}
