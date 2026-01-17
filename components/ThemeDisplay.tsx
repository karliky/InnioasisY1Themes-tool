import React, { useCallback, useEffect, useMemo } from 'react';
import { LoadedTheme, Song } from '../types';
import { getBatteryIconUrl } from '../services/batteryService';
import StatusBar from './StatusBar';
import HomeView from './views/HomeView';
import SettingsView from './views/SettingsView';
import EqualizerView from './views/EqualizerView';
import ThemePreviewView from './views/ThemePreviewView';
import GenericMenuView from './views/GenericMenuView';
import NowPlayingView from './views/NowPlayingView';
import ModalDialog from './ModalDialog';
import Toast from './Toast';
import selectedNoArrow from '../res/extracted_item_selected_no_arrow.9.png?url';
import selectedNoArrowAlt from '../res/extracted_item_selected_no_arrow_alt.9.png?url';

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
  batteryLevel: number;
  isCharging: boolean;
  showToast: boolean;
  onHideToast: () => void;
  toastMessage?: string;
  playState: 'playing' | 'pause' | 'stop' | 'fmPlaying' | 'audiobookPlaying' | null;
  headsetState: 'withMic' | 'withoutMic' | null;
  bluetoothState: 'connected' | 'connecting' | 'disconnected' | null;
  ringtoneEnabled: boolean;
  vibratorEnabled: boolean;
  elapsedTime: number;
  playbackProgress: number;
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
  timedShutdownValue,
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
    
    return {
      text_primary: itemConfig.itemTextColor || menuConfig.menuItemTextColor || '#00ff2a',
      text_selected: itemConfig.itemSelectedTextColor || menuConfig.menuItemSelectedTextColor || '#00ff2a',
      status_bar_bg: statusConfig.statusBarColor || '#0000004e'
    };
  }, [spec]);

  const statusBarHeight = spec.layout_tokens?.status_bar?.height_px || 40;

  const statusConfig = useMemo(() => (spec as any)?.statusConfig || {}, [spec]);
  const settingConfig = useMemo(() => (spec as any)?.settingConfig || {}, [spec]);
  const dialogConfig = useMemo(() => (spec as any)?.dialogConfig || {}, [spec]);
  const playerConfig = useMemo(() => (spec as any)?.playerConfig || {}, [spec]);

  // Helper to get status icon URL with fallback to defaults
  const getStatusIconUrl = useCallback((key: string): string | undefined => {
    const file = statusConfig[key];
    if (file && typeof file === 'string' && file.trim() !== '') {
      const url = loadedTheme.assetUrlForFile?.(file);
      if (url) return url;
    }
    
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
    
    if (Array.isArray(batteryArray) && batteryArray.length > lev) {
      const file = batteryArray[lev];
      if (file && typeof file === 'string') {
        const url = loadedTheme.assetUrlForFile?.(file);
        if (url) return url;
      }
    }
    
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
    if (themeViewId === 'home') {
      const desktopBg = (spec as any)?.desktopWallpaper;
      if (desktopBg && loadedTheme.assetUrlForFile) {
        const url = loadedTheme.assetUrlForFile(desktopBg);
        if (url) return url;
      }
      const bgId = (spec as any)?.theme?.background_image_id;
      return bgId ? loadedTheme.assetUrlForId(bgId) : undefined;
    }
    
    const globalBg = (spec as any)?.globalWallpaper;
    if (globalBg && loadedTheme.assetUrlForFile) {
      const url = loadedTheme.assetUrlForFile(globalBg);
      if (url) return url;
    }
    
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

  // Construct views
  const currentView = useMemo(() => {
    if (themeViewId === 'music') {
      return { 
        id: 'music', 
        title: 'Music', 
        items: ['All songs', 'Playlists', 'Artists', 'Albums', 'Genres', 'Folders', 'Search'].map(label => ({ id: label.toLowerCase().replace(/\s+/g, '_'), label }))
      };
    }
    if (themeViewId === 'music_folders') {
      const folders = ['Bad', 'Thriller', 'Dangerous', 'HIStory', 'Invincible', 'Off the Wall', 'The Wall', 'Bloodline', 'Unreleased', 'Live', 'Demos', 'Remixes', 'Collabs', 'Remastered', 'Vault'];
      return {
        id: 'music_folders',
        title: 'Folders',
        items: folders.map(label => ({ id: label.toLowerCase().replace(/\s+/g, '_'), label, isFolder: true }))
      };
    }
    if (themeViewId === 'videos_folders') {
      const folders = ['Music Videos', 'Concerts', 'Documentaries', 'Interviews', 'Behind The Scenes', 'Short Films', 'Live Performances', 'Rehearsals', 'Awards Shows', 'TV Appearances', 'Tributes', 'Fan Made', 'Remastered', 'Archives', 'Collections'];
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
      return { id: 'settings', title: 'Settings', items: settingsItems };
    }
    if (themeViewId === 'settingsEqualizer') {
      return { id: 'settingsEqualizer', title: 'Equalizer', items: equalizerItems };
    }
    if (themeViewId === 'settingsTheme') {
      return { id: 'settingsTheme', title: 'Theme', themeImageUrl: settingThemeImageUrl };
    }
    if (themeViewId === 'nowPlaying') {
      return { id: 'nowPlaying', title: 'Now Playing' };
    }
    return { id: 'home', title: 'Home', items: homeItems };
  }, [equalizerItems, homeItems, settingThemeImageUrl, settingsItems, themeViewId]);

  return (
    <div 
      className="rounded-sm overflow-hidden relative select-none" 
      style={{ 
        width: W, 
        height: H, 
        backgroundColor: '#000', 
        fontFamily: defaultFontFamily,
        // Wallpaper: Set as background on window decor view (not ImageView)
        // Scaling: loadProportionalBitmap to WALLPAPER size (480x360), fit-inside at load time
        // Then applied as BitmapDrawable background which fills the view
        backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : undefined,
        backgroundSize: backgroundUrl ? 'cover' : undefined, // Fill view (image pre-scaled to fit 480x360)
        backgroundPosition: backgroundUrl ? 'center' : undefined,
        backgroundRepeat: backgroundUrl ? 'no-repeat' : undefined
      }}
    >
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      {/* Status Bar */}
      <StatusBar
        W={W}
        statusBarHeight={statusBarHeight}
        colors={colors}
        showTimeInTitle={showTimeInTitle}
        currentViewTitle={currentView?.title || 'Home'}
        currentViewId={currentView?.id || 'home'}
        playState={playState}
        headsetState={headsetState}
        bluetoothState={bluetoothState}
        ringtoneEnabled={ringtoneEnabled}
        vibratorEnabled={vibratorEnabled}
        batteryLevel={batteryLevel}
        isCharging={isCharging}
        getStatusIconUrl={getStatusIconUrl}
        getBatteryIconFromConfig={getBatteryIconFromConfig}
        getBatteryIconUrl={getBatteryIconUrl}
        defaultRingtoneIcon={defaultRingtoneIcon}
        defaultVibratorIcon={defaultVibratorIcon}
      />

      {/* Views */}
      {currentView?.id === 'home' && (
        <HomeView
          W={W}
          H={H}
          statusBarHeight={statusBarHeight}
          desktopMaskUrl={desktopMaskUrl}
          items={currentView.items || []}
          selectedIndex={themeSelectedIndex}
          colors={colors}
          itemBackgroundStyle={itemBackgroundStyle}
          itemSelectedBackgroundStyle={itemSelectedBackgroundStyle}
          itemRightArrowUrl={itemRightArrowUrl}
          loadedTheme={loadedTheme}
        />
      )}

      {currentView?.id === 'settings' && (
        <SettingsView
          W={W}
          H={H}
          statusBarHeight={statusBarHeight}
          settingMaskUrl={settingMaskUrl}
          items={currentView.items || []}
          selectedIndex={themeSelectedIndex}
          colors={colors}
          itemBackgroundStyle={itemBackgroundStyle}
          itemSelectedBackgroundStyle={itemSelectedBackgroundStyle}
          itemRightArrowUrl={itemRightArrowUrl}
        />
      )}

      {currentView?.id === 'settingsEqualizer' && (
        <EqualizerView
          W={W}
          H={H}
          statusBarHeight={statusBarHeight}
          settingMaskUrl={settingMaskUrl}
          items={currentView.items || []}
          selectedIndex={themeSelectedIndex}
          colors={colors}
          itemBackgroundStyle={itemBackgroundStyle}
          itemSelectedBackgroundStyle={itemSelectedBackgroundStyle}
          itemRightArrowUrl={itemRightArrowUrl}
        />
      )}

      {currentView?.id === 'settingsTheme' && (
        <ThemePreviewView
          W={W}
          H={H}
          statusBarHeight={statusBarHeight}
          themeImageUrl={(currentView as any).themeImageUrl}
          colors={colors}
        />
      )}

      {(currentView?.id === 'music' || currentView?.id === 'music_folders' || currentView?.id === 'videos_folders' || currentView?.id === 'videos' || currentView?.id === 'audiobooks') && (
        <GenericMenuView
          W={W}
          H={H}
          statusBarHeight={statusBarHeight}
          items={currentView.items || []}
          selectedIndex={themeSelectedIndex}
          colors={colors}
          itemBackgroundStyle={itemBackgroundStyle}
          itemSelectedBackgroundStyle={itemSelectedBackgroundStyle}
          itemRightArrowUrl={itemRightArrowUrl}
          loadedTheme={loadedTheme}
        />
      )}

      {currentView?.id === 'nowPlaying' && (
        <NowPlayingView
          W={W}
          H={H}
          statusBarHeight={statusBarHeight}
          currentSong={currentSong}
          selectedSongIndex={selectedSongIndex}
          elapsedTime={elapsedTime}
          playbackProgress={playbackProgress}
          colors={colors}
          playerConfig={playerConfig}
        />
      )}

      {/* Modal Dialog */}
      <ModalDialog
        W={W}
        H={H}
        visible={dialogState?.visible || false}
        title={dialogState?.title || ''}
        message={dialogState?.message || ''}
        options={dialogState?.options || []}
        selectedIndex={dialogState?.selectedIndex || 0}
        onSelect={onDialogSelect}
        dialogConfig={dialogConfig}
        colors={colors}
        resolveBackgroundStyle={resolveBackgroundStyle}
      />

      {/* Toast Notification */}
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
