/**
 * Audio Engine for Spatial Audio MVP
 * Phase 3: FOA encoding → Binaural decoding
 * 
 * Signal flow:
 * Source → GainNode → FOA Encoder (4ch) → FOA Bus → Binaural Decoder → Stereo Output
 */

import { AUDIO_ASSETS, NUM_OBJECTS, degToRad } from './constants';
import { loadSOFAHRIRs } from './hrtf/sofaLoader';

export interface ObjectPosition {
    x: number; // Normalized 0-1
    y: number; // Normalized 0-1
    azimuth: number; // Degrees
    elevation: number; // Degrees
}

export class AudioEngine {
    private audioContext: AudioContext | null = null;
    private audioBuffers: AudioBuffer[] = [];
    private sourceNodes: AudioBufferSourceNode[] = [];
    private gainNodes: GainNode[] = [];
    private foaEncoders: AudioWorkletNode[] = [];
    private foaBus: GainNode | null = null;
    private binauralDecoder: AudioWorkletNode | null = null;
    private channelSplitter: ChannelSplitterNode | null = null;
    private channelAnalyzers: AnalyserNode[] = [];
    private masterGain: GainNode | null = null;
    private isPlaying = false;
    private isLoaded = false;
    private workletReady = false;

    /**
     * Initialize the AudioContext (must be called after user interaction)
     */
    async init(): Promise<void> {
        if (this.audioContext) {
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            return;
        }

        this.audioContext = new AudioContext();

        // Load and register worklets
        await this.registerWorklets();

        // Create FOA bus (4 channels: W, Y, Z, X)
        this.foaBus = this.audioContext.createGain();
        this.foaBus.channelCount = 4;
        this.foaBus.channelCountMode = 'explicit';
        this.foaBus.channelInterpretation = 'discrete';

        // Create channel splitter for analysis (4 → 4 separate)
        this.channelSplitter = this.audioContext.createChannelSplitter(4);
        this.foaBus.connect(this.channelSplitter);

        // Create analyzers for each FOA channel
        for (let i = 0; i < 4; i++) {
            const analyzer = this.audioContext.createAnalyser();
            analyzer.fftSize = 256;
            analyzer.smoothingTimeConstant = 0.9;
            this.channelSplitter.connect(analyzer, i);
            this.channelAnalyzers.push(analyzer);
        }

        // Create binaural decoder worklet (4ch FOA → 2ch stereo)
        this.binauralDecoder = new AudioWorkletNode(this.audioContext, 'foa-binaural-decoder', {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            outputChannelCount: [2], // Stereo output
        });

        // Load HRIR data from SOFA file (with automatic fallback to built-in)
        const sofaResult = await loadSOFAHRIRs(this.audioContext.sampleRate);

        // Send HRIR data and decode matrix to the decoder worklet
        this.binauralDecoder.port.postMessage({
            type: 'setHRIR',
            hrirData: sofaResult.hrirData.buffer,
            decodeMatrix: sofaResult.decodeMatrix.buffer,
        }, [sofaResult.hrirData.buffer, sofaResult.decodeMatrix.buffer]);

        // Create master gain
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);

        // Connect: FOA bus → Binaural Decoder → Master Gain → Destination
        this.foaBus.connect(this.binauralDecoder);
        this.binauralDecoder.connect(this.masterGain);

        // Create gain nodes and FOA encoders for each object
        for (let i = 0; i < NUM_OBJECTS; i++) {
            // Input gain node
            const gainNode = this.audioContext.createGain();
            this.gainNodes.push(gainNode);

            // FOA encoder worklet
            const encoder = new AudioWorkletNode(this.audioContext, 'foa-encoder', {
                numberOfInputs: 1,
                numberOfOutputs: 1,
                outputChannelCount: [4], // 4-channel output
            });

            gainNode.connect(encoder);
            encoder.connect(this.foaBus);
            this.foaEncoders.push(encoder);
        }

