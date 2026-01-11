import React, { useCallback, useEffect, useMemo } from 'react';
import { LoadedTheme, Song } from '../types';
import { getBatteryIconUrl } from '../services/batteryService';
import Toast from './Toast';
import selectedNoArrow from '../res/extracted_item_selected_no_arrow.9.png?url';
import selectedNoArrowAlt from '../res/extracted_item_selected_no_arrow_alt.9.png?url';
import albumCover from '../res/albumcover.avif?url';

// Default status bar icons (fallbacks when theme doesn't provide them)
import defaultPlayIcon from '../docs/status_default_icons/icon_statusbar_play__mU.png?url';
import defaultPauseIcon from '../docs/status_default_icons/icon_statusbar_stop__Ck.png?url';
import defaultStopIcon from '../docs/status_default_icons/icon_statusbar_real_stop__LS.png?url';
import defaultFmIcon from '../docs/status_default_icons/icon_statusbar_fm__Th.png?url';
import defaultAudiobookIcon from '../docs/status_default_icons/icon_statusbar_book__7S.png?url';
import defaultRingtoneIcon from '../docs/status_default_icons/icon_statusbar_ringtone__WV.png?url';
import defaultVibratorIcon from '../docs/status_default_icons/icon_statusbar_vibrate__hS.png?url';
import defaultBlConnected from '../docs/status_default_icons/icon_bluetooth_2__By.png?url';
import defaultBlConnecting from '../docs/status_default_icons/icon_bluetooth_1__B-.png?url';
import defaultBlDisconnected from '../docs/status_default_icons/icon_bluetooth_0__B2.png?url';
import defaultHeadsetWithMic from '../docs/status_default_icons/icon_headset_2__cB.png?url';
import defaultHeadsetWithoutMic from '../docs/status_default_icons/icon_headset_1__AQ.png?url';
import defaultBattery0 from '../docs/status_default_icons/icon_statusbar_battery_1__vT.png?url';
import defaultBattery1 from '../docs/status_default_icons/icon_statusbar_battery_2__Mg.png?url';
import defaultBattery2 from '../docs/status_default_icons/icon_statusbar_battery_3__b8.png?url';
import defaultBattery3 from '../docs/status_default_icons/icon_statusbar_battery_4__rm.png?url';
import defaultBatteryCharging0 from '../docs/status_default_icons/icon_statusbar_battery_1_c__Xw.png?url';
import defaultBatteryCharging1 from '../docs/status_default_icons/icon_statusbar_battery_2_c__gG.png?url';
import defaultBatteryCharging2 from '../docs/status_default_icons/icon_statusbar_battery_3_c__gr.png?url';
import defaultBatteryCharging3 from '../docs/status_default_icons/icon_statusbar_battery_4_c__E3.png?url';

// Default icon arrays for fallback
const DEFAULT_BATTERY_ICONS = [defaultBattery0, defaultBattery1, defaultBattery2, defaultBattery3];
const DEFAULT_BATTERY_CHARGING_ICONS = [defaultBatteryCharging0, defaultBatteryCharging1, defaultBatteryCharging2, defaultBatteryCharging3];

interface ThemeDisplayProps {
  loadedTheme: LoadedTheme;
  themeViewId: string;
  themeSelectedIndex: number;
  currentSong: Song | null;
  selectedSongIndex: number;
  batteryLevel: number; // 0..3
  isCharging: boolean;
  showToast: boolean;
  onHideToast: () => void;
  toastMessage?: string;
  playState: 'playing' | 'pause' | 'stop' | 'fmPlaying' | 'audiobookPlaying' | null;
  headsetState: 'withMic' | 'withoutMic' | null;
  bluetoothState: 'connected' | 'connecting' | 'disconnected' | null;
  ringtoneEnabled: boolean;
  vibratorEnabled: boolean;
  elapsedTime: number; // in seconds
  playbackProgress: number; // 0-1
  showTimeInTitle: boolean;
  dialogState: {
    visible: boolean;
    title: string;
    message: string;
    options: string[];
    selectedIndex: number;
  };
  onDialogSelect: (option: string) => void;
  timedShutdownValue: 'off' | '10' | '20' | '30' | '60' | '90' | '120';
  backlightValue: '10' | '15' | '30' | '45' | '60' | '120' | '300' | 'always';
}

