export interface BuildingConfig {
  // Placement & Orientation
  posX: number;
  posY: number;
  posZ: number;
  rotY: number; // in radians
  scale: number;
  wingAngle: number; // front wing angle in radians (0 = completely straight)

  // Atrium Glass Skylights
  atriumZ: number;
  atriumWidth: number;
  atriumDepth: number;
  atriumPitch: number;
  atriumOpacity: number;

  // Grand Entrance Portico
  porticoZ: number;
  porticoWidth: number;
  pillarHeight: number;

  // Rotunda & Silver Dome
  domeScale: number;
  domeY: number;

  // Rear Academic Complex
  rearZ: number;
  rearDepth: number;

  // Exterior Colors
  wallCream: string;
  borderWhite: string;
  domeSilver: string;
}

export const DEFAULT_BUILDING_CONFIG: BuildingConfig = {
  posX: 3.18,
  posY: 0,
  posZ: -4.25,
  rotY: -0.637, // -36.5 degrees
  scale: 1.0,
  wingAngle: 0.0, // completely straight front facade matching rear side

  atriumZ: 8.0,
  atriumWidth: 23.5,
  atriumDepth: 7.0,
  atriumPitch: 0.18,
  atriumOpacity: 0.5,

  porticoZ: -14.0,
  porticoWidth: 22.0,
  pillarHeight: 8.0,

  domeScale: 1.0,
  domeY: 0,

  rearZ: 18.0,
  rearDepth: 13.0,

  wallCream: '#f5f0e6',
  borderWhite: '#fafafa',
  domeSilver: '#cbd5e1',
};
