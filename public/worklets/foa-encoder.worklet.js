/**
 * FOA Encoder AudioWorklet Processor
 * 
 * Encodes mono audio into First Order Ambisonics (FOA) using SN3D/ACN convention.
 * 
 * Input: 1 channel (mono)
 * Output: 4 channels [W, Y, Z, X] (ACN order)
 */

const SQRT1_2 = 0.7071067811865476;

class FOAEncoderProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.currentAzimuth = 0;
        this.currentElevation = 0;
        this.targetAzimuth = 0;
        this.targetElevation = 0;
        this.smoothingCoeff = 0.002;
    }

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
                minValue: -Math.PI / 4,
                maxValue: Math.PI / 4,
                automationRate: 'k-rate',
            },
        ];
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];

        if (!input || !input[0] || !output || output.length < 4) {
            return true;
        }

        const inputChannel = input[0];
        const blockSize = inputChannel.length;

        this.targetAzimuth = parameters.azimuth[0];
        this.targetElevation = parameters.elevation[0];

        const outW = output[0];
        const outY = output[1];
        const outZ = output[2];
        const outX = output[3];

        for (let i = 0; i < blockSize; i++) {
            this.currentAzimuth += (this.targetAzimuth - this.currentAzimuth) * this.smoothingCoeff;
            this.currentElevation += (this.targetElevation - this.currentElevation) * this.smoothingCoeff;

            const cosEl = Math.cos(this.currentElevation);
            const sinEl = Math.sin(this.currentElevation);
            const cosAz = Math.cos(this.currentAzimuth);
            const sinAz = Math.sin(this.currentAzimuth);

            const s = inputChannel[i];

            outW[i] = s * SQRT1_2;
            outY[i] = s * cosEl * sinAz;
            outZ[i] = s * sinEl;
            outX[i] = s * cosEl * cosAz;
        }

        return true;
    }
}

registerProcessor('foa-encoder', FOAEncoderProcessor);
