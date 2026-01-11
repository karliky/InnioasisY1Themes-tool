
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
  const ROTATION_THRESHOLD = 15; // Degrees to trigger a scroll event

  const getAngle = (clientX: number, clientY: number) => {
    if (!wheelRef.current) return 0;
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isRotating) return;
    
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
  }, [isRotating, onScroll]);

  const handlePointerUp = useCallback(() => {
    setIsRotating(false);
    lastAngle.current = null;
    accumulatedRotation.current = 0;
  }, []);

  useEffect(() => {
    if (isRotating) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isRotating, handlePointerMove, handlePointerUp]);

  return (
    <div className="relative w-64 h-64 flex items-center justify-center select-none" style={{ transform: 'scale(0.75)' }}>
      {/* Outer Ring - Interaction Area */}
      <div 
        ref={wheelRef}
        onPointerDown={(e) => {
          setIsRotating(true);
          lastAngle.current = getAngle(e.clientX, e.clientY);
        }}
        className="click-wheel-surface w-full h-full rounded-full border-4 border-slate-700 shadow-2xl cursor-pointer flex items-center justify-center relative overflow-hidden active:brightness-95 transition-all"
      >
        {/* Button Areas */}
        {/* Top: Back/Menu (curved arrow) */}
        <button 
          onClick={(e) => { e.stopPropagation(); onMenuClick(); }}
          className="absolute top-4 text-slate-400 hover:text-white transition-colors flex flex-col items-center gap-1"
          title="Menu / Back"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 7V4L3 11l7 7v-3h6a4 4 0 0 0 0-8h-6z"/>
          </svg>
          <span className="text-[10px] font-semibold uppercase tracking-wide">Menu</span>
        </button>

        {/* Right: Next / Fast Forward (double right + bar) */}
        <button 
          onClick={(e) => { e.stopPropagation(); onNextClick(); }}
          className="absolute right-6 text-slate-400 hover:text-white transition-colors"
          title="Next / Fast Forward"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 6h2v12h-2V6zM6 6v12l8.5-6L6 6z"/>
          </svg>
        </button>

        {/* Left: Previous / Rewind (double left + bar) */}
        <button 
          onClick={(e) => { e.stopPropagation(); onPrevClick(); }}
          className="absolute left-6 text-slate-400 hover:text-white transition-colors"
          title="Previous / Rewind"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h2v12H6V6zm3.5 6 8.5 6V6l-8.5 6z"/>
          </svg>
        </button>

        {/* Bottom: Play / Pause */}
        <button 
          onClick={(e) => { e.stopPropagation(); onPlayPauseClick(); }}
          className="absolute bottom-4 text-slate-400 hover:text-white transition-colors"
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            // Pause icon
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z"/>
            </svg>
          ) : (
            // Play icon
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
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
