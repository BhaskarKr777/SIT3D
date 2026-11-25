/**
 * Calculates solar position and lighting parameters based on Siliguri, WB, India
 * Coordinates: Latitude 26.76929° N, Longitude 88.37620° E (UTC+5:30)
 */

export interface LightingState {
  isNight: boolean;
  sunPosition: [number, number, number];
  sunIntensity: number;
  sunColor: string;
  ambientIntensity: number;
  ambientColor: string;
  skyColor: string;
  groundColor: string;
  fogColor: string;
  shadowOpacity: number;
  starOpacity: number;
  streetLightIntensity: number;
  windowGlowIntensity: number;
}

export function getSiliguriLocalHour(): number {
  const now = new Date();
  // Siliguri is in IST (UTC +5:30)
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const istDate = new Date(utc + 3600000 * 5.5);
  return istDate.getHours() + istDate.getMinutes() / 60;
}

export function getLightingForHour(hour: number): LightingState {
  // Normalize hour 0 - 24
  const h = ((hour % 24) + 24) % 24;

  // Approximate solar elevation and azimuth for Siliguri (~26.7° N latitude)
  // Sunrise ~ 5:30 AM, Sunset ~ 17:45 (5:45 PM) in winter/spring
  const isNight = h < 5.5 || h > 18.2;

  // Solar angle: 12 is noon (max height), 0/24 is midnight
  const solarAngle = ((h - 12) / 12) * Math.PI; // -PI at midnight, 0 at noon, +PI at next midnight
  const elevation = Math.cos(solarAngle); // 1 at noon, -1 at midnight

  // Sun orbit radius in Three.js world coordinates
  const radius = 250;
  const sunX = Math.sin(solarAngle) * radius;
  const sunY = Math.max(-50, elevation * radius);
  const sunZ = Math.cos(solarAngle) * 60; // slight south tilt

  if (isNight) {
    // Night Mode (Balanced Atmospheric Moonlight & Campus Visibility)
    return {
      isNight: true,
      sunPosition: [-sunX, Math.abs(sunY * 0.7), -sunZ], // Moon position
      sunIntensity: 0.45,
      sunColor: '#a5c9fd', // soft luminous silver-blue moonlight
      ambientIntensity: 0.65, // balanced nighttime ambient to keep vegetation & river natural
      ambientColor: '#2c3e5e', // deep luminous midnight slate/navy
      skyColor: '#0c1427', // rich dark blue night sky
      groundColor: '#1a2a42', // soft ground bounce keeping lawns & terrain visible
      fogColor: '#0c1427',
      shadowOpacity: 0.22,
      starOpacity: 0.95,
      streetLightIntensity: 2.2,
      windowGlowIntensity: 1.8, // natural architectural window glow without over-bloom
    };
  }

  // Golden hour check (dawn 5.5-7.0 or dusk 16.8-18.2)
  const isDawnDusk = (h >= 5.5 && h <= 7.0) || (h >= 16.8 && h <= 18.2);

  if (isDawnDusk) {
    return {
      isNight: false,
      sunPosition: [sunX, Math.max(15, sunY), sunZ],
      sunIntensity: 1.2,
      sunColor: '#fb923c', // golden orange
      ambientIntensity: 0.6,
      ambientColor: '#fed7aa',
      skyColor: '#fdba74',
      groundColor: '#4b5563',
      fogColor: '#ffedd5',
      shadowOpacity: 0.45,
      starOpacity: 0.0,
      streetLightIntensity: 0.4,
      windowGlowIntensity: 0.5,
    };
  }

  // Clear Daytime (Bright Himalayan Sun)
  const normalizedMidday = Math.min(1.0, Math.sin(((h - 6) / 12) * Math.PI));
  return {
    isNight: false,
    sunPosition: [sunX, sunY, sunZ],
    sunIntensity: 1.5 + normalizedMidday * 0.5,
    sunColor: '#fffbeb', // bright warm sunlight
    ambientIntensity: 0.75,
    ambientColor: '#e0f2fe', // soft sky blue ambient
    skyColor: '#60a5fa',
    groundColor: '#334155',
    fogColor: '#bfdbfe',
    shadowOpacity: 0.5,
    starOpacity: 0.0,
    streetLightIntensity: 0.0,
    windowGlowIntensity: 0.0,
  };
}
