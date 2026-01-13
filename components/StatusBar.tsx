import React from 'react';

interface StatusBarProps {
  W: number;
  statusBarHeight: number;
  colors: { status_bar_bg: string; text_primary: string; text_selected: string };
  showTimeInTitle: boolean;
  currentViewTitle: string;
  currentViewId: string;
  playState: 'playing' | 'pause' | 'stop' | 'fmPlaying' | 'audiobookPlaying' | null;
  headsetState: 'withMic' | 'withoutMic' | null;
  bluetoothState: 'connected' | 'connecting' | 'disconnected' | null;
  ringtoneEnabled: boolean;
  vibratorEnabled: boolean;
  batteryLevel: number;
  isCharging: boolean;
  getStatusIconUrl: (key: string) => string | undefined;
  getBatteryIconFromConfig: (level: number, charging: boolean) => string | undefined;
  getBatteryIconUrl: (level: number, charging: boolean) => string;
  defaultRingtoneIcon: string;
  defaultVibratorIcon: string;
}

const StatusBar: React.FC<StatusBarProps> = ({
  W,
  statusBarHeight,
  colors,
  showTimeInTitle,
  currentViewTitle,
  currentViewId,
  playState,
  headsetState,
  bluetoothState,
  ringtoneEnabled,
  vibratorEnabled,
  batteryLevel,
  isCharging,
  getStatusIconUrl,
  getBatteryIconFromConfig,
  getBatteryIconUrl,
  defaultRingtoneIcon,
  defaultVibratorIcon
}) => {
  return (
    <div style={{ 
      position: 'absolute', 
      left: 0, 
      top: 0, 
      width: W, 
      height: statusBarHeight, 
      backgroundColor: colors.status_bar_bg || 'rgba(0,0,0,0.25)',
      color: '#ffffff', 
      display: 'flex', 
      alignItems: 'center', 
      paddingLeft: 14,
      paddingRight: 14,
      justifyContent: 'space-between', 
      zIndex: 10,
      fontSize: 20,
      fontWeight: 700
    }}>
      <span>
        {showTimeInTitle && currentViewId === 'home' 
          ? new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
          : currentViewTitle
        }
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {/* Play icon */}
        {playState && (() => {
          const playIconKey = playState === 'playing' ? 'playing' : 
                              playState === 'pause' ? 'pause' : 
                              playState === 'stop' ? 'stop' : 
                              playState === 'fmPlaying' ? 'fmPlaying' : 
                              'audiobookPlaying';
          const playIconUrl = getStatusIconUrl(playIconKey);
          return playIconUrl && (
            <img src={playIconUrl} alt="play" style={{ height: 20, width: 20, objectFit: 'contain' }} />
          );
        })()}

        {/* Headset icon */}
        {headsetState && (() => {
          const headsetIconKey = headsetState === 'withMic' ? 'headsetWithMic' : 'headsetWithoutMic';
          const headsetIconUrl = getStatusIconUrl(headsetIconKey);
          return headsetIconUrl && (
            <img src={headsetIconUrl} alt="headset" style={{ height: 20, width: 20, objectFit: 'contain' }} />
          );
        })()}

        {/* Bluetooth icon */}
        {bluetoothState && (() => {
          const blIconKey = bluetoothState === 'connected' ? 'blConnected' : 
                           bluetoothState === 'connecting' ? 'blConnecting' : 
                           'blDisconnected';
          const blIconUrl = getStatusIconUrl(blIconKey);
          return blIconUrl && (
            <img src={blIconUrl} alt="bluetooth" style={{ height: 20, width: 20, objectFit: 'contain' }} />
          );
        })()}

        {/* Ringtone icon */}
        {ringtoneEnabled && (
          <img src={defaultRingtoneIcon} alt="ringtone" style={{ height: 20, width: 20, objectFit: 'contain' }} title="Ringtone" />
        )}

        {/* Vibrator icon */}
        {vibratorEnabled && (
          <img src={defaultVibratorIcon} alt="vibrator" style={{ height: 20, width: 20, objectFit: 'contain' }} title="Vibrator" />
        )}

        {/* Battery indicator */}
        {(() => {
          const batteryUrl = getBatteryIconFromConfig(batteryLevel, isCharging) || getBatteryIconUrl(batteryLevel, isCharging);
          const percentage = ((batteryLevel + 1) * 25);
          return batteryUrl ? (
            <>
              <img src={batteryUrl} alt="battery" style={{ height: 16, width: 'auto' }} />
              <span style={{ fontSize: 14 }}>{percentage}%</span>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: 16, height: 8, border: `1px solid ${colors.text_primary || '#0f0'}`, borderRadius: 1, padding: '1px', display: 'flex', boxSizing: 'border-box' }}>
                <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: colors.text_primary || '#0f0' }} />
              </div>
              <span style={{ fontSize: 14 }}>{percentage}%</span>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default StatusBar;
