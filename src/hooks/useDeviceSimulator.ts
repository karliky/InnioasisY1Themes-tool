import { useState, useCallback, useEffect } from 'react';
import { LoadedTheme, Song } from '../../types';

interface UseDeviceSimulatorProps {
    activeTheme: LoadedTheme | null;
    initialViewId?: string;
}

export const useDeviceSimulator = ({ activeTheme, initialViewId = 'home' }: UseDeviceSimulatorProps) => {
    const [themeViewId, setThemeViewId] = useState<string>(initialViewId);
    const [themeSelectedIndex, setThemeSelectedIndex] = useState(0);
    const [themeHistory, setThemeHistory] = useState<string[]>([]);

    // Status states
    const [isPlaying, setIsPlaying] = useState(false);
    const [batteryLevel, setBatteryLevel] = useState(3);
    const [isCharging, setIsCharging] = useState(false);
    const [playState, setPlayState] = useState<'playing' | 'pause' | 'stop' | 'fmPlaying' | 'audiobookPlaying' | null>(null);

    // Settings states
    const [timedShutdownValue, setTimedShutdownValue] = useState<'off' | '10' | '20' | '30' | '60' | '90' | '120'>('off');
    const [backlightValue, setBacklightValue] = useState<'10' | '15' | '30' | '45' | '60' | '120' | '300' | 'always'>('10');
    
    // Toggle states
    const [shuffleEnabled, setShuffleEnabled] = useState(false);
    const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
    const [fileExtensionsEnabled, setFileExtensionsEnabled] = useState(false);
    const [keyLockEnabled, setKeyLockEnabled] = useState(false);
    const [keyToneEnabled, setKeyToneEnabled] = useState(true);
    const [keyVibrationEnabled, setKeyVibrationEnabled] = useState(true);
    const [displayBatteryEnabled, setDisplayBatteryEnabled] = useState(true);
    const [brightnessLevel, setBrightnessLevel] = useState(50); // 0-100

    // Dialog state
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

    // Simple toast (can be exposed if needed)
    const [requestToast, setRequestToast] = useState<{ message: string, visible: boolean }>({ message: '', visible: false });

    const resetState = useCallback(() => {
        setThemeViewId('home');
        setThemeSelectedIndex(0);
        setThemeHistory([]);
        setDialogState(prev => ({ ...prev, visible: false }));
    }, []);

    const goBack = useCallback(() => {
        if (dialogState.visible) {
            setDialogState(prev => ({ ...prev, visible: false }));
            return;
        }
        if (themeHistory.length > 0) {
            const prev = themeHistory[themeHistory.length - 1];
            setThemeHistory(h => h.slice(0, -1));
            setThemeViewId(prev);
            // Reset selected index when going back to home or other root menus usually
            if (['home', 'music', 'videos', 'audiobooks', 'settings', 'settingsTheme', 'settingsEqualizer'].includes(prev)) {
                setThemeSelectedIndex(0);
            }
        } else {
            setThemeViewId('home');
            setThemeSelectedIndex(0);
        }
    }, [dialogState.visible, themeHistory]);

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
            // Mock folders
            const folders = ['Bad', 'Thriller', 'Dangerous', 'HIStory', 'Invincible', 'Off the Wall', 'The Wall'];
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
        } else if (themeViewId === 'settingsBrightness') {
            // Left/right (antiClockwise/clockwise) adjusts brightness by 10 (0-100 range)
            if (direction === 'down') {
                setBrightnessLevel(prev => Math.min(prev + 10, 100));
            } else {
                setBrightnessLevel(prev => Math.max(prev - 10, 0));
            }
        }
        // Add more views as needed
    }, [activeTheme, dialogState.visible, dialogState.options.length, themeViewId, setBrightnessLevel]);

    const handleCenterClick = useCallback(() => {
        if (dialogState.visible) {
            // Handle dialog selection (mock)
            setDialogState(prev => ({ ...prev, visible: false }));
            return;
        }

        if (themeViewId === 'home') {
            const homeCfg = (activeTheme?.spec as any)?.homePageConfig || {};
            const standardItems = ['nowPlaying', 'music', 'video', 'audiobooks', 'photos', 'fm', 'bluetooth', 'settings'];
            const availableItems = standardItems.filter(key => homeCfg[key] !== undefined);
            const selectedItemId = availableItems[themeSelectedIndex];

            if (selectedItemId === 'music') {
                setThemeHistory(prev => [...prev, themeViewId]);
                setThemeViewId('music');
                setThemeSelectedIndex(0);
            } else if (selectedItemId === 'video') {
                setThemeHistory(prev => [...prev, themeViewId]);
                setThemeViewId('videos');
                setThemeSelectedIndex(0);
            } else if (selectedItemId === 'audiobooks') {
                setThemeHistory(prev => [...prev, themeViewId || 'home']);
                setThemeViewId('audiobooks');
                setThemeSelectedIndex(0);
            } else if (selectedItemId === 'nowPlaying') {
                setThemeHistory(prev => [...prev, themeViewId]);
                setThemeViewId('nowPlaying');
                setThemeSelectedIndex(0);
            } else if (selectedItemId === 'settings') {
                setThemeHistory(prev => [...prev, themeViewId]);
                setThemeViewId('settings');
                setThemeSelectedIndex(0);
            } else {
                // Not implemented toast
                setRequestToast({ message: 'Not Implemented', visible: true });
                // Try generic route lookup
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
            }
        } else if (themeViewId === 'music') {
            const musicMenuItems = ['All songs', 'Playlists', 'Artists', 'Albums', 'Genres', 'Folders', 'Search'];
            const selected = musicMenuItems[themeSelectedIndex];
            if (selected === 'Folders') {
                setThemeHistory(prev => [...prev, themeViewId]);
                setThemeViewId('music_folders');
                setThemeSelectedIndex(0);
            } else {
                setRequestToast({ message: 'Not Implemented', visible: true });
            }
        } else if (themeViewId === 'settings') {
            const settingsMenuItems = ['Shutdown', 'Timed shutdown', 'Shuffle', 'Repeat', 'Equalizer', 'File extensions', 'Key lock', 'Key tone', 'Key vibration', 'Wallpaper', 'Backlight', 'Brightness', 'Display battery', 'Date & Time', 'Theme', 'Language', 'Factory reset', 'Clear cache', 'About'];
            const selected = settingsMenuItems[themeSelectedIndex];

            if (selected === 'Theme') {
                setThemeHistory(prev => [...prev, themeViewId]);
                setThemeViewId('settingsTheme');
                setThemeSelectedIndex(0);
            } else if (selected === 'Equalizer') {
                setThemeHistory(prev => [...prev, themeViewId]);
                setThemeViewId('settingsEqualizer');
                setThemeSelectedIndex(0);
            } else if (selected === 'Brightness') {
                setThemeHistory(prev => [...prev, themeViewId]);
                setThemeViewId('settingsBrightness');
                setThemeSelectedIndex(0);
            } else if (selected === 'Wallpaper') {
                setThemeHistory(prev => [...prev, themeViewId]);
                setThemeViewId('settingsWallpaper');
                setThemeSelectedIndex(0);
            } else if (selected === 'Date & Time') {
                setThemeHistory(prev => [...prev, themeViewId]);
                setThemeViewId('settingsDateTime');
                setThemeSelectedIndex(0);
            } else if (selected === 'Language') {
                setThemeHistory(prev => [...prev, themeViewId]);
                setThemeViewId('settingsLanguage');
                setThemeSelectedIndex(0);
            } else if (selected === 'About') {
                setThemeHistory(prev => [...prev, themeViewId]);
                setThemeViewId('settingsAbout');
                setThemeSelectedIndex(0);
            } else if (selected === 'Shutdown') {
                setDialogState({
                    visible: true,
                    title: 'Shutdown',
                    message: 'Sure to shut down?',
                    options: ['Yes', 'No'],
                    selectedIndex: 1
                });
            } else if (selected === 'Timed shutdown') {
                // Cycle: Off → 10 → 20 → 30 → 60 → 90 → 120 → Off
                const values: Array<'off' | '10' | '20' | '30' | '60' | '90' | '120'> = ['off', '10', '20', '30', '60', '90', '120'];
                const idx = values.indexOf(timedShutdownValue);
                setTimedShutdownValue(values[(idx + 1) % values.length]);
            } else if (selected === 'Shuffle') {
                setShuffleEnabled(prev => !prev);
            } else if (selected === 'Repeat') {
                // Cycle: Off → All → One → Off
                setRepeatMode(prev => {
                    if (prev === 'off') return 'all';
                    if (prev === 'all') return 'one';
                    return 'off';
                });
            } else if (selected === 'File extensions') {
                setFileExtensionsEnabled(prev => !prev);
            } else if (selected === 'Key lock') {
                setKeyLockEnabled(prev => !prev);
            } else if (selected === 'Key tone') {
                setKeyToneEnabled(prev => !prev);
            } else if (selected === 'Key vibration') {
                setKeyVibrationEnabled(prev => !prev);
            } else if (selected === 'Display battery') {
                setDisplayBatteryEnabled(prev => !prev);
            } else if (selected === 'Backlight') {
                // Cycle: 10s → 15s → 30s → 45s → 60s → 120s → 300s → Always → 10s
                const values: Array<'10' | '15' | '30' | '45' | '60' | '120' | '300' | 'always'> = ['10', '15', '30', '45', '60', '120', '300', 'always'];
                const idx = values.indexOf(backlightValue);
                setBacklightValue(values[(idx + 1) % values.length]);
            } else if (selected === 'Factory reset') {
                setDialogState({
                    visible: true,
                    title: 'Factory reset',
                    message: 'Sure to reset?',
                    options: ['Yes', 'No'],
                    selectedIndex: 1
                });
            } else if (selected === 'Clear cache') {
                setRequestToast({ message: 'Clearing cache...', visible: true });
                setTimeout(() => setRequestToast(prev => ({ ...prev, visible: false })), 2000);
            } else {
                setRequestToast({ message: 'Not Implemented', visible: true });
            }
        }
    }, [activeTheme, dialogState.visible, themeViewId, themeSelectedIndex, timedShutdownValue, backlightValue, shuffleEnabled, repeatMode, fileExtensionsEnabled, keyLockEnabled, keyToneEnabled, keyVibrationEnabled, displayBatteryEnabled, goBack]);

    const handleMenuClick = useCallback(() => {
        goBack();
    }, [goBack]);

    const handlePlayPause = useCallback(() => {
        setIsPlaying(p => !p);
        setPlayState(p => p === 'playing' ? 'pause' : 'playing');
    }, []);

    return {
        themeViewId,
        themeSelectedIndex,
        themeHistory,
        isPlaying,
        playState,
        batteryLevel,
        isCharging,
        timedShutdownValue,
        backlightValue,
        shuffleEnabled,
        repeatMode,
        fileExtensionsEnabled,
        keyLockEnabled,
        keyToneEnabled,
        keyVibrationEnabled,
        displayBatteryEnabled,
        brightnessLevel,
        dialogState,
        requestToast,
        setRequestToast,
        handleScroll,
        handleCenterClick,
        handleMenuClick,
        handlePlayPause,
        resetState,
        setThemeViewId,
        setThemeSelectedIndex,
        setThemeHistory,
        setIsPlaying,
        setPlayState,
        setBatteryLevel,
        setIsCharging,
        setDialogState,
        setTimedShutdownValue,
        setBacklightValue,
        setShuffleEnabled,
        setRepeatMode,
        setFileExtensionsEnabled,
        setKeyLockEnabled,
        setKeyToneEnabled,
        setKeyVibrationEnabled,
        setDisplayBatteryEnabled,
        setBrightnessLevel
    };
};
