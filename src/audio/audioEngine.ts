/**
 * Audio Engine for SC360 Spatial Audio
 * Using JSAmbisonics npm package
 * SC360 Spatial Audio Engine - HOA Panner Implementation
 * 
 * Signal flow:
 * Source → GainNode → monoEncoder → sceneMirror → orderLimiter → binDecoder → Output
 */

import * as ambisonics from 'ambisonics';
import { AUDIO_ASSETS, NUM_OBJECTS } from './constants';

export interface ObjectPosition {
    x: number;
    y: number;
    azimuth: number;   // Degrees
    elevation: number; // Degrees
}

// HRIR options for binaural decoding
export interface HRIROption {
    name: string;
    order: number;
    url: string;
}

export const HRIR_OPTIONS: HRIROption[] = [
    { name: 'Free-field HRIRs 1', order: 3, url: '/audio/hrir/HOA3_IRC_1008_virtual.wav' },
    { name: 'Free-field HRIRs 2', order: 3, url: '/audio/hrir/aalto2016_N3.wav' },
    { name: 'Medium room BRIRs', order: 3, url: '/audio/hrir/HOA3_BRIRs-medium.wav' },
];

// Mirror options
export const MIRROR_OPTIONS = [
    { value: 0, name: 'None' },
    { value: 1, name: 'Front-Back' },
    { value: 2, name: 'Left-Right' },
    { value: 3, name: 'Up-Down' },
];

// Max HOA order
const MAX_ORDER = 3;

export class AudioEngine {
    private audioContext: AudioContext | null = null;
    private audioBuffers: AudioBuffer[] = [];
    private sourceNodes: AudioBufferSourceNode[] = [];
    private gainNodes: GainNode[] = [];

    // JSAmbisonics components
    private encoders: any[] = [];
    private mirror: any = null;
    private limiter: any = null;
    private decoder: any = null;
    private analyser: any = null;

    // State
    private currentOrder: number = MAX_ORDER;
    private currentMirror: number = 0;
    private currentHRIRIndex: number = 2; // Default to Medium room BRIRs

    // Mixing
    private ambisonicBus: GainNode | null = null;
    private masterGain: GainNode | null = null;

    private isPlaying = false;
    private isLoaded = false;
    private filtersLoaded = false;

    /**
     * Initialize the audio engine
     */
    async init(): Promise<void> {
        if (this.audioContext) {
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            return;
        }

        this.audioContext = new AudioContext();

        // Handle Firefox suspension
        this.audioContext.onstatechange = () => {
            if (this.audioContext?.state === 'suspended') {
                this.audioContext.resume();
            }
        };

        await this.initAmbisonicChain(MAX_ORDER);
        await this.loadHRIRFilters(HRIR_OPTIONS[this.currentHRIRIndex]);
        await this.loadAudioAssets();

        console.log('AudioEngine initialized with JSAmbisonics (Order 3)');
    }

    /**
     * Initialize the ambisonic processing chain
     */
    private async initAmbisonicChain(order: number): Promise<void> {
        if (!this.audioContext) return;

        const nCh = (order + 1) ** 2; // 16 for Order 3

        // Clear existing nodes
        this.encoders.forEach(e => e?.out?.disconnect());
        this.encoders = [];
        this.gainNodes.forEach(g => g.disconnect());
        this.gainNodes = [];

        // Create ambisonic bus
        this.ambisonicBus = this.audioContext.createGain();
        this.ambisonicBus.channelCount = nCh;
        this.ambisonicBus.channelCountMode = 'explicit';
        this.ambisonicBus.channelInterpretation = 'discrete';

        // Create encoder per audio object
        for (let i = 0; i < NUM_OBJECTS; i++) {
            const encoder = new ambisonics.monoEncoder(this.audioContext, order);
            encoder.azim = 0;
            encoder.elev = 0;
            encoder.updateGains();
            this.encoders.push(encoder);

            const gainNode = this.audioContext.createGain();
            this.gainNodes.push(gainNode);

            gainNode.connect(encoder.in);
            encoder.out.connect(this.ambisonicBus);
        }

        // Create scene mirror
        this.mirror = new ambisonics.sceneMirror(this.audioContext, order);

        // Create order limiter (allows reducing order dynamically)
        this.limiter = new ambisonics.orderLimiter(this.audioContext, order, this.currentOrder);

        // Create binaural decoder
        this.decoder = new ambisonics.binDecoder(this.audioContext, order);

        // Create intensity analyser
        this.analyser = new ambisonics.intensityAnalyser(this.audioContext, order);

        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 2.0;
        this.masterGain.connect(this.audioContext.destination);

        // Connect chain: Bus → Mirror → Limiter → Decoder → Output
        //                       ↘ Analyser
        this.ambisonicBus.connect(this.mirror.in);
        this.mirror.out.connect(this.analyser.in);
        this.mirror.out.connect(this.limiter.in);
        this.limiter.out.connect(this.decoder.in);
        this.decoder.out.connect(this.masterGain);
    }

