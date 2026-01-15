
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDeviceSimulator } from '../hooks/useDeviceSimulator';
import ClickWheel from '../../components/ClickWheel';
import ThemeDisplay from '../../components/ThemeDisplay';
import DeviceShell, { METALLIC_COLORS } from '../../components/DeviceShell';
import ImageAssetsSidebar from '../../components/ImageAssetsSidebar';
import MenuBar from '../../components/MenuBar';
import ThemeTabs from '../../components/ThemeTabs';
import TutorialModal from '../../components/TutorialModal';
import { Tooltip } from '../../components/Tooltip';
import { Song, LoadedTheme, ThemeAssetInfo } from '../../types';
import { MOCK_SONGS } from '../../constants';
import { loadAvailableThemes, loadClonedThemes, cloneTheme, updateClonedThemeAsset, deleteClonedTheme, updateClonedThemeSpec, importThemeFromZip } from '../../services/themeService';
import { downloadTheme } from '../../utils/themeExport';

const DEVICE_BACKGROUND_COLORS: Record<string, string> = {
  black: '#2a2a2a', // Lighter gray for better contrast with black device
  silver: '#1e293b',
  yellow: '#1c1917',
  teal: '#0f172a',
  blue: '#18181b',
  orange: '#1e1b1b'
};



const EditorPage: React.FC = () => {
  const [selectedSongIndex, setSelectedSongIndex] = useState(0);
  const [currentSong, setCurrentSong] = useState<Song | null>(MOCK_SONGS[0]);
  // isPlaying moved to hook
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
  // Device Simulator Hook
  const {
    themeViewId,
    themeSelectedIndex,
    themeHistory,
    isPlaying,
    playState,
    batteryLevel,
    isCharging,
    timedShutdownValue,
    backlightValue,
    dialogState,
    requestToast,
    setRequestToast,
    handleScroll,
    handleCenterClick,
    handleMenuClick,
    handlePlayPause,
    setThemeViewId,
    setThemeSelectedIndex,
    setThemeHistory,
    setIsPlaying,
    setPlayState,
    setBatteryLevel,
    setIsCharging,
    setDialogState,
    setTimedShutdownValue,
    setBacklightValue
  } = useDeviceSimulator({ activeTheme });

  // Missing state restoration
  const [deviceColor, setDeviceColor] = useState<'black' | 'silver' | 'yellow' | 'teal' | 'blue' | 'orange'>('teal');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Not Implemented');

  // Debounce refs for spec changes (to avoid losing input focus)
  const pendingSpecChangesRef = useRef<any>(null);
  const specUpdateTimeoutRef = useRef<NodeJS.Timeout>();

  // Sync internal toast state with hook toast request
  useEffect(() => {
    if (requestToast.visible) {
      setToastMessage(requestToast.message);
      setShowToast(true);
      setRequestToast(prev => ({ ...prev, visible: false }));
    }
  }, [requestToast]);

  // Unused state variables that were previously here can be removed or kept if needed by other parts
  // (e.g. showTimeInTitle, headsetState, bluetoothState, ringtoneEnabled, vibratorEnabled are not yet in hook fully but can remain here for now if needed by context or added to hook later)
  const [showTimeInTitle, setShowTimeInTitle] = useState(false);
  const [headsetState, setHeadsetState] = useState<'withMic' | 'withoutMic' | null>(null);
  const [bluetoothState, setBluetoothState] = useState<'connected' | 'connecting' | 'disconnected' | null>(null);
  const [ringtoneEnabled, setRingtoneEnabled] = useState(false);
  const [vibratorEnabled, setVibratorEnabled] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // Backlight value setter for settings menu interaction if needed outside hook (hook manages it internally)
  // We might need to expose setBacklightValue from hook if we want to change it from menu bar or similar? 
  // For now, it's only changed via device interaction.

  // Other state variables...

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

  // Check if tutorial should be shown on first visit
  useEffect(() => {
    if (!isLoading) {
      try {
        const tutorialSeen = localStorage.getItem('tutorialSeen');
        if (!tutorialSeen) {
          setShowTutorial(true);
        }
      } catch (e) {
        console.warn('Failed to check tutorial status:', e);
      }
    }
  }, [isLoading]);

  const handleTutorialClose = useCallback(() => {
    setShowTutorial(false);
    try {
      localStorage.setItem('tutorialSeen', 'true');
    } catch (e) {
      console.warn('Failed to save tutorial status:', e);
    }
  }, []);

  const handleTutorialSkip = useCallback(() => {
    setShowTutorial(false);
    try {
      localStorage.setItem('tutorialSeen', 'true');
    } catch (e) {
      console.warn('Failed to save tutorial status:', e);
    }
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

  // Handlers now provided by hook
  // goBack, handleScroll, handleCenterClick removed


  // Menu Bar Handlers - MUST be before any conditional returns
  const handleNewTheme = useCallback(async () => {
    try {
      const newTheme = await cloneTheme(availableThemes.find(t => t.id.toLowerCase() === 'default blank') || availableThemes[0]);
      const updated = [...availableThemes, newTheme];
      setAvailableThemes(updated);
      saveThemeTabOrder(updated);
      setActiveTheme(newTheme);
      try { localStorage.setItem('activeThemeId', newTheme.id); } catch { }
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
          try { localStorage.setItem('activeThemeId', newTheme.id); } catch { }
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
            try { localStorage.setItem('activeThemeId', newTheme.id); } catch { }
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
      try { localStorage.setItem('activeThemeId', newTheme.id); } catch { }
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
      try { localStorage.setItem('activeThemeId', newClone.id); } catch { }
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
          try { localStorage.setItem('activeThemeId', nextTheme.id); } catch { }
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
      {/* Tutorial Modal */}
      <TutorialModal
        visible={showTutorial}
        onClose={handleTutorialClose}
        onSkip={handleTutorialSkip}
      />

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
        onShowTutorial={() => setShowTutorial(true)}
        onSearchAssetSelect={handleSearchAssetSelect}
      />

      {/* Theme Tabs */}
      <ThemeTabs
        themes={availableThemes.filter(t => t.isEditable)}
        activeTheme={activeTheme}
        onSelectTheme={(theme) => {
          setActiveTheme(theme);
          try { localStorage.setItem('activeThemeId', theme.id); } catch { }
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
              <section className="space-y-2 editorial-section">
                <h3 className="text-[11px] font-bold text-[#C0C0C0] uppercase tracking-[0.15em] border-b border-[#3C7FD5] pb-1 flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)' }}>
                  <svg className="w-4 h-4 text-[#3C7FD5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Device Status
                </h3>
                <div className="space-y-2 pl-2">
                  {/* Battery Level */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-[#999999] font-medium tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Battery Level</label>
                    <div className="flex gap-2">
                      {[0, 1, 2, 3].map((level) => (
                        <button
                          key={level}
                          onClick={() => setBatteryLevel(level)}
                          className={`flex-1 py-1.5 px-2 text-center text-[10px] font-bold uppercase transition-all border rounded-sm ${batteryLevel === level
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
                  <div className="space-y-0">
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
                  <div className="space-y-0">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showTimeInTitle}
                        onChange={e => setShowTimeInTitle(e.target.checked)}
                        className="w-4 h-4 bg-[#3A3A3A] border border-[#4A4A4A] rounded focus:ring-2 focus:ring-[#3C7FD5]"
                      />
                      <span className="text-[10px] uppercase text-[#999999] font-medium tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Time in Title</span>
                    </label>
                    <p className="text-[9px] text-[#777777] ml-6 italic -mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>Show hh:mm in Home status bar</p>
                  </div>

                  {/* Play State */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-[#999999] font-medium tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Play State</label>
                    <select
                      value={playState || ''}
                      onChange={e => {
                        const newState = e.target.value ? (e.target.value as typeof playState) : null;
                        setPlayState(newState);
                        setIsPlaying(newState === 'playing' || newState === 'fmPlaying' || newState === 'audiobookPlaying');
                      }}
                      className="w-full bg-[#3A3A3A] border border-[#4A4A4A] px-3 py-1.5 text-xs text-[#CCCCCC] font-medium focus:outline-none focus:ring-2 focus:ring-[#3C7FD5] focus:border-[#3C7FD5]"
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
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-[#999999] font-medium tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Headset</label>
                    <select
                      value={headsetState || ''}
                      onChange={e => setHeadsetState(e.target.value ? (e.target.value as typeof headsetState) : null)}
                      className="w-full bg-[#3A3A3A] border border-[#4A4A4A] px-3 py-1.5 text-xs text-[#CCCCCC] font-medium focus:outline-none focus:ring-2 focus:ring-[#3C7FD5] focus:border-[#3C7FD5]"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      <option value="">None</option>
                      <option value="withMic">With Mic</option>
                      <option value="withoutMic">Without Mic</option>
                    </select>
                  </div>

                  {/* Bluetooth State */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-[#999999] font-medium tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Bluetooth</label>
                    <select
                      value={bluetoothState || ''}
                      onChange={e => setBluetoothState(e.target.value ? (e.target.value as typeof bluetoothState) : null)}
                      className="w-full bg-[#3A3A3A] border border-[#4A4A4A] px-3 py-1.5 text-xs text-[#CCCCCC] font-medium focus:outline-none focus:ring-2 focus:ring-[#3C7FD5] focus:border-[#3C7FD5]"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      <option value="">None</option>
                      <option value="connected">Connected</option>
                      <option value="connecting">Connecting</option>
                      <option value="disconnected">Disconnected</option>
                    </select>
                  </div>

                  {/* Ringtone Toggle */}
                  <div className="space-y-0">
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
                  <div className="space-y-0">
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
                            className={`flex-1 text-left text-xs border px-3 py-2.5 transition-all ${activeTheme?.id === t.id
                              ? 'border-[#5A9FFF] bg-[#3C7FD5] text-white'
                              : 'border-[#4A4A4A] bg-[#3A3A3A] hover:border-[#3C7FD5] text-[#AAAAAA] hover:bg-[#404040]'
                              }`}
                            style={{
                              fontFamily: 'var(--font-body)'
                            }}
                            onClick={() => {
                              setActiveTheme(t);
                              try { localStorage.setItem('activeThemeId', t.id); } catch { }
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
                                  try { localStorage.setItem('activeThemeId', newClone.id); } catch { }
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
                            className={`flex-1 text-left text-xs border px-3 py-2.5 transition-all ${activeTheme?.id === t.id
                              ? 'border-[#5A9FFF] bg-[#3C7FD5] text-white'
                              : 'border-[#4A4A4A] bg-[#3A3A3A] hover:border-[#3C7FD5] text-[#AAAAAA] hover:bg-[#404040]'
                              }`}
                            style={{
                              fontFamily: 'var(--font-body)'
                            }}
                            onClick={() => {
                              console.log('Activating theme:', t.id, 'Preserving current view:', themeViewId);
                              setActiveTheme(t);
                              try { localStorage.setItem('activeThemeId', t.id); } catch { }
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
                                  try { localStorage.setItem('activeThemeId', newClone.id); } catch { }
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
            <DeviceShell
              deviceColor={deviceColor}
              scale={0.65}
              screenContent={
                activeTheme && themeViewId && (
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
                )
              }
              clickWheel={
                <ClickWheel
                  onScroll={handleScroll}
                  onCenterClick={handleCenterClick}
                  onMenuClick={handleMenuClick}
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
                  onPlayPauseClick={handlePlayPause}
                  isPlaying={isPlaying}
                />
              }
            />

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
                  className={`w-8 h-8 rounded-full transition-all duration-300 ${deviceColor === col.name
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

export default EditorPage;
