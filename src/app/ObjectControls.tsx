/**
 * ObjectControls Component
 * Professional mixer-style channel strips with rotary knobs
 * Vertical layout beside the spatial grid
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
    disabled?: boolean;
}

export const ObjectControls: React.FC<ObjectControlsProps> = ({
    gains,
    muted,
    positions,
    onGainChange,
    onMuteToggle,
    disabled = false,
}) => {
    return (
        <div className={`channel-mixer ${disabled ? 'disabled' : ''}`}>
            <div className="mixer-header">
                <span className="mixer-title">CHANNEL MIXER</span>
            </div>

            <div className="channel-strips">
                {AUDIO_ASSETS.map((asset, index) => {
                    const pos = positions[index] || { x: 0.5, y: 0.5 };
                    const azimuth = xToAzimuth(pos.x);
                    const elevation = yToElevation(pos.y);
                    const elevZone = pos.y < 0.33 ? 'UP' : pos.y > 0.66 ? 'DOWN' : 'CENTER';
                    const isMuted = muted[index];
                    const color = OBJECT_COLORS[index];

                    return (
                        <div
                            key={asset.id}
                            className={`channel-strip ${isMuted ? 'muted' : ''}`}
                        >
                            {/* Header: Color indicator + Name + Mute */}
                            <div className="strip-header">
                                <span
                                    className="channel-indicator"
                                    style={{ backgroundColor: color }}
                                />
                                <span
                                    className="channel-name"
                                    style={{ color: isMuted ? 'var(--text-muted)' : color }}
                                >
                                    {asset.name.toUpperCase()}
                                </span>
                                <button
                                    className={`mute-btn ${isMuted ? 'active' : ''}`}
                                    onClick={() => onMuteToggle(index)}
                                    style={{
                                        borderColor: isMuted ? 'var(--accent-danger)' : color,
                                        color: isMuted ? 'var(--accent-danger)' : color,
                                    }}
                                >
                                    M
                                </button>
                            </div>

                            {/* Body: Knob + Position Info */}
                            <div className="strip-body">
                                <div
                                    className="knob-glow"
                                    style={{
                                        background: isMuted
                                            ? 'transparent'
                                            : `radial-gradient(circle, ${color}15 0%, transparent 70%)`
                                    }}
                                />
                                <RotaryKnob
                                    value={isMuted ? 0 : gains[index]}
                                    onChange={(val) => onGainChange(index, val)}
                                    color={color}
                                    disabled={isMuted}
                                    size={52}
                                    showValue={true}
                                    label="VOL"
                                />

                                <div className="position-info">
                                    <div className="pos-row">
                                        <span className="pos-label">Az</span>
                                        <span className="pos-value">{azimuth >= 0 ? '+' : ''}{azimuth.toFixed(0)}°</span>
                                    </div>
                                    <div className="pos-row">
                                        <span className="pos-label">El</span>
                                        <span className="pos-value">{elevation >= 0 ? '+' : ''}{elevation.toFixed(0)}°</span>
                                    </div>
                                    <div className="pos-row">
                                        <span
                                            className="pos-zone"
                                            style={{
                                                color: elevZone === 'UP' ? 'var(--accent-primary)'
                                                    : elevZone === 'DOWN' ? 'var(--accent-warning)'
                                                        : 'var(--text-muted)'
                                            }}
                                        >
                                            {elevZone}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ObjectControls;
