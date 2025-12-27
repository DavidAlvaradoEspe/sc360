/**
 * Main App Component - SC360 Spatial Audio
 */

import React, { useState, useEffect, useCallback } from 'react';
import { SpatialGrid, ObjectPosition } from './SpatialGrid';
import { ObjectControls } from './ObjectControls';

import {
    DEFAULT_POSITIONS,
    NUM_OBJECTS,
    xToAzimuth,
    yToElevation,
} from '../audio/constants';
import { getAudioEngine, HRIR_OPTIONS, MIRROR_OPTIONS } from '../audio/audioEngine';
import './styles.css';

const App: React.FC = () => {
    const [audioReady, setAudioReady] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [contextState, setContextState] = useState<string>('uninitialized');
    const [positions, setPositions] = useState<ObjectPosition[]>(
        DEFAULT_POSITIONS.map((p) => ({ ...p }))
    );
    const [gains, setGains] = useState<number[]>(Array(NUM_OBJECTS).fill(1));
    const [muted, setMuted] = useState<boolean[]>(Array(NUM_OBJECTS).fill(false));


    // HOA Controls state
    const [currentOrder, setCurrentOrder] = useState(3);
    const [currentHRIR, setCurrentHRIR] = useState(0); // Default to Free Field HRIRs 1
    const [currentMirror, setCurrentMirror] = useState(0);

    const audioEngine = getAudioEngine();



    // Start Audio button handler
    const handleStartAudio = useCallback(async () => {
        try {
            await audioEngine.init();
            setAudioReady(audioEngine.ready);
            setContextState(audioEngine.contextState ?? 'unknown');
        } catch (error) {
            console.error('Failed to initialize audio:', error);
        }
    }, [audioEngine]);

    // Play button handler
    const handlePlay = useCallback(() => {
        audioEngine.play();
        setIsPlaying(audioEngine.playing);
    }, [audioEngine]);

    // Stop button handler
    const handleStop = useCallback(() => {
        audioEngine.stop();
        setIsPlaying(audioEngine.playing);

    }, [audioEngine]);

    // Position change handler
    const handlePositionChange = useCallback(
        (index: number, position: ObjectPosition) => {
            setPositions((prev) => {
                const newPositions = [...prev];
                newPositions[index] = position;
                return newPositions;
            });

            audioEngine.updateObjectPosition(index, {
                x: position.x,
                y: position.y,
                azimuth: xToAzimuth(position.x),
                elevation: yToElevation(position.y),
            });
        },
        [audioEngine]
    );

    // Gain change handler
    const handleGainChange = useCallback(
        (index: number, gain: number) => {
            setGains((prev) => {
                const newGains = [...prev];
                newGains[index] = gain;
                return newGains;
            });
            audioEngine.setGain(index, gain);
        },
        [audioEngine]
    );

    // Mute toggle handler
    const handleMuteToggle = useCallback(
        (index: number) => {
            setMuted((prev) => {
                const newMuted = [...prev];
                newMuted[index] = !newMuted[index];
                audioEngine.setMuted(index, newMuted[index]);
                return newMuted;
            });
        },
        [audioEngine]
    );

    // Order change handler
    const handleOrderChange = useCallback(
        (order: number) => {
            setCurrentOrder(order);
            audioEngine.setOrder(order);
        },
        [audioEngine]
    );

    // HRIR change handler
    const handleHRIRChange = useCallback(
        async (index: number) => {
            setCurrentHRIR(index);
            await audioEngine.setHRIR(index);
        },
        [audioEngine]
    );

    // Mirror change handler
    const handleMirrorChange = useCallback(
        (mode: number) => {
            setCurrentMirror(mode);
            audioEngine.setMirror(mode);
        },
        [audioEngine]
    );

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            audioEngine.dispose();
        };
    }, [audioEngine]);

    return (
        <div className="app">
            <main className="app-main">
                {/* Audio Controls */}
                <div className="audio-controls">
                    <button
                        className="control-button start-button"
                        onClick={handleStartAudio}
                        disabled={audioReady}
                    >
                        {audioReady ? '✓ AUDIO READY' : '🔊 START AUDIO'}
                    </button>

                    <button
                        className="control-button play-button"
                        onClick={handlePlay}
                        disabled={!audioReady || isPlaying}
                    >
                        ▶ Play
                    </button>

                    <button
                        className="control-button stop-button"
                        onClick={handleStop}
                        disabled={!audioReady || !isPlaying}
                    >
                        ■ Stop
                    </button>

                    <span className="context-state">
                        Context: {contextState}
                    </span>
                </div>

                {/* HOA Controls Row */}
                <div className="hoa-controls">
                    {/* Order Selector */}
                    <div className="control-group">
                        <span className="control-label">Order:</span>
                        {[1, 2, 3].map((order) => (
                            <button
                                key={order}
                                className={`hoa-button ${currentOrder === order ? 'active' : ''}`}
                                onClick={() => handleOrderChange(order)}
                                disabled={!audioReady}
                            >
                                N{order}
                            </button>
                        ))}
                    </div>

                    {/* HRIR Selector */}
                    <div className="control-group">
                        <span className="control-label">Decoder:</span>
                        {HRIR_OPTIONS.map((option, index) => (
                            <button
                                key={index}
                                className={`hoa-button ${currentHRIR === index ? 'active' : ''}`}
                                onClick={() => handleHRIRChange(index)}
                                disabled={!audioReady}
                            >
                                {option.name}
                            </button>
                        ))}
                    </div>

                    {/* Mirror Selector */}
                    <div className="control-group">
                        <span className="control-label">Mirror:</span>
                        {MIRROR_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                className={`hoa-button ${currentMirror === option.value ? 'active' : ''}`}
                                onClick={() => handleMirrorChange(option.value)}
                                disabled={!audioReady}
                            >
                                {option.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content: Grid + Mixer */}
                <div className={`main-content-layout ${!audioReady ? 'locked' : ''}`}>
                    <SpatialGrid
                        positions={positions}
                        onPositionChange={handlePositionChange}
                        disabled={!audioReady}
                    />

                    <ObjectControls
                        gains={gains}
                        muted={muted}
                        positions={positions}
                        onGainChange={handleGainChange}
                        onMuteToggle={handleMuteToggle}
                        disabled={!audioReady}
                    />
                </div>
            </main>
        </div>
    );
};

export default App;

