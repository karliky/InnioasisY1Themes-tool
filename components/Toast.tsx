import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onHide: () => void;
  duration?: number; // in milliseconds
  containerWidth?: number; // width of container for relative positioning
  containerHeight?: number; // height of container for relative positioning
}

const Toast: React.FC<ToastProps> = ({ message, isVisible, onHide, duration = 1000, containerWidth, containerHeight }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onHide();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onHide]);

  if (!isVisible) return null;

  // If container dimensions are provided, use absolute positioning relative to container
  // Otherwise, use fixed positioning relative to viewport
  const positionStyle = containerWidth && containerHeight
    ? {
        position: 'absolute' as const,
        top: containerHeight * 0.75, // 75% from top of container
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }
    : {
        position: 'fixed' as const,
        top: '75%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };

  return (
    <div
      style={{
        ...positionStyle,
        backgroundColor: '#323232', // Android Material Design dark background
        color: '#ffffff',
        padding: '12px 24px',
        borderRadius: '4px',
        fontSize: '18px',
        fontWeight: 400,
        zIndex: 10000,
        boxShadow: '0 3px 5px -1px rgba(0,0,0,0.2), 0 6px 10px 0 rgba(0,0,0,0.14), 0 1px 18px 0 rgba(0,0,0,0.12)',
        minWidth: '200px',
        textAlign: 'center',
        pointerEvents: 'none',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.3s ease-in-out',
      }}
    >
      {message}
    </div>
  );
};

export default Toast;