    /**
     * Load HRIR filters using HOAloader
     */
    async loadHRIRFilters(hrirOption: HRIROption): Promise<void> {
        if (!this.audioContext || !this.decoder) return;

        // If no URL, use default cardioid filters
        if (!hrirOption.url) {
            this.decoder.resetFilters();
            this.filtersLoaded = true;
            console.log('Using default cardioid filters');
            return;
        }

        return new Promise((resolve) => {
            const loader = new ambisonics.HOAloader(
                this.audioContext,
                hrirOption.order,
                hrirOption.url,
                (buffer: AudioBuffer) => {
                    this.decoder!.updateFilters(buffer);
                    this.filtersLoaded = true;
                    console.log(`HRIR loaded: ${hrirOption.name}`);
                    resolve();
                }
            );

            loader.load();

            // Fallback timeout
            setTimeout(() => {
                if (!this.filtersLoaded) {
                    console.log('HRIR timeout, using cardioid filters');
                    this.filtersLoaded = true;
                    resolve();
                }
            }, 5000);
        });
    }

    /**
     * Change HRIR (UI control)
     */
    async setHRIR(hrirIndex: number): Promise<void> {
        if (hrirIndex < 0 || hrirIndex >= HRIR_OPTIONS.length) return;
        this.currentHRIRIndex = hrirIndex;
        this.filtersLoaded = false;
        await this.loadHRIRFilters(HRIR_OPTIONS[hrirIndex]);
    }

    /**
     * Set output order 1-3 (UI control)
     */
    setOrder(order: number): void {
        if (!this.limiter || order < 1 || order > MAX_ORDER) return;
        this.currentOrder = order;
        this.limiter.updateOrder(order);
        this.limiter.out.connect(this.decoder.in);
        console.log(`Order set to: N${order}`);
    }

    /**
     * Set mirror mode (UI control)
     * 0: none, 1: front-back, 2: left-right, 3: up-down
     */
    setMirror(planeNo: number): void {
        if (!this.mirror || planeNo < 0 || planeNo > 3) return;
        this.currentMirror = planeNo;
        this.mirror.mirror(planeNo);
        console.log(`Mirror set to: ${MIRROR_OPTIONS[planeNo].name}`);
    }

    /**
     * Load audio source files
     */
    private async loadAudioAssets(): Promise<void> {
        if (!this.audioContext) {
            throw new Error('AudioContext not initialized');
        }

        const loadPromises = AUDIO_ASSETS.map(async (asset) => {
            const response = await fetch(asset.path);
            if (!response.ok) {
                throw new Error(`Failed to load ${asset.path}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            return await this.audioContext!.decodeAudioData(arrayBuffer);
        });

        this.audioBuffers = await Promise.all(loadPromises);
        this.isLoaded = true;
        console.log('Audio assets loaded');
    }

    /**
     * Start playback
     */
    play(): void {
        if (!this.audioContext || !this.isLoaded || this.isPlaying) return;

        this.sourceNodes = this.audioBuffers.map((buffer, index) => {
            const source = this.audioContext!.createBufferSource();
            source.buffer = buffer;
            source.loop = true;
            source.connect(this.gainNodes[index]);
            return source;
        });

        const startTime = this.audioContext.currentTime + 0.01;
        this.sourceNodes.forEach((source) => source.start(startTime));
        this.isPlaying = true;
    }

    /**
     * Stop playback
     */
    stop(): void {
        if (!this.isPlaying) return;

        this.sourceNodes.forEach((source) => {
            try {
                source.stop();
                source.disconnect();
            } catch (e) { }
        });

        this.sourceNodes = [];
        this.isPlaying = false;
    }

    /**
     * Set gain for object
     */
    setGain(objectIndex: number, gain: number): void {
        if (objectIndex < 0 || objectIndex >= this.gainNodes.length) return;
        const clampedGain = Math.max(0, Math.min(1, gain));
        this.gainNodes[objectIndex].gain.setValueAtTime(
            clampedGain,
            this.audioContext?.currentTime ?? 0
        );
    }

    /**
     * Set mute state
     */
    setMuted(objectIndex: number, muted: boolean): void {
        if (objectIndex < 0 || objectIndex >= this.gainNodes.length) return;
        this.gainNodes[objectIndex].gain.setValueAtTime(
            muted ? 0 : 1,
            this.audioContext?.currentTime ?? 0
        );
    }

    /**
     * Update object spatial position
     */
    updateObjectPosition(objectIndex: number, position: ObjectPosition): void {
        if (objectIndex < 0 || objectIndex >= this.encoders.length) return;

        const encoder = this.encoders[objectIndex];
        if (!encoder) return;

        // JSAmbisonics uses degrees
        encoder.azim = position.azimuth;
        encoder.elev = position.elevation;
        encoder.updateGains();
    }

    // Getters for UI
    get order(): number { return this.currentOrder; }
    get ready(): boolean { return this.isLoaded && this.filtersLoaded; }
    get playing(): boolean { return this.isPlaying; }
    get contextState(): AudioContextState | null { return this.audioContext?.state ?? null; }

    /**
     * Cleanup
     */
    dispose(): void {
        this.stop();
        this.gainNodes.forEach((node) => node.disconnect());
        this.gainNodes = [];
        this.encoders = [];
        this.mirror = null;
        this.limiter = null;
        this.decoder = null;
        this.analyser = null;
        this.ambisonicBus?.disconnect();
        this.ambisonicBus = null;
        this.masterGain?.disconnect();
        this.masterGain = null;
        this.audioContext?.close();
        this.audioContext = null;
        this.audioBuffers = [];
        this.isLoaded = false;
        this.filtersLoaded = false;
    }
}

// Singleton
let audioEngineInstance: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
    if (!audioEngineInstance) {
        audioEngineInstance = new AudioEngine();
    }
    return audioEngineInstance;
}
