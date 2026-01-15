
import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ClickWheelProps {
  onScroll: (direction: 'up' | 'down') => void;
  onCenterClick: () => void;
  onMenuClick: () => void;
  onPrevClick: () => void;
  onNextClick: () => void;
  onPlayPauseClick: () => void;
  isPlaying?: boolean;
}

const ClickWheel: React.FC<ClickWheelProps> = ({ 
  onScroll, 
  onCenterClick, 
  onMenuClick, 
  onPrevClick, 
  onNextClick, 
  onPlayPauseClick,
  isPlaying = false
}) => {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [isRotating, setIsRotating] = useState(false);
  const lastAngle = useRef<number | null>(null);
  const accumulatedRotation = useRef(0);
  const pointerStartPos = useRef<{ x: number; y: number } | null>(null);
  const wasScrolling = useRef(false); // Track if user was scrolling
  const ROTATION_THRESHOLD = 15; // Degrees to trigger a scroll event
  const CLICK_THRESHOLD = 5; // Pixels of movement to distinguish click from drag

  const getAngle = (clientX: number, clientY: number) => {
    if (!wheelRef.current) return 0;
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isRotating || !pointerStartPos.current) return;
    
    // Check if user has moved enough to consider it a drag (not a click)
    const moveDistance = Math.sqrt(
      Math.pow(e.clientX - pointerStartPos.current.x, 2) + 
      Math.pow(e.clientY - pointerStartPos.current.y, 2)
    );
    
    // If moved enough, it's a scroll - allow it
    if (moveDistance > CLICK_THRESHOLD) {
      wasScrolling.current = true; // Mark that scrolling occurred
      const currentAngle = getAngle(e.clientX, e.clientY);
      if (lastAngle.current !== null) {
        let delta = currentAngle - lastAngle.current;
        
        // Handle degree wrap-around (-180 to 180)
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;

        accumulatedRotation.current += delta;

        if (Math.abs(accumulatedRotation.current) >= ROTATION_THRESHOLD) {
          onScroll(accumulatedRotation.current > 0 ? 'down' : 'up');
          accumulatedRotation.current = 0;
        }
      }
      lastAngle.current = currentAngle;
    }
  }, [isRotating, onScroll]);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    // Don't reset pointerStartPos yet - onClick handlers need it
    // We'll reset it after a small delay to allow onClick to check it
    
    setIsRotating(false);
    lastAngle.current = null;
    accumulatedRotation.current = 0;
    
    // Reset after onClick has had a chance to fire
    setTimeout(() => {
      pointerStartPos.current = null;
      wasScrolling.current = false;
    }, 100);
  }, []);

  useEffect(() => {
    if (isRotating) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp as (e: PointerEvent) => void);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp as (e: PointerEvent) => void);
    };
  }, [isRotating, handlePointerMove, handlePointerUp]);

  const wheelSize = '306px'; // 2/3 of device width (540px) - 15% smaller - circular wheel
  
  return (
    <div className="relative flex items-center justify-center select-none" style={{ width: wheelSize, height: wheelSize }}>
      {/* Outer Ring - Interaction Area */}
      <div 
        ref={wheelRef}
        onPointerDown={(e) => {
          // Store initial position to distinguish clicks from drags
          pointerStartPos.current = { x: e.clientX, y: e.clientY };
          wasScrolling.current = false; // Reset scroll tracking
          
          // Always allow scrolling to start, even if on a button
          // We'll check if it was a click vs drag later
          setIsRotating(true);
          lastAngle.current = getAngle(e.clientX, e.clientY);
        }}
        className="click-wheel-surface w-full h-full rounded-full border-4 border-slate-700 shadow-2xl cursor-pointer flex items-center justify-center relative overflow-hidden active:brightness-95 transition-all"
      >
        {/* Button Areas - Large clickable sections */}
        {/* Top: Back/Menu (curved arrow) */}
        <button 
          onClick={(e) => { 
            // Only trigger if we weren't scrolling
            if (!wasScrolling.current && pointerStartPos.current) {
              const moveDistance = Math.sqrt(
                Math.pow(e.clientX - pointerStartPos.current.x, 2) + 
                Math.pow(e.clientY - pointerStartPos.current.y, 2)
              );
              if (moveDistance <= CLICK_THRESHOLD) {
                e.stopPropagation(); 
                onMenuClick(); 
              }
            }
          }}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-1/3 flex flex-col items-center justify-start pt-4 text-slate-400 hover:text-white transition-colors z-20 pointer-events-auto"
          style={{ transform: 'translateX(-50%)' }}
        >
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 7V4L3 11l7 7v-3h6a4 4 0 0 0 0-8h-6z"/>
          </svg>
          <span className="text-[10px] font-semibold uppercase tracking-wide">Menu</span>
        </button>

        {/* Right: Next / Fast Forward (double right + bar) */}
        <button 
          onClick={(e) => { 
            if (!wasScrolling.current && pointerStartPos.current) {
              const moveDistance = Math.sqrt(
                Math.pow(e.clientX - pointerStartPos.current.x, 2) + 
                Math.pow(e.clientY - pointerStartPos.current.y, 2)
              );
              if (moveDistance <= CLICK_THRESHOLD) {
                e.stopPropagation(); 
                onNextClick(); 
              }
            }
          }}
          className="absolute right-0 top-1/2 -translate-y-1/2 w-1/3 h-1/3 flex items-center justify-end pr-6 text-slate-400 hover:text-white transition-colors z-20 pointer-events-auto"
          style={{ transform: 'translateY(-50%)' }}
        >
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 6h2v12h-2V6zM6 6v12l8.5-6L6 6z"/>
          </svg>
        </button>

        {/* Left: Previous / Rewind (double left + bar) */}
        <button 
          onClick={(e) => { 
            if (!wasScrolling.current && pointerStartPos.current) {
              const moveDistance = Math.sqrt(
                Math.pow(e.clientX - pointerStartPos.current.x, 2) + 
                Math.pow(e.clientY - pointerStartPos.current.y, 2)
              );
              if (moveDistance <= CLICK_THRESHOLD) {
                e.stopPropagation(); 
                onPrevClick(); 
              }
            }
          }}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1/3 h-1/3 flex items-center justify-start pl-6 text-slate-400 hover:text-white transition-colors z-20 pointer-events-auto"
          style={{ transform: 'translateY(-50%)' }}
        >
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h2v12H6V6zm3.5 6 8.5 6V6l-8.5 6z"/>
          </svg>
        </button>

        {/* Bottom: Play / Pause */}
        <button 
          onClick={(e) => { 
            if (!wasScrolling.current && pointerStartPos.current) {
              const moveDistance = Math.sqrt(
                Math.pow(e.clientX - pointerStartPos.current.x, 2) + 
                Math.pow(e.clientY - pointerStartPos.current.y, 2)
              );
              if (moveDistance <= CLICK_THRESHOLD) {
                e.stopPropagation(); 
                onPlayPauseClick(); 
              }
            }
          }}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 h-1/3 flex items-center justify-center pb-4 text-slate-400 hover:text-white transition-colors z-20 pointer-events-auto"
          style={{ transform: 'translateX(-50%)' }}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            // Pause icon
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z"/>
            </svg>
          ) : (
            // Play icon
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7L8 5z"/>
            </svg>
          )}
        </button>

        {/* Center Button */}
        <button 
          onClick={(e) => { e.stopPropagation(); onCenterClick(); }}
          className="w-24 h-24 bg-slate-800 rounded-full border-2 border-slate-700 shadow-inner hover:bg-slate-700 active:scale-95 transition-all z-10"
        />
      </div>
    </div>
  );
};

export default ClickWheel;
