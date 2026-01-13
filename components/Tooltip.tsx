import { useState, useRef, useEffect, ReactNode, CSSProperties } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  delay?: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip = ({ content, children, delay = 200, position = 'top' }: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [actualPosition, setActualPosition] = useState(position);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      const spacing = 8; // Gap between trigger and tooltip
      let top = 0;
      let left = 0;
      let finalPosition = position;

      // Calculate initial position
      switch (position) {
        case 'top':
          top = triggerRect.top - tooltipRect.height - spacing;
          left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
          
          // Check if tooltip goes above viewport
          if (top < spacing) {
            finalPosition = 'bottom';
            top = triggerRect.bottom + spacing;
          }
          break;

        case 'bottom':
          top = triggerRect.bottom + spacing;
          left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
          
          // Check if tooltip goes below viewport
          if (top + tooltipRect.height > viewportHeight - spacing) {
            finalPosition = 'top';
            top = triggerRect.top - tooltipRect.height - spacing;
          }
          break;

        case 'left':
          top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
          left = triggerRect.left - tooltipRect.width - spacing;
          
          // Check if tooltip goes left of viewport
          if (left < spacing) {
            finalPosition = 'right';
            left = triggerRect.right + spacing;
          }
          break;

        case 'right':
          top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
          left = triggerRect.right + spacing;
          
          // Check if tooltip goes right of viewport
          if (left + tooltipRect.width > viewportWidth - spacing) {
            finalPosition = 'left';
            left = triggerRect.left - tooltipRect.width - spacing;
          }
          break;
      }

      // Ensure tooltip doesn't overflow horizontally
      if (left < spacing) {
        left = spacing;
      } else if (left + tooltipRect.width > viewportWidth - spacing) {
        left = viewportWidth - tooltipRect.width - spacing;
      }

      // Ensure tooltip doesn't overflow vertically
      if (top < spacing) {
        top = spacing;
      } else if (top + tooltipRect.height > viewportHeight - spacing) {
        top = viewportHeight - tooltipRect.height - spacing;
      }

      setCoords({ top, left });
      setActualPosition(finalPosition);
    }
  }, [isVisible, position]);

  const getArrowStyles = (): CSSProperties => {
    const arrowSize = 6;
    const commonStyles: CSSProperties = {
      content: '""',
      position: 'absolute',
      width: 0,
      height: 0,
      borderStyle: 'solid',
    };

    switch (actualPosition) {
      case 'top':
        return {
          ...commonStyles,
          bottom: -arrowSize,
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: `${arrowSize}px ${arrowSize}px 0 ${arrowSize}px`,
          borderColor: 'rgba(30, 30, 30, 0.98) transparent transparent transparent',
        };
      case 'bottom':
        return {
          ...commonStyles,
          top: -arrowSize,
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: `0 ${arrowSize}px ${arrowSize}px ${arrowSize}px`,
          borderColor: 'transparent transparent rgba(30, 30, 30, 0.98) transparent',
        };
      case 'left':
        return {
          ...commonStyles,
          right: -arrowSize,
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: `${arrowSize}px 0 ${arrowSize}px ${arrowSize}px`,
          borderColor: 'transparent transparent transparent rgba(30, 30, 30, 0.98)',
        };
      case 'right':
        return {
          ...commonStyles,
          left: -arrowSize,
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: `${arrowSize}px ${arrowSize}px ${arrowSize}px 0`,
          borderColor: 'transparent rgba(30, 30, 30, 0.98) transparent transparent',
        };
      default:
        return commonStyles;
    }
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        style={{ display: 'inline-block' }}
      >
        {children}
      </div>
      
      {isVisible && (
        <div
          ref={tooltipRef}
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(30, 30, 30, 0.98)',
              color: 'rgba(255, 255, 255, 0.95)',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              lineHeight: '1.4',
              maxWidth: '280px',
              wordWrap: 'break-word',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(8px)',
              animation: 'tooltipFadeIn 0.15s ease-out',
              position: 'relative',
            }}
          >
            {content}
            <div style={getArrowStyles()} />
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes tooltipFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </>
  );
};
