/**
 * FOA Encoder AudioWorklet Processor
 * 
 * Encodes mono audio into First Order Ambisonics (FOA) using SN3D/ACN convention.
 * 
 * Input: 1 channel (mono)
 * Output: 4 channels [W, Y, Z, X] (ACN order)
 * 
 * Encoding formulas (SN3D normalization):
 *   W = s * 0.70710678 (1/√2)
 *   Y = s * cos(el) * sin(az)
 *   Z = s * sin(el)
 *   X = s * cos(el) * cos(az)
 */

// AudioWorklet global types (these exist in the worklet scope)
declare const sampleRate: number;
declare class AudioWorkletProcessor {
    constructor();
    readonly port: MessagePort;
    process(
        inputs: Float32Array[][],
        outputs: Float32Array[][],
        parameters: Record<string, Float32Array>
    ): boolean;
}
declare function registerProcessor(name: string, processorCtor: typeof AudioWorkletProcessor): void;

// Constants
const SQRT1_2 = 0.7071067811865476; // 1/√2

class FOAEncoderProcessor extends AudioWorkletProcessor {
    // Current smoothed values
    private currentAzimuth = 0;
    private currentElevation = 0;

    // Target values (from parameters)
    private targetAzimuth = 0;
    private targetElevation = 0;

    // Smoothing coefficient (per sample)
    // This creates a gentle ramp over ~5-10ms at 48kHz
    private smoothingCoeff = 0.002;

    static get parameterDescriptors() {
        return [
            {
                name: 'azimuth',
                defaultValue: 0,
                minValue: -Math.PI,
                maxValue: Math.PI,
                automationRate: 'k-rate',
            },
            {
                name: 'elevation',
                defaultValue: 0,
                minValue: -Math.PI / 4, // -45 degrees
                maxValue: Math.PI / 4,  // +45 degrees
                automationRate: 'k-rate',
            },
        ];
    }

    constructor() {
        super();
    }

    process(
        inputs: Float32Array[][],
        outputs: Float32Array[][],
        parameters: Record<string, Float32Array>
    ): boolean {
        const input = inputs[0];
        const output = outputs[0];

        // If no input or no output channels, pass through silence
        if (!input || !input[0] || !output || output.length < 4) {
            return true;
        }

        const inputChannel = input[0];
        const blockSize = inputChannel.length;

        // Get target parameters (k-rate = single value for entire block)
        this.targetAzimuth = parameters.azimuth[0];
        this.targetElevation = parameters.elevation[0];

        // Output channels: W, Y, Z, X (ACN order)
        const outW = output[0];
        const outY = output[1];
        const outZ = output[2];
        const outX = output[3];

        for (let i = 0; i < blockSize; i++) {
            // Smooth parameters
            this.currentAzimuth += (this.targetAzimuth - this.currentAzimuth) * this.smoothingCoeff;
            this.currentElevation += (this.targetElevation - this.currentElevation) * this.smoothingCoeff;

            // Pre-compute trig functions
            const cosEl = Math.cos(this.currentElevation);
            const sinEl = Math.sin(this.currentElevation);
            const cosAz = Math.cos(this.currentAzimuth);
            const sinAz = Math.sin(this.currentAzimuth);

            // Get input sample
            const s = inputChannel[i];

            // Apply FOA encoding (SN3D/ACN)
            outW[i] = s * SQRT1_2;           // W: omnidirectional
            outY[i] = s * cosEl * sinAz;     // Y: left-right (positive = right)
            outZ[i] = s * sinEl;              // Z: up-down (positive = up)
            outX[i] = s * cosEl * cosAz;     // X: front-back (positive = front)
        }

        return true;
    }
}

registerProcessor('foa-encoder', FOAEncoderProcessor);
