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
  const MENU_WIDTH = 204;
  const MENU_HEIGHT = 307;
  const MENU_LEFT = 9;
  const MENU_TOP = 45; // Aligns just under the 45dp status bar
  
  const PREVIEW_WIDTH = 179;
  const PREVIEW_RIGHT_MARGIN = 23;
  const PREVIEW_TOP_MARGIN = 86;

  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}>
      {/* Desktop Mask Overlay - @id/back ImageView with centerCrop */}
      {desktopMaskUrl && (
        <img 
          src={desktopMaskUrl} 
          alt="desktop mask overlay" 
          style={{ 
            position: 'absolute', 
            left: 0, 
            top: 0, 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover', // centerCrop scaleType
            pointerEvents: 'none', 
            zIndex: 5 
          }} 
        />
      )}

      {/* Left menu container - exact RecyclerView dimensions */}
      <div style={{ 
        position: 'absolute', 
        left: MENU_LEFT, 
        top: MENU_TOP, 
        width: MENU_WIDTH, 
        height: MENU_HEIGHT, 
        overflow: 'hidden', 
        zIndex: 10 
      }}>
        <MenuList
          items={items}
          selectedIndex={selectedIndex}
          H={H}
          statusBarHeight={statusBarHeight}
          colors={colors}
          itemBackgroundStyle={itemBackgroundStyle}
          itemSelectedBackgroundStyle={itemSelectedBackgroundStyle}
          itemRightArrowUrl={itemRightArrowUrl}
          fixedItemHeight={45}
          containerHeight={MENU_HEIGHT}
          leftPad={0}
        />
      </div>

      {/* Right Preview Tile (iv_now) - ImageView with adjustViewBounds="true", fitCenter scaleType */}
      {(() => {
        const selected = items[selectedIndex];
        const iconUrl = selected?.iconFile ? loadedTheme.assetUrlForFile?.(selected.iconFile) : undefined;
        if (!iconUrl) return null;
        // ImageView container: layout_width=179dp, layout_marginRight=23dp, constrained to top-right
        // The image inside can be smaller (150px naturally) and will be centered within the 179dp container
        return (
          <div
            style={{
              position: 'absolute',
              right: PREVIEW_RIGHT_MARGIN, // 23dp margin from right edge
              top: PREVIEW_TOP_MARGIN, // 86dp from top
              width: PREVIEW_WIDTH, // 179dp container width
              height: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10
            }}
          >
            <img 
              src={iconUrl} 
              alt={selected?.label} 
              style={{ 
                maxWidth: '100%', // Fit within 179dp container
                width: 'auto', // Natural size (150px), scales down if larger
                height: 'auto', // adjustViewBounds: height adjusts to maintain aspect
                objectFit: 'contain', // fitCenter scaleType (default)
                display: 'block'
              }} 
            />
          </div>
        );
      })()}
    </div>
  );
};

export default HomeView;
