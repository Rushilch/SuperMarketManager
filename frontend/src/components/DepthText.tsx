import React, { useState, useEffect, useRef } from 'react';

export interface DepthTextProps {
  text: string;
  layers?: number;
  depth?: number;
  className?: string;
  frontColor?: string;
  layerColor?: string;
  strokeColor?: string;
}

/**
 * DepthText - ReactBits 3D Extruded Layered Typography
 * Creates an interactive 3D extruded text effect where stacked layers
 * dynamically shift in parallax response to pointer movement.
 */
export const DepthText: React.FC<DepthTextProps> = ({
  text,
  layers = 8,
  depth = 4,
  className = '',
  frontColor = 'var(--neo-yellow, #FFE600)',
  layerColor = '#000000',
  strokeColor = '#000000',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // Default non-zero initial offset so it looks extruded even before mouse movement
  const [offset, setOffset] = useState({ x: 1, y: 1 });

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate normalized direction vector (-1 to 1) from pointer to center
      const maxDistance = Math.max(window.innerWidth, window.innerHeight) / 2;
      const rawX = (e.clientX - centerX) / maxDistance;
      const rawY = (e.clientY - centerY) / maxDistance;

      // Clamp values
      const clampedX = Math.max(-1, Math.min(1, rawX));
      const clampedY = Math.max(-1, Math.min(1, rawY));

      setOffset({
        x: Number((clampedX * 1.5).toFixed(3)),
        y: Number((clampedY * 1.5).toFixed(3)),
      });
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative select-none inline-block font-black uppercase tracking-tight ${className}`}
      style={{
        perspective: '1000px',
      }}
      data-testid="depth-text-container"
    >
      {/* Extrusion layers (from back to front) */}
      {Array.from({ length: layers }).map((_, index) => {
        const layerIndex = layers - index; // Deepest layer rendered first
        const shiftX = offset.x * layerIndex * depth;
        const shiftY = offset.y * layerIndex * depth;

        return (
          <span
            key={`layer-${layerIndex}`}
            aria-hidden="true"
            data-testid={`depth-text-layer-${layerIndex}`}
            className="absolute inset-0 pointer-events-none transition-transform duration-100 ease-out"
            style={{
              transform: `translate3d(${shiftX}px, ${shiftY}px, 0)`,
              color: layerColor,
              WebkitTextStroke: `2px ${layerColor}`,
              zIndex: index,
            }}
          >
            {text}
          </span>
        );
      })}

      {/* Front Face Text */}
      <span
        className="relative block transition-transform duration-100 ease-out"
        style={{
          color: frontColor,
          WebkitTextStroke: `2.5px ${strokeColor}`,
          zIndex: layers + 1,
          textShadow: `1px 1px 0 ${strokeColor}`,
        }}
        data-testid="depth-text-front"
      >
        {text}
      </span>
    </div>
  );
};