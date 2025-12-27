/**
 * SpatialGrid Component
 * Displays a rectangular grid with draggable dots representing audio objects
 * Supports both mouse and touch events for mobile
 */

import React, { useRef, useCallback } from 'react';
import {
    OBJECT_COLORS,
    xToAzimuth,
    yToElevation,
} from '../audio/constants';

export interface ObjectPosition {
    x: number;
    y: number;
}

interface SpatialGridProps {
    positions: ObjectPosition[];
    onPositionChange: (index: number, position: ObjectPosition) => void;
    disabled?: boolean;
}

const DOT_RADIUS = 24;

export const SpatialGrid: React.FC<SpatialGridProps> = ({
    positions,
    onPositionChange,
    disabled = false,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const draggingRef = useRef<number | null>(null);

    // Get normalized position from client coordinates
    const getPositionFromClient = useCallback(
        (clientX: number, clientY: number): ObjectPosition | null => {
            if (!containerRef.current) return null;

            const rect = containerRef.current.getBoundingClientRect();
            const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

            return { x, y };
        },
        []
    );

    // Mouse events
    const handleMouseDown = useCallback(
        (index: number) => (e: React.MouseEvent) => {
            e.preventDefault();
            draggingRef.current = index;

            const handleMouseMove = (moveEvent: MouseEvent) => {
                if (draggingRef.current === null) return;
                const pos = getPositionFromClient(moveEvent.clientX, moveEvent.clientY);
                if (pos) {
                    onPositionChange(draggingRef.current, pos);
                }
            };

            const handleMouseUp = () => {
                draggingRef.current = null;
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };

            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        },
        [getPositionFromClient, onPositionChange]
    );

    // Touch events
    const handleTouchStart = useCallback(
        (index: number) => (e: React.TouchEvent) => {
            e.preventDefault();
            e.stopPropagation();
            draggingRef.current = index;

            const handleTouchMove = (moveEvent: TouchEvent) => {
                moveEvent.preventDefault();
                if (draggingRef.current === null) return;
                const touch = moveEvent.touches[0];
                const pos = getPositionFromClient(touch.clientX, touch.clientY);
                if (pos) {
                    onPositionChange(draggingRef.current, pos);
                }
            };

            const handleTouchEnd = () => {
                draggingRef.current = null;
                window.removeEventListener('touchmove', handleTouchMove);
                window.removeEventListener('touchend', handleTouchEnd);
                window.removeEventListener('touchcancel', handleTouchEnd);
            };

            window.addEventListener('touchmove', handleTouchMove, { passive: false });
            window.addEventListener('touchend', handleTouchEnd);
            window.addEventListener('touchcancel', handleTouchEnd);
        },
        [getPositionFromClient, onPositionChange]
    );

    return (
        <div className="spatial-grid-container">
            <div
                ref={containerRef}
                className={`spatial-grid ${disabled ? 'disabled' : ''}`}
            >
                {/* Grid lines */}
                <div className="grid-lines">
                    <div className="grid-line-h center" />
                    <div className="grid-line-v center" />
                </div>

                {/* Axis labels */}
                <div className="axis-label left">+180°</div>
                <div className="axis-label right">-180°</div>
                <div className="axis-label top">+90°</div>
                <div className="axis-label bottom">-90°</div>
                <div className="axis-label center-label">0°</div>

                {/* Draggable dots */}
                {positions.map((pos, index) => {
                    const azimuth = xToAzimuth(pos.x);
                    const elevation = yToElevation(pos.y);

                    return (
                        <div
                            key={index}
                            className="object-dot"
                            style={{
                                left: `${pos.x * 100}%`,
                                top: `${pos.y * 100}%`,
                                backgroundColor: OBJECT_COLORS[index],
                                width: DOT_RADIUS * 2,
                                height: DOT_RADIUS * 2,
                                transform: 'translate(-50%, -50%)',
                            }}
                            onMouseDown={handleMouseDown(index)}
                            onTouchStart={handleTouchStart(index)}
                        >
                            <span className="dot-label">{index + 1}</span>
                            <div className="dot-tooltip">
                                <div>Az: {azimuth.toFixed(1)}°</div>
                                <div>El: {elevation.toFixed(1)}°</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SpatialGrid;
