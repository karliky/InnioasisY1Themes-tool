import React from 'react';
import MenuList from './MenuList';

interface LanguageViewProps {
  W: number;
  H: number;
  statusBarHeight: number;
  settingMaskUrl?: string;
  colors: { text_primary: string; text_selected: string };
  itemBackgroundStyle?: React.CSSProperties;
  itemSelectedBackgroundStyle?: React.CSSProperties;
  itemRightArrowUrl?: string;
  loadedTheme?: any;
}

const LanguageView: React.FC<LanguageViewProps> = ({
  W,
  H,
  statusBarHeight,
  settingMaskUrl,
  colors,
  itemBackgroundStyle,
  itemSelectedBackgroundStyle,
  itemRightArrowUrl,
  loadedTheme
}) => {
  // LanguageActivity UI: left list of languages; right ImageView preview (full width, wrap_content)
  const MENU_WIDTH = 218;
  const MENU_HEIGHT = 305;
  const MENU_LEFT = 9;
  const MENU_TOP = 45;
  const RIGHT_PANEL_WIDTH = 179;
  const RIGHT_PANEL_MARGIN = 22;

  const languages = [
    { id: 'en', label: 'English', imageFile: loadedTheme?.spec?.settingConfig?.language },
    { id: 'es', label: 'Spanish', imageFile: loadedTheme?.spec?.settingConfig?.language },
    { id: 'fr', label: 'French', imageFile: loadedTheme?.spec?.settingConfig?.language },
    { id: 'de', label: 'German', imageFile: loadedTheme?.spec?.settingConfig?.language },
    { id: 'zh', label: 'Chinese', imageFile: loadedTheme?.spec?.settingConfig?.language }
  ];

  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const selected = languages[selectedIndex];
  const previewUrl = selected?.imageFile && loadedTheme?.assetUrlForFile?.(selected.imageFile);

  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}>
      {/* Left list */}
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
          items={languages.map(lang => ({ id: lang.id, label: lang.label }))}
          selectedIndex={selectedIndex}
          H={H}
          statusBarHeight={statusBarHeight}
          fixedItemHeight={40}
          containerHeight={MENU_HEIGHT}
          colors={colors}
          itemBackgroundStyle={itemBackgroundStyle}
          itemSelectedBackgroundStyle={itemSelectedBackgroundStyle}
          itemRightArrowUrl={itemRightArrowUrl}
          leftPad={0}
        />
      </div>

      {/* Right preview - full width, wrap_content */}
      {previewUrl && (
        <div style={{
          position: 'absolute',
          right: RIGHT_PANEL_MARGIN,
          top: statusBarHeight + 50,
          width: RIGHT_PANEL_WIDTH,
          zIndex: 10
        }}>
          <img 
            src={previewUrl} 
            alt={selected.label}
            style={{
              width: '100%',
              height: 'auto',
              maxWidth: 146,
              maxHeight: 146,
              objectFit: 'contain',
              display: 'block'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default LanguageView;
