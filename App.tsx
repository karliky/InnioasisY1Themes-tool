
import React, { useState, useCallback, useEffect, useRef } from 'react';
import ClickWheel from './components/ClickWheel';
import ThemeDisplay from './components/ThemeDisplay';
import ImageAssetsSidebar from './components/ImageAssetsSidebar';
import MenuBar from './components/MenuBar';
import ThemeTabs from './components/ThemeTabs';
import { Tooltip } from './components/Tooltip';
import { Song, LoadedTheme, ThemeAssetInfo } from './types';
import { MOCK_SONGS } from './constants';
import { loadAvailableThemes, loadClonedThemes, cloneTheme, updateClonedThemeAsset, deleteClonedTheme, updateClonedThemeSpec, importThemeFromZip } from './services/themeService';
import { downloadTheme } from './utils/themeExport';

const DEVICE_BACKGROUND_COLORS: Record<string, string> = {
  black: '#2a2a2a', // Lighter gray for better contrast with black device
  silver: '#1e293b',
  yellow: '#1c1917',
  teal: '#0f172a',
  blue: '#18181b',
  orange: '#1e1b1b'
};

// Metallic color schemes with highlights and shadows
const METALLIC_COLORS: Record<string, {
  base: string;
  highlight: string;
  shadow: string;
  border: string;
  accent: string;
  gradient: string;
}> = {
  black: {
    base: '#1a1a1a',
    highlight: '#3a3a3a',
    shadow: '#0a0a0a',
    border: '#2a2a2a',
    accent: '#4a4a4a',
    gradient: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 30%, #0f0f0f 60%, #1a1a1a 100%)'
  },
  silver: {
    base: '#c0c0c0',
    highlight: '#f0f0f0',
    shadow: '#808080',
    border: '#d0d0d0',
    accent: '#e8e8e8',
    gradient: 'linear-gradient(135deg, #e8e8e8 0%, #c0c0c0 25%, #a0a0a0 50%, #c0c0c0 75%, #d8d8d8 100%)'
  },
  yellow: {
    base: '#d4af37',
    highlight: '#f4d03f',
    shadow: '#b8860b',
    border: '#daa520',
    accent: '#ffd700',
    gradient: 'linear-gradient(135deg, #ffd700 0%, #d4af37 30%, #b8860b 60%, #d4af37 100%)'
  },
  teal: {
    base: '#40e0d0',
    highlight: '#60f0e0',
    shadow: '#20c0b0',
    border: '#50d0c0',
    accent: '#70f0e0',
    gradient: 'linear-gradient(135deg, #60f0e0 0%, #40e0d0 25%, #20c0b0 50%, #40e0d0 75%, #50d0c0 100%)'
  },
  blue: {
    base: '#007bff',
    highlight: '#409fff',
    shadow: '#003d99',
    border: '#2080ff',
    accent: '#60b0ff',
    gradient: 'linear-gradient(135deg, #409fff 0%, #007bff 25%, #003d99 50%, #007bff 75%, #2080ff 100%)'
  },
  orange: {
    base: '#ff6a00',
    highlight: '#ff8a30',
    shadow: '#cc4400',
    border: '#ff7a10',
    accent: '#ff9a40',
    gradient: 'linear-gradient(135deg, #ff8a30 0%, #ff6a00 25%, #cc4400 50%, #ff6a00 75%, #ff7a10 100%)'
  }
};

