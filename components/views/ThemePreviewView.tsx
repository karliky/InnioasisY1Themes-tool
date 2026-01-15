import React from 'react';

interface ThemePreviewViewProps {
  W: number;
  H: number;
  statusBarHeight: number;
  themeImageUrl?: string;
  colors: { text_primary: string };
}

const ThemePreviewView: React.FC<ThemePreviewViewProps> = ({
  W,
  H,
  statusBarHeight,
  themeImageUrl,
  colors
}) => {
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}>
      <div style={{ position: 'absolute', left: 0, top: statusBarHeight, width: W, height: H - statusBarHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
        {themeImageUrl ? (
          <div style={{
            width: W * 0.7,
            height: H * 0.65,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            backgroundColor: 'rgba(0,0,0,0.35)'
          }}>
            <img 
              src={themeImageUrl} 
              alt="Theme preview" 
              style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: 'rgba(255,255,255,0.04)' }} 
            />
          </div>
        ) : (
          <div style={{ color: colors.text_primary, opacity: 0.8, fontSize: 18 }}>
            No theme image provided in settingConfig.theme
          </div>
        )}
      </div>
    </div>
  );
};

export default ThemePreviewView;
