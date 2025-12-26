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

// AudioWorklet global types
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
declare const sampleRate: number;

// Constants
const NUM_SPEAKERS = 8;
const HRIR_LENGTH = 128;

class FOABinauralDecoderProcessor extends AudioWorkletProcessor {
    // HRIR data: [L0, R0, L1, R1, ...] each of length HRIR_LENGTH
    private hrirData: Float32Array;

    // FOA decode matrix: 4 coefficients per speaker [W, Y, Z, X]
    private decodeMatrix: Float32Array;

    // Convolution delay buffers for each speaker (circular buffers)
    private speakerBuffers: Float32Array[];
    private bufferIndex: number = 0;

    // Flag indicating if we have received HRIR data
    private initialized: boolean = false;

    constructor() {
        super();

        // Initialize empty HRIR data
        this.hrirData = new Float32Array(NUM_SPEAKERS * 2 * HRIR_LENGTH);
        this.decodeMatrix = new Float32Array(NUM_SPEAKERS * 4);

        // Initialize speaker delay buffers for convolution
        this.speakerBuffers = [];
        for (let i = 0; i < NUM_SPEAKERS; i++) {
            this.speakerBuffers.push(new Float32Array(HRIR_LENGTH));
        }

        // Listen for HRIR data from main thread
        this.port.onmessage = (event) => {
            if (event.data.type === 'setHRIR') {
                this.hrirData = new Float32Array(event.data.hrirData);
                this.decodeMatrix = new Float32Array(event.data.decodeMatrix);
                this.initialized = true;
            }
        };
    }

    process(
        inputs: Float32Array[][],
        outputs: Float32Array[][],
        parameters: Record<string, Float32Array>
    ): boolean {
        const input = inputs[0];
        const output = outputs[0];

        // Need 4 input channels (FOA) and 2 output channels (stereo)
        if (!input || input.length < 4 || !output || output.length < 2) {
            return true;
        }

        // If not initialized, pass silence
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

        // Process each sample
        for (let i = 0; i < blockSize; i++) {
            let sumL = 0;
            let sumR = 0;

            // Get FOA sample
            const w = inW[i];
            const y = inY[i];
            const z = inZ[i];
            const x = inX[i];

            // Decode to each virtual speaker and convolve
            for (let spk = 0; spk < NUM_SPEAKERS; spk++) {
                // Get decode coefficients for this speaker
                const decOffset = spk * 4;
                const decW = this.decodeMatrix[decOffset + 0];
                const decY = this.decodeMatrix[decOffset + 1];
                const decZ = this.decodeMatrix[decOffset + 2];
                const decX = this.decodeMatrix[decOffset + 3];

                // Decode FOA to speaker signal
                const speakerSignal = w * decW + y * decY + z * decZ + x * decX;

                // Store in circular buffer
                const buffer = this.speakerBuffers[spk];
                buffer[this.bufferIndex] = speakerSignal;

                // Time-domain convolution with HRIRs
                // HRIR layout: [L0(128), R0(128), L1(128), R1(128), ...]
                const hrirOffset = spk * 2 * HRIR_LENGTH;

                let convL = 0;
                let convR = 0;

                // Convolve: output[n] = sum(input[n-k] * hrir[k]) for k=0 to HRIR_LENGTH-1
                for (let k = 0; k < HRIR_LENGTH; k++) {
                    // Get sample from circular buffer at position (current - k)
                    let bufIdx = this.bufferIndex - k;
                    if (bufIdx < 0) bufIdx += HRIR_LENGTH;

                    const sample = buffer[bufIdx];

                    convL += sample * this.hrirData[hrirOffset + k];
                    convR += sample * this.hrirData[hrirOffset + HRIR_LENGTH + k];
                }

                sumL += convL;
                sumR += convR;
            }

            // Apply gain scaling (divide by number of speakers to prevent clipping)
            const scale = 1.0 / NUM_SPEAKERS;
            outL[i] = sumL * scale;
            outR[i] = sumR * scale;

            // Advance circular buffer index
            this.bufferIndex = (this.bufferIndex + 1) % HRIR_LENGTH;
        }

        return true;
    }
}

registerProcessor('foa-binaural-decoder', FOABinauralDecoderProcessor);
