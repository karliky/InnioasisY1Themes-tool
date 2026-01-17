import React from 'react';
import { LoadedTheme } from '../../types';

interface WallpaperListViewProps {
  W: number;
  H: number;
  statusBarHeight: number;
  settingMaskUrl?: string;
  colors: { text_primary: string; text_selected: string };
  itemBackgroundStyle?: React.CSSProperties;
  itemSelectedBackgroundStyle?: React.CSSProperties;
  itemRightArrowUrl?: string;
  loadedTheme: LoadedTheme;
}

const WallpaperListView: React.FC<WallpaperListViewProps> = ({
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
  // WallpaperListActivity UI: left list (260dp wide) of wallpaper entries;
  // right preview (ImageView 160x120, centerCrop) + label "Current"
  const LIST_WIDTH = 260;
  const PREVIEW_WIDTH = 160;
  const PREVIEW_HEIGHT = 120;

  // Mock wallpaper list (in real app, this would come from available wallpapers)
  const wallpapers = [
    { id: 'default', label: 'Default', imageFile: (loadedTheme.spec as any)?.desktopWallpaper },
    { id: 'global', label: 'Global', imageFile: (loadedTheme.spec as any)?.globalWallpaper }
  ];

  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const selected = wallpapers[selectedIndex];

  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}>
      {/* Left list - 260dp wide */}
      <div style={{
        position: 'absolute',
        left: 9,
        top: statusBarHeight,
        width: LIST_WIDTH,
        height: H - statusBarHeight,
        overflow: 'hidden',
        zIndex: 10
      }}>
        {wallpapers.map((wallpaper, idx) => {
          const isSelected = idx === selectedIndex;
          const bgStyle = isSelected ? itemSelectedBackgroundStyle : itemBackgroundStyle;
          return (
            <div
              key={wallpaper.id}
              onClick={() => setSelectedIndex(idx)}
              style={{
                height: 40,
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 10,
                paddingRight: 10,
                color: isSelected ? colors.text_selected : colors.text_primary,
                fontWeight: 'bold',
                fontSize: 22,
                cursor: 'pointer',
                ...bgStyle
              }}
            >
              {wallpaper.label}
            </div>
          );
        })}
      </div>

      {/* Right preview - 160x120, centerCrop */}
      {selected?.imageFile && (() => {
        const previewUrl = loadedTheme.assetUrlForFile?.(selected.imageFile);
        if (!previewUrl) return null;
        return (
          <div style={{
            position: 'absolute',
            right: 22,
            top: statusBarHeight + 50,
            width: PREVIEW_WIDTH,
            height: PREVIEW_HEIGHT,
            zIndex: 10
          }}>
            <img 
              src={previewUrl} 
              alt={selected.label}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover' // centerCrop
              }}
            />
            <div style={{
              marginTop: 10,
              textAlign: 'center',
              fontSize: 16,
              color: '#ffffff',
              fontWeight: 'bold'
            }}>
              Current
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default WallpaperListView;
