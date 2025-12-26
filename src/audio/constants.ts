/**
 * Audio configuration constants for the Spatial Audio MVP
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

// Spatial mapping ranges
export const AZIMUTH_RANGE = { min: -90, max: 90 }; // degrees, X axis (full L/R separation)
export const ELEVATION_RANGE = { min: -45, max: 45 }; // degrees, Y axis

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
 */
export function xToAzimuth(x: number): number {
  const clamped = Math.max(0, Math.min(1, x));
  return AZIMUTH_RANGE.min + clamped * (AZIMUTH_RANGE.max - AZIMUTH_RANGE.min);
}

/**
 * Convert normalized Y position (0-1) to elevation in degrees
 * Note: Y=0 is top (positive elevation), Y=1 is bottom (negative elevation)
 */
export function yToElevation(y: number): number {
  const clamped = Math.max(0, Math.min(1, y));
  // Invert Y so that top = positive elevation
  return ELEVATION_RANGE.max - clamped * (ELEVATION_RANGE.max - ELEVATION_RANGE.min);
}

/**
 * Convert degrees to radians
 */
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
