import React from 'react';
import SettingsMenuList from './SettingsMenuList';

interface SettingsViewProps {
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
  loadedTheme?: any;
  timedShutdownValue?: 'off' | '10' | '20' | '30' | '60' | '90' | '120';
  backlightValue?: '10' | '15' | '30' | '45' | '60' | '120' | '300' | 'always';
}

const SettingsView: React.FC<SettingsViewProps> = ({
  W,
  H,
  statusBarHeight,
  settingMaskUrl,
  items,
  selectedIndex,
  colors,
  itemBackgroundStyle,
  itemSelectedBackgroundStyle,
  itemRightArrowUrl,
  loadedTheme,
  timedShutdownValue = 'off',
  backlightValue = '10'
}) => {
  // Exact dimensions from reverse engineering document (480x360 layout)
  const MENU_WIDTH = 218;
  const MENU_HEIGHT = 305;
  const MENU_LEFT = 9;
  const MENU_TOP = 45; // Aligned below 45dp status bar
  
  const RIGHT_PANEL_WIDTH = 179;
  const RIGHT_PANEL_MARGIN = 22;
  
  const selected = items[selectedIndex];
  const iconUrl = selected?.iconUrl;
  const isAbout = selected?.id === 'about';
  
  // State text comes from the item's valueText (which comes from refreshConfig in the real app)
  const stateText = selected?.valueText;
  
  // Selected text color: use itemConfig.itemSelectedTextColor if available,
  // otherwise fallback to #3CFFDE (default passed by adapter, overridden by ThemeManager)
  const itemConfig = loadedTheme?.spec?.itemConfig || {};
  const settingsSelectedColor = itemConfig.itemSelectedTextColor || '#3CFFDE';
  
  // Override colors.text_selected for settings with the correct fallback
  const settingsColors = {
    ...colors,
    text_selected: settingsSelectedColor
  };

  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}>
      {/* Settings Mask Overlay - @id/back ImageView with centerCrop */}
      {settingMaskUrl && (
        <img 
          src={settingMaskUrl} 
          alt="settings mask overlay" 
          style={{ 
            position: 'absolute', 
            left: 0, 
            top: 0, 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover', // centerCrop
            pointerEvents: 'none', 
            zIndex: 5 
          }} 
        />
      )}

      {/* Left settings menu container - exact RecyclerView dimensions */}
      <div style={{ 
        position: 'absolute', 
        left: MENU_LEFT, 
        top: MENU_TOP, 
        width: MENU_WIDTH, 
        height: MENU_HEIGHT, 
        overflow: 'hidden', 
        zIndex: 10 
      }}>
        <SettingsMenuList
          items={items}
          selectedIndex={selectedIndex}
          containerHeight={MENU_HEIGHT}
          colors={settingsColors}
          itemBackgroundStyle={itemBackgroundStyle}
          itemSelectedBackgroundStyle={itemSelectedBackgroundStyle}
          itemRightArrowUrl={itemRightArrowUrl}
        />
      </div>

      {/* Right Detail Panel - ConstraintLayout */}
      <div style={{
        position: 'absolute',
        right: RIGHT_PANEL_MARGIN, // 22dp margin from right edge
        top: 0,
        width: RIGHT_PANEL_WIDTH, // 179dp wide
        height: H, // fill_parent
        zIndex: 10
      }}>
        {/* Right title - 18sp bold, marginTop 58dp, centered */}
        {/* Title height is approximately 22px (18sp * ~1.2 line height) */}
        <div style={{
          position: 'absolute',
          top: 58, // layout_marginTop: 58dp
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 18, // textSize: 18sp
          fontWeight: 'bold',
          color: '#ffffff', // textColor: @color/white (#ffffffff)
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          paddingLeft: 5,
          paddingRight: 5,
          lineHeight: 1.2
        }}>
          {selected?.label || ''}
        </div>

        {/* Image container (cl) - constrained below right_title with marginTop 12dp */}
        {/* Title is at 58dp, title height ~26px (18sp with line height), so image container starts at ~96dp (58 + 26 + 12) */}
        <div style={{
          position: 'absolute',
          top: 96, // 58dp (title top) + ~26px (title height with line height) + 12dp (marginTop) ≈ 96dp
          left: 0,
          right: 0,
          width: '100%', // fill_parent (179dp)
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start'
        }}>
          {/* AboutView special case - hidden for now, would show bzt_view */}
          {isAbout ? (
            <div style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: 14,
              textAlign: 'center',
              padding: 10
            }}>
              About information would be displayed here
            </div>
          ) : iconUrl ? (
            <img 
              src={iconUrl} 
              alt={selected?.label} 
              style={{ 
                maxWidth: 146, // SETTING_ICON size: 146px max width
                maxHeight: 146, // SETTING_ICON size: 146px max height
                width: 'auto', // Natural size, scales down if larger than 146px
                height: 'auto', // layout_height="wrap_content", adjustViewBounds=true
                objectFit: 'contain', // fitCenter scaleType (default)
                display: 'block'
              }} 
            />
          ) : null}
        </div>

        {/* State text (info_state_tv) - constrained below cl */}
        {/* Image container at 96dp, image is 146px tall, so state text at ~242px (96 + 146) */}
        {stateText && (
          <div style={{
            position: 'absolute',
            top: 242, // 96dp (image container top) + 146px (image height) = 242px
            left: 0,
            right: 0,
            fontSize: 16, // textSize: 16sp
            color: '#ffffff', // textColor: @color/white (#ffffffff)
            textAlign: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            paddingLeft: 5,
            paddingRight: 5
          }}>
            {stateText}
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsView;
