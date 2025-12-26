/**
 * Main App Component - SC360 Spatial Audio
 * Production Build
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SpatialGrid, ObjectPosition } from './SpatialGrid';
import { ObjectControls } from './ObjectControls';
import { ChannelMeter } from './ChannelMeter';
import {
    DEFAULT_POSITIONS,
    NUM_OBJECTS,
    xToAzimuth,
    yToElevation,
} from '../audio/constants';
import { getAudioEngine } from '../audio/audioEngine';
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
    const [channelLevels, setChannelLevels] = useState<number[]>([0, 0, 0, 0]);

    const audioEngine = getAudioEngine();
    const animationFrameRef = useRef<number | undefined>(undefined);

    // Animation loop for channel meters
    useEffect(() => {
        const updateMeters = () => {
            if (isPlaying) {
                const levels = audioEngine.getChannelLevels();
                setChannelLevels(levels);
            }
            animationFrameRef.current = requestAnimationFrame(updateMeters);
        };

        animationFrameRef.current = requestAnimationFrame(updateMeters);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isPlaying, audioEngine]);

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
        setChannelLevels([0, 0, 0, 0]);
    }, [audioEngine]);

    // Position change handler
    const handlePositionChange = useCallback(
        (index: number, position: ObjectPosition) => {
            setPositions((prev) => {
                const newPositions = [...prev];
                newPositions[index] = position;
                return newPositions;
            });

            // Update audio engine with new position
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

                {/* Spatial Grid + Channel Meters side by side */}
                <div className="grid-meter-container">
                    <SpatialGrid
                        positions={positions}
                        onPositionChange={handlePositionChange}
                    />

                    <ChannelMeter
                        levels={channelLevels}
                        isActive={isPlaying}
                    />
                </div>

                {/* Object Controls */}
                <ObjectControls
                    gains={gains}
                    muted={muted}
                    positions={positions}
                    onGainChange={handleGainChange}
                    onMuteToggle={handleMuteToggle}
                />
            </main>
        </div>
    );
};

export default App;
