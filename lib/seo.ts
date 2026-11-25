export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'https://sit-3-d.vercel.app');

export const SITE_NAME = 'SIT 3D Digital Twin';
export const INSTITUTION_NAME = 'Siliguri Institute of Technology';
export const INSTITUTION_OFFICIAL_URL = 'https://www.sittechno.org';

export const DEFAULT_TITLE =
  'SIT 3D Digital Twin | Virtual Campus Tour – Siliguri Institute of Technology';
export const DEFAULT_DESCRIPTION =
  'Explore Siliguri Institute of Technology through an interactive 3D digital twin. Discover campus buildings, facilities, navigation, and take a virtual campus tour.';

export const SEO_KEYWORDS = [
  'SIT 3D Digital Twin',
  'Siliguri Institute of Technology 3D Campus',
  'SIT Virtual Campus Tour',
  'Siliguri Institute of Technology Virtual Tour',
  'SIT Campus Map',
  'SIT Campus Navigation',
  'Siliguri Institute of Technology Campus',
  'SIT Building Directory',
  'SIT Interactive Campus Map',
  'SIT Fresher Tour',
  'SIT Campus Facilities',
  'Siliguri Institute of Technology Salbari',
];
