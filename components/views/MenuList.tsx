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
  fixedItemHeight?: number; // Fixed row height in pixels (e.g., 45px for home menu)
  containerHeight?: number; // Fixed container height in pixels (e.g., 307px for home menu)
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
  folderIconUrl,
  fixedItemHeight,
  containerHeight
}) => {
  // Use fixed dimensions if provided (for home menu), otherwise calculate dynamically
  const itemHeight = fixedItemHeight || Math.floor((H - statusBarHeight - 12) / 7);
  const itemGap = 0;
  const actualRowWidth = fullWidth ? 480 : rowWidth;
  
  // Use fixed container height if provided, otherwise calculate
  const visibleHeight = containerHeight || (Math.floor((H - statusBarHeight - 12) / 7) * 7);
  
  const totalHeight = items.length * (itemHeight + itemGap);
  const maxScroll = Math.max(0, totalHeight - visibleHeight);
  
  // Calculate how many items fit in the visible area
  const itemsPerPage = Math.floor(visibleHeight / itemHeight);
  
  // Scrolling behavior: show ~7 items at once, scroll to reveal next item
  // When selected item is beyond the visible range, scroll to show it
  let targetY = 0;
  
  if (selectedIndex < itemsPerPage) {
    // Selected item is in the first page, no scroll needed
    targetY = 0;
  } else {
    // Scroll to show the selected item, keeping it visible
    // Show the selected item and items before/after it
    const itemsBeforeSelected = Math.floor((itemsPerPage - 1) / 2);
    targetY = (selectedIndex - itemsBeforeSelected) * itemHeight;
    
    // Don't scroll past the end
    if (targetY > maxScroll) {
      targetY = maxScroll;
    }
  }
  
  const scrollOffset = Math.max(0, Math.min(targetY, maxScroll));

  return (
    <div style={{ position: 'relative', height: visibleHeight, overflow: 'hidden' }}>
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

              {/* Label text - 22sp bold as per device spec */}
              <div style={{ 
                position: item.isFolder ? 'relative' : 'absolute', 
                left: item.isFolder ? undefined : 5, // padding from item_main.xml: @dimen/main_item_padding = 5dp
                top: item.isFolder ? undefined : 0, 
                right: item.isFolder ? undefined : 42, 
                height: item.isFolder ? 'auto' : rowH, 
                display: 'flex', 
                alignItems: 'center', 
                color: selected ? colors.text_selected : colors.text_primary, 
                fontWeight: 'bold', // textStyle: bold from item_main.xml
                fontSize: 22, // textSize: 22sp from item_main.xml
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

              {/* Right arrow - ImageView with adjustViewBounds="true", layout_height="fill_parent" */}
              {/* Per HOME_SCREEN_REVERSE_ENGINEERING.md: only shown on selected row, 10dp margin, SMALL_ICON (64x64px) */}
              {selected && (
                <div style={{ 
                  position: 'absolute', 
                  right: 10, // layout_marginEnd="10dp" (from item_main.xml)
                  top: 0,
                  height: rowH, // fill_parent (fills row height, 45dp for home menu)
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  {itemRightArrowUrl ? (
                    <img 
                      src={itemRightArrowUrl} 
                      alt="arrow" 
                      style={{ 
                        height: '100%', // adjustViewBounds: height fills parent
                        width: 'auto', // width adjusts to maintain aspect (wrap_content)
                        objectFit: 'contain', // fit-inside to SMALL_ICON target (64x64px), no crop
                        maxWidth: 64, // SMALL_ICON target size: 64x64px
                        maxHeight: 64,
                        opacity: 0.9 
                      }} 
                    />
                  ) : (
                    <span style={{ color: colors.text_selected, fontWeight: 700, fontSize: 22, lineHeight: 1 }}>›</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MenuList;
