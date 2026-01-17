import React from 'react';

interface AboutViewProps {
  W: number;
  H: number;
  statusBarHeight: number;
  settingMaskUrl?: string;
  colors: { text_primary: string; text_selected: string };
  loadedTheme?: any;
}

const AboutView: React.FC<AboutViewProps> = ({
  W,
  H,
  statusBarHeight,
  settingMaskUrl,
  colors,
  loadedTheme
}) => {
  // AboutActivity UI: AboutView (140dp square) + two info text fields
  const ABOUT_SIZE = 140;
  const RIGHT_PANEL_WIDTH = 179;
  const RIGHT_PANEL_MARGIN = 22;

  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}>
      {/* Right panel with AboutView */}
      <div style={{
        position: 'absolute',
        right: RIGHT_PANEL_MARGIN,
        top: statusBarHeight + 50,
        width: RIGHT_PANEL_WIDTH,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 10
      }}>
        {/* AboutView - 140dp square */}
        <div style={{
          width: ABOUT_SIZE,
          height: ABOUT_SIZE,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
          border: '2px solid rgba(255, 255, 255, 0.3)'
        }}>
          <div style={{
            color: '#ffffff',
            fontSize: 48,
            fontWeight: 'bold'
          }}>
            Y1
          </div>
        </div>

        {/* Two info text fields */}
        <div style={{
          color: '#ffffff',
          fontSize: 16,
          textAlign: 'center',
          marginBottom: 10
        }}>
          Version 3.0.2
        </div>
        <div style={{
          color: '#ffffff',
          fontSize: 14,
          textAlign: 'center',
          opacity: 0.8
        }}>
          Innioasis Y1
        </div>
      </div>
    </div>
  );
};

export default AboutView;
