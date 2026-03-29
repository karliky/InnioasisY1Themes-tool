
import React, { useRef, useEffect, useCallback, useState } from 'react';

interface ClickWheelProps {
  onScroll: (direction: 'up' | 'down') => void;
  onCenterClick: () => void;
  onMenuClick: () => void;
  onPrevClick: () => void;
  onNextClick: () => void;
  onPlayPauseClick: () => void;
  isPlaying?: boolean;
  deviceColor?: string;
  centerColor?: string;
}

type PressedBtn = 'menu' | 'prev' | 'next' | 'play' | null;

const ClickWheel: React.FC<ClickWheelProps> = ({
  onScroll,
  onCenterClick,
  onMenuClick,
  onPrevClick,
  onNextClick,
  onPlayPauseClick,
  isPlaying = false,
  deviceColor = 'black',
  centerColor,
}) => {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [centerPressed, setCenterPressed] = useState(false);
  const [pressedBtn, setPressedBtn] = useState<PressedBtn>(null);

  // Scroll tracking
  const lastAngle = useRef<number | null>(null);
  const accumulatedRotation = useRef(0);
  const pointerStartPos = useRef<{ x: number; y: number } | null>(null);
  const wasScrolling = useRef(false);

  // Velocity tracking: ring of (angle, timestamp) samples
  const angleHistory = useRef<{ angle: number; time: number }[]>([]);
  const momentumTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const CLICK_THRESHOLD = 6; // px — below this = click, above = drag

  const clearMomentum = () => {
    momentumTimers.current.forEach(clearTimeout);
    momentumTimers.current = [];
  };

  const getAngle = (clientX: number, clientY: number): number => {
    if (!wheelRef.current) return 0;
    const rect = wheelRef.current.getBoundingClientRect();
    return Math.atan2(
      clientY - (rect.top + rect.height / 2),
      clientX - (rect.left + rect.width / 2)
    ) * (180 / Math.PI);
  };

  // Angular velocity in degrees/ms over the last 120 ms
  const getVelocity = (): number => {
    const now = Date.now();
    const recent = angleHistory.current.filter(s => now - s.time < 120);
    if (recent.length < 2) return 0;
    const first = recent[0];
    const last = recent[recent.length - 1];
    let delta = last.angle - first.angle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    const dt = last.time - first.time;
    return dt > 0 ? delta / dt : 0;
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isRotating || !pointerStartPos.current) return;

    const moveDistance = Math.sqrt(
      Math.pow(e.clientX - pointerStartPos.current.x, 2) +
      Math.pow(e.clientY - pointerStartPos.current.y, 2)
    );

    if (moveDistance <= CLICK_THRESHOLD) return;

    wasScrolling.current = true;
    const currentAngle = getAngle(e.clientX, e.clientY);

    // Record sample for velocity
    const now = Date.now();
    angleHistory.current.push({ angle: currentAngle, time: now });
    // Keep only last 200 ms
    angleHistory.current = angleHistory.current.filter(s => now - s.time < 200);

    if (lastAngle.current !== null) {
      let delta = currentAngle - lastAngle.current;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;

      accumulatedRotation.current += delta;

      // Adaptive threshold: fast rotation fires more events
      const velocity = Math.abs(getVelocity()); // deg/ms
      const threshold = Math.max(6, 14 - velocity * 35);

      if (Math.abs(accumulatedRotation.current) >= threshold) {
        onScroll(accumulatedRotation.current > 0 ? 'down' : 'up');
        accumulatedRotation.current = 0;
      }
    }

    lastAngle.current = currentAngle;
  }, [isRotating, onScroll]);

  const handlePointerUp = useCallback(() => {
    // Momentum: fire extra scroll events proportional to release velocity
    const velocity = getVelocity(); // deg/ms
    const speed = Math.abs(velocity);
    const direction = velocity > 0 ? 'down' : 'up';

    if (speed > 0.5) {
      // Fast swipe — 3 extra events
      const delays = [60, 140, 240];
      delays.forEach(d => {
        momentumTimers.current.push(setTimeout(() => onScroll(direction), d));
      });
    } else if (speed > 0.25) {
      // Medium swipe — 1 extra event
      momentumTimers.current.push(setTimeout(() => onScroll(direction), 70));
    }

    setIsRotating(false);
    lastAngle.current = null;
    accumulatedRotation.current = 0;
    angleHistory.current = [];

    setTimeout(() => {
      pointerStartPos.current = null;
      wasScrolling.current = false;
    }, 100);
  }, [onScroll]);

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

  useEffect(() => () => clearMomentum(), []);

  // Guard: fire handler only if pointer didn't travel far (= click, not drag)
  const handleBtnClick = (handler: () => void) => (e: React.MouseEvent) => {
    if (wheelRef.current) {
      const rect = wheelRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const centerRadius = 56; // Matches the 112px center button diameter
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      if (Math.sqrt(dx * dx + dy * dy) <= centerRadius) {
        return;
      }
    }

    if (!wasScrolling.current && pointerStartPos.current) {
      const d = Math.sqrt(
        Math.pow(e.clientX - pointerStartPos.current.x, 2) +
        Math.pow(e.clientY - pointerStartPos.current.y, 2)
      );
      if (d <= CLICK_THRESHOLD) {
        e.stopPropagation();
        handler();
      }
    }
  };

  // ── Styles ───────────────────────────────────────────────────────────────

  const isDark = deviceColor === 'black';
  const iconColor = isDark ? '#c8c8c8' : '#4a4a4a';
  const iconPressedColor = isDark ? '#ffffff' : '#1a1a1a';

  const wheelBg = isDark
    ? 'radial-gradient(circle at 36% 30%, #2c2c2c 0%, #1a1a1a 55%, #0e0e0e 100%)'
    : 'radial-gradient(circle at 36% 30%, #ffffff 0%, #f4f4f4 50%, #e6e6e6 100%)';

  const wheelShadow = isDark
    ? '0 4px 14px rgba(0,0,0,0.35), inset 0 1px 2px rgba(255,255,255,0.04)'
    : '0 4px 14px rgba(0,0,0,0.1), inset 0 1px 3px rgba(255,255,255,0.9), inset 0 -1px 2px rgba(0,0,0,0.06)';

  const centerBg = centerPressed
    ? (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)')
    : 'transparent';
  const centerBgFull = centerColor
    ? (centerPressed
        ? `color-mix(in srgb, ${centerColor} 80%, ${isDark ? 'white' : 'black'} 20%)`
        : centerColor)
    : (isDark ? '#111111' : '#d8d8d8');

  const centerBorder = `1.5px solid ${centerColor ?? (isDark ? '#2a2a2a' : '#bdbdbd')}`;
  const centerShadow = centerPressed
    ? 'inset 0 2px 8px rgba(0,0,0,0.35), inset 0 1px 3px rgba(0,0,0,0.2)'
    : 'inset 0 1px 4px rgba(0,0,0,0.15)';

  const btnBase: React.CSSProperties = {
    position: 'absolute',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    zIndex: 20,
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.08s',
  };

  const iconStyle = (btn: PressedBtn): React.CSSProperties => ({
    color: pressedBtn === btn ? iconPressedColor : iconColor,
    display: 'block',
    transition: 'color 0.08s, transform 0.08s',
    transform: pressedBtn === btn ? 'scale(0.88)' : 'scale(1)',
  });

  const wheelSize = '306px';

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: wheelSize, height: wheelSize }}
    >
      <div
        ref={wheelRef}
        onPointerDown={(e) => {
          clearMomentum();
          pointerStartPos.current = { x: e.clientX, y: e.clientY };
          wasScrolling.current = false;
          angleHistory.current = [];
          setIsRotating(true);
          lastAngle.current = getAngle(e.clientX, e.clientY);
        }}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: wheelBg,
          boxShadow: wheelShadow,
          cursor: 'pointer',
          position: 'relative',
        }}
      >
        {/* ── Top: Menu / Back ── */}
        <button
          onClick={handleBtnClick(onMenuClick)}
          onPointerDown={() => setPressedBtn('menu')}
          onPointerUp={() => setPressedBtn(null)}
          onPointerLeave={() => setPressedBtn(null)}
          style={{
            ...btnBase,
            top: '5%', left: '50%',
            transform: 'translateX(-50%)',
            width: '40%', height: '36%',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            paddingTop: '14px',
          }}
        >
          <span style={iconStyle('menu')}>
            <svg width="26" height="22" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path
                d="M11 7l-6 6 6 6"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M5 13h16a8 8 0 0 1 8 8v1a8 8 0 0 1 -8 8h-14"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>

        {/* ── Left: Previous track ── */}
        <button
          onClick={handleBtnClick(onPrevClick)}
          onPointerDown={() => setPressedBtn('prev')}
          onPointerUp={() => setPressedBtn(null)}
          onPointerLeave={() => setPressedBtn(null)}
          style={{
            ...btnBase,
            top: '50%', left: '5%',
            transform: 'translateY(-50%)',
            width: '36%', height: '40%',
            justifyContent: 'flex-start',
            paddingLeft: '14px',
          }}
        >
          <span style={iconStyle('prev')}>
            <svg width="26" height="22" viewBox="0 0 26 22" fill="currentColor">
              <rect x="1" y="4" width="3" height="14" rx="1.3"/>
              <path d="M7 11L16 5.5v11z"/>
              <path d="M15 11L23 6v10z"/>
            </svg>
          </span>
        </button>

        {/* ── Right: Next track ── */}
        <button
          onClick={handleBtnClick(onNextClick)}
          onPointerDown={() => setPressedBtn('next')}
          onPointerUp={() => setPressedBtn(null)}
          onPointerLeave={() => setPressedBtn(null)}
          style={{
            ...btnBase,
            top: '50%', right: '5%',
            transform: 'translateY(-50%)',
            width: '36%', height: '40%',
            justifyContent: 'flex-end',
            paddingRight: '14px',
          }}
        >
          <span style={iconStyle('next')}>
            <svg width="26" height="22" viewBox="0 0 26 22" fill="currentColor">
              <path d="M2 6v10l9-5z"/>
              <path d="M10 6v10l9-5z"/>
              <rect x="21" y="4" width="3" height="14" rx="1.3"/>
            </svg>
          </span>
        </button>

        {/* ── Bottom: Play / Pause ── */}
        <button
          onClick={handleBtnClick(onPlayPauseClick)}
          onPointerDown={() => setPressedBtn('play')}
          onPointerUp={() => setPressedBtn(null)}
          onPointerLeave={() => setPressedBtn(null)}
          title={isPlaying ? 'Pause' : 'Play'}
          style={{
            ...btnBase,
            bottom: '5%', left: '50%',
            transform: 'translateX(-50%)',
            width: '40%', height: '36%',
            alignItems: 'flex-end',
            paddingBottom: '14px',
          }}
        >
          <span style={iconStyle('play')}>
            {isPlaying ? (
              <svg width="28" height="20" viewBox="0 0 28 20" fill="currentColor">
                <rect x="1"   y="2" width="5.5" height="16" rx="1.5"/>
                <rect x="9.5" y="2" width="5.5" height="16" rx="1.5"/>
                <rect x="18"  y="5.5" width="8.5" height="9" rx="1.5"/>
              </svg>
            ) : (
              <svg width="28" height="20" viewBox="0 0 28 20" fill="currentColor">
                <path d="M1 2v16l13-8z"/>
                <rect x="17" y="5.5" width="9.5" height="9" rx="1.5"/>
              </svg>
            )}
          </span>
        </button>

        {/* ── Center button ── */}
        <button
          onClick={(e) => { e.stopPropagation(); onCenterClick(); }}
          onPointerDown={() => setCenterPressed(true)}
          onPointerUp={() => setCenterPressed(false)}
          onPointerLeave={() => setCenterPressed(false)}
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            transition: 'background-color 0.1s ease, box-shadow 0.1s ease',
            width: '112px',
            height: '112px',
            borderRadius: '50%',
            background: centerBgFull,
            border: centerBorder,
            boxShadow: centerShadow,
            zIndex: 30,
            cursor: 'pointer',
          }}
        />
      </div>
    </div>
  );
};

export default ClickWheel;
