import React from 'react';

interface MenuItem {
  id: string;
  label: string;
  iconFile?: string;
  iconUrl?: string;
  isFolder?: boolean;
}

interface MenuListProps {
  items: MenuItem[];
  selectedIndex: number;
  H: number;
  statusBarHeight: number;
  colors: { text_primary: string; text_selected: string };
  itemBackgroundStyle?: React.CSSProperties;
  itemSelectedBackgroundStyle?: React.CSSProperties;
  itemRightArrowUrl?: string;
  showIcons?: boolean;
  leftPad?: number;
  rowWidth?: number;
  fullWidth?: boolean;
  folderIconUrl?: string;
}

const MenuList: React.FC<MenuListProps> = ({
  items,
  selectedIndex,
  H,
  statusBarHeight,
  colors,
  itemBackgroundStyle,
  itemSelectedBackgroundStyle,
  itemRightArrowUrl,
  showIcons = false,
  leftPad = 10,
  rowWidth = 200,
  fullWidth = false,
  folderIconUrl
}) => {
  const itemsPerPage = 7;
  const availableHeight = H - statusBarHeight;
  const itemHeight = Math.floor((availableHeight - 12) / itemsPerPage);
  const itemGap = 0;
  const actualRowWidth = fullWidth ? 480 : rowWidth; // Full width if requested
  const visibleHeight = itemsPerPage * (itemHeight + itemGap);
  const totalHeight = items.length * (itemHeight + itemGap);
  const maxScroll = Math.max(0, totalHeight - visibleHeight);
  
  // Calculate target scroll position to center the selected item
  const centerOffset = (itemsPerPage / 2) * (itemHeight + itemGap);
  let targetY = selectedIndex * (itemHeight + itemGap) - centerOffset;
  
  // For items near the end of the list, ensure we scroll to show all remaining items
  const itemsFromEnd = items.length - 1 - selectedIndex;
  if (itemsFromEnd < Math.floor(itemsPerPage / 2)) {
    // If we're within the last half-page of items, scroll to the bottom
    targetY = maxScroll;
  } else {
    // Otherwise, try to center the item
    targetY = Math.max(0, targetY);
  }
  
  const scrollOffset = Math.max(0, Math.min(targetY, maxScroll));

  return (
    <div style={{ position: 'relative', height: visibleHeight, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ position: 'relative', transform: `translateY(-${scrollOffset}px)` }}>
        {items.map((item, idx) => {
          const selected = idx === selectedIndex;
          const rowY = idx * (itemHeight + itemGap);
          const rowX = fullWidth ? 0 : leftPad;
          const rowW = actualRowWidth;
          const rowH = itemHeight;
          const backgroundStyle = selected 
            ? itemSelectedBackgroundStyle 
            : (itemBackgroundStyle || { backgroundColor: 'rgba(0,0,0,0.1)' });

          return (
            <div
              key={item.id || idx}
              style={{
                position: 'absolute',
                left: rowX,
                top: rowY,
                width: rowW,
                height: rowH,
                display: 'flex',
                alignItems: 'center',
                paddingRight: 32,
                ...backgroundStyle
              }}
            >
              {/* Folder icon for folder items */}
              {item.isFolder && (
                <>
                  {folderIconUrl ? (
                    <img 
                      src={folderIconUrl} 
                      alt="folder" 
                      style={{ width: 24, height: 24, marginLeft: 10, marginRight: 8, objectFit: 'contain', flexShrink: 0 }} 
                    />
                  ) : (
                    <span style={{ marginLeft: 10, marginRight: 8, color: selected ? colors.text_selected : colors.text_primary, fontSize: 20, flexShrink: 0 }}>📁</span>
                  )}
                </>
              )}

              {/* Label text */}
              <div style={{ 
                position: item.isFolder ? 'relative' : 'absolute', 
                left: item.isFolder ? undefined : 12, 
                top: item.isFolder ? undefined : 0, 
                right: item.isFolder ? undefined : 42, 
                height: item.isFolder ? 'auto' : rowH, 
                display: 'flex', 
                alignItems: 'center', 
                color: selected ? colors.text_selected : colors.text_primary, 
                fontWeight: selected ? 700 : 600, 
                fontSize: 22, 
                overflow: 'hidden', 
                whiteSpace: 'nowrap',
                flex: item.isFolder ? 1 : undefined
              }}>
                <div style={{ 
                  display: 'inline-block', 
                  animation: (selected && item.label.length > 12) ? 'marquee 8s linear infinite' : 'none',
                  overflow: item.isFolder ? 'hidden' : undefined,
                  textOverflow: item.isFolder ? 'ellipsis' : undefined,
                  whiteSpace: 'nowrap'
                }}>
                  {item.label}
                  {(selected && item.label.length > 12 && !item.isFolder) && (
                    <span style={{ paddingLeft: '40px' }}>{item.label}</span>
                  )}
                </div>
              </div>

              {/* Right arrow */}
              <div style={{ position: 'absolute', right: 10, top: (rowH - 24) / 2, width: 22, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {itemRightArrowUrl ? (
                  <img src={itemRightArrowUrl} alt="arrow" style={{ width: 22, height: 28, objectFit: 'contain', opacity: 0.9 }} />
                ) : (
                  <span style={{ color: selected ? colors.text_selected : colors.text_primary, fontWeight: 700, fontSize: 22, lineHeight: 1 }}>›</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MenuList;
