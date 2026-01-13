import React from 'react';
import MenuList from './MenuList';
import { LoadedTheme } from '../../types';

interface GenericMenuViewProps {
  W: number;
  H: number;
  statusBarHeight: number;
  items: any[];
  selectedIndex: number;
  colors: { text_primary: string; text_selected: string };
  itemBackgroundStyle?: React.CSSProperties;
  itemSelectedBackgroundStyle?: React.CSSProperties;
  itemRightArrowUrl?: string;
  loadedTheme?: LoadedTheme;
}

const GenericMenuView: React.FC<GenericMenuViewProps> = ({
  W,
  H,
  statusBarHeight,
  items,
  selectedIndex,
  colors,
  itemBackgroundStyle,
  itemSelectedBackgroundStyle,
  itemRightArrowUrl,
  loadedTheme
}) => {
  // Check if items have folder property
  const hasFolder = items.some(item => item.isFolder);
  const folderIconFile = hasFolder && loadedTheme ? (loadedTheme.spec as any)?.fileConfig?.folderIcon : undefined;
  const folderIconUrl = folderIconFile && loadedTheme ? loadedTheme.assetUrlForFile?.(folderIconFile) : undefined;

  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}>
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
          fullWidth={true}
          folderIconUrl={folderIconUrl}
        />
      </div>
    </div>
  );
};

export default GenericMenuView;
