
import React, { useState, useCallback, useEffect, useRef } from 'react';
import ClickWheel from './components/ClickWheel';
import ThemeDisplay from './components/ThemeDisplay';
import ImageAssetsSidebar from './components/ImageAssetsSidebar';
import { Song, LoadedTheme, ThemeAssetInfo } from './types';
import { MOCK_SONGS } from './constants';
import { loadAvailableThemes, loadClonedThemes, cloneTheme, updateClonedThemeAsset, deleteClonedTheme, updateClonedThemeSpec, importThemeFromZip } from './services/themeService';

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

        // Sort cloned by clonedDate (newest first)
        const clonedSorted = [...cloned].sort((a, b) => (b.clonedDate || '').localeCompare(a.clonedDate || ''));

        // Combine both lists using the sorted order
        const all = [...installedSorted, ...clonedSorted];
        setAvailableThemes(all);

        if (all.length === 0) {
          console.error('No themes found in themes folder');
          setIsLoading(false);
          return;
        }

        // Determine default theme selection
        const defaultBlank = installedSorted.find(t => t.id.toLowerCase() === 'default blank');
        const sortedThemes = [...installedSorted, ...clonedSorted];
        const firstTheme = defaultBlank ?? sortedThemes[0];

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

        // Use Default blank as default (if present); else first theme
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
      const settingsMenuItems = ['Shutdown', 'Timed shutdown', 'Shuffle', 'Repeat', 'Equalizer', 'File extension', 'Key lock', 'Key tone', 'Key vibration', 'Wallpaper', 'Backlight', 'Brightness', 'Display battery', 'Date & Time', 'Theme', 'Language', 'Factory reset', 'Clear cache', 'About'];
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
      const settingsMenuItems = ['Shutdown', 'Timed shutdown', 'Shuffle', 'Repeat', 'Equalizer', 'File extension', 'Key lock', 'Key tone', 'Key vibration', 'Wallpaper', 'Backlight', 'Brightness', 'Display battery', 'Date & Time', 'Theme', 'Language', 'Factory reset', 'Clear cache', 'About'];
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
    <div className="w-screen h-screen flex bg-black text-white font-mono overflow-hidden">
      {/* Left Sidebar: Theme Selector */}
      {isLeftSidebarOpen && (
        <div className="w-80 border-r-2 border-[#3A3530] bg-[#1A1612] flex flex-col z-30 overflow-y-auto relative editorial-sidebar" style={{ boxShadow: '4px 0 12px rgba(0,0,0,0.3)' }}>
          <div className="p-6 border-b-2 border-[#3A3530] bg-[#25201B] flex items-start justify-between relative z-10" style={{ borderBottomStyle: 'solid' }}>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-[#D4A574] tracking-tight" style={{ fontFamily: 'var(--font-editorial)' }}>Theme Selector</h2>
              <p className="text-[10px] text-[#6B7A47] mt-1 uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono)' }}>Theme Maker Y1</p>
            </div>
            <button 
              onClick={() => setIsLeftSidebarOpen(false)}
              className="p-1.5 hover:bg-[#2F2A25] transition-colors text-[#D4A574] hover:text-[#E8E3D5] rounded-sm"
              title="Hide sidebar"
              style={{ border: '1px solid transparent' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-10 no-scrollbar relative z-10">
            {/* Device Status Section */}
            <section className="space-y-4 editorial-section">
              <h3 className="text-[11px] font-bold text-[#D4A574] uppercase tracking-[0.15em] border-b-2 border-[#C97D60] pb-2 flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)' }}>
                <svg className="w-4 h-4 text-[#C97D60]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Device Status
              </h3>
              <div className="space-y-4 pl-2">
                {/* Battery Level */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase text-[#8A8578] font-medium tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Battery Level</label>
                  <div className="flex gap-2">
                    {[0, 1, 2, 3].map((level) => (
                      <button
                        key={level}
                        onClick={() => setBatteryLevel(level)}
                        className={`flex-1 py-2 px-3 text-center text-[10px] font-bold uppercase transition-all border-2 rounded-sm ${
                          batteryLevel === level
                            ? 'bg-[#C97D60] border-[#E8A576] text-[#1A1612]'
                            : 'bg-[#2F2A25] border-[#4A4540] text-[#D4A574] hover:border-[#6B7A47]'
                        }`}
                        style={{ fontFamily: 'var(--font-mono)', boxShadow: batteryLevel === level ? '2px 2px 0 0 #1A1612' : 'none' }}
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
                      className="w-4 h-4 bg-[#2F2A25] border-2 border-[#4A4540] rounded focus:ring-2 focus:ring-[#C97D60]"
                    />
                    <span className="text-[10px] uppercase text-[#8A8578] font-medium tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Charging</span>
                  </label>
                </div>

                {/* Time in Title Toggle */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showTimeInTitle}
                      onChange={e => setShowTimeInTitle(e.target.checked)}
                      className="w-4 h-4 bg-[#2F2A25] border-2 border-[#4A4540] rounded focus:ring-2 focus:ring-[#C97D60]"
                    />
                    <span className="text-[10px] uppercase text-[#8A8578] font-medium tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Time in Title</span>
                  </label>
                  <p className="text-[9px] text-[#8A8578] ml-6 italic" style={{ fontFamily: 'var(--font-body)' }}>Show hh:mm in Home status bar</p>
                </div>

                {/* Play State */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase text-[#8A8578] font-medium tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Play State</label>
                  <select 
                    value={playState || ''} 
                    onChange={e => {
                      const newState = e.target.value ? (e.target.value as typeof playState) : null;
                      setPlayState(newState);
                      setIsPlaying(newState === 'playing' || newState === 'fmPlaying' || newState === 'audiobookPlaying');
                    }}
                    className="w-full bg-[#2F2A25] border-2 border-[#4A4540] px-3 py-2 text-xs text-[#E8E3D5] font-medium focus:outline-none focus:ring-2 focus:ring-[#C97D60] focus:border-[#C97D60]"
                    style={{ fontFamily: 'var(--font-body)', boxShadow: '2px 2px 0 0 #1A1612' }}
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
                  <label className="text-[10px] uppercase text-[#8A8578] font-medium tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Headset</label>
                  <select 
                    value={headsetState || ''} 
                    onChange={e => setHeadsetState(e.target.value ? (e.target.value as typeof headsetState) : null)}
                    className="w-full bg-[#2F2A25] border-2 border-[#4A4540] px-3 py-2 text-xs text-[#E8E3D5] font-medium focus:outline-none focus:ring-2 focus:ring-[#C97D60] focus:border-[#C97D60]"
                    style={{ fontFamily: 'var(--font-body)', boxShadow: '2px 2px 0 0 #1A1612' }}
                  >
                    <option value="">None</option>
                    <option value="withMic">With Mic</option>
                    <option value="withoutMic">Without Mic</option>
                  </select>
                </div>

                {/* Bluetooth State */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase text-[#8A8578] font-medium tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Bluetooth</label>
                  <select 
                    value={bluetoothState || ''} 
                    onChange={e => setBluetoothState(e.target.value ? (e.target.value as typeof bluetoothState) : null)}
                    className="w-full bg-[#2F2A25] border-2 border-[#4A4540] px-3 py-2 text-xs text-[#E8E3D5] font-medium focus:outline-none focus:ring-2 focus:ring-[#C97D60] focus:border-[#C97D60]"
                    style={{ fontFamily: 'var(--font-body)', boxShadow: '2px 2px 0 0 #1A1612' }}
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
                      className="w-4 h-4 bg-[#2F2A25] border-2 border-[#4A4540] rounded focus:ring-2 focus:ring-[#C97D60]"
                    />
                    <span className="text-[10px] uppercase text-[#8A8578] font-medium tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Ringtone</span>
                  </label>
                </div>

                {/* Vibrator Toggle */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={vibratorEnabled}
                      onChange={e => setVibratorEnabled(e.target.checked)}
                      className="w-4 h-4 bg-[#2F2A25] border-2 border-[#4A4540] rounded focus:ring-2 focus:ring-[#C97D60]"
                    />
                    <span className="text-[10px] uppercase text-[#8A8578] font-medium tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Vibrator</span>
                  </label>
                </div>

                {/* Backlight Timeout */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase text-[#8A8578] font-medium tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Backlight Timeout</label>
                  <select 
                    value={backlightValue}
                    onChange={e => setBacklightValue(e.target.value as typeof backlightValue)}
                    className="w-full bg-[#2F2A25] border-2 border-[#4A4540] px-3 py-2 text-xs text-[#E8E3D5] font-medium focus:outline-none focus:ring-2 focus:ring-[#C97D60] focus:border-[#C97D60]"
                    style={{ fontFamily: 'var(--font-body)', boxShadow: '2px 2px 0 0 #1A1612' }}
                  >
                    <option value="10">10s</option>
                    <option value="15">15s</option>
                    <option value="30">30s</option>
                    <option value="45">45s</option>
                    <option value="60">60s</option>
                    <option value="120">120s</option>
                    <option value="300">300s</option>
                    <option value="always">Always on</option>
                  </select>
                  <p className="text-[9px] text-[#8A8578] italic" style={{ fontFamily: 'var(--font-body)' }}>Updates Settings → Backlight icon</p>
                </div>

              </div>
            </section>

            {availableThemes.length > 0 && (
              <>
                {/* Pinned Default Theme (always on top) */}
                {availableThemes.filter(t => !t.isEditable && t.id.toLowerCase() === 'default blank').map((t) => (
                  <section key={`${t.id}-pinned`} className="space-y-3 editorial-section">
                    <h3 className="text-[11px] font-bold text-[#D4A574] uppercase tracking-[0.15em] border-b-2 border-[#C97D60] pb-2 flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)' }}>
                      <svg className="w-4 h-4 text-[#C97D60]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Default Theme
                    </h3>
                    <div className="flex flex-col gap-2.5 pl-2">
                      <div className="flex gap-2">
                        <button 
                          className={`flex-1 text-left text-xs border-2 px-3 py-2.5 transition-all ${
                            activeTheme?.id === t.id 
                              ? 'border-[#6B7A47] bg-[#6B7A47] text-white' 
                              : 'border-[#4A4540] bg-[#2F2A25] hover:border-[#C97D60] text-[#E8E3D5] hover:bg-[#3A342F]'
                          }`}
                          style={{ 
                            boxShadow: activeTheme?.id === t.id ? '2px 2px 0 0 #4A5A2F' : '2px 2px 0 0 #1A1612',
                            fontFamily: 'var(--font-body)'
                          }}
                          onClick={() => {
                            setActiveTheme(t);
                            try { localStorage.setItem('activeThemeId', t.id); } catch {}
                          }}
                        >
                          {t.id}
                        </button>
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
                          className="px-3 py-2.5 border-2 border-[#4A4540] bg-[#2F2A25] hover:border-[#6B7A47] hover:bg-[#3A342F] text-[#D4A574] transition-all"
                          style={{ boxShadow: '2px 2px 0 0 #1A1612' }}
                          title="Clone Default blank to edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </section>
                ))}
                {/* Cloned Themes Section - Show first */}
                <section className="space-y-3 editorial-section">
                  <h3 className="text-[11px] font-bold text-[#D4A574] uppercase tracking-[0.15em] border-b-2 border-[#6B7A47] pb-2 flex items-center gap-2 justify-between" style={{ fontFamily: 'var(--font-mono)' }}>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#6B7A47]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      My Themes
                    </div>
                    <button
                        onClick={() => {
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
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-[9px] bg-[#6B7A47] hover:bg-[#7B8A57] text-white border border-[#7B8A57] rounded transition-colors"
                        title="Import theme from .zip file"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Import
                      </button>
                    </h3>
                    <div className="flex flex-col gap-2.5 pl-2">
                      {availableThemes
                        .filter(t => t.isEditable)
                        .sort((a, b) => {
                          // Imported themes first (ID starts with 'imported_')
                          const aIsImported = a.id.startsWith('imported_');
                          const bIsImported = b.id.startsWith('imported_');
                          
                          if (aIsImported && !bIsImported) return -1;
                          if (!aIsImported && bIsImported) return 1;
                          
                          // Within each group, sort alphabetically by title or ID
                          const aTitle = ((a as any)?.spec?.theme_info?.title || a.id).toLowerCase();
                          const bTitle = ((b as any)?.spec?.theme_info?.title || b.id).toLowerCase();
                          return aTitle.localeCompare(bTitle);
                        })
                        .map(t => (
                        <div key={t.id} className="flex gap-2">
                          <button 
                            className={`flex-1 text-left text-xs border-2 px-3 py-2.5 transition-all ${
                              activeTheme?.id === t.id 
                                ? 'border-[#6B7A47] bg-[#6B7A47] text-white' 
                                : 'border-[#4A4540] bg-[#2F2A25] hover:border-[#6B7A47] text-[#E8E3D5] hover:bg-[#3A342F]'
                            }`}
                            style={{ 
                              boxShadow: activeTheme?.id === t.id ? '2px 2px 0 0 #4A5A2F' : '2px 2px 0 0 #1A1612',
                              fontFamily: 'var(--font-body)'
                            }}
                            onClick={() => {
                              console.log('Activating cloned theme:', t.id);
                              setActiveTheme(t);
                              try { localStorage.setItem('activeThemeId', t.id); } catch {}
                            }}
                          >
                            <div className="flex items-center gap-2">
                              {t.id.startsWith('imported_') ? (
                                <svg className="w-3 h-3 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              ) : (
                                <svg className="w-3 h-3 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              )}
                              <span>{(t as any)?.spec?.theme_info?.title || t.id.replace(/_clone_\d+$/, '').replace(/^imported_[a-z0-9]+_/, '')}</span>
                            </div>
                            {t.originalThemeId && (
                              <div className="text-[9px] text-white/90 mt-0.5 italic">Clone of {t.originalThemeId}</div>
                            )}
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Delete clone "${t.id}"?`)) {
                                try {
                                  await deleteClonedTheme(t.id);
                                  setAvailableThemes(prev => prev.filter(theme => theme.id !== t.id));
                                  if (activeTheme?.id === t.id) {
                                    const installed = availableThemes.find(theme => !theme.isEditable);
                                    if (installed) {
                                      setActiveTheme(installed);
                                      try { localStorage.setItem('activeThemeId', installed.id); } catch {}
                                    }
                                  }
                                } catch (error: any) {
                                  console.error('Failed to delete theme:', error);
                                  setToastMessage(error.message || 'Failed to delete theme');
                                  setShowToast(true);
                                }
                              }
                            }}
                            className="px-3 py-2.5 border-2 border-[#4A4540] bg-[#2F2A25] hover:border-[#C97D60] hover:bg-[#3A342F] text-[#C97D60] transition-all"
                            style={{ boxShadow: '2px 2px 0 0 #1A1612' }}
                            title="Delete this cloned theme"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>

                {/* Installed Themes Section */}
                <section className="space-y-3 editorial-section">
                  <h3 className="text-[11px] font-bold text-[#D4A574] uppercase tracking-[0.15em] border-b-2 border-[#C97D60] pb-2 flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)' }}>
                    <svg className="w-4 h-4 text-[#C97D60]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Installed Themes
                  </h3>
                  <div className="flex flex-col gap-2.5 pl-2">
                    {availableThemes.filter(t => !t.isEditable && t.id.toLowerCase() !== 'default blank').map(t => (
                      <div key={t.id} className="flex gap-2">
                        <button 
                          className={`flex-1 text-left text-xs border-2 px-3 py-2.5 transition-all ${
                            activeTheme?.id === t.id 
                              ? 'border-[#6B7A47] bg-[#6B7A47] text-white' 
                              : 'border-[#4A4540] bg-[#2F2A25] hover:border-[#C97D60] text-[#E8E3D5] hover:bg-[#3A342F]'
                          }`}
                          style={{ 
                            boxShadow: activeTheme?.id === t.id ? '2px 2px 0 0 #4A5A2F' : '2px 2px 0 0 #1A1612',
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
                          className="px-3 py-2.5 border-2 border-[#4A4540] bg-[#2F2A25] hover:border-[#6B7A47] hover:bg-[#3A342F] text-[#D4A574] transition-all"
                          style={{ boxShadow: '2px 2px 0 0 #1A1612' }}
                          title="Clone this theme to edit it"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            {/* Credits Section */}
            <section className="space-y-3 mt-auto pt-8 border-t-2 border-[#3A3530] editorial-section">
              <h3 className="text-[11px] font-bold text-[#D4A574] uppercase tracking-[0.15em]" style={{ fontFamily: 'var(--font-mono)' }}>Credits</h3>
              <div className="space-y-2 pl-2">
                <a 
                  href="https://x.com/k4rliky" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[10px] text-[#D4A574] hover:text-[#E8E3D5] transition-colors flex items-center gap-2 group"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  <span>x.com/k4rliky</span>
                </a>
                <a 
                  href="https://karliky.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[10px] text-[#D4A574] hover:text-[#E8E3D5] transition-colors flex items-center gap-2 group"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  <span>karliky.com</span>
                </a>
                <a 
                  href="https://karliky.dev" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[10px] text-[#D4A574] hover:text-[#E8E3D5] transition-colors flex items-center gap-2 group"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>karliky.dev</span>
                </a>
              </div>
            </section>
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
          <button 
            onClick={() => setIsLeftSidebarOpen(true)}
            className="absolute top-6 left-6 z-40 p-2 hover:opacity-70 transition-opacity text-zinc-400 hover:text-zinc-200 bg-zinc-900/80 rounded-lg border border-zinc-700"
            title="Show theme selector"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Right sidebar toggle button (when hidden) */}
        {!isRightSidebarOpen && (
          <button 
            onClick={() => setIsRightSidebarOpen(true)}
            className="absolute top-6 right-6 z-40 p-2 hover:opacity-70 transition-opacity text-zinc-400 hover:text-zinc-200 bg-zinc-900/80 rounded-lg border border-zinc-700"
            title="Show assets panel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
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
          themeName={activeTheme.id}
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
  );
};

export default App;
