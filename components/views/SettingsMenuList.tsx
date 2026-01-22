import React from 'react';

interface SettingsMenuItem {
  id: string;
  label: string;
  valueText?: string; // Right-side value text (e.g., "Off", "On", "10 min")
  iconFile?: string;
  iconUrl?: string;
}

interface SettingsMenuListProps {
  items: SettingsMenuItem[];
  selectedIndex: number;
  containerHeight: number;
  colors: { text_primary: string; text_selected: string };
  itemBackgroundStyle?: React.CSSProperties;
  itemSelectedBackgroundStyle?: React.CSSProperties;
  itemRightArrowUrl?: string;
}

const SettingsMenuList: React.FC<SettingsMenuListProps> = ({
  items,
  selectedIndex,
  containerHeight,
  colors,
  itemBackgroundStyle,
  itemSelectedBackgroundStyle,
  itemRightArrowUrl
}) => {
  const itemHeight = 40; // 40dp row height
  const itemGap = 0;
  const totalHeight = items.length * (itemHeight + itemGap);
  const maxScroll = Math.max(0, totalHeight - containerHeight);
  
  // Calculate how many items fit in the visible area
  const itemsPerPage = Math.floor(containerHeight / itemHeight);
  
  // Scrolling behavior: show items, scroll to reveal next item
  let targetY = 0;
  
  if (selectedIndex < itemsPerPage) {
    targetY = 0;
  } else {
    const itemsBeforeSelected = Math.floor((itemsPerPage - 1) / 2);
    targetY = (selectedIndex - itemsBeforeSelected) * itemHeight;
    
    if (targetY > maxScroll) {
      targetY = maxScroll;
    }
  }
  
  const scrollOffset = Math.max(0, Math.min(targetY, maxScroll));
  
  // Selected color: comes from colors.text_selected which is computed in SettingsView
  // as itemConfig.itemSelectedTextColor || '#3CFFDE' (default passed by adapter)
  const SELECTED_TEXT_COLOR = colors.text_selected;

  return (
    <div style={{ position: 'relative', height: containerHeight, overflow: 'hidden' }}>
      <div style={{ position: 'relative', transform: `translateY(-${scrollOffset}px)` }}>
        {items.map((item, idx) => {
          const selected = idx === selectedIndex;
          const rowY = idx * (itemHeight + itemGap);
          const backgroundStyle = selected 
            ? itemSelectedBackgroundStyle 
            : (itemBackgroundStyle || { backgroundColor: 'rgba(0,0,0,0.1)' });

          return (
            <div
              key={item.id || idx}
              style={{
                position: 'absolute',
                left: 0,
                top: rowY,
                width: '100%',
                height: itemHeight,
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 5, // layout_marginStart: 5dp
                paddingRight: 5, // layout_marginEnd: 5dp
                ...backgroundStyle
              }}
            >
              {/* Title text - 22sp bold */}
              <div style={{ 
                flex: 1, // layout_width: 0dp with layout_weight="1"
                display: 'flex', 
                alignItems: 'center',
                color: selected ? SELECTED_TEXT_COLOR : colors.text_primary, // Hard-coded #3CFFDE when selected
                fontWeight: 'bold', // textStyle: bold
                fontSize: 22, // textSize: 22sp
                overflow: 'hidden', 
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                marginRight: 5 // layout_marginEnd: 5dp
              }}>
                {item.label}
              </div>

              {/* Value text - 20sp bold (right-side) */}
              {item.valueText && (
                <div style={{
                  fontSize: 20, // textSize: 20sp
                  fontWeight: 'bold',
                  color: selected ? SELECTED_TEXT_COLOR : colors.text_primary,
                  marginRight: 5, // layout_marginEnd: 5dp
                  whiteSpace: 'nowrap'
                }}>
                  {item.valueText}
                </div>
              )}

              {/* Right arrow - visibility controlled by selection and item type */}
              {/* Per HOME_SCREEN_REVERSE_ENGINEERING.md: 
                  - Items with haveNext == true → arrow shown, value text hidden (opens another view)
                  - Items with haveNext == false → value text shown, arrow hidden (toggles/cycles)
                  - Since we don't have haveNext property, we infer: items WITHOUT valueText show arrow */}
              {selected && !item.valueText && (
                <div style={{ 
                  position: 'absolute', 
                  right: 5, // layout_marginEnd="5dp" (from item_setting.xml)
                  top: 0,
                  height: itemHeight, // fill_parent (row height 40dp for settings)
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
                    <span style={{ color: SELECTED_TEXT_COLOR, fontWeight: 700, fontSize: 22, lineHeight: 1 }}>›</span>
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

export default SettingsMenuList;
