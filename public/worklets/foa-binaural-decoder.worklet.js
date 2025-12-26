/**
 * FOA Binaural Decoder AudioWorklet Processor
 * 
 * Decodes First Order Ambisonics (FOA) to binaural stereo using:
 * 1. Virtual speaker decode (8 speakers at el=0)
 * 2. Per-speaker HRIR convolution
 * 3. Sum to stereo output
 * 
 * Input: 4 channels [W, Y, Z, X] (ACN order)
 * Output: 2 channels [Left, Right]
 */

const NUM_SPEAKERS = 8;
const HRIR_LENGTH = 128;

class FOABinauralDecoderProcessor extends AudioWorkletProcessor {
    constructor() {
        super();

        this.hrirData = new Float32Array(NUM_SPEAKERS * 2 * HRIR_LENGTH);
        this.decodeMatrix = new Float32Array(NUM_SPEAKERS * 4);
        this.speakerBuffers = [];
        this.bufferIndex = 0;
        this.initialized = false;

        for (let i = 0; i < NUM_SPEAKERS; i++) {
            this.speakerBuffers.push(new Float32Array(HRIR_LENGTH));
        }

        this.port.onmessage = (event) => {
            if (event.data.type === 'setHRIR') {
                this.hrirData = new Float32Array(event.data.hrirData);
                this.decodeMatrix = new Float32Array(event.data.decodeMatrix);
                this.initialized = true;
            }
        };
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];

        if (!input || input.length < 4 || !output || output.length < 2) {
            return true;
        }

        if (!this.initialized) {
            return true;
        }

        const blockSize = input[0].length;
        const inW = input[0];
        const inY = input[1];
        const inZ = input[2];
        const inX = input[3];

        const outL = output[0];
        const outR = output[1];

        for (let i = 0; i < blockSize; i++) {
            let sumL = 0;
            let sumR = 0;

            const w = inW[i];
            const y = inY[i];
            const z = inZ[i];
            const x = inX[i];

            for (let spk = 0; spk < NUM_SPEAKERS; spk++) {
                const decOffset = spk * 4;
                const decW = this.decodeMatrix[decOffset + 0];
                const decY = this.decodeMatrix[decOffset + 1];
                const decZ = this.decodeMatrix[decOffset + 2];
                const decX = this.decodeMatrix[decOffset + 3];

                const speakerSignal = w * decW + y * decY + z * decZ + x * decX;

                const buffer = this.speakerBuffers[spk];
                buffer[this.bufferIndex] = speakerSignal;

                const hrirOffset = spk * 2 * HRIR_LENGTH;

                let convL = 0;
                let convR = 0;

                for (let k = 0; k < HRIR_LENGTH; k++) {
                    let bufIdx = this.bufferIndex - k;
                    if (bufIdx < 0) bufIdx += HRIR_LENGTH;

                    const sample = buffer[bufIdx];

                    convL += sample * this.hrirData[hrirOffset + k];
                    convR += sample * this.hrirData[hrirOffset + HRIR_LENGTH + k];
                }

                sumL += convL;
                sumR += convR;
            }

            const scale = 1.0 / NUM_SPEAKERS;
            outL[i] = sumL * scale;
            outR[i] = sumR * scale;

            this.bufferIndex = (this.bufferIndex + 1) % HRIR_LENGTH;
        }

        return true;
    }
}

registerProcessor('foa-binaural-decoder', FOABinauralDecoderProcessor);
