import React from 'react';

interface DateTimeViewProps {
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

const DateTimeView: React.FC<DateTimeViewProps> = ({
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
  // DateOneLevelActivity UI: left list of rows (Date, Time, Time format, Time in title),
  // each with left label and right value; right panel shows icon, large day/date/time readouts
  const LIST_WIDTH = 218;
  const RIGHT_PANEL_WIDTH = 179;
  const RIGHT_PANEL_MARGIN = 22;

  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const items = [
    { id: 'date', label: 'Date', value: new Date().toLocaleDateString() },
    { id: 'time', label: 'Time', value: new Date().toLocaleTimeString() },
    { id: 'time_format', label: 'Time format', value: '24h' },
    { id: 'time_in_title', label: 'Time in title', value: 'Off' }
  ];

  const selected = items[selectedIndex];
  const dateTimeIcon = loadedTheme?.spec?.settingConfig?.dateTime;
  const iconUrl = dateTimeIcon && loadedTheme?.assetUrlForFile?.(dateTimeIcon);

  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}>
      {/* Left list */}
      <div style={{
        position: 'absolute',
        left: 9,
        top: statusBarHeight,
        width: LIST_WIDTH,
        height: H - statusBarHeight,
        overflow: 'hidden',
        zIndex: 10
      }}>
        {items.map((item, idx) => {
          const isSelected = idx === selectedIndex;
          const bgStyle = isSelected ? itemSelectedBackgroundStyle : itemBackgroundStyle;
          return (
            <div
              key={item.id}
              onClick={() => setSelectedIndex(idx)}
              style={{
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingLeft: 10,
                paddingRight: 10,
                color: isSelected ? colors.text_selected : colors.text_primary,
                fontWeight: 'bold',
                fontSize: 22,
                cursor: 'pointer',
                ...bgStyle
              }}
            >
              <span>{item.label}</span>
              <span style={{ fontSize: 20 }}>{item.value}</span>
            </div>
          );
        })}
      </div>

      {/* Right panel - icon and large day/date/time readouts */}
      <div style={{
        position: 'absolute',
        right: RIGHT_PANEL_MARGIN,
        top: statusBarHeight + 50,
        width: RIGHT_PANEL_WIDTH,
        zIndex: 10
      }}>
        {iconUrl && (
          <img 
            src={iconUrl} 
            alt="date time"
            style={{
              maxWidth: 146,
              maxHeight: 146,
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              display: 'block',
              marginBottom: 20
            }}
          />
        )}
        <div style={{
          color: '#ffffff',
          fontSize: 24,
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: 10
        }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
        </div>
        <div style={{
          color: '#ffffff',
          fontSize: 20,
          textAlign: 'center',
          marginBottom: 10
        }}>
          {new Date().toLocaleDateString()}
        </div>
        <div style={{
          color: '#ffffff',
          fontSize: 32,
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default DateTimeView;