        await this.loadAudioAssets();
    }

    /**
     * Register AudioWorklet modules
     */
    private async registerWorklets(): Promise<void> {
        if (!this.audioContext) {
            throw new Error('AudioContext not initialized');
        }

        try {
            // Register FOA encoder
            await this.audioContext.audioWorklet.addModule(
                new URL('./worklets/foa-encoder.worklet.ts', import.meta.url).href
            );

            // Register binaural decoder
            await this.audioContext.audioWorklet.addModule(
                new URL('./worklets/foa-binaural-decoder.worklet.ts', import.meta.url).href
            );

            this.workletReady = true;
        } catch (error) {
            console.error('Failed to register worklet:', error);
            throw error;
        }
    }

    /**
     * Load all audio assets
     */
    private async loadAudioAssets(): Promise<void> {
        if (!this.audioContext) {
            throw new Error('AudioContext not initialized');
        }


        const loadPromises = AUDIO_ASSETS.map(async (asset) => {
            const response = await fetch(asset.path);
            if (!response.ok) {
                throw new Error(`Failed to load ${asset.path}: ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
            return audioBuffer;
        });

        this.audioBuffers = await Promise.all(loadPromises);
        this.isLoaded = true;
    }

    /**
     * Start playback of all stems
     */
    play(): void {
        if (!this.audioContext || !this.isLoaded) {
            return;
        }

        if (this.isPlaying) {
            return;
        }

        // Create new source nodes for each buffer
        this.sourceNodes = this.audioBuffers.map((buffer, index) => {
            const source = this.audioContext!.createBufferSource();
            source.buffer = buffer;
            source.loop = true;
            source.connect(this.gainNodes[index]);
            return source;
        });

        // Start all sources at the same time
        const startTime = this.audioContext.currentTime + 0.01;
        this.sourceNodes.forEach((source) => source.start(startTime));

        this.isPlaying = true;
    }

    /**
     * Stop playback of all stems
     */
    stop(): void {
        if (!this.isPlaying) {
            return;
        }

        this.sourceNodes.forEach((source) => {
            try {
                source.stop();
                source.disconnect();
            } catch (e) {
                // Source may already be stopped
            }
        });

        this.sourceNodes = [];
        this.isPlaying = false;
    }

    /**
     * Set gain for a specific object
     */
    setGain(objectIndex: number, gain: number): void {
        if (objectIndex < 0 || objectIndex >= this.gainNodes.length) {
            return;
        }
        const clampedGain = Math.max(0, Math.min(1, gain));
        this.gainNodes[objectIndex].gain.setValueAtTime(
            clampedGain,
            this.audioContext?.currentTime ?? 0
        );
    }

    /**
     * Set mute state for a specific object
     */
    setMuted(objectIndex: number, muted: boolean): void {
        if (objectIndex < 0 || objectIndex >= this.gainNodes.length) {
            return;
        }
        this.gainNodes[objectIndex].gain.setValueAtTime(
            muted ? 0 : 1,
            this.audioContext?.currentTime ?? 0
        );
    }

    /**
     * Update object position - sends azimuth/elevation to FOA encoder worklet
     */
    updateObjectPosition(objectIndex: number, position: ObjectPosition): void {
        if (objectIndex < 0 || objectIndex >= this.foaEncoders.length) {
            return;
        }

        const encoder = this.foaEncoders[objectIndex];
        if (!encoder) return;

        // Convert degrees to radians for the worklet
        const azRad = degToRad(position.azimuth);
        const elRad = degToRad(position.elevation);

        // Set worklet parameters
        const azParam = encoder.parameters.get('azimuth');
        const elParam = encoder.parameters.get('elevation');

        if (azParam) {
            azParam.setValueAtTime(azRad, this.audioContext?.currentTime ?? 0);
        }
        if (elParam) {
            elParam.setValueAtTime(elRad, this.audioContext?.currentTime ?? 0);
        }
    }

    /**
     * Get current FOA channel levels for metering
     * Returns array of 4 values [W, Y, Z, X] normalized 0-1
     */
    getChannelLevels(): number[] {
        if (!this.isPlaying || this.channelAnalyzers.length < 4) {
            return [0, 0, 0, 0];
        }

        const levels: number[] = [];
        const dataArray = new Float32Array(128);

        for (let i = 0; i < 4; i++) {
            const analyzer = this.channelAnalyzers[i];
            analyzer.getFloatTimeDomainData(dataArray);

            // Calculate RMS level
            let sum = 0;
            for (let j = 0; j < dataArray.length; j++) {
                sum += dataArray[j] * dataArray[j];
            }
            const rms = Math.sqrt(sum / dataArray.length);

            // Convert to dB scale for better visual response
            // RMS values are typically very small (0.001 - 0.1)
            // Apply logarithmic scaling to make meters more visible
            const db = rms > 0.0001 ? 20 * Math.log10(rms) : -80;

            // Map dB range (-60 to 0) to 0-1
            // -60dB = 0, 0dB = 1
            const normalized = Math.max(0, Math.min(1, (db + 60) / 60));

            levels.push(normalized);
        }

        return levels;
    }

    /**
     * Check if audio is ready
     */
    get ready(): boolean {
        return this.isLoaded && this.workletReady;
    }

    /**
     * Check if currently playing
     */
    get playing(): boolean {
        return this.isPlaying;
    }

    /**
     * Get AudioContext state
     */
    get contextState(): AudioContextState | null {
        return this.audioContext?.state ?? null;
    }

    /**
     * Cleanup resources
     */
    dispose(): void {
        this.stop();
        this.gainNodes.forEach((node) => node.disconnect());
        this.gainNodes = [];
        this.foaEncoders.forEach((node) => node.disconnect());
        this.foaEncoders = [];
        this.channelAnalyzers.forEach((node) => node.disconnect());
        this.channelAnalyzers = [];
        this.channelSplitter?.disconnect();
        this.channelSplitter = null;
        this.binauralDecoder?.disconnect();
        this.binauralDecoder = null;
        this.foaBus?.disconnect();
        this.foaBus = null;
        this.masterGain?.disconnect();
        this.masterGain = null;
        this.audioContext?.close();
        this.audioContext = null;
        this.audioBuffers = [];
        this.isLoaded = false;
        this.workletReady = false;
    }
}

// Singleton instance
let audioEngineInstance: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
    if (!audioEngineInstance) {
        audioEngineInstance = new AudioEngine();
    }
    return audioEngineInstance;
}
