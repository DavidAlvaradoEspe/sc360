/**
 * ObjectControls Component
 * Professional mixer-style controls with rotary knobs
 */

import React from 'react';
import { AUDIO_ASSETS, OBJECT_COLORS, xToAzimuth, yToElevation } from '../audio/constants';
import { RotaryKnob } from './RotaryKnob';
import { ObjectPosition } from './SpatialGrid';

interface ObjectControlsProps {
    gains: number[];
    muted: boolean[];
    positions: ObjectPosition[];
    onGainChange: (index: number, gain: number) => void;
    onMuteToggle: (index: number) => void;
}

export const ObjectControls: React.FC<ObjectControlsProps> = ({
    gains,
    muted,
    positions,
    onGainChange,
    onMuteToggle,
}) => {
    return (
        <div className="mixer-panel">
            <div className="mixer-header">
                <span className="mixer-title">CHANNEL MIXER</span>
            </div>

            <div className="mixer-channels">
                {AUDIO_ASSETS.map((asset, index) => {
                    const pos = positions[index] || { x: 0.5, y: 0.5 };
                    const azimuth = xToAzimuth(pos.x);
                    const elevation = yToElevation(pos.y);

                    return (
                        <div
                            key={asset.id}
                            className={`mixer-channel ${muted[index] ? 'muted' : ''}`}
                        >
                            {/* Channel strip background glow */}
                            <div
                                className="channel-glow"
                                style={{
                                    background: muted[index]
                                        ? 'transparent'
                                        : `radial-gradient(ellipse at center bottom, ${OBJECT_COLORS[index]}20 0%, transparent 70%)`
                                }}
                            />

                            {/* Channel label */}
                            <span
                                className="channel-name"
                                style={{ color: OBJECT_COLORS[index] }}
                                title={asset.name}
                            >
                                {asset.name.toUpperCase()}
                            </span>

                            {/* Position info */}
                            <div className="channel-position">
                                <span className="position-label">Az: {azimuth.toFixed(1)}°</span>
                                <span className="position-label">El: {elevation.toFixed(1)}°</span>
                            </div>

                            {/* Volume knob */}
                            <RotaryKnob
                                value={muted[index] ? 0 : gains[index]}
                                onChange={(val) => onGainChange(index, val)}
                                color={OBJECT_COLORS[index]}
                                disabled={muted[index]}
                                size={70}
                                showValue={true}
                            />

                            {/* Mute button */}
                            <button
                                className={`channel-mute ${muted[index] ? 'active' : ''}`}
                                onClick={() => onMuteToggle(index)}
                                style={{
                                    borderColor: muted[index] ? '#ff4444' : OBJECT_COLORS[index],
                                    color: muted[index] ? '#ff4444' : OBJECT_COLORS[index],
                                }}
                            >
                                {muted[index] ? 'M' : 'M'}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ObjectControls;