const ThemeDisplay: React.FC<ThemeDisplayProps> = ({ 
  loadedTheme, 
  themeViewId, 
  themeSelectedIndex, 
  currentSong,
  selectedSongIndex,
  batteryLevel, 
  isCharging, 
  showToast, 
  onHideToast,
  toastMessage = 'Not implemented',
  playState,
  headsetState,
  bluetoothState,
  ringtoneEnabled,
  vibratorEnabled,
  elapsedTime,
  playbackProgress,
  showTimeInTitle,
  dialogState,
  onDialogSelect,
  timedShutdownValue
  ,
  backlightValue
}) => {
  const spec = loadedTheme.spec;

  const W = 480;
  const H = 360;

  // Derive color tokens from config properties per theme manifest docs
  const colors = useMemo(() => {
    const itemConfig = (spec as any)?.itemConfig || {};
    const menuConfig = (spec as any)?.menuConfig || {};
    const statusConfig = (spec as any)?.statusConfig || {};
    
    // We use a vivid color like #00ff2a as fallback to make missing configs obvious
    return {
      text_primary: itemConfig.itemTextColor || menuConfig.menuItemTextColor || '#00ff2a',
      text_selected: itemConfig.itemSelectedTextColor || menuConfig.menuItemSelectedTextColor || '#00ff2a',
      status_bar_bg: statusConfig.statusBarColor || '#0000004e' // TODO: Reverse engineer the APK to get the default alpha color
    };
  }, [spec]);

  const statusBarHeight = spec.layout_tokens?.status_bar?.height_px || 40;

  // Get statusConfig from theme
  const statusConfig = useMemo(() => {
    return (spec as any)?.statusConfig || {};
  }, [spec]);

  const settingConfig = useMemo(() => {
    return (spec as any)?.settingConfig || {};
  }, [spec]);

  const dialogConfig = useMemo(() => {
    return (spec as any)?.dialogConfig || {};
  }, [spec]);

  // Get playerConfig from theme
  const playerConfig = useMemo(() => {
    return (spec as any)?.playerConfig || {};
  }, [spec]);

  // Helper to get status icon URL with fallback to defaults
  const getStatusIconUrl = useCallback((key: string): string | undefined => {
    const file = statusConfig[key];
    // Try to load theme's custom icon first
    if (file && typeof file === 'string' && file.trim() !== '') {
      const url = loadedTheme.assetUrlForFile?.(file);
      if (url) return url;
    }
    
    // Fallback to default icons
    const defaultIcons: Record<string, string> = {
      playing: defaultPlayIcon,
      pause: defaultPauseIcon,
      stop: defaultStopIcon,
      fmPlaying: defaultFmIcon,
      audiobookPlaying: defaultAudiobookIcon,
      blConnected: defaultBlConnected,
      blConnecting: defaultBlConnecting,
      blDisconnected: defaultBlDisconnected,
      headsetWithMic: defaultHeadsetWithMic,
      headsetWithoutMic: defaultHeadsetWithoutMic,
    };
    
    return defaultIcons[key];
  }, [statusConfig, loadedTheme]);

  // Get battery icon URLs from statusConfig with fallback to defaults
  const getBatteryIconFromConfig = useCallback((level: number, charging: boolean): string | undefined => {
    const batteryArray = charging ? statusConfig.batteryCharging : statusConfig.battery;
    const lev = Math.max(0, Math.min(3, Math.floor(level)));
    
    // Try theme's custom battery icons first
    if (Array.isArray(batteryArray) && batteryArray.length > lev) {
      const file = batteryArray[lev];
      if (file && typeof file === 'string') {
        const url = loadedTheme.assetUrlForFile?.(file);
        if (url) return url;
      }
    }
    
    // Fallback to default battery icons
    const defaultArray = charging ? DEFAULT_BATTERY_CHARGING_ICONS : DEFAULT_BATTERY_ICONS;
    return defaultArray[lev];
  }, [statusConfig, loadedTheme]);

  // Derive home items and assets from config
  const homeItems = useMemo(() => {
    const homeCfg = (spec as any)?.homePageConfig || {};
    const labelMap: Record<string, string> = {
      nowPlaying: 'Now playing',
      music: 'Music',
      video: 'Videos',
      audiobooks: 'Audiobooks',
      photos: 'Photos',
      fm: 'FM Radio',
      bluetooth: 'Bluetooth',
      settings: 'Settings'
    };
    // Only show the standard 8 menu items in order
    const standardItems = ['nowPlaying', 'music', 'video', 'audiobooks', 'photos', 'fm', 'bluetooth', 'settings'];
    return standardItems
      .filter(key => homeCfg[key] !== undefined)
      .map(key => ({
        id: key,
        label: labelMap[key],
        iconFile: typeof homeCfg[key] === 'string' ? homeCfg[key] : undefined,
      }));
  }, [spec]);

  const settingsItems = useMemo(() => {
    // Get the correct timed shutdown icon based on current value
    const timedShutdownIcon = settingConfig?.[`timedShutdown_${timedShutdownValue}` as keyof typeof settingConfig];
    const backlightIcon = settingConfig?.[`backlight_${backlightValue}` as keyof typeof settingConfig];
    
    const base = [
      { id: 'shutdown', label: 'Shutdown', iconFile: settingConfig?.shutdown },
      { id: 'timed_shutdown', label: 'Timed shutdown', iconFile: timedShutdownIcon },
      { id: 'shuffle', label: 'Shuffle', iconFile: settingConfig?.shuffleOff },
      { id: 'repeat', label: 'Repeat', iconFile: settingConfig?.repeatOff },
      { id: 'equalizer', label: 'Equalizer', iconFile: settingConfig?.equalizer_normal },
      { id: 'file_extension', label: 'File extension', iconFile: settingConfig?.fileExtensionOff },
      { id: 'key_lock', label: 'Key lock', iconFile: settingConfig?.keyLockOff },
      { id: 'key_tone', label: 'Key tone', iconFile: settingConfig?.keyToneOff },
      { id: 'key_vibration', label: 'Key vibration', iconFile: settingConfig?.keyVibrationOff },
      { id: 'wallpaper', label: 'Wallpaper', iconFile: settingConfig?.wallpaper },
      { id: 'backlight', label: 'Backlight', iconFile: backlightIcon },
      { id: 'brightness', label: 'Brightness', iconFile: settingConfig?.brightness },
      { id: 'display_battery', label: 'Display battery', iconFile: settingConfig?.displayBatteryOff },
      { id: 'date_time', label: 'Date & Time', iconFile: settingConfig?.dateTime },
      { id: 'theme', label: 'Theme', iconFile: settingConfig?.theme },
      { id: 'language', label: 'Language', iconFile: settingConfig?.language },
      { id: 'factory_reset', label: 'Factory reset', iconFile: settingConfig?.factoryReset },
      { id: 'clear_cache', label: 'Clear cache', iconFile: settingConfig?.clearCache },
      { id: 'about', label: 'About', iconFile: undefined }
    ];
    return base.map(item => ({
      ...item,
      iconUrl: item.iconFile ? loadedTheme.assetUrlForFile?.(item.iconFile) : undefined
    }));
  }, [loadedTheme, settingConfig, timedShutdownValue, backlightValue]);

  const equalizerItems = useMemo(() => {
    const base = [
      { id: 'equalizer_normal', label: 'Normal', iconFile: settingConfig?.equalizer_normal },
      { id: 'equalizer_classical', label: 'Classical', iconFile: settingConfig?.equalizer_classical },
      { id: 'equalizer_dance', label: 'Dance', iconFile: settingConfig?.equalizer_dance },
      { id: 'equalizer_flat', label: 'Flat', iconFile: settingConfig?.equalizer_flat },
      { id: 'equalizer_folk', label: 'Folk', iconFile: settingConfig?.equalizer_folk },
      { id: 'equalizer_heavymetal', label: 'Heavy Metal', iconFile: settingConfig?.equalizer_heavymetal },
      { id: 'equalizer_hiphop', label: 'Hip Hop', iconFile: settingConfig?.equalizer_hiphop },
      { id: 'equalizer_jazz', label: 'Jazz', iconFile: settingConfig?.equalizer_jazz },
      { id: 'equalizer_pop', label: 'Pop', iconFile: settingConfig?.equalizer_pop },
      { id: 'equalizer_rock', label: 'Rock', iconFile: settingConfig?.equalizer_rock }
    ];

    return base.map(item => ({
      ...item,
      iconUrl: item.iconFile ? loadedTheme.assetUrlForFile?.(item.iconFile) : undefined
    }));
  }, [loadedTheme, settingConfig]);

  const backgroundUrl = useMemo(() => {
    // For home view: always use desktopWallpaper
    if (themeViewId === 'home') {
      const desktopBg = (spec as any)?.desktopWallpaper;
      if (desktopBg && loadedTheme.assetUrlForFile) {
        const url = loadedTheme.assetUrlForFile(desktopBg);
        if (url) return url;
      }
      const bgId = (spec as any)?.theme?.background_image_id;
      return bgId ? loadedTheme.assetUrlForId(bgId) : undefined;
    }
    
    // For other views: use globalWallpaper if set and present, otherwise fallback to desktopWallpaper
    const globalBg = (spec as any)?.globalWallpaper;
    if (globalBg && loadedTheme.assetUrlForFile) {
      const url = loadedTheme.assetUrlForFile(globalBg);
      if (url) return url;
    }
    
    // Fallback to desktopWallpaper
    const desktopBg = (spec as any)?.desktopWallpaper;
    if (desktopBg && loadedTheme.assetUrlForFile) {
      const url = loadedTheme.assetUrlForFile(desktopBg);
      if (url) return url;
    }
    
    const bgId = (spec as any)?.theme?.background_image_id;
    return bgId ? loadedTheme.assetUrlForId(bgId) : undefined;
  }, [spec, loadedTheme, themeViewId]);

  const desktopMaskUrl = useMemo(() => {
    const maskFile = (spec as any)?.desktopMask;
    if (!maskFile || !loadedTheme.assetUrlForFile) return undefined;
    return loadedTheme.assetUrlForFile(maskFile);
  }, [spec, loadedTheme]);

  const settingMaskUrl = useMemo(() => {
    const maskFile = settingConfig?.settingMask;
    if (!maskFile || !loadedTheme.assetUrlForFile) return undefined;
    return loadedTheme.assetUrlForFile(maskFile);
  }, [loadedTheme, settingConfig]);

  const settingThemeImageUrl = useMemo(() => {
    const file = (spec as any)?.themeCover;
    if (!file || !loadedTheme.assetUrlForFile) return undefined;
    return loadedTheme.assetUrlForFile(file);
  }, [loadedTheme, spec]);

  const itemRightArrowUrl = useMemo(() => {
    const file = (spec as any)?.itemConfig?.itemRightArrow;
    if (!file || !loadedTheme.assetUrlForFile) return undefined;
    return loadedTheme.assetUrlForFile(file);
  }, [spec, loadedTheme]);

  const defaultSelectedBg = selectedNoArrowAlt || selectedNoArrow;

  const isColorString = useCallback((val?: string) => {
    if (!val) return false;
    return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(val.trim());
  }, []);

  const resolveBackgroundStyle = useCallback((val?: string) => {
    if (!val) return undefined;
    if (isColorString(val)) {
      return { backgroundColor: val } as React.CSSProperties;
    }
    const url = loadedTheme.assetUrlForFile?.(val);
    if (url) {
      return {
        backgroundImage: `url(${url})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center'
      } as React.CSSProperties;
    }
    return undefined;
  }, [isColorString, loadedTheme]);

  const itemBackgroundStyle = useMemo(() => {
    const cfg = (spec as any)?.itemConfig?.itemBackground;
    return resolveBackgroundStyle(cfg);
  }, [resolveBackgroundStyle, spec]);

  const itemSelectedBackgroundStyle = useMemo(() => {
    const cfg = (spec as any)?.itemConfig?.itemSelectedBackground;
    const resolved = resolveBackgroundStyle(cfg);
    if (resolved) return resolved;
    if (defaultSelectedBg) {
      // Fallback to the extracted default selection outline used by the device firmware
      return {
        backgroundImage: `url(${defaultSelectedBg})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center'
      } as React.CSSProperties;
    }
    return { backgroundColor: 'rgba(255,255,255,0.12)' } as React.CSSProperties;
  }, [resolveBackgroundStyle, spec, defaultSelectedBg]);

  const stripExt = (name: string) => name.replace(/\.[^/.]+$/, '');

  // Build @font-face rules and apply a theme-scoped font stack
  const themeFonts = useMemo(() => {
    const modern = spec.theme?.fonts || [];
    if (modern.length > 0) return modern;

    // Fall back to fontFamily from config.json if available
    const fontFamily = (spec as any)?.fontFamily;
    if (fontFamily) {
      return [{ file: fontFamily, default: true }];
    }
    
    return [];
  }, [spec]);

  const fontEntries = useMemo(() => {
    return themeFonts
      .map(f => {
        const url = loadedTheme.assetUrlForFile?.(f.file);
        if (!url) return null;
        const family = f.id || stripExt(f.file);
        return { family, url, original: f.file };
      })
      .filter(Boolean) as Array<{ family: string; url: string; original: string }>;
  }, [themeFonts, loadedTheme]);

  const shouldUseRobotoFallback = useMemo(() => fontEntries.length === 0, [fontEntries]);

  const defaultFontFamily = useMemo(() => {
    if (!fontEntries.length) return '"Roboto", "Helvetica Neue", Arial, sans-serif';
    const def = themeFonts.find(f => f.default) || themeFonts[0];
    const family = def.id || stripExt(def.file);
    const alt = stripExt(def.file);
    const stack = [`"${family}"`];
    if (alt && alt !== family) stack.push(`"${alt}"`);
    stack.push('"Courier New Bold"', '"Courier New"', 'Courier', 'monospace');
    return stack.join(', ');
  }, [fontEntries.length, themeFonts]);

  useEffect(() => {
    if (typeof document === 'undefined' || !shouldUseRobotoFallback) return;
    const styleId = 'theme-roboto-fallback';
    const head = document.head || document.getElementsByTagName('head')[0];
    if (!head || head.querySelector(`#${styleId}`)) return;

    const link = document.createElement('link');
    link.id = styleId;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap';
    head.appendChild(link);

    return () => {
      const el = head.querySelector(`#${styleId}`);
      if (el) el.remove();
    };
  }, [shouldUseRobotoFallback]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const safeThemeId = loadedTheme.id.replace(/[^a-zA-Z0-9_-]/g, '-');
    const styleId = `theme-fonts-${safeThemeId}`;
    const head = document.head || document.getElementsByTagName('head')[0];
    const existing = head?.querySelector(`#${styleId}`);
    if (existing) existing.remove();

    if (!fontEntries.length || !head) return;

    const css = fontEntries
      .map(({ family, url, original }) => {
        const ext = original.split('.').pop()?.toLowerCase();
        const format = ext === 'otf' ? 'opentype' : ext === 'woff' ? 'woff' : ext === 'woff2' ? 'woff2' : 'truetype';
        return `@font-face { font-family: "${family}"; src: url('${url}') format('${format}'); font-weight: 400; font-style: normal; font-display: swap; }`;
      })
      .join('\n');

    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.setAttribute('data-theme-fonts', loadedTheme.id);
    styleEl.appendChild(document.createTextNode(css));
    head.appendChild(styleEl);

    return () => {
      const el = head.querySelector(`#${styleId}`);
      if (el) el.remove();
    };
  }, [fontEntries, loadedTheme.id]);

  // Construct a simple view using derived menu items
  const currentView = useMemo(() => {
    if (themeViewId === 'music') {
      return { 
        id: 'music', 
        title: 'Music', 
        items: ['All songs', 'Playlists', 'Artists', 'Albums', 'Genres', 'Folders', 'Search'].map(label => ({ id: label.toLowerCase().replace(/\s+/g, '_'), label }))
      };
    }
    if (themeViewId === 'music_folders') {
      const folders = [
        'Bad',
        'Thriller',
        'Dangerous',
        'HIStory',
        'Invincible',
        'Off the Wall',
        'The Wall',
        'Bloodline',
        'Unreleased',
        'Live',
        'Demos',
        'Remixes',
        'Collabs',
        'Remastered',
        'Vault'
      ];
      return {
        id: 'music_folders',
        title: 'Folders',
        items: folders.map(label => ({ id: label.toLowerCase().replace(/\s+/g, '_'), label, isFolder: true }))
      };
    }
    if (themeViewId === 'videos_folders') {
      const folders = [
        'Music Videos',
        'Concerts',
        'Documentaries',
        'Interviews',
        'Behind The Scenes',
        'Short Films',
        'Live Performances',
        'Rehearsals',
        'Awards Shows',
        'TV Appearances',
        'Tributes',
        'Fan Made',
        'Remastered',
        'Archives',
        'Collections'
      ];
      return {
        id: 'videos_folders',
        title: 'Folders',
        items: folders.map(label => ({ id: label.toLowerCase().replace(/\s+/g, '_'), label, isFolder: true }))
      };
    }
    if (themeViewId === 'videos') {
      return { 
        id: 'videos', 
        title: 'Videos', 
        items: ['All video', 'Playlist', 'Folders', 'Search'].map(label => ({ id: label.toLowerCase().replace(/\s+/g, '_'), label }))
      };
    }
    if (themeViewId === 'audiobooks') {
      return { 
        id: 'audiobooks', 
        title: 'Audiobooks', 
        items: ['All audiobooks', 'Artists', 'Albums', 'Folders', 'Bookmark lists', 'Settings'].map(label => ({ id: label.toLowerCase().replace(/\s+/g, '_'), label }))
      };
    }
    if (themeViewId === 'settings') {
      return {
        id: 'settings',
        title: 'Settings',
        items: settingsItems
      };
    }
    if (themeViewId === 'settingsEqualizer') {
      return {
        id: 'settingsEqualizer',
        title: 'Equalizer',
        items: equalizerItems
      };
    }
    if (themeViewId === 'settingsTheme') {
      return {
        id: 'settingsTheme',
        title: 'Theme',
        themeImageUrl: settingThemeImageUrl
      };
    }
    if (themeViewId === 'nowPlaying') {
      return { 
        id: 'nowPlaying', 
        title: 'Now Playing'
      };
    }
    return { id: 'home', title: 'Home', items: homeItems };
  }, [equalizerItems, homeItems, settingThemeImageUrl, settingsItems, themeViewId]);

  return (
    <div className="rounded-sm overflow-hidden relative select-none" style={{ width: W, height: H, backgroundColor: '#000', fontFamily: defaultFontFamily }}>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
      {/* Background image - covers entire screen */}
      {backgroundUrl && <img src={backgroundUrl} alt="bg" style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', objectFit: 'fill' }} />}

      {/* Status Bar */}
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
          {showTimeInTitle && currentView?.id === 'home' 
            ? new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
            : (currentView?.title || 'Home')
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

          {/* Ringtone icon - always uses default (not theme-configurable per APK docs) */}
          {ringtoneEnabled && (
            <img src={defaultRingtoneIcon} alt="ringtone" style={{ height: 20, width: 20, objectFit: 'contain' }} title="Ringtone" />
          )}

          {/* Vibrator icon - always uses default (not theme-configurable per APK docs) */}
          {vibratorEnabled && (
            <img src={defaultVibratorIcon} alt="vibrator" style={{ height: 20, width: 20, objectFit: 'contain' }} title="Vibrator" />
          )}

          {/* Battery indicator */}
          {(() => {
            // Try to get battery icon from statusConfig first, then fallback to batteryService
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

      {/* HOME VIEW */}
      {currentView?.id === 'home' && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}>
          {/* Desktop Mask Overlay - behind menu items but on top of background */}
          {desktopMaskUrl && (
            <img 
              src={desktopMaskUrl} 
              alt="desktop mask overlay" 
              style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', zIndex: 5 }} 
            />
          )}

          {/* Scrollable list container */}
          <div style={{ position: 'absolute', left: 0, top: statusBarHeight, width: W, height: H - statusBarHeight, overflow: 'hidden', zIndex: 10 }}>
            {(() => {
              const items = currentView.items || [];
              const itemsPerPage = 7; // Fixed to show exactly 7 items
              const availableHeight = H - statusBarHeight;
              const itemHeight = Math.floor((availableHeight - 12) / itemsPerPage); // 7 items with small gap at bottom
              const itemGap = 0;
              const leftPad = 10; // Offset items to the right
              const rowWidth = 200; // Slightly smaller width
              const visibleHeight = itemsPerPage * (itemHeight + itemGap); // Exactly 7 items visible
              const targetY = themeSelectedIndex * (itemHeight + itemGap) - (itemsPerPage / 2) * (itemHeight + itemGap);
              const maxScroll = Math.max(0, items.length * (itemHeight + itemGap) - visibleHeight);
              const scrollOffset = Math.max(0, Math.min(targetY, maxScroll));

              return (
                <div style={{ position: 'relative', height: visibleHeight, overflow: 'hidden', marginTop: 4 }}>
                  <div style={{ position: 'relative', transform: `translateY(-${scrollOffset}px)` }}>
                  {items.map((item: any, idx: number) => {
                    const selected = idx === themeSelectedIndex;
                    const rowY = idx * (itemHeight + itemGap);
                    const rowX = leftPad;
                    const rowW = rowWidth;
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
                        <div style={{ position: 'absolute', left: 12, top: 0, right: 42, height: rowH, display: 'flex', alignItems: 'center', color: selected ? colors.text_selected : colors.text_primary, fontWeight: selected ? 700 : 600, fontSize: 22, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-block', animation: (selected && item.label.length > 12) ? 'marquee 8s linear infinite' : 'none' }}>
                            {item.label}
                            {(selected && item.label.length > 12) && (
                              <span style={{ paddingLeft: '40px' }}>{item.label}</span>
                            )}
                          </div>
                        </div>
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
            })()}
          </div>

          {/* Right icon panel showing selected item */}
          {(() => {
            const items = currentView.items || [];
            const selected = items[themeSelectedIndex];
            const iconUrl = selected?.iconFile ? loadedTheme.assetUrlForFile?.(selected.iconFile) : undefined;
            if (!iconUrl) return null;
            const panelW = 220;
            const panelH = 220;
            const rightX = W - panelW;
            const centerY = (H - 40) / 2;
            return (
              <div style={{ position: 'absolute', left: rightX, top: centerY - panelH / 2, width: panelW, height: panelH, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, zIndex: 10 }}>
                <img src={iconUrl} alt={selected?.label} style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
              </div>
            );
          })()}
        </div>
      )}

      {/* SETTINGS VIEW */}
      {currentView?.id === 'settings' && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}>
          {/* Settings Mask Overlay */}
          {settingMaskUrl && (
            <img 
              src={settingMaskUrl} 
              alt="settings mask overlay" 
              style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', zIndex: 5 }} 
            />
          )}

          {/* Scrollable list container */}
          <div style={{ position: 'absolute', left: 0, top: statusBarHeight, width: W, height: H - statusBarHeight, overflow: 'hidden', zIndex: 10 }}>
            {(() => {
              const items = currentView.items || [];
              const itemsPerPage = 7;
              const availableHeight = H - statusBarHeight;
              const itemHeight = Math.floor((availableHeight - 12) / itemsPerPage);
              const itemGap = 0;
              const leftPad = 10;
              const rowWidth = 200;
              const visibleHeight = itemsPerPage * (itemHeight + itemGap);
              const targetY = themeSelectedIndex * (itemHeight + itemGap) - (itemsPerPage / 2) * (itemHeight + itemGap);
              const maxScroll = Math.max(0, items.length * (itemHeight + itemGap) - visibleHeight);
              const scrollOffset = Math.max(0, Math.min(targetY, maxScroll));

              return (
                <div style={{ position: 'relative', height: visibleHeight, overflow: 'hidden', marginTop: 4 }}>
                  <div style={{ position: 'relative', transform: `translateY(-${scrollOffset}px)` }}>
                  {items.map((item: any, idx: number) => {
                    const selected = idx === themeSelectedIndex;
                    const rowY = idx * (itemHeight + itemGap);
                    const rowX = leftPad;
                    const rowW = rowWidth;
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
                        <div style={{ position: 'absolute', left: 12, top: 0, right: 42, height: rowH, display: 'flex', alignItems: 'center', color: selected ? colors.text_selected : colors.text_primary, fontWeight: selected ? 700 : 600, fontSize: 22, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-block', animation: (selected && item.label.length > 12) ? 'marquee 8s linear infinite' : 'none' }}>
                            {item.label}
                            {(selected && item.label.length > 12) && (
                              <span style={{ paddingLeft: '40px' }}>{item.label}</span>
                            )}
                          </div>
                        </div>
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
            })()}
          </div>

          {/* Right icon panel showing selected item */}
          {(() => {
            const items = currentView.items || [];
            const selected = items[themeSelectedIndex];
            const iconUrl = selected?.iconUrl;
            if (!iconUrl) return null;
            const panelW = 220;
            const panelH = 220;
            const rightX = W - panelW;
            // Center within content area below status bar, then nudge down
            const centerY = statusBarHeight + (H - statusBarHeight) / 2;
            return (
              <div style={{ position: 'absolute', left: rightX, top: centerY - panelH + 65, width: panelW, height: panelH, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 12, zIndex: 10 }}>
                <div style={{ color: '#ffffff', fontWeight: 700, fontSize: 18, marginBottom: 8, textAlign: 'center', maxWidth: '90%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selected?.label}
                </div>
                <img src={iconUrl} alt={selected?.label} style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
              </div>
            );
          })()}
        </div>
      )}

      {/* SETTINGS EQUALIZER VIEW */}
      {currentView?.id === 'settingsEqualizer' && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}>
          {/* Settings Mask Overlay */}
          {settingMaskUrl && (
            <img 
              src={settingMaskUrl} 
              alt="settings mask overlay" 
              style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', zIndex: 5 }} 
            />
          )}

          {/* Scrollable list container */}
          <div style={{ position: 'absolute', left: 0, top: statusBarHeight, width: W, height: H - statusBarHeight, overflow: 'hidden', zIndex: 10 }}>
            {(() => {
              const items = currentView.items || [];
              const itemsPerPage = 7;
              const availableHeight = H - statusBarHeight;
              const itemHeight = Math.floor((availableHeight - 12) / itemsPerPage);
              const itemGap = 0;
              const leftPad = 10;
              const rowWidth = 200;
              const visibleHeight = itemsPerPage * (itemHeight + itemGap);
              const targetY = themeSelectedIndex * (itemHeight + itemGap) - (itemsPerPage / 2) * (itemHeight + itemGap);
              const maxScroll = Math.max(0, items.length * (itemHeight + itemGap) - visibleHeight);
              const scrollOffset = Math.max(0, Math.min(targetY, maxScroll));

              return (
                <div style={{ position: 'relative', height: visibleHeight, overflow: 'hidden', marginTop: 4 }}>
                  <div style={{ position: 'relative', transform: `translateY(-${scrollOffset}px)` }}>
                  {items.map((item: any, idx: number) => {
                    const selected = idx === themeSelectedIndex;
                    const rowY = idx * (itemHeight + itemGap);
                    const rowX = leftPad;
                    const rowW = rowWidth;
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
                        <div style={{ position: 'absolute', left: 12, top: 0, right: 42, height: rowH, display: 'flex', alignItems: 'center', color: selected ? colors.text_selected : colors.text_primary, fontWeight: selected ? 700 : 600, fontSize: 22, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-block', animation: (selected && item.label.length > 12) ? 'marquee 8s linear infinite' : 'none' }}>
                            {item.label}
                            {(selected && item.label.length > 12) && (
                              <span style={{ paddingLeft: '40px' }}>{item.label}</span>
                            )}
                          </div>
                        </div>
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
            })()}
          </div>

          {/* Right icon panel showing selected item */}
          {(() => {
            const items = currentView.items || [];
            const selected = items[themeSelectedIndex];
            const iconUrl = selected?.iconUrl;
            if (!iconUrl) return null;
            const panelW = 220;
            const panelH = 220;
            const rightX = W - panelW;
            const centerY = statusBarHeight + (H - statusBarHeight) / 2;
            return (
              <div style={{ position: 'absolute', left: rightX, top: centerY - panelH + 90, width: panelW, height: panelH, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 12, zIndex: 10 }}>
                <div style={{ color: colors.text_selected, fontWeight: 700, fontSize: 18, marginBottom: 8, textAlign: 'center', maxWidth: '90%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selected?.label}
                </div>
                <img src={iconUrl} alt={selected?.label} style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
              </div>
            );
          })()}
        </div>
      )}

      {/* SETTINGS THEME VIEW */}
      {currentView?.id === 'settingsTheme' && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}>
          <div style={{ position: 'absolute', left: 0, top: statusBarHeight, width: W, height: H - statusBarHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            {currentView.themeImageUrl ? (
              <div style={{
                width: W * 0.7,
                height: H * 0.65,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                backgroundColor: 'rgba(0,0,0,0.35)'
              }}>
                <img 
                  src={currentView.themeImageUrl} 
                  alt="Theme preview" 
                  style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: 'rgba(255,255,255,0.04)' }} 
                />
              </div>
            ) : (
              <div style={{ color: colors.text_primary, opacity: 0.8, fontSize: 18 }}>Theme image not provided in settingConfig.theme</div>
            )}
          </div>
        </div>
      )}

      {/* MUSIC VIEW */}
      {currentView?.id === 'music' && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}>
          {/* Vertical menu list - full width */}
          <div style={{ position: 'absolute', left: 0, top: statusBarHeight, width: W, height: H - statusBarHeight, overflow: 'hidden', zIndex: 10 }}>
            {(() => {
              const items = currentView.items || [];
              const itemsPerPage = 7; // Show up to 7 items
              const availableHeight = H - statusBarHeight;
              const itemHeight = Math.floor((availableHeight - 12) / itemsPerPage);
              const itemGap = 0;
              const rowWidth = W; // Full width
              const visibleHeight = itemsPerPage * (itemHeight + itemGap);
              const targetY = themeSelectedIndex * (itemHeight + itemGap) - (itemsPerPage / 2) * (itemHeight + itemGap);
              const maxScroll = Math.max(0, items.length * (itemHeight + itemGap) - visibleHeight);
              const scrollOffset = Math.max(0, Math.min(targetY, maxScroll));

              return (
                <div style={{ position: 'relative', height: visibleHeight, overflow: 'hidden', marginTop: 4 }}>
                  <div style={{ position: 'relative', transform: `translateY(-${scrollOffset}px)` }}>
                  {items.map((item: any, idx: number) => {
                    const selected = idx === themeSelectedIndex;
                    const rowY = idx * (itemHeight + itemGap);
                    const rowX = 0; // Start from left edge
                    const rowW = rowWidth;
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
                        <div style={{ position: 'absolute', left: 12, top: 0, height: rowH, display: 'flex', alignItems: 'center', color: selected ? colors.text_selected : colors.text_primary, fontWeight: selected ? 700 : 600, fontSize: 22 }}>
                          {item.label}
                        </div>
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
            })()}
          </div>
        </div>
      )}

      {/* MUSIC FOLDERS VIEW */}
      {currentView?.id === 'music_folders' && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}>
          {/* Vertical menu list - full width with folder icons */}
          <div style={{ position: 'absolute', left: 0, top: statusBarHeight, width: W, height: H - statusBarHeight, overflow: 'hidden', zIndex: 10 }}>
            {(() => {
              const items = currentView.items || [];
              const itemsPerPage = 7; // Show up to 7 items
              const availableHeight = H - statusBarHeight;
              const itemHeight = Math.floor((availableHeight - 12) / itemsPerPage);
              const itemGap = 0;
              const rowWidth = W; // Full width
              const visibleHeight = itemsPerPage * (itemHeight + itemGap);
              const targetY = themeSelectedIndex * (itemHeight + itemGap) - (itemsPerPage / 2) * (itemHeight + itemGap);
              const maxScroll = Math.max(0, items.length * (itemHeight + itemGap) - visibleHeight);
              const scrollOffset = Math.max(0, Math.min(targetY, maxScroll));
              
              // Get folder icon URL from theme
              const folderIconFile = (loadedTheme.spec as any)?.fileConfig?.folderIcon;
              const folderIconUrl = folderIconFile ? loadedTheme.assetUrlForFile?.(folderIconFile) : undefined;

              return (
                <div style={{ position: 'relative', height: visibleHeight, overflow: 'hidden', marginTop: 4 }}>
                  <div style={{ position: 'relative', transform: `translateY(-${scrollOffset}px)` }}>
                  {items.map((item: any, idx: number) => {
                    const selected = idx === themeSelectedIndex;
                    const rowY = idx * (itemHeight + itemGap);
                    const rowX = 0; // Start from left edge
                    const rowW = rowWidth;
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
                        {/* Folder icon on the left */}
                        {folderIconUrl ? (
                          <img 
                            src={folderIconUrl} 
                            alt="folder" 
                            style={{ width: 24, height: 24, marginLeft: 10, marginRight: 8, objectFit: 'contain', flexShrink: 0 }} 
                          />
                        ) : (
                          <span style={{ marginLeft: 10, marginRight: 8, color: selected ? colors.text_selected : colors.text_primary, fontSize: 20, flexShrink: 0 }}>📁</span>
                        )}
                        
                        {/* Folder name text */}
                        <div style={{ display: 'flex', alignItems: 'center', color: selected ? colors.text_selected : colors.text_primary, fontWeight: selected ? 700 : 600, fontSize: 22, overflow: 'hidden', flex: 1 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.label}
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
            })()}
          </div>
        </div>
      )}

      {/* VIDEOS FOLDERS VIEW */}
      {currentView?.id === 'videos_folders' && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}>
          {/* Vertical menu list - full width with folder icons */}
          <div style={{ position: 'absolute', left: 0, top: statusBarHeight, width: W, height: H - statusBarHeight, overflow: 'hidden', zIndex: 10 }}>
            {(() => {
              const items = currentView.items || [];
              const itemsPerPage = 7; // Show up to 7 items
              const availableHeight = H - statusBarHeight;
              const itemHeight = Math.floor((availableHeight - 12) / itemsPerPage);
              const itemGap = 0;
              const rowWidth = W; // Full width
              const visibleHeight = itemsPerPage * (itemHeight + itemGap);
              const targetY = themeSelectedIndex * (itemHeight + itemGap) - (itemsPerPage / 2) * (itemHeight + itemGap);
              const maxScroll = Math.max(0, items.length * (itemHeight + itemGap) - visibleHeight);
              const scrollOffset = Math.max(0, Math.min(targetY, maxScroll));
              
              // Get folder icon URL from theme
              const folderIconFile = (loadedTheme.spec as any)?.fileConfig?.folderIcon;
              const folderIconUrl = folderIconFile ? loadedTheme.assetUrlForFile?.(folderIconFile) : undefined;

              return (
                <div style={{ position: 'relative', height: visibleHeight, overflow: 'hidden', marginTop: 4 }}>
                  <div style={{ position: 'relative', transform: `translateY(-${scrollOffset}px)` }}>
                  {items.map((item: any, idx: number) => {
                    const selected = idx === themeSelectedIndex;
                    const rowY = idx * (itemHeight + itemGap);
                    const rowX = 0; // Start from left edge
                    const rowW = rowWidth;
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
                        {/* Folder icon on the left */}
                        {folderIconUrl ? (
                          <img 
                            src={folderIconUrl} 
                            alt="folder" 
                            style={{ width: 24, height: 24, marginLeft: 10, marginRight: 8, objectFit: 'contain', flexShrink: 0 }} 
                          />
                        ) : (
                          <span style={{ marginLeft: 10, marginRight: 8, color: selected ? colors.text_selected : colors.text_primary, fontSize: 20, flexShrink: 0 }}>📁</span>
                        )}
                        
                        {/* Folder name text */}
                        <div style={{ display: 'flex', alignItems: 'center', color: selected ? colors.text_selected : colors.text_primary, fontWeight: selected ? 700 : 600, fontSize: 22, overflow: 'hidden', flex: 1 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.label}
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
            })()}
          </div>
        </div>
      )}

      {/* VIDEOS VIEW */}
      {currentView?.id === 'videos' && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}>
          {/* Vertical menu list - full width */}
          <div style={{ position: 'absolute', left: 0, top: statusBarHeight, width: W, height: H - statusBarHeight, overflow: 'hidden', zIndex: 10 }}>
            {(() => {
              const items = currentView.items || [];
              const itemsPerPage = 7; // Show up to 7 items
              const availableHeight = H - statusBarHeight;
              const itemHeight = Math.floor((availableHeight - 12) / itemsPerPage);
              const itemGap = 0;
              const rowWidth = W; // Full width
              const visibleHeight = itemsPerPage * (itemHeight + itemGap);
              const targetY = themeSelectedIndex * (itemHeight + itemGap) - (itemsPerPage / 2) * (itemHeight + itemGap);
              const maxScroll = Math.max(0, items.length * (itemHeight + itemGap) - visibleHeight);
              const scrollOffset = Math.max(0, Math.min(targetY, maxScroll));

              return (
                <div style={{ position: 'relative', height: visibleHeight, overflow: 'hidden', marginTop: 4 }}>
                  <div style={{ position: 'relative', transform: `translateY(-${scrollOffset}px)` }}>
                  {items.map((item: any, idx: number) => {
                    const selected = idx === themeSelectedIndex;
                    const rowY = idx * (itemHeight + itemGap);
                    const rowX = 0; // Start from left edge
                    const rowW = rowWidth;
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
                        <div style={{ position: 'absolute', left: 12, top: 0, height: rowH, display: 'flex', alignItems: 'center', color: selected ? colors.text_selected : colors.text_primary, fontWeight: selected ? 700 : 600, fontSize: 22 }}>
                          {item.label}
                        </div>
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
            })()}
          </div>
        </div>
      )}

      {/* AUDIOBOOKS VIEW */}
      {currentView?.id === 'audiobooks' && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}>
          {/* Vertical menu list - full width */}
          <div style={{ position: 'absolute', left: 0, top: statusBarHeight, width: W, height: H - statusBarHeight, overflow: 'hidden', zIndex: 10 }}>
            {(() => {
              const items = currentView.items || [];
              const itemsPerPage = 7; // Show up to 7 items
              const availableHeight = H - statusBarHeight;
              const itemHeight = Math.floor((availableHeight - 12) / itemsPerPage);
              const itemGap = 0;
              const rowWidth = W; // Full width
              const visibleHeight = itemsPerPage * (itemHeight + itemGap);
              const targetY = themeSelectedIndex * (itemHeight + itemGap) - (itemsPerPage / 2) * (itemHeight + itemGap);
              const maxScroll = Math.max(0, items.length * (itemHeight + itemGap) - visibleHeight);
              const scrollOffset = Math.max(0, Math.min(targetY, maxScroll));

              return (
                <div style={{ position: 'relative', height: visibleHeight, overflow: 'hidden', marginTop: 4 }}>
                  <div style={{ position: 'relative', transform: `translateY(-${scrollOffset}px)` }}>
                  {items.map((item: any, idx: number) => {
                    const selected = idx === themeSelectedIndex;
                    const rowY = idx * (itemHeight + itemGap);
                    const rowX = 0; // Start from left edge
                    const rowW = rowWidth;
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
                        <div style={{ position: 'absolute', left: 12, top: 0, height: rowH, display: 'flex', alignItems: 'center', color: selected ? colors.text_selected : colors.text_primary, fontWeight: selected ? 700 : 600, fontSize: 22 }}>
                          {item.label}
                        </div>
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
            })()}
          </div>
        </div>
      )}

      {/* NOW PLAYING VIEW */}
      {currentView?.id === 'nowPlaying' && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}>
          {/* Main content area - album art on left, metadata on right */}
          <div style={{ 
            position: 'absolute', 
            left: 0, 
            top: statusBarHeight, 
            width: W, 
            height: H - statusBarHeight - 60, // Reserve space for timeline
            display: 'flex',
            overflow: 'visible'
          }}>
            {/* Left Column: Album Artwork with Reflection */}
            <div style={{
              position: 'relative',
              width: W / 3, // Left third
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              paddingLeft: 4,
              paddingTop: 12,
              overflow: 'visible'
            }}>
              {/* Album Cover */}
              <div style={{
                position: 'relative',
                width: '140%',
                aspectRatio: '1',
                maxHeight: 'none',
                height: 'auto',
                transform: 'perspective(500px) rotateY(25deg) rotateX(2deg)',
                transformStyle: 'preserve-3d'
              }}>
                <img 
                  src={albumCover} 
                  alt="Album cover"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: 2,
                    display: 'block',
                    transform: 'skewY(-2deg)',
                    transformOrigin: 'center'
                  }}
                />
                
                {/* Reflection Effect */}
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  width: '100%',
                  height: '100%',
                  transform: 'scaleY(-1) skewY(2deg)',
                  backgroundImage: `url(${albumCover})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  borderRadius: 2,
                  maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0) 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0) 100%)',
                  filter: 'blur(0.5px)',
                  opacity: 0.6,
                  pointerEvents: 'none'
                }} />
              </div>
            </div>

            {/* Right Column: Track Metadata */}
            <div style={{
              position: 'relative',
              width: (W * 2) / 3, // Right two-thirds
              height: '100%',
              paddingLeft: 80,
              paddingRight: 20,
              paddingTop: 30,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              gap: 8
            }}>
              {currentSong ? (
                <>
                  {/* Track Title */}
                  <div style={{
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: 28,
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%',
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                    backgroundColor: 'rgba(255,255,255,0.16)',
                    padding: '4px 6px',
                    borderRadius: 4,
                    display: 'inline-block'
                  }}>
                    {currentSong.title}
                  </div>

                  {/* Artist Name */}
                  <div style={{
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: 22,
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%',
                    opacity: 0.9,
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                    backgroundColor: 'rgba(255,255,255,0.16)',
                    padding: '4px 6px',
                    borderRadius: 4,
                    display: 'inline-block'
                  }}>
                    {currentSong.artist}
                  </div>

                  {/* Album Name */}
                  <div style={{
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: 20,
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%',
                    opacity: 0.85,
                    marginTop: 4,
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                    backgroundColor: 'rgba(255,255,255,0.16)',
                    padding: '4px 6px',
                    borderRadius: 4,
                    display: 'inline-block'
                  }}>
                    {currentSong.album}
                  </div>

                  {/* Track Position */}
                  <div style={{
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: 18,
                    lineHeight: 1.2,
                    opacity: 0.8,
                    marginTop: 12,
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                    backgroundColor: 'rgba(255,255,255,0.16)',
                    padding: '4px 6px',
                    borderRadius: 4,
                    display: 'inline-block'
                  }}>
                    {(() => {
                      // Calculate track position (using selectedSongIndex + 1 as current track)
                      const currentTrack = selectedSongIndex + 1;
                      const totalTracks = 5; // From MOCK_SONGS length
                      return `${currentTrack}/${totalTracks}`;
                    })()}
                  </div>
                </>
              ) : (
                <div style={{
                  color: colors.text_primary,
                  fontSize: 18,
                  opacity: 0.7,
                  marginTop: 20
                }}>
                  No track selected
                </div>
              )}
            </div>
          </div>

          {/* Bottom Playback Timeline */}
          <div style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            width: W,
            height: 60,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingLeft: 20,
            paddingRight: 20,
            paddingBottom: 10
          }}>
            {/* Progress Bar */}
            <div style={{
              position: 'relative',
              width: '100%',
              height: 2,
              backgroundColor: playerConfig.progressBackgroundColor || 'rgba(255, 255, 255, 0.2)',
              borderRadius: 1,
              marginBottom: 8
            }}>
              {/* Progress Indicator */}
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: `${playbackProgress * 100}%`,
                height: '100%',
                backgroundColor: playerConfig.progressColor || colors.text_primary || '#ffffff',
                borderRadius: 1,
                transition: 'width 0.3s ease'
              }} />
              {/* Current Position Indicator */}
              <div style={{
                position: 'absolute',
                left: `${playbackProgress * 100}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: playerConfig.progressColor || colors.text_primary || '#ffffff',
                border: '1px solid rgba(0,0,0,0.3)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
              }} />
            </div>

            {/* Time Display */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              color: playerConfig.progressTextColor || colors.text_primary,
              fontSize: 16,
              fontWeight: 600,
              opacity: 0.9
            }}>
              {/* Elapsed Time */}
              <span style={{ backgroundColor: 'rgba(255,255,255,0.16)', padding: '4px 6px', borderRadius: 4, display: 'inline-block' }}>
                {(() => {
                  const minutes = Math.floor(elapsedTime / 60);
                  const seconds = Math.floor(elapsedTime % 60);
                  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                })()}
              </span>

              {/* Total Duration */}
              <span style={{ backgroundColor: 'rgba(255,255,255,0.16)', padding: '4px 6px', borderRadius: 4, display: 'inline-block' }}>
                {currentSong ? (() => {
                  const minutes = Math.floor(currentSong.duration / 60);
                  const seconds = Math.floor(currentSong.duration % 60);
                  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                })() : '00:00'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog Overlay */}
      {dialogState?.visible && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            width: W * 0.75,
            maxWidth: 380,
            backgroundColor: dialogConfig.dialogBackgroundColor || 'rgba(0,0,0,0.85)',
            color: dialogConfig.dialogTextColor || colors.text_primary,
            borderRadius: 14,
            padding: 18,
            boxShadow: '0 10px 32px rgba(0,0,0,0.45)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: dialogConfig.dialogTextColor || colors.text_selected }}>
              {dialogState.title}
            </div>
            <div style={{ fontSize: 16, lineHeight: 1.4, color: dialogConfig.dialogTextColor || colors.text_selected }}>
              {dialogState.message}
            </div>
            <div style={{
              display: 'flex',
              justifyContent: dialogState.options.length > 1 ? 'space-evenly' : 'center',
              gap: 12,
              flexWrap: 'wrap',
              width: '100%'
            }}>
              {dialogState.options.map((option, idx) => {
                const selected = idx === dialogState.selectedIndex;
                const backgroundStyle = resolveBackgroundStyle(selected ? dialogConfig.dialogOptionSelectedBackground : dialogConfig.dialogOptionBackground) || { backgroundColor: selected ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.08)' };
                const color = selected ? (dialogConfig.dialogOptionSelectedTextColor || colors.text_selected) : (dialogConfig.dialogOptionTextColor || colors.text_primary);
                return (
                  <button
                    key={option}
                    onClick={() => onDialogSelect(option)}
                    style={{
                      minWidth: 96,
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.12)',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: 16,
                      color,
                      ...backgroundStyle
                    }}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification - positioned on device screen */}
      <Toast 
        message={toastMessage} 
        isVisible={showToast} 
        onHide={onHideToast}
        containerWidth={W}
        containerHeight={H}
      />
    </div>
  );
};

export default ThemeDisplay;
