/**
 * RotaryKnob Component
 * Professional audio-style rotary knob with premium design
 */

import React, { useCallback, useRef, useState } from 'react';

interface RotaryKnobProps {
    value: number;          // 0-1 normalized
    onChange: (value: number) => void;
    size?: number;          // Size in pixels
    color?: string;         // Accent color
    label?: string;         // Label below knob
    disabled?: boolean;
    showValue?: boolean;
}

export const RotaryKnob: React.FC<RotaryKnobProps> = ({
    value,
    onChange,
    size = 56,
    color = '#00ff88',
    label,
    disabled = false,
    showValue = true,
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const startY = useRef(0);
    const startValue = useRef(0);

    // Angle range: 135° to 405° (270° sweep)
    const minAngle = 135;
    const maxAngle = 405;
    const angleRange = maxAngle - minAngle;

    const currentAngle = minAngle + value * angleRange;

    // Convert angle to SVG arc coordinates
    const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
        const rad = (angle - 90) * Math.PI / 180;
        return {
            x: cx + r * Math.cos(rad),
            y: cy + r * Math.sin(rad),
        };
    };

    const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
        const start = polarToCartesian(cx, cy, r, endAngle);
        const end = polarToCartesian(cx, cy, r, startAngle);
        const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
        return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
    };

    const handleStart = useCallback((clientY: number) => {
        if (disabled) return;
        setIsDragging(true);
        startY.current = clientY;
        startValue.current = value;
    }, [value, disabled]);

    const handleMove = useCallback((clientY: number) => {
        if (!isDragging) return;
        const deltaY = startY.current - clientY;
        const sensitivity = 0.004;
        const newValue = Math.max(0, Math.min(1, startValue.current + deltaY * sensitivity));
        onChange(newValue);
    }, [isDragging, onChange]);

    const handleEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (disabled) return;
        e.preventDefault();

        const startYPos = e.clientY;
        const startVal = value;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaY = startYPos - moveEvent.clientY;
            const sensitivity = 0.004;
            const newValue = Math.max(0, Math.min(1, startVal + deltaY * sensitivity));
            onChange(newValue);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        setIsDragging(true);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, [value, onChange, disabled]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
        handleStart(e.touches[0].clientY);
    }, [handleStart]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        handleMove(e.touches[0].clientY);
    }, [handleMove]);

    const handleTouchEnd = useCallback(() => {
        handleEnd();
    }, [handleEnd]);

    const center = size / 2;
    const outerRadius = size / 2 - 3;
    const arcRadius = outerRadius - 4;
    const innerRadius = outerRadius - 8;
    const indicatorRadius = innerRadius - 6;

    // Calculate indicator position
    const indicatorEnd = polarToCartesian(center, center, indicatorRadius, currentAngle);
    const indicatorStart = polarToCartesian(center, center, indicatorRadius * 0.4, currentAngle);

    return (
        <div
            className={`rotary-knob-container ${disabled ? 'disabled' : ''}`}
            style={{ width: size }}
        >
            <div
                className={`rotary-knob ${isDragging ? 'dragging' : ''}`}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                    width: size,
                    height: size,
                    cursor: disabled ? 'not-allowed' : 'ns-resize',
                }}
            >
                <svg width={size} height={size}>
                    <defs>
                        {/* Premium metallic gradient for knob body */}
                        <radialGradient id={`knobGrad-${size}`} cx="35%" cy="35%">
                            <stop offset="0%" stopColor="#4a4a55" />
                            <stop offset="50%" stopColor="#2a2a32" />
                            <stop offset="100%" stopColor="#1a1a20" />
                        </radialGradient>

                        {/* Outer ring gradient */}
                        <linearGradient id={`ringGrad-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
                            <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
                        </linearGradient>
                    </defs>

                    {/* Outer ring */}
                    <circle
                        cx={center}
                        cy={center}
                        r={outerRadius}
                        fill={`url(#ringGrad-${size})`}
                        stroke="rgba(0,0,0,0.5)"
                        strokeWidth="1"
                    />

                    {/* Background arc track */}
                    <path
                        d={describeArc(center, center, arcRadius, minAngle, maxAngle)}
                        fill="none"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="4"
                        strokeLinecap="round"
                    />

                    {/* Active arc */}
                    {value > 0.005 && (
                        <path
                            d={describeArc(center, center, arcRadius, minAngle, currentAngle)}
                            fill="none"
                            stroke={disabled ? '#444' : color}
                            strokeWidth="4"
                            strokeLinecap="round"
                            style={{
                                filter: disabled ? 'none' : `drop-shadow(0 0 3px ${color})`,
                            }}
                        />
                    )}

                    {/* Knob body */}
                    <circle
                        cx={center}
                        cy={center}
                        r={innerRadius}
                        fill={`url(#knobGrad-${size})`}
                        stroke="rgba(0,0,0,0.6)"
                        strokeWidth="1"
                    />

                    {/* Inner highlight */}
                    <circle
                        cx={center - innerRadius * 0.2}
                        cy={center - innerRadius * 0.2}
                        r={innerRadius * 0.4}
                        fill="rgba(255,255,255,0.03)"
                    />

                    {/* Indicator line */}
                    <line
                        x1={indicatorStart.x}
                        y1={indicatorStart.y}
                        x2={indicatorEnd.x}
                        y2={indicatorEnd.y}
                        stroke={disabled ? '#555' : '#fff'}
                        strokeWidth="2"
                        strokeLinecap="round"
                        style={{
                            filter: disabled ? 'none' : 'drop-shadow(0 0 2px rgba(255,255,255,0.5))',
                        }}
                    />
                </svg>
            </div>

            {showValue && (
                <span className="knob-value" style={{ color: disabled ? '#444' : 'inherit' }}>
                    {disabled ? '-∞' : `${Math.round(value * 100)}%`}
                </span>
            )}

            {label && (
                <span className="knob-label" style={{ color: disabled ? '#444' : color }}>
                    {label}
                </span>
            )}
        </div>
    );
};

export default RotaryKnob;