const App: React.FC = () => {
  const [selectedSongIndex, setSelectedSongIndex] = useState(0);
  const [currentSong, setCurrentSong] = useState<Song | null>(MOCK_SONGS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  // Playback time state
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [playbackProgress, setPlaybackProgress] = useState(0); // 0-1

  const [availableThemes, setAvailableThemes] = useState<LoadedTheme[]>([]);

  // Save theme tab order to localStorage
  const saveThemeTabOrder = useCallback((themes: LoadedTheme[]) => {
    const editableIds = themes.filter(t => t.isEditable).map(t => t.id);
    try {
      localStorage.setItem('themeTabOrder', JSON.stringify(editableIds));
    } catch (e) {
      console.warn('Failed to save theme tab order:', e);
    }
  }, []);

  // Load theme tab order from localStorage
  const getThemeTabOrder = useCallback((): string[] => {
    try {
      const saved = localStorage.getItem('themeTabOrder');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('Failed to load theme tab order:', e);
      return [];
    }
  }, []);

  // Sort themes according to saved order
  const sortThemesByTabOrder = useCallback((themes: LoadedTheme[]): LoadedTheme[] => {
    const savedOrder = getThemeTabOrder();
    const editableThemes = themes.filter(t => t.isEditable);
    const installedThemes = themes.filter(t => !t.isEditable);
    
    if (savedOrder.length === 0) {
      // No saved order, sort editables by clonedDate (newest first)
      const sortedEditables = [...editableThemes].sort((a, b) => 
        (b.clonedDate || '').localeCompare(a.clonedDate || '')
      );
      return [...installedThemes, ...sortedEditables];
    }
    
    // Sort editables according to saved order
    const orderedEditables = editableThemes.sort((a, b) => {
      const aIndex = savedOrder.indexOf(a.id);
      const bIndex = savedOrder.indexOf(b.id);
      if (aIndex === -1) return 1; // New themes go to the end
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
    
    return [...installedThemes, ...orderedEditables];
  }, [getThemeTabOrder]);

  const [activeTheme, setActiveTheme] = useState<LoadedTheme | null>(null);
  const [themeViewId, setThemeViewId] = useState<string | null>(null);
  
  // Device color
  const [deviceColor, setDeviceColor] = useState<'black' | 'silver' | 'yellow' | 'teal' | 'blue' | 'orange'>('teal');
  const [themeHistory, setThemeHistory] = useState<string[]>([]);
  const [themeSelectedIndex, setThemeSelectedIndex] = useState(0);

  // Battery state for status bar
  const [batteryLevel, setBatteryLevel] = useState(3); // 0..3
  const [isCharging, setIsCharging] = useState(false);

  // Device status controls
  const [showTimeInTitle, setShowTimeInTitle] = useState(false);

  // Status bar icon states
  const [playState, setPlayState] = useState<'playing' | 'pause' | 'stop' | 'fmPlaying' | 'audiobookPlaying' | null>(null);
  const [headsetState, setHeadsetState] = useState<'withMic' | 'withoutMic' | null>(null);
  const [bluetoothState, setBluetoothState] = useState<'connected' | 'connecting' | 'disconnected' | null>(null);
  const [ringtoneEnabled, setRingtoneEnabled] = useState(false);
  const [vibratorEnabled, setVibratorEnabled] = useState(false);

  // Settings states
  const [timedShutdownValue, setTimedShutdownValue] = useState<'off' | '10' | '20' | '30' | '60' | '90' | '120'>('off');
  const [backlightValue, setBacklightValue] = useState<'10' | '15' | '30' | '45' | '60' | '120' | '300' | 'always'>('10');

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Not Implemented');

  // Preferences modal state
  const [showPreferences, setShowPreferences] = useState(false);

  // Debounce refs for spec changes (to avoid losing input focus)
  const pendingSpecChangesRef = useRef<any>(null);
  const specUpdateTimeoutRef = useRef<NodeJS.Timeout>();

  // Dialog state for in-device modal
  const [dialogState, setDialogState] = useState<{
    visible: boolean;
    title: string;
    message: string;
    options: string[];
    selectedIndex: number;
  }>({
    visible: false,
    title: '',
    message: '',
    options: [],
    selectedIndex: 1
  });

  // Handle updating asset in theme
  const handleUpdateAsset = useCallback(async (fileName: string, newUrl: string) => {
    if (!activeTheme) return;
    
    // Only allow updates on editable (cloned) themes
    if (!activeTheme.isEditable) {
      console.warn('Cannot edit installed theme. Please clone it first.');
      return;
    }

    const ensurePersistableUrl = async (url: string) => {
      if (url.startsWith('data:')) return url;
      if (!url.startsWith('blob:')) return url;

      try {
        const response = await fetch(url);
        const blob = await response.blob();
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : url);
          reader.onerror = () => reject(new Error('Failed to convert blob URL to data URL'));
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error('Failed to persist blob URL, storing raw URL instead:', error);
        return url;
      }
    };

    const persistedUrl = await ensurePersistableUrl(newUrl);
    
    // Update in IndexedDB for cloned themes
    try {
      await updateClonedThemeAsset(activeTheme.id, fileName, persistedUrl);
    } catch (error: any) {
      console.error('Failed to persist asset change:', error);
      setToastMessage(error.message || 'Failed to save asset changes');
      setShowToast(true);
      return; // Don't update UI if storage failed
    }
    
    // Update the asset in loaded assets
    const updatedAssets = activeTheme.loadedAssets.map(asset => 
      asset.fileName === fileName ? { ...asset, url: persistedUrl } : asset
    );
    
    // Update the theme
    const updatedTheme: LoadedTheme = {
      ...activeTheme,
      loadedAssets: updatedAssets,
      assetUrlForFile: (file: string) => {
        const asset = updatedAssets.find(a => a.fileName === file || a.fileName.endsWith(`/${file}`));
        return asset?.url || activeTheme.assetUrlForFile?.(file);
      }
    };
    
    setActiveTheme(updatedTheme);
    
    // Update in available themes list
    setAvailableThemes(prev => 
      prev.map(t => t.id === activeTheme.id ? updatedTheme : t)
    );
    
  }, [activeTheme]);

  // Handle updating color/metadata in theme config
  const handleUpdateColor = useCallback((configPath: string, newColor: string) => {
    if (!activeTheme) return;
    
    // Only allow updates on editable (cloned) themes
    if (!activeTheme.isEditable) {
      console.warn('Cannot edit installed theme. Please clone it first.');
      return;
    }
    
    // Update local spec immediately (for instant UI feedback)
    const updatedSpec: any = JSON.parse(JSON.stringify(activeTheme.spec));
    const keys = configPath.split('.');
    let cursor: any = updatedSpec;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (typeof cursor[k] !== 'object' || cursor[k] === null) cursor[k] = {};
      cursor = cursor[k];
    }
    const lastKey = keys[keys.length - 1];
    cursor[lastKey] = newColor;

    // Update UI immediately without triggering a full re-render cycle
    const updatedTheme: LoadedTheme = {
      ...activeTheme,
      spec: updatedSpec
    };
    setActiveTheme(updatedTheme);
    setAvailableThemes(prev => prev.map(t => t.id === activeTheme.id ? updatedTheme : t));
    
    // Track pending changes for debounced persistence
    pendingSpecChangesRef.current = updatedSpec;
    
    // Clear existing timeout
    if (specUpdateTimeoutRef.current) {
      clearTimeout(specUpdateTimeoutRef.current);
    }
    
    // Set new timeout to persist after 1 second of no changes
    specUpdateTimeoutRef.current = setTimeout(async () => {
      if (!pendingSpecChangesRef.current || !activeTheme) return;
      
      try {
        await updateClonedThemeSpec(activeTheme.id, pendingSpecChangesRef.current);
        pendingSpecChangesRef.current = null;
      } catch (error: any) {
        console.error('Failed to persist changes:', error);
        setToastMessage(error.message || 'Failed to save changes');
        setShowToast(true);
      }
    }, 1000);
  }, [activeTheme]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (specUpdateTimeoutRef.current) {
        clearTimeout(specUpdateTimeoutRef.current);
      }
    };
  }, []);

  // Persist any pending spec changes when theme switches to prevent data loss
  useEffect(() => {
    const flushPendingChanges = async () => {
      if (pendingSpecChangesRef.current && activeTheme) {
        try {
          // Clear the timeout if any
          if (specUpdateTimeoutRef.current) {
            clearTimeout(specUpdateTimeoutRef.current);
          }
          await updateClonedThemeSpec(activeTheme.id, pendingSpecChangesRef.current);
          pendingSpecChangesRef.current = null;
        } catch (error: any) {
          console.error('Failed to flush pending changes:', error);
        }
      }
    };
    
    // Only flush when theme ID changes, not on every activeTheme change
    return () => {
      flushPendingChanges();
    };
  }, [activeTheme?.id]);

  const openShutdownDialog = useCallback(() => {
    setDialogState({
      visible: true,
      title: 'Shutdown',
      message: 'Sure to shut down?',
      options: ['Yes', 'No'],
      selectedIndex: 1
    });
  }, []);

  const openAboutDialog = useCallback(() => {
    setDialogState({
      visible: true,
      title: 'https://www.mjinnocent.com/',
      message: 'Michael Jackson is innocent',
      options: ['Ok'],
      selectedIndex: 0
    });
  }, []);

  const handleDialogSelect = useCallback((option?: string) => {
    if (option) {
      console.log('Dialog option selected:', option);
    }
    setDialogState(prev => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    const loadThemes = async () => {
      try {
        // Load installed themes
        const installed = loadAvailableThemes();
        
        // Load cloned themes (now async)
        const cloned = await loadClonedThemes();
        
        // Sort installed with "Default blank" pinned first, then alphabetical
        const installedSorted = [...installed].sort((a, b) => {
          const aIsDefault = a.id.toLowerCase() === 'default blank';
          const bIsDefault = b.id.toLowerCase() === 'default blank';
          if (aIsDefault && !bIsDefault) return -1;
          if (!aIsDefault && bIsDefault) return 1;
          return a.id.localeCompare(b.id);
        });

        // Combine and sort using tab order
        const combined = [...installedSorted, ...cloned];
        const all = sortThemesByTabOrder(combined);
        setAvailableThemes(all);
        saveThemeTabOrder(all);

        if (all.length === 0) {
          console.error('No themes found in themes folder');
          setIsLoading(false);
          return;
        }

        // Determine default theme selection
        const aeroTheme = installedSorted.find(t => t.id.toLowerCase() === 'aero');
        const firstTheme = aeroTheme ?? all[0];

        // Check for persisted theme preference
        const persisted = (() => { try { return localStorage.getItem('activeThemeId'); } catch { return null; } })();
        if (persisted) {
          const found = all.find(t => t.id === persisted);
          if (found) {
            setActiveTheme(found);
            setThemeViewId('home');
            setIsLoading(false);
            return;
          }
        }

        // Use Aero as default (if present); else first theme
        setActiveTheme(firstTheme);
        setThemeViewId('home');
        setIsLoading(false);
      } catch (error: any) {
        console.error('Error loading themes:', error);
        setToastMessage(error.message || 'Failed to load themes from database');
        setShowToast(true);
        
        // Still try to show installed themes even if cloned themes fail
        const installed = loadAvailableThemes();
        if (installed.length > 0) {
          setAvailableThemes(installed);
          setActiveTheme(installed[0]);
          setThemeViewId('home');
        }
        setIsLoading(false);
      }
    };
    
    loadThemes();
  }, []);

  // Playback timer effect
  useEffect(() => {
    if (!isPlaying || !currentSong) {
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(prev => {
        const newTime = prev + 1;
        const progress = currentSong.duration > 0 ? Math.min(newTime / currentSong.duration, 1) : 0;
        setPlaybackProgress(progress);
        
        // Reset when song ends
        if (newTime >= currentSong.duration) {
          setIsPlaying(false);
          setPlayState('pause');
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, currentSong]);

  const goBack = () => {
    if (dialogState.visible) {
      setDialogState(prev => ({ ...prev, visible: false }));
      return;
    }
    if (themeHistory.length > 0) {
      const prev = themeHistory[themeHistory.length - 1];
      setThemeHistory(h => h.slice(0, -1));
      setThemeViewId(prev);
      // Reset selected index when going back to home
      if (prev === 'home') {
        setThemeSelectedIndex(0);
      } else if (prev === 'music' || prev === 'videos' || prev === 'audiobooks') {
        setThemeSelectedIndex(0);
      } else if (prev === 'settings' || prev === 'settingsTheme' || prev === 'settingsEqualizer') {
        setThemeSelectedIndex(0);
      }
    } else {
      setThemeViewId('home');
      setThemeSelectedIndex(0);
    }
  };

  const handleScroll = useCallback((direction: 'up' | 'down') => {
    if (dialogState.visible) {
      const optionCount = dialogState.options.length;
      if (optionCount > 0) {
        setDialogState(prev => {
          const len = prev.options.length;
          if (len === 0) return prev;
          const delta = direction === 'down' ? 1 : -1;
          const nextIndex = (prev.selectedIndex + delta + len) % len;
          return { ...prev, selectedIndex: nextIndex };
        });
      }
      return;
    }

    if (themeViewId === 'home') {
      const homeCfg = (activeTheme?.spec as any)?.homePageConfig || {};
      const standardItems = ['nowPlaying', 'music', 'video', 'audiobooks', 'photos', 'fm', 'bluetooth', 'settings'];
      const len = standardItems.filter(key => homeCfg[key] !== undefined).length;
      if (len > 0) {
        setThemeSelectedIndex(prev => {
          if (direction === 'down') return (prev + 1) % len;
          return (prev - 1 + len) % len;
        });
      }
    } else if (themeViewId === 'music') {
      const musicMenuItems = ['All songs', 'Playlists', 'Artists', 'Albums', 'Genres', 'Folders', 'Search'];
      setThemeSelectedIndex(prev => {
        if (direction === 'down') return Math.min(prev + 1, musicMenuItems.length - 1);
        return Math.max(prev - 1, 0);
      });
    } else if (themeViewId === 'music_folders') {
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
      setThemeSelectedIndex(prev => {
        if (direction === 'down') return Math.min(prev + 1, folders.length - 1);
        return Math.max(prev - 1, 0);
      });
    } else if (themeViewId === 'videos') {
      const videosMenuItems = ['All video', 'Playlist', 'Folders', 'Search'];
      setThemeSelectedIndex(prev => {
        if (direction === 'down') return Math.min(prev + 1, videosMenuItems.length - 1);
        return Math.max(prev - 1, 0);
      });
    } else if (themeViewId === 'videos_folders') {
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
      setThemeSelectedIndex(prev => {
        if (direction === 'down') return Math.min(prev + 1, folders.length - 1);
        return Math.max(prev - 1, 0);
      });
    } else if (themeViewId === 'audiobooks') {
      const audiobooksMenuItems = ['All audiobooks', 'Artists', 'Albums', 'Folders', 'Bookmark lists', 'Settings'];
      setThemeSelectedIndex(prev => {
        if (direction === 'down') return Math.min(prev + 1, audiobooksMenuItems.length - 1);
        return Math.max(prev - 1, 0);
      });
    } else if (themeViewId === 'settings') {
      const settingsMenuItems = ['Shutdown', 'Timed shutdown', 'Shuffle', 'Repeat', 'Equalizer', 'File extension', 'Key lock', 'Key tone', 'Key vibration', 'Wallpaper', 'Brightness', 'Display battery', 'Date & Time', 'Theme', 'Language', 'Factory reset', 'Clear cache', 'About'];
      setThemeSelectedIndex(prev => {
        if (direction === 'down') return Math.min(prev + 1, settingsMenuItems.length - 1);
        return Math.max(prev - 1, 0);
      });
    } else if (themeViewId === 'settingsEqualizer') {
      const equalizerMenuItems = ['Normal', 'Classical', 'Dance', 'Flat', 'Folk', 'Heavy Metal', 'Hip Hop', 'Jazz', 'Pop', 'Rock'];
      setThemeSelectedIndex(prev => {
        if (direction === 'down') return Math.min(prev + 1, equalizerMenuItems.length - 1);
        return Math.max(prev - 1, 0);
      });
    }
  }, [activeTheme, dialogState.options.length, dialogState.visible, themeViewId]);

  const handleCenterClick = async () => {
    if (dialogState.visible) {
      const option = dialogState.options[dialogState.selectedIndex] || dialogState.options[0];
      handleDialogSelect(option);
      return;
    }

    if (themeViewId === 'home') {
      const homeCfg = (activeTheme?.spec as any)?.homePageConfig || {};
      const standardItems = ['nowPlaying', 'music', 'video', 'audiobooks', 'photos', 'fm', 'bluetooth', 'settings'];
      const availableItems = standardItems.filter(key => homeCfg[key] !== undefined);
      const selectedItemId = availableItems[themeSelectedIndex];
      
      // Check if Music is selected
      if (selectedItemId === 'music') {
        setThemeHistory(prev => [...prev, themeViewId || 'home']);
        setThemeViewId('music');
        setThemeSelectedIndex(0); // Reset to first item (All songs)
        return;
      }
      
      // Check if Videos is selected
      if (selectedItemId === 'video') {
        setThemeHistory(prev => [...prev, themeViewId || 'home']);
        setThemeViewId('videos');
        setThemeSelectedIndex(0); // Reset to first item (All video)
        return;
      }
      
      // Check if Audiobooks is selected
      if (selectedItemId === 'audiobooks') {
        setThemeHistory(prev => [...prev, themeViewId || 'home']);
        setThemeViewId('audiobooks');
        setThemeSelectedIndex(0); // Reset to first item (All audiobooks)
        return;
      }
      
      // Check if Now Playing is selected
      if (selectedItemId === 'nowPlaying') {
        setThemeHistory(prev => [...prev, themeViewId || 'home']);
        setThemeViewId('nowPlaying');
        setThemeSelectedIndex(0);
        return;
      }

      if (selectedItemId === 'settings') {
        setThemeHistory(prev => [...prev, themeViewId || 'home']);
        setThemeViewId('settings');
        setThemeSelectedIndex(0);
        return;
      }
      
      // Show toast for all other items (not implemented)
      setShowToast(true);
      
      // Try theme spec navigation for other items (but still show toast)
      const homeView = activeTheme?.spec.views.find(v => v.id === 'home');
      const list = homeView?.children?.find((c: any) => c.type === 'list');
      const item = list?.items?.[themeSelectedIndex];
      const action = item?.action;
      if (action) {
        const route = activeTheme?.spec.navigation.routes.find(r => r.action === action);
        if (route) {
          if (route.to === 'pop') {
            goBack();
          } else {
            setThemeHistory(prev => [...prev, themeViewId || 'home']);
            setThemeViewId(route.to);
          }
        }
      }
    } else if (themeViewId === 'music') {
      // Handle Folders navigation
      const musicMenuItems = ['All songs', 'Playlists', 'Artists', 'Albums', 'Genres', 'Folders', 'Search'];
      const selected = musicMenuItems[themeSelectedIndex];
      if (selected === 'Folders') {
        setThemeHistory(prev => [...prev, themeViewId]);
        setThemeViewId('music_folders');
        setThemeSelectedIndex(0);
        return;
      }
      // Show toast for all other music menu items (not implemented)
      setShowToast(true);
    } else if (themeViewId === 'music_folders') {
      // Show toast for folder clicks (not implemented)
      setShowToast(true);
    } else if (themeViewId === 'videos') {
      // Handle Folders navigation
      const videosMenuItems = ['All video', 'Playlist', 'Folders', 'Search'];
      const selected = videosMenuItems[themeSelectedIndex];
      if (selected === 'Folders') {
        setThemeHistory(prev => [...prev, themeViewId]);
        setThemeViewId('videos_folders');
        setThemeSelectedIndex(0);
        return;
      }
      // Show toast for all other videos menu items (not implemented)
      setShowToast(true);
    } else if (themeViewId === 'videos_folders') {
      // Show toast for folder clicks (not implemented)
      setShowToast(true);
    } else if (themeViewId === 'audiobooks') {
      // Show toast for all audiobooks menu items (not implemented)
      setShowToast(true);
    } else if (themeViewId === 'settings') {
      const settingsMenuItems = ['Shutdown', 'Timed shutdown', 'Shuffle', 'Repeat', 'Equalizer', 'File extension', 'Key lock', 'Key tone', 'Key vibration', 'Wallpaper', 'Brightness', 'Display battery', 'Date & Time', 'Theme', 'Language', 'Factory reset', 'Clear cache', 'About'];
      const selected = settingsMenuItems[themeSelectedIndex];
      if (selected === 'Theme') {
        setThemeHistory(prev => [...prev, themeViewId]);
        setThemeViewId('settingsTheme');
        setThemeSelectedIndex(0);
        return;
      }
      if (selected === 'Equalizer') {
        setThemeHistory(prev => [...prev, themeViewId]);
        setThemeViewId('settingsEqualizer');
        setThemeSelectedIndex(0);
        return;
      }
      if (selected === 'Shutdown') {
        openShutdownDialog();
        return;
      }
      if (selected === 'About') {
        openAboutDialog();
        return;
      }
        if (selected === 'Timed shutdown') {
          // Cycle through timed shutdown values: off -> 10 -> 20 -> 30 -> 60 -> 90 -> 120 -> off
          const timedShutdownValues: Array<'off' | '10' | '20' | '30' | '60' | '90' | '120'> = ['off', '10', '20', '30', '60', '90', '120'];
          const currentIndex = timedShutdownValues.indexOf(timedShutdownValue);
          const nextIndex = (currentIndex + 1) % timedShutdownValues.length;
          setTimedShutdownValue(timedShutdownValues[nextIndex]);
          return;
        }
        if (selected === 'Backlight') {
          // Cycle through backlight timeout values: 10 -> 15 -> 30 -> 45 -> 60 -> 120 -> 300 -> always -> 10
          const backlightValues: Array<'10' | '15' | '30' | '45' | '60' | '120' | '300' | 'always'> = ['10', '15', '30', '45', '60', '120', '300', 'always'];
          const currentIndex = backlightValues.indexOf(backlightValue);
          const nextIndex = (currentIndex + 1) % backlightValues.length;
          setBacklightValue(backlightValues[nextIndex]);
          return;
        }
        // Show toast for all other unimplemented settings
        setShowToast(true);
    } else if (themeViewId === 'settingsEqualizer') {
      // Equalizer selection is not wired to playback yet
      setShowToast(true);
    } else if (themeViewId === 'settingsTheme') {
      openShutdownDialog();
    }
  };

  // Menu Bar Handlers - MUST be before any conditional returns
  const handleNewTheme = useCallback(async () => {
    try {
      const newTheme = await cloneTheme(availableThemes.find(t => t.id.toLowerCase() === 'default blank') || availableThemes[0]);
      const updated = [...availableThemes, newTheme];
      setAvailableThemes(updated);
      saveThemeTabOrder(updated);
      setActiveTheme(newTheme);
      try { localStorage.setItem('activeThemeId', newTheme.id); } catch {}
      setToastMessage('New theme created');
      setShowToast(true);
    } catch (error: any) {
      console.error('Failed to create new theme:', error);
      setToastMessage(error.message || 'Failed to create new theme');
      setShowToast(true);
    }
  }, [availableThemes, saveThemeTabOrder]);

  const handleOpenTheme = useCallback(() => {
    // Open file dialog to import theme from ZIP
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          setToastMessage('Importing theme...');
          setShowToast(true);
          const newTheme = await importThemeFromZip(file);
          setAvailableThemes(prev => [...prev, newTheme]);
          setActiveTheme(newTheme);
          try { localStorage.setItem('activeThemeId', newTheme.id); } catch {}
          setToastMessage('Theme imported successfully!');
          setShowToast(true);
        } catch (error: any) {
          console.error('Failed to import theme:', error);
          setToastMessage(error.message || 'Failed to import theme');
          setShowToast(true);
        }
      }
    };
    input.click();
  }, []);

  const handleSaveTheme = useCallback(async () => {
    if (!activeTheme || !activeTheme.isEditable) return;
    try {
      await updateClonedThemeSpec(activeTheme.id, activeTheme.spec);
      setToastMessage('Theme saved successfully');
      setShowToast(true);
    } catch (error: any) {
      console.error('Failed to save theme:', error);
      setToastMessage(error.message || 'Failed to save theme');
      setShowToast(true);
    }
  }, [activeTheme]);

  const handleExportTheme = useCallback(async (format: 'zip' | 'metadata') => {
    if (!activeTheme) return;
    try {
      setToastMessage('Exporting theme...');
      setShowToast(true);
      await downloadTheme(activeTheme);
      setToastMessage(`Theme exported as ${format}`);
      setShowToast(true);
    } catch (error: any) {
      console.error('Failed to export theme:', error);
      setToastMessage(error.message || 'Failed to export theme');
      setShowToast(true);
    }
  }, [activeTheme]);

  const handleImportThemes = useCallback(async (format: 'zip' | 'url') => {
    if (format === 'zip') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.zip';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          try {
            setToastMessage('Importing theme...');
            setShowToast(true);
            const newTheme = await importThemeFromZip(file);
            setAvailableThemes(prev => [...prev, newTheme]);
            setActiveTheme(newTheme);
            try { localStorage.setItem('activeThemeId', newTheme.id); } catch {}
            setToastMessage('Theme imported successfully!');
            setShowToast(true);
          } catch (error: any) {
            console.error('Failed to import theme:', error);
            setToastMessage(error.message || 'Failed to import theme');
            setShowToast(true);
          }
        }
      };
      input.click();
    }
  }, []);

  const handleDeleteTheme = useCallback(async (themeId: string) => {
    if (!confirm(`Delete theme "${themeId}"?`)) return;
    try {
      await deleteClonedTheme(themeId);
      setAvailableThemes(prev => prev.filter(t => t.id !== themeId));
      if (activeTheme?.id === themeId) {
        const nextTheme = availableThemes.find(t => t.id !== themeId) || null;
        setActiveTheme(nextTheme);
      }
      setToastMessage('Theme deleted');
      setShowToast(true);
    } catch (error: any) {
      console.error('Failed to delete theme:', error);
      setToastMessage(error.message || 'Failed to delete theme');
      setShowToast(true);
    }
  }, [activeTheme, availableThemes]);

  const handleDuplicateTheme = useCallback(async () => {
    if (!activeTheme) return;
    try {
      const newTheme = await cloneTheme(activeTheme);
      setAvailableThemes(prev => [...prev, newTheme]);
      setActiveTheme(newTheme);
      try { localStorage.setItem('activeThemeId', newTheme.id); } catch {}
      setToastMessage('Theme duplicated');
      setShowToast(true);
    } catch (error: any) {
      console.error('Failed to duplicate theme:', error);
      setToastMessage(error.message || 'Failed to duplicate theme');
      setShowToast(true);
    }
  }, [activeTheme]);

  const handleCloneCurrentTheme = useCallback(async () => {
    if (!activeTheme) return;
    try {
      const newClone = await cloneTheme(activeTheme);
      setAvailableThemes(prev => [...prev, newClone]);
      setActiveTheme(newClone);
      try { localStorage.setItem('activeThemeId', newClone.id); } catch {}
      setToastMessage('Theme cloned');
      setShowToast(true);
    } catch (error: any) {
      console.error('Failed to clone theme:', error);
      setToastMessage(error.message || 'Failed to clone theme');
      setShowToast(true);
    }
  }, [activeTheme]);

  const handleRevertTheme = useCallback(async () => {
    if (!activeTheme) return;
    if (!confirm('Discard all changes and revert to saved version?')) return;
    try {
      // Reload the theme from storage
      const reloaded = availableThemes.find(t => t.id === activeTheme.id);
      if (reloaded) {
        setActiveTheme(reloaded);
        setToastMessage('Theme reverted');
        setShowToast(true);
      }
    } catch (error: any) {
      console.error('Failed to revert theme:', error);
      setToastMessage(error.message || 'Failed to revert theme');
      setShowToast(true);
    }
  }, [activeTheme, availableThemes]);

  const handleCloseThemeTab = useCallback(async (themeId: string) => {
    if (!confirm(`Close theme "${themeId}"? This will delete it permanently.`)) return;
    try {
      await deleteClonedTheme(themeId);
      setAvailableThemes(prev => prev.filter(t => t.id !== themeId));
      if (activeTheme?.id === themeId) {
        const nextEditable = availableThemes.find(t => t.isEditable && t.id !== themeId);
        const nextTheme = nextEditable || availableThemes.find(t => !t.isEditable);
        setActiveTheme(nextTheme || null);
        if (nextTheme) {
          try { localStorage.setItem('activeThemeId', nextTheme.id); } catch {}
        }
      }
      setToastMessage('Theme closed');
      setShowToast(true);
    } catch (error: any) {
      console.error('Failed to close theme:', error);
      setToastMessage(error.message || 'Failed to close theme');
      setShowToast(true);
    }
  }, [activeTheme, availableThemes]);

  const handleSearchAssetSelect = useCallback((asset: { type: 'image' | 'color' | 'metadata'; id: string; configKey?: string }) => {
    // This will trigger sidebar to focus on the selected asset
    // The ImageAssetsSidebar component will handle scrolling to and highlighting the asset
    // For now, just ensure the right sidebar is open
    if (!isRightSidebarOpen) {
      setIsRightSidebarOpen(true);
    }
    // Dispatch custom event for sidebar to listen to
    window.dispatchEvent(new CustomEvent('searchAssetSelected', { detail: asset }));
  }, [isRightSidebarOpen]);

  if (isLoading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-black text-white font-mono">
          <div className="text-center">
          <div className="text-xl mb-2 animate-pulse">Loading themes...</div>
          <div className="text-xs opacity-50">Theme Maker Y1</div>
        </div>
      </div>
    );
  }

  if (!activeTheme) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-black text-white font-mono">
        <div className="text-center">
          <div className="text-xl mb-2 text-red-500">No themes available</div>
          <div className="text-xs opacity-50">Please add themes to the themes/ folder</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex flex-col bg-black text-white font-mono overflow-hidden">
      {/* Global Menu Bar */}
      <MenuBar
        activeTheme={activeTheme}
        availableThemes={availableThemes}
        isLeftSidebarOpen={isLeftSidebarOpen}
        isRightSidebarOpen={isRightSidebarOpen}
        deviceColor={deviceColor}
        assets={activeTheme?.loadedAssets || []}
        spec={activeTheme?.spec}
        onSetActiveTheme={setActiveTheme}
        onToggleLeftSidebar={setIsLeftSidebarOpen}
        onToggleRightSidebar={setIsRightSidebarOpen}
        onSetDeviceColor={setDeviceColor}
        onNewTheme={handleNewTheme}
        onOpenTheme={handleOpenTheme}
        onExportTheme={handleExportTheme}
        onImportThemes={handleImportThemes}
        onDeleteTheme={handleDeleteTheme}
        onDuplicateTheme={handleDuplicateTheme}
        onCloneCurrentTheme={handleCloneCurrentTheme}
        onRevertTheme={handleRevertTheme}
        onShowPreferences={() => setShowPreferences(true)}
        onSearchAssetSelect={handleSearchAssetSelect}
      />

      {/* Theme Tabs */}
      <ThemeTabs
        themes={availableThemes.filter(t => t.isEditable)}
        activeTheme={activeTheme}
        onSelectTheme={(theme) => {
          setActiveTheme(theme);
          try { localStorage.setItem('activeThemeId', theme.id); } catch {}
        }}
        onCloseTheme={handleCloseThemeTab}
        onRenameTheme={async (themeId: string, newName: string) => {
          const theme = availableThemes.find(t => t.id === themeId);
          if (theme && theme.isEditable) {
            try {
              const updatedSpec = {
                ...theme.spec,
                theme_info: {
                  ...theme.spec.theme_info,
                  title: newName
                }
              };
              await updateClonedThemeSpec(themeId, updatedSpec);
              
              // Update the theme in available themes
              setAvailableThemes(prev => 
                prev.map(t => t.id === themeId ? { ...t, spec: updatedSpec } : t)
              );
              
              // Update active theme if it's the one being renamed
              if (activeTheme?.id === themeId) {
                setActiveTheme({ ...activeTheme, spec: updatedSpec });
              }
              
              setToastMessage(`Theme renamed to "${newName}"`);
              setShowToast(true);
            } catch (error: any) {
              console.error('Failed to rename theme:', error);
              setToastMessage(error.message || 'Failed to rename theme');
              setShowToast(true);
            }
          }
        }}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 bg-black text-white font-mono overflow-hidden">
        {/* Left Sidebar: Theme Selector */}
      {isLeftSidebarOpen && (
        <div className="w-80 border-r border-[#3A3A3A] bg-[#2D2D2D] flex flex-col z-30 overflow-y-auto relative editorial-sidebar" style={{ boxShadow: '2px 0 8px rgba(0,0,0,0.5)' }}>
          <div className="flex-1 overflow-y-auto p-6 space-y-10 no-scrollbar relative z-10">
            {/* Device Status Section */}
            <section className="space-y-4 editorial-section">
              <h3 className="text-[11px] font-bold text-[#C0C0C0] uppercase tracking-[0.15em] border-b border-[#3C7FD5] pb-2 flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)' }}>
                <svg className="w-4 h-4 text-[#3C7FD5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Device Status
              </h3>
              <div className="space-y-4 pl-2">
                {/* Battery Level */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase text-[#999999] font-medium tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Battery Level</label>
                  <div className="flex gap-2">
                    {[0, 1, 2, 3].map((level) => (
                      <button
                        key={level}
                        onClick={() => setBatteryLevel(level)}
                        className={`flex-1 py-2 px-3 text-center text-[10px] font-bold uppercase transition-all border rounded-sm ${
                          batteryLevel === level
                            ? 'bg-[#3C7FD5] border-[#5A9FFF] text-white'
                            : 'bg-[#3A3A3A] border-[#4A4A4A] text-[#AAAAAA] hover:border-[#5A9FFF]'
                        }`}
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {((level + 1) * 25)}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Charging Toggle */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCharging}
                      onChange={e => setIsCharging(e.target.checked)}
                      className="w-4 h-4 bg-[#3A3A3A] border border-[#4A4A4A] rounded focus:ring-2 focus:ring-[#3C7FD5]"
                    />
                    <span className="text-[10px] uppercase text-[#999999] font-medium tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Charging</span>
                  </label>
                </div>

                {/* Time in Title Toggle */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showTimeInTitle}
                      onChange={e => setShowTimeInTitle(e.target.checked)}
                      className="w-4 h-4 bg-[#3A3A3A] border border-[#4A4A4A] rounded focus:ring-2 focus:ring-[#3C7FD5]"
                    />
                    <span className="text-[10px] uppercase text-[#999999] font-medium tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Time in Title</span>
                  </label>
                  <p className="text-[9px] text-[#777777] ml-6 italic" style={{ fontFamily: 'var(--font-body)' }}>Show hh:mm in Home status bar</p>
                </div>

                {/* Play State */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase text-[#999999] font-medium tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Play State</label>
                  <select 
                    value={playState || ''} 
                    onChange={e => {
                      const newState = e.target.value ? (e.target.value as typeof playState) : null;
                      setPlayState(newState);
                      setIsPlaying(newState === 'playing' || newState === 'fmPlaying' || newState === 'audiobookPlaying');
                    }}
                    className="w-full bg-[#3A3A3A] border border-[#4A4A4A] px-3 py-2 text-xs text-[#CCCCCC] font-medium focus:outline-none focus:ring-2 focus:ring-[#3C7FD5] focus:border-[#3C7FD5]"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    <option value="">None</option>
                    <option value="playing">Playing</option>
                    <option value="pause">Pause</option>
                    <option value="stop">Stop</option>
                    <option value="fmPlaying">FM Playing</option>
                    <option value="audiobookPlaying">Audiobook Playing</option>
                  </select>
                </div>

                {/* Headset State */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase text-[#999999] font-medium tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Headset</label>
                  <select 
                    value={headsetState || ''} 
                    onChange={e => setHeadsetState(e.target.value ? (e.target.value as typeof headsetState) : null)}
                    className="w-full bg-[#3A3A3A] border border-[#4A4A4A] px-3 py-2 text-xs text-[#CCCCCC] font-medium focus:outline-none focus:ring-2 focus:ring-[#3C7FD5] focus:border-[#3C7FD5]"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    <option value="">None</option>
                    <option value="withMic">With Mic</option>
                    <option value="withoutMic">Without Mic</option>
                  </select>
                </div>

                {/* Bluetooth State */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase text-[#999999] font-medium tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Bluetooth</label>
                  <select 
                    value={bluetoothState || ''} 
                    onChange={e => setBluetoothState(e.target.value ? (e.target.value as typeof bluetoothState) : null)}
                    className="w-full bg-[#3A3A3A] border border-[#4A4A4A] px-3 py-2 text-xs text-[#CCCCCC] font-medium focus:outline-none focus:ring-2 focus:ring-[#3C7FD5] focus:border-[#3C7FD5]"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    <option value="">None</option>
                    <option value="connected">Connected</option>
                    <option value="connecting">Connecting</option>
                    <option value="disconnected">Disconnected</option>
                  </select>
                </div>

                {/* Ringtone Toggle */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ringtoneEnabled}
                      onChange={e => setRingtoneEnabled(e.target.checked)}
                      className="w-4 h-4 bg-[#3A3A3A] border border-[#4A4A4A] rounded focus:ring-2 focus:ring-[#3C7FD5]"
                    />
                    <span className="text-[10px] uppercase text-[#999999] font-medium tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Ringtone</span>
                  </label>
                </div>

                {/* Vibrator Toggle */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={vibratorEnabled}
                      onChange={e => setVibratorEnabled(e.target.checked)}
                      className="w-4 h-4 bg-[#3A3A3A] border border-[#4A4A4A] rounded focus:ring-2 focus:ring-[#3C7FD5]"
                    />
                    <span className="text-[10px] uppercase text-[#999999] font-medium tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Vibrator</span>
                  </label>
                </div>

              </div>
            </section>

            {availableThemes.length > 0 && (
              <>
                {/* Pinned Default Theme (always on top) */}
                {availableThemes.filter(t => !t.isEditable && t.id.toLowerCase() === 'default blank').map((t) => (
                  <section key={`${t.id}-pinned`} className="space-y-3 editorial-section">
                    <h3 className="text-[11px] font-bold text-[#C0C0C0] uppercase tracking-[0.15em] border-b border-[#3C7FD5] pb-2 flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)' }}>
                      <svg className="w-4 h-4 text-[#3C7FD5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Default Theme
                    </h3>
                    <div className="flex flex-col gap-2.5 pl-2">
                      <div className="flex gap-2">
                        <button 
                          className={`flex-1 text-left text-xs border px-3 py-2.5 transition-all ${
                            activeTheme?.id === t.id 
                              ? 'border-[#5A9FFF] bg-[#3C7FD5] text-white' 
                              : 'border-[#4A4A4A] bg-[#3A3A3A] hover:border-[#3C7FD5] text-[#AAAAAA] hover:bg-[#404040]'
                          }`}
                          style={{ 
                            fontFamily: 'var(--font-body)'
                          }}
                          onClick={() => {
                            setActiveTheme(t);
                            try { localStorage.setItem('activeThemeId', t.id); } catch {}
                          }}
                        >
                          {t.id}
                        </button>
                        <Tooltip content="Clone Default blank to edit">
                          <button
                            onClick={async () => {
                              try {
                                const newClone = await cloneTheme(t);
                                setAvailableThemes(prev => [...prev, newClone]);
                                setActiveTheme(newClone);
                                try { localStorage.setItem('activeThemeId', newClone.id); } catch {}
                              } catch (error: any) {
                                console.error('Failed to clone theme:', error);
                                setToastMessage(error.message || 'Failed to clone theme');
                                setShowToast(true);
                              }
                            }}
                            className="px-3 py-2.5 border border-[#4A4A4A] bg-[#3A3A3A] hover:border-[#3C7FD5] hover:bg-[#404040] text-[#999999] transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  </section>
                ))}

                {/* Installed Themes Section */}
                <section className="space-y-3 editorial-section">
                  <h3 className="text-[11px] font-bold text-[#C0C0C0] uppercase tracking-[0.15em] border-b border-[#3C7FD5] pb-2 flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)' }}>
                    <svg className="w-4 h-4 text-[#3C7FD5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Installed Themes
                  </h3>
                  <div className="flex flex-col gap-2.5 pl-2">
                    {availableThemes.filter(t => !t.isEditable && t.id.toLowerCase() !== 'default blank').map(t => (
                      <div key={t.id} className="flex gap-2">
                        <button 
                          className={`flex-1 text-left text-xs border px-3 py-2.5 transition-all ${
                            activeTheme?.id === t.id 
                              ? 'border-[#5A9FFF] bg-[#3C7FD5] text-white' 
                              : 'border-[#4A4A4A] bg-[#3A3A3A] hover:border-[#3C7FD5] text-[#AAAAAA] hover:bg-[#404040]'
                          }`}
                          style={{ 
                            fontFamily: 'var(--font-body)'
                          }}
                          onClick={() => {
                            console.log('Activating theme:', t.id, 'Preserving current view:', themeViewId);
                            setActiveTheme(t);
                            try { localStorage.setItem('activeThemeId', t.id); } catch {}
                          }}
                        >
                          {t.id}
                        </button>
                        <Tooltip content="Clone this theme to edit it">
                          <button
                            onClick={async () => {
                              try {
                                const newClone = await cloneTheme(t);
                                setAvailableThemes(prev => [...prev, newClone]);
                                setActiveTheme(newClone);
                                try { localStorage.setItem('activeThemeId', newClone.id); } catch {}
                              } catch (error: any) {
                                console.error('Failed to clone theme:', error);
                                setToastMessage(error.message || 'Failed to clone theme');
                                setShowToast(true);
                              }
                            }}
                            className="px-3 py-2.5 border border-[#4A4A4A] bg-[#3A3A3A] hover:border-[#3C7FD5] hover:bg-[#404040] text-[#999999] transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </Tooltip>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

          </div>

        </div>
      )}

      {/* Main Viewport: Simulator */}
      <div 
        className="flex-1 flex items-center justify-center relative overflow-auto transition-colors duration-500"
        style={{ backgroundColor: DEVICE_BACKGROUND_COLORS[deviceColor] }}
      >
        {/* Left sidebar toggle button (when hidden) */}
        {!isLeftSidebarOpen && (
          <Tooltip content="Show theme selector">
            <button 
              onClick={() => setIsLeftSidebarOpen(true)}
              className="absolute top-6 left-6 z-40 p-2 hover:opacity-70 transition-opacity text-zinc-400 hover:text-zinc-200 bg-zinc-900/80 rounded-lg border border-zinc-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </Tooltip>
        )}

        {/* Right sidebar toggle button (when hidden) */}
        {!isRightSidebarOpen && (
          <Tooltip content="Show assets panel">
            <button 
              onClick={() => setIsRightSidebarOpen(true)}
              className="absolute top-6 right-6 z-40 p-2 hover:opacity-70 transition-opacity text-zinc-400 hover:text-zinc-200 bg-zinc-900/80 rounded-lg border border-zinc-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </Tooltip>
        )}


        <div className="relative z-10">
          <div 
            className="device-shadow rounded-3xl border-6 flex flex-col items-center justify-start pt-6 ring-1 ring-white/10 overflow-hidden relative" 
            style={{ 
              transform: 'scale(0.65)', 
              transformOrigin: 'center center', 
              width: '540px', 
              height: '800px',
              borderColor: METALLIC_COLORS[deviceColor].border,
              background: METALLIC_COLORS[deviceColor].gradient,
              boxShadow: `
                0 0 0 1px ${METALLIC_COLORS[deviceColor].shadow} inset,
                0 0 20px rgba(0, 0, 0, 0.5),
                0 10px 40px rgba(0, 0, 0, 0.3),
                0 0 60px rgba(0, 0, 0, 0.2),
                inset 0 2px 4px ${METALLIC_COLORS[deviceColor].highlight},
                inset 0 -2px 4px ${METALLIC_COLORS[deviceColor].shadow}
              `,
              position: 'relative'
            }}
          >
            {/* Metallic shine overlay */}
            <div 
              className="absolute inset-0 rounded-3xl pointer-events-none"
              style={{
                background: `linear-gradient(
                  135deg,
                  rgba(255, 255, 255, 0.15) 0%,
                  transparent 20%,
                  transparent 60%,
                  rgba(0, 0, 0, 0.1) 80%,
                  rgba(255, 255, 255, 0.05) 100%
                )`,
                mixBlendMode: 'overlay'
              }}
            />
            
            {/* Highlight reflection */}
            <div 
              className="absolute top-0 left-1/4 w-1/3 h-1/4 rounded-full pointer-events-none opacity-30"
              style={{
                background: `radial-gradient(ellipse at center, ${METALLIC_COLORS[deviceColor].highlight}, transparent)`,
                filter: 'blur(20px)'
              }}
            />
            
            {/* Subtle metallic texture */}
            <div 
              className="absolute inset-0 rounded-3xl pointer-events-none opacity-5"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 2px,
                  rgba(255, 255, 255, 0.1) 2px,
                  rgba(255, 255, 255, 0.1) 4px
                )`,
                mixBlendMode: 'overlay'
              }}
            />
            
            <div 
              className="w-10 h-1 rounded-full mb-3 relative z-10" 
              style={{ 
                background: `linear-gradient(90deg, ${METALLIC_COLORS[deviceColor].shadow}, ${METALLIC_COLORS[deviceColor].accent}, ${METALLIC_COLORS[deviceColor].shadow})`,
                boxShadow: `
                  0 0 8px rgba(0, 0, 0, 0.3),
                  inset 0 1px 2px ${METALLIC_COLORS[deviceColor].highlight},
                  inset 0 -1px 2px ${METALLIC_COLORS[deviceColor].shadow}
                `,
                opacity: 0.6
              }} 
            />
            
            <div 
              className="bg-black rounded-lg flex-shrink-0 relative" 
              style={{ 
                padding: '16px',
                border: `4px solid ${METALLIC_COLORS[deviceColor].border}`,
                boxShadow: `
                  0 0 0 1px ${METALLIC_COLORS[deviceColor].shadow} inset,
                  0 0 40px rgba(0, 0, 0, 0.8),
                  inset 0 2px 4px rgba(255, 255, 255, 0.1),
                  inset 0 -2px 4px rgba(0, 0, 0, 0.3)
                `,
                position: 'relative'
              }}
            >
              {/* Screen bezel highlight */}
              <div 
                className="absolute inset-0 rounded-lg pointer-events-none"
                style={{
                  border: `1px solid ${METALLIC_COLORS[deviceColor].highlight}`,
                  opacity: 0.3,
                  borderRadius: '0.5rem'
                }}
              />
              {/* Screen content */}
              {activeTheme && themeViewId && (
                <ThemeDisplay 
                  loadedTheme={activeTheme}
                  themeViewId={themeViewId}
                  themeSelectedIndex={themeSelectedIndex}
                  currentSong={currentSong}
                  selectedSongIndex={selectedSongIndex}
                  batteryLevel={batteryLevel}
                  isCharging={isCharging}
                  showToast={showToast}
                  onHideToast={() => setShowToast(false)}
                  toastMessage={toastMessage}
                  playState={playState}
                  headsetState={headsetState}
                  bluetoothState={bluetoothState}
                  ringtoneEnabled={ringtoneEnabled}
                  vibratorEnabled={vibratorEnabled}
                  elapsedTime={elapsedTime}
                  playbackProgress={playbackProgress}
                  showTimeInTitle={showTimeInTitle}
                  dialogState={dialogState}
                  onDialogSelect={handleDialogSelect}
                  timedShutdownValue={timedShutdownValue}
                  backlightValue={backlightValue}
                />
              )}
            </div>

            <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0">
              <ClickWheel 
                onScroll={handleScroll}
                onCenterClick={handleCenterClick}
                onMenuClick={goBack}
                onPrevClick={() => {
                  const prevIdx = (selectedSongIndex - 1 + MOCK_SONGS.length) % MOCK_SONGS.length;
                  setSelectedSongIndex(prevIdx);
                  setCurrentSong(MOCK_SONGS[prevIdx]);
                  // Reset playback when changing songs
                  setElapsedTime(0);
                  setPlaybackProgress(0);
                }}
                onNextClick={() => {
                  const nextIdx = (selectedSongIndex + 1) % MOCK_SONGS.length;
                  setSelectedSongIndex(nextIdx);
                  setCurrentSong(MOCK_SONGS[nextIdx]);
                  // Reset playback when changing songs
                  setElapsedTime(0);
                  setPlaybackProgress(0);
                }}
                onPlayPauseClick={() => {
                  const newPlayingState = !isPlaying;
                  setIsPlaying(newPlayingState);
                  // Update status bar play state icon - toggle between playing and pause
                  // If currently in a playing state (playing, fmPlaying, audiobookPlaying), switch to pause
                  // Otherwise, switch to playing
                  if (playState === 'playing' || playState === 'fmPlaying' || playState === 'audiobookPlaying') {
                    setPlayState('pause');
                  } else {
                    setPlayState('playing');
                  }
                  // Reset elapsed time when pausing
                  if (!newPlayingState) {
                    setElapsedTime(0);
                    setPlaybackProgress(0);
                  }
                }}
                isPlaying={isPlaying}
              />
            </div>
          </div>

          {/* Device Color Selector - positioned directly below */}
          <div className="flex gap-3 justify-center items-center absolute left-1/2 -translate-x-1/2" style={{ top: 'calc(800px * 0.65 + 160px)' }}>
            {[
              { name: 'black', label: 'Black', color: '#0A0A0A' },
              { name: 'silver', label: 'Silver', color: '#C0C0C0' },
              { name: 'yellow', label: 'Yellow', color: '#FFD700' },
              { name: 'teal', label: 'Teal', color: '#40E0D0' },
              { name: 'blue', label: 'Blue', color: '#007BFF' },
              { name: 'orange', label: 'Orange', color: '#FF6A00' },
            ].map((col) => (
              <button
                key={col.name}
                onClick={() => setDeviceColor(col.name as typeof deviceColor)}
                className={`w-8 h-8 rounded-full transition-all duration-300 ${
                  deviceColor === col.name 
                    ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-black/50 scale-110' 
                    : 'hover:scale-105 opacity-60 hover:opacity-100'
                }`}
                style={{ 
                  backgroundColor: col.color,
                  border: (col.name === 'silver' || col.name === 'yellow') ? '1px solid rgba(0,0,0,0.15)' : 'none'
                }}
                title={col.label}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right Sidebar: Image Assets */}
      {isRightSidebarOpen && activeTheme && (
        <ImageAssetsSidebar 
          assets={activeTheme.loadedAssets} 
          themeName={activeTheme.spec.theme_info?.title || activeTheme.id}
          spec={activeTheme.spec}
          onClose={() => setIsRightSidebarOpen(false)}
          onUpdateAsset={handleUpdateAsset}
          onUpdateColor={handleUpdateColor}
          availableThemes={availableThemes}
          isEditable={activeTheme.isEditable}
          currentTheme={activeTheme}
        />
      )}
      </div>
    </div>
  );
};

export default App;
