/**
 * Built-in Stub HRIR Data for MVP
 * 
 * This provides simplified Head-Related Impulse Responses for 8 virtual speaker
 * positions around the horizontal plane (elevation = 0°).
 * 
 * Speaker layout (azimuth angles):
 *   0: 0° (front)
 *   1: 45° (front-right)
 *   2: 90° (right)
 *   3: 135° (back-right)
 *   4: 180° (back)
 *   5: -135° / 225° (back-left)
 *   6: -90° / 270° (left)
 *   7: -45° / 315° (front-left)
 * 
 * Each HRIR is 128 samples at assumed 48kHz sample rate.
 * These are simplified synthetic HRIRs that approximate:
 * - Interaural Time Difference (ITD) via delay
 * - Interaural Level Difference (ILD) via amplitude
 * - Basic head shadow effect
 * 
 * For production, replace with SOFA-loaded HRTFs (Phase 4).
 */

export const HRIR_LENGTH = 128;
export const NUM_SPEAKERS = 8;

// Speaker azimuths in degrees (for documentation)
export const SPEAKER_AZIMUTHS = [0, 45, 90, 135, 180, -135, -90, -45];

// Speaker azimuths in radians (for calculations)
export const SPEAKER_AZIMUTHS_RAD = SPEAKER_AZIMUTHS.map(deg => deg * Math.PI / 180);

/**
 * Generate a simple synthetic HRIR for a given azimuth
 * This creates a basic approximation using:
 * - Delay difference for ITD
 * - Amplitude difference for ILD
 * - Simple lowpass for contralateral ear (head shadow)
 */
function generateSyntheticHRIR(azimuthDeg: number): { left: Float32Array; right: Float32Array } {
    const left = new Float32Array(HRIR_LENGTH);
    const right = new Float32Array(HRIR_LENGTH);

    // Normalize azimuth to -180 to 180
    let az = azimuthDeg;
    while (az > 180) az -= 360;
    while (az < -180) az += 360;

    // Convert to radians
    const azRad = az * Math.PI / 180;

    // ITD: max delay ~0.7ms at 90° = ~34 samples at 48kHz
    // Positive azimuth = source on right = sound arrives at right ear first
    const maxDelaySamples = 22;
    const delayFactor = Math.sin(azRad); // -1 (left) to +1 (right)

    // Calculate delays for each ear
    const rightDelay = Math.round(Math.max(0, -delayFactor * maxDelaySamples));
    const leftDelay = Math.round(Math.max(0, delayFactor * maxDelaySamples));

    // ILD: contralateral ear is quieter (head shadow)
    // At 90° right, left ear is ~6dB quieter
    const ildDb = 6;
    const ildFactor = Math.pow(10, -ildDb / 20); // ~0.5

    // Calculate gain for each ear
    let leftGain: number, rightGain: number;
    if (az >= 0) {
        // Source on right
        rightGain = 1.0;
        leftGain = 1.0 - (1.0 - ildFactor) * Math.abs(Math.sin(azRad));
    } else {
        // Source on left
        leftGain = 1.0;
        rightGain = 1.0 - (1.0 - ildFactor) * Math.abs(Math.sin(azRad));
    }

    // Create impulse with exponential decay (simple room/head response)
    const decayRate = 0.92;

    for (let i = 0; i < HRIR_LENGTH; i++) {
        // Left ear
        if (i >= leftDelay) {
            const t = i - leftDelay;
            if (t === 0) {
                left[i] = leftGain;
            } else if (t < 20) {
                // Some early reflections / head diffraction
                left[i] = leftGain * Math.pow(decayRate, t) * 0.3 * (Math.random() * 0.5 + 0.5);
            }
        }

        // Right ear
        if (i >= rightDelay) {
            const t = i - rightDelay;
            if (t === 0) {
                right[i] = rightGain;
            } else if (t < 20) {
                right[i] = rightGain * Math.pow(decayRate, t) * 0.3 * (Math.random() * 0.5 + 0.5);
            }
        }
    }

    return { left, right };
}

// Pre-generate HRIRs for all speaker positions
// Making these deterministic by seeding the "random" reflection pattern
function generateAllHRIRs(): Array<{ left: Float32Array; right: Float32Array }> {
    // Use a simple seeded random for reproducibility
    let seed = 12345;
    const seededRandom = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
    };

    // Temporarily replace Math.random
    const originalRandom = Math.random;
    Math.random = seededRandom;

    const hrirs = SPEAKER_AZIMUTHS.map(az => generateSyntheticHRIR(az));

    // Restore Math.random
    Math.random = originalRandom;

    return hrirs;
}

/**
 * Built-in HRIR set for 8 speakers
 * Access: BUILTIN_HRIRS[speakerIndex].left / .right
 */
export const BUILTIN_HRIRS = generateAllHRIRs();

/**
 * Get HRIR data as a flat array suitable for AudioWorklet transfer
 * Format: [L0[0..127], R0[0..127], L1[0..127], R1[0..127], ...]
 */
export function getHRIRDataForWorklet(): Float32Array {
    const data = new Float32Array(NUM_SPEAKERS * 2 * HRIR_LENGTH);

    for (let spk = 0; spk < NUM_SPEAKERS; spk++) {
        const offset = spk * 2 * HRIR_LENGTH;
        data.set(BUILTIN_HRIRS[spk].left, offset);
        data.set(BUILTIN_HRIRS[spk].right, offset + HRIR_LENGTH);
    }

    return data;
}

/**
 * FOA decode coefficients for each speaker
 * speaker_signal = W*decodeW + X*decodeX + Y*decodeY + Z*decodeZ
 * 
 * For horizontal-only speakers (el=0):
 *   decodeW = 0.707 (or 1/sqrt(2))
 *   decodeX = cos(azimuth)
 *   decodeY = sin(azimuth)
 *   decodeZ = 0
 */
export function getFOADecodeMatrix(): Float32Array {
    // 4 coefficients per speaker: [W, Y, Z, X] in ACN order
    const matrix = new Float32Array(NUM_SPEAKERS * 4);

    for (let spk = 0; spk < NUM_SPEAKERS; spk++) {
        const azRad = SPEAKER_AZIMUTHS_RAD[spk];
        const offset = spk * 4;

        // ACN order: W(0), Y(1), Z(2), X(3)
        matrix[offset + 0] = 0.7071067811865476; // W coefficient
        matrix[offset + 1] = Math.sin(azRad);     // Y coefficient
        matrix[offset + 2] = 0;                    // Z coefficient (el=0)
        matrix[offset + 3] = Math.cos(azRad);     // X coefficient
    }

    return matrix;
}
