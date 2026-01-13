import React from 'react';
import MenuList from './MenuList';

interface EqualizerViewProps {
  W: number;
  H: number;
  statusBarHeight: number;
  settingMaskUrl?: string;
  items: any[];
  selectedIndex: number;
  colors: { text_primary: string; text_selected: string };
  itemBackgroundStyle?: React.CSSProperties;
  itemSelectedBackgroundStyle?: React.CSSProperties;
  itemRightArrowUrl?: string;
}

const EqualizerView: React.FC<EqualizerViewProps> = ({
  W,
  H,
  statusBarHeight,
  settingMaskUrl,
  items,
  selectedIndex,
  colors,
  itemBackgroundStyle,
  itemSelectedBackgroundStyle,
  itemRightArrowUrl
}) => {
  const selected = items[selectedIndex];
  const iconUrl = selected?.iconUrl;

  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}>
      {/* Settings Mask Overlay */}
      {settingMaskUrl && (
        <img 
          src={settingMaskUrl} 
          alt="settings mask overlay" 
          style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', zIndex: 5 }} 
        />
      )}

      {/* Scrollable list container */}
      <div style={{ position: 'absolute', left: 0, top: statusBarHeight, width: W, height: H - statusBarHeight, overflow: 'hidden', zIndex: 10 }}>
        <MenuList
          items={items}
          selectedIndex={selectedIndex}
          H={H}
          statusBarHeight={statusBarHeight}
          colors={colors}
          itemBackgroundStyle={itemBackgroundStyle}
          itemSelectedBackgroundStyle={itemSelectedBackgroundStyle}
          itemRightArrowUrl={itemRightArrowUrl}
        />
      </div>

      {/* Right icon panel showing selected item */}
      {iconUrl && (() => {
        const panelW = 220;
        const panelH = 220;
        const rightX = W - panelW;
        const centerY = statusBarHeight + (H - statusBarHeight) / 2;
        return (
          <div style={{ position: 'absolute', left: rightX, top: centerY - panelH + 90, width: panelW, height: panelH, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 12, zIndex: 10 }}>
            <div style={{ color: colors.text_selected, fontWeight: 700, fontSize: 18, marginBottom: 8, textAlign: 'center', maxWidth: '90%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selected?.label}
            </div>
            <img src={iconUrl} alt={selected?.label} style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
          </div>
        );
      })()}
    </div>
  );
};

export default EqualizerView;
