import React from 'react';

interface BrightnessViewProps {
  W: number;
  H: number;
  statusBarHeight: number;
  settingMaskUrl?: string;
  colors: { text_primary: string; text_selected: string };
  brightnessLevel?: number;
  onBrightnessChange?: (level: number) => void;
}

const BrightnessView: React.FC<BrightnessViewProps> = ({
  W,
  H,
  statusBarHeight,
  settingMaskUrl,
  colors,
  brightnessLevel = 50,
  onBrightnessChange
}) => {
  // BrightnessActivity UI: title at top, centered progress bar in middle, numeric percent at bottom
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}>
      {/* Title */}
      <div style={{
        position: 'absolute',
        top: statusBarHeight + 20,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
        zIndex: 10
      }}>
        Brightness
      </div>

      {/* Progress Bar - centered in middle */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: W - 100,
        zIndex: 10
      }}>
        <div style={{
          width: '100%',
          height: 8,
          backgroundColor: 'rgba(255, 255, 255, 0.3)',
          borderRadius: 4,
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${brightnessLevel}%`,
            height: '100%',
            backgroundColor: '#ffffff',
            transition: 'width 0.2s'
          }} />
        </div>
      </div>

      {/* Numeric percent text at bottom */}
      <div style={{
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
        zIndex: 10
      }}>
        {brightnessLevel}%
      </div>
    </div>
  );
};

export default BrightnessView;
