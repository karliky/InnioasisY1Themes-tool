import React from 'react';
import MenuList from './MenuList';
import { LoadedTheme } from '../../types';

interface HomeViewProps {
  W: number;
  H: number;
  statusBarHeight: number;
  desktopMaskUrl?: string;
  items: any[];
  selectedIndex: number;
  colors: { text_primary: string; text_selected: string };
  itemBackgroundStyle?: React.CSSProperties;
  itemSelectedBackgroundStyle?: React.CSSProperties;
  itemRightArrowUrl?: string;
  loadedTheme: LoadedTheme;
}

const HomeView: React.FC<HomeViewProps> = ({
  W,
  H,
  statusBarHeight,
  desktopMaskUrl,
  items,
  selectedIndex,
  colors,
  itemBackgroundStyle,
  itemSelectedBackgroundStyle,
  itemRightArrowUrl,
  loadedTheme
}) => {
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}>
      {/* Desktop Mask Overlay */}
      {desktopMaskUrl && (
        <img 
          src={desktopMaskUrl} 
          alt="desktop mask overlay" 
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
      {(() => {
        const selected = items[selectedIndex];
        const iconUrl = selected?.iconFile ? loadedTheme.assetUrlForFile?.(selected.iconFile) : undefined;
        if (!iconUrl) return null;
        const panelW = 220;
        const panelH = 220;
        const rightX = W - panelW;
        const centerY = (H - 40) / 2;
        return (
          <div style={{ position: 'absolute', left: rightX, top: centerY - panelH / 2, width: panelW, height: panelH, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, zIndex: 10 }}>
            <img src={iconUrl} alt={selected?.label} style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
          </div>
        );
      })()}
    </div>
  );
};

export default HomeView;
