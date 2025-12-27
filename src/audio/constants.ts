/**
 * Audio configuration constants for the Spatial Audio MVP
 * 
 * Spatial Coordinate System (matching reference implementation):
 * - X axis (horizontal): Azimuth (-180° to +180°, full circle)
 * - Y axis (vertical): Elevation (-90° to +90°, half sphere)
 * 
 * Grid Layout:
 * - Left (X=0) → +180° azimuth (behind left)
 * - Center (X=0.5) → 0° azimuth (front center)
 * - Right (X=1) → -180° azimuth (behind right)
 * - Top (Y=0) → +90° elevation (above)
 * - Bottom (Y=1) → -90° elevation (below)
 */

// Audio asset paths (relative to public folder)
export const AUDIO_ASSETS = [
  { id: 0, name: 'Acoustic Guitar', path: '/audio/01AcousticGtr.wav' },
  { id: 1, name: 'Acoustic Guitar DI', path: '/audio/02AcousticGtrDI.wav' },
  { id: 2, name: 'Saxophone', path: '/audio/03Saxophone.wav' },
] as const;

export const NUM_OBJECTS = AUDIO_ASSETS.length;

// Grid dimensions for UI
export const GRID_WIDTH = 600;
export const GRID_HEIGHT = 300;

// Spatial mapping ranges (matching reference implementation)
// X maps to full 360° rotation: LEFT (+180°) to RIGHT (-180°)
export const AZIMUTH_RANGE = { min: -180, max: 180 }; // degrees, full circle
export const ELEVATION_RANGE = { min: -90, max: 90 }; // degrees, half sphere

// Default object positions (normalized 0-1)
export const DEFAULT_POSITIONS = [
  { x: 0.25, y: 0.5 }, // Object 0: left-center
  { x: 0.5, y: 0.5 },  // Object 1: center
  { x: 0.75, y: 0.5 }, // Object 2: right-center
] as const;

// Object colors for UI
export const OBJECT_COLORS = [
  '#ff6b6b', // Red
  '#4ecdc4', // Teal
  '#ffe66d', // Yellow
] as const;

// Audio constants
export const SAMPLE_RATE = 48000;

/**
 * Convert normalized X position (0-1) to azimuth in degrees
 * X=0 → +180° (left/behind), X=0.5 → 0° (center/front), X=1 → -180° (right/behind)
 */
export function xToAzimuth(x: number): number {
  const clamped = Math.max(0, Math.min(1, x));
  // Reference formula: -Math.round(360 * (mouseXPos - (width/2)) / width)
  // Maps 0→+180, 0.5→0, 1→-180
  return Math.round(360 * (0.5 - clamped));
}

/**
 * Convert normalized Y position (0-1) to elevation in degrees
 * Matches reference: Y=0 → +90° (above), Y=1 → -90° (below)
 */
export function yToElevation(y: number): number {
  const clamped = Math.max(0, Math.min(1, y));
  // Reference formula: Math.round(180 * ((height/2) - mouseYPos) / height)
  // Maps 0→+90, 0.5→0, 1→-90
  return Math.round(180 * (0.5 - clamped));
}

/**
 * Convert normalized Y position (0-1) to front/back factor
 * Y=0 → Front (1.0), Y=1 → Back (0.0)
 * This is used for EQ filtering (front = bright, back = dull)
 */
export function yToFrontBack(y: number): number {
  const clamped = Math.max(0, Math.min(1, y));
  return 1.0 - clamped; // 1 = front, 0 = back
}

/**
 * Convert degrees to radians
 */
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
