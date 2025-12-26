/**
 * ChannelMeter Component
 * Displays FOA channel levels (W, Y, Z, X) for debugging
 */

import React from 'react';

interface ChannelMeterProps {
    levels: number[]; // [W, Y, Z, X] normalized 0-1
    isActive: boolean;
}

const CHANNEL_NAMES = ['W', 'Y', 'Z', 'X'];
const CHANNEL_COLORS = ['#4ecdc4', '#ffe66d', '#ff6b6b', '#a29bfe'];

export const ChannelMeter: React.FC<ChannelMeterProps> = ({ levels, isActive }) => {
    return (
        <div className="channel-meter-container">
            <h3 className="meter-title">FOA Bus Levels</h3>
            <div className="channel-meters">
                {CHANNEL_NAMES.map((name, index) => {
                    const level = isActive ? Math.min(1, Math.max(0, levels[index] || 0)) : 0;
                    // Ensure minimum visible height when there's any signal
                    const displayPercentage = level > 0.01 ? Math.max(5, level * 100) : 0;

                    return (
                        <div key={name} className="channel-meter">
                            <div className="meter-label">{name}</div>
                            <div className="meter-bar-container">
                                <div
                                    className="meter-bar"
                                    style={{
                                        height: `${displayPercentage}%`,
                                        backgroundColor: CHANNEL_COLORS[index],
                                        boxShadow: level > 0.1 ? `0 0 0.5rem ${CHANNEL_COLORS[index]}` : 'none',
                                    }}
                                />
                            </div>
                            <div className="meter-value">
                                {isActive ? (level * 100).toFixed(0) : '--'}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ChannelMeter;
