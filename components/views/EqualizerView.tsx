import React from 'react';
import SettingsMenuList from './SettingsMenuList';

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
  loadedTheme?: any;
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
  itemRightArrowUrl,
  loadedTheme
}) => {
  // EqActivity UI: left RecyclerView list of presets; right panel has title "Equalizer",
  // ImageView (200dp wide, wrap_content), and label text
  const MENU_WIDTH = 218;
  const MENU_HEIGHT = 305;
  const MENU_LEFT = 9;
  const MENU_TOP = 45;
  const RIGHT_PANEL_WIDTH = 200; // 200dp wide for ImageView
  const RIGHT_PANEL_MARGIN = 22;

  const selected = items[selectedIndex];
  const iconUrl = selected?.iconUrl;

  // Selected text color for settings
  const itemConfig = loadedTheme?.spec?.itemConfig || {};
  const settingsSelectedColor = itemConfig.itemSelectedTextColor || '#3CFFDE';
  const settingsColors = {
    ...colors,
    text_selected: settingsSelectedColor
  };

  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}>
      {/* Left list - RecyclerView */}
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
          items={items.map(item => ({ id: item.id, label: item.label }))}
          selectedIndex={selectedIndex}
          containerHeight={MENU_HEIGHT}
          colors={settingsColors}
          itemBackgroundStyle={itemBackgroundStyle}
          itemSelectedBackgroundStyle={itemSelectedBackgroundStyle}
          itemRightArrowUrl={itemRightArrowUrl}
        />
      </div>

      {/* Right panel - title "Equalizer", ImageView (200dp wide), label text */}
      <div style={{
        position: 'absolute',
        right: RIGHT_PANEL_MARGIN,
        top: 0,
        width: RIGHT_PANEL_WIDTH,
        height: H,
        zIndex: 10
      }}>
        {/* Title */}
        <div style={{
          position: 'absolute',
          top: 58,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 18,
          fontWeight: 'bold',
          color: '#ffffff',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          paddingLeft: 5,
          paddingRight: 5
        }}>
          Equalizer
        </div>

        {/* ImageView - 200dp wide, wrap_content */}
        {iconUrl && (
          <div style={{
            position: 'absolute',
            top: 96, // Below title
            left: 0,
            right: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start'
          }}>
            <img 
              src={iconUrl} 
              alt={selected?.label} 
              style={{ 
                maxWidth: 146, // SETTING_ICON size
                maxHeight: 146,
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                display: 'block'
              }} 
            />
          </div>
        )}

        {/* Label text */}
        {selected?.label && (
          <div style={{
            position: 'absolute',
            top: 242, // Below image (96 + 146)
            left: 0,
            right: 0,
            fontSize: 16,
            color: '#ffffff',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            paddingLeft: 5,
            paddingRight: 5
          }}>
            {selected.label}
          </div>
        )}
      </div>
    </div>
  );
};

export default EqualizerView;
