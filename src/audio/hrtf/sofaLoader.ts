/**
 * SOFA Loader - Phase 4 HRTF Integration
 * 
 * Loads HRIRs from a SOFA file using libmysofa WASM.
 * Falls back to built-in HRIRs if loading fails.
 */

import { initLibMySofa } from './initLibMySofa';
import { loadSofaToMemFs } from '../loadSofaToMemFs';
import {
    HRIR_LENGTH,
    NUM_SPEAKERS,
    SPEAKER_AZIMUTHS_RAD,
    getHRIRDataForWorklet,
    getFOADecodeMatrix
} from './hrirBuiltIn';

// Default SOFA file path
const DEFAULT_SOFA_PATH = '/hrtf/hrtf.sofa';

/**
 * Convert azimuth (radians, horizontal plane) to cartesian unit vector
 * 
 * SOFA coordinate system:
 *   x = front (positive)
 *   y = LEFT (positive) - NOTE: opposite of our azimuth convention!
 *   z = up (positive)
 * 
 * Our azimuth convention:
 *   positive azimuth = RIGHT
 * 
 * So we negate Y to align our "positive = right" with SOFA's "positive = left"
 */
function azimuthToCartesian(azRad: number): { x: number; y: number; z: number } {
    return {
        x: Math.cos(azRad),
        y: -Math.sin(azRad), // Negated: our +az (right) → SOFA -y (right)
        z: 0  // elevation = 0 for horizontal plane
    };
}

/**
 * Trim or pad an HRIR to target length
 */
function normalizeHRIRLength(hrir: Float32Array, targetLength: number): Float32Array {
    if (hrir.length === targetLength) {
        return hrir;
    }

    const result = new Float32Array(targetLength);
    const copyLength = Math.min(hrir.length, targetLength);
    result.set(hrir.subarray(0, copyLength));
    return result;
}

export interface SOFALoadResult {
    hrirData: Float32Array;
    decodeMatrix: Float32Array;
    source: 'sofa' | 'builtin';
    filterLength?: number;
}

/**
 * Load HRIRs from SOFA file for the virtual speaker positions
 * 
 * @param sampleRate - AudioContext sample rate for resampling
 * @param sofaPath - Path to SOFA file (default: /hrtf/hrtf.sofa)
 * @returns Promise with HRIR data formatted for the decoder worklet
 */
export async function loadSOFAHRIRs(
    sampleRate: number,
    sofaPath: string = DEFAULT_SOFA_PATH
): Promise<SOFALoadResult> {
    try {
        const { Module, api } = await initLibMySofa();

        // Load SOFA file to Emscripten memory filesystem
        const memFsPath = await loadSofaToMemFs(Module, sofaPath);

        // Open SOFA file
        const handle = api.open(memFsPath, sampleRate);

        const err = api.err(handle);
        if (err !== 0) {
            throw new Error(`Failed to open SOFA file, error code: ${err}`);
        }

        const filterLength = api.filterLength(handle);

        if (filterLength <= 0) {
            api.close(handle);
            throw new Error(`Invalid SOFA filter length: ${filterLength}`);
        }

        // Extract HRIRs for each virtual speaker position
        // Format: [L0(128), R0(128), L1(128), R1(128), ...]
        const hrirData = new Float32Array(NUM_SPEAKERS * 2 * HRIR_LENGTH);

        for (let spk = 0; spk < NUM_SPEAKERS; spk++) {
            const azRad = SPEAKER_AZIMUTHS_RAD[spk];
            const { x, y, z } = azimuthToCartesian(azRad);

            // Get HRIR for this direction
            const { left, right, leftDelay, rightDelay } = api.getFilter(handle, x, y, z);

            // Normalize to target length (128 samples)
            const leftNorm = normalizeHRIRLength(left, HRIR_LENGTH);
            const rightNorm = normalizeHRIRLength(right, HRIR_LENGTH);

            // Store in output array
            const offset = spk * 2 * HRIR_LENGTH;
            hrirData.set(leftNorm, offset);
            hrirData.set(rightNorm, offset + HRIR_LENGTH);
        }

        api.close(handle);

        // Return HRIR data and decode matrix
        return {
            hrirData,
            decodeMatrix: getFOADecodeMatrix(),
            source: 'sofa',
            filterLength
        };

    } catch {
        // Fall back to built-in HRIRs if SOFA loading fails
        return {
            hrirData: getHRIRDataForWorklet(),
            decodeMatrix: getFOADecodeMatrix(),
            source: 'builtin'
        };
    }
}
