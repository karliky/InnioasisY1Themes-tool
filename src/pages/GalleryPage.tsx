import React, { useState, useEffect } from 'react';
import { useDeviceSimulator } from '../hooks/useDeviceSimulator';
import { Link } from 'react-router-dom';
import { LoadedTheme, Song } from '../../types';
import ThemeDisplay from '../../components/ThemeDisplay';
import ClickWheel from '../../components/ClickWheel';
import DeviceShell from '../../components/DeviceShell';
import { loadAvailableThemes, loadClonedThemes } from '../../services/themeService';
import { MOCK_SONGS } from '../../constants';
// Re-using styles from index.css mostly, but adding some specific layout

// Mock Data for Community Themes
// In a real app, this would be fetched from an API/JSON


const GalleryPage: React.FC = () => {
    // State for themes
    const [themes, setThemes] = useState<LoadedTheme[]>([]);
    const [loading, setLoading] = useState(true);

    // State for preview modal
    const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
    const [previewTheme, setPreviewTheme] = useState<LoadedTheme | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState<string | null>("Initializing...");

    // Device Simulator Hook
    const {
        themeViewId,
        themeSelectedIndex,
        isPlaying,
        playState,
        batteryLevel,
        isCharging,
        timedShutdownValue,
        backlightValue,
        dialogState,
        handleScroll,
        handleCenterClick,
        handleMenuClick,
        handlePlayPause,
        resetState,
        setThemeViewId,
        setThemeSelectedIndex,
        setThemeHistory
    } = useDeviceSimulator({ activeTheme: previewTheme });

    // Mock song for preview
    const selectedSongIndex = 0;
    const currentSong = MOCK_SONGS[selectedSongIndex];

    useEffect(() => {
        const fetchThemes = async () => {
            try {
                // Load installed themes
                setLoadingStatus("Loading installed themes...");
                const installed = loadAvailableThemes();

                // Load cloned themes
                setLoadingStatus("Loading cloned from IndexedDB...");
                const cloned = await loadClonedThemes();

                // Combine and set
                setLoadingStatus("Finalizing...");
                setThemes([...installed, ...cloned]);
            } catch (e) {
                console.error("Failed to load themes", e);
                setLoadingStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
            } finally {
                setLoadingStatus(null);
                setLoading(false);
            }
        };
        fetchThemes();
    }, []);

    const handlePreview = (theme: LoadedTheme) => {
        setSelectedThemeId(theme.id);
        setPreviewTheme(theme);
        // Reset device state hook for the new theme
        setThemeViewId('home');
        setThemeSelectedIndex(0);
        setThemeHistory([]);
    };

    const closePreview = () => {
        setSelectedThemeId(null);
        setPreviewTheme(null);
        resetState();
    };

    const getThemeCoverUrl = (theme: LoadedTheme) => {
        const coverFile = (theme.spec as any).themeCover;
        if (coverFile && theme.assetUrlForFile) {
            return theme.assetUrlForFile(coverFile);
        }
        return null;
    };

    return (
        <div className="h-screen bg-[#1A1612] text-[#E8E3D5] font-sans pb-20 relative overflow-y-auto overflow-x-hidden">
            {/* Texture Overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'var(--texture-noise)' }}></div>


            {/* Header */}
            <header className="relative z-10 border-b border-[#3A3530] bg-[#25201B]/90 backdrop-blur-md sticky top-0">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-[#C97D60] flex items-center justify-center text-[#1A1612] font-bold text-xl">
                            Y1
                        </div>
                        <h1 className="text-xl font-medium tracking-wide">Theme Gallery</h1>
                    </div>
                    <Link
                        to="/"
                        className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#4A4540] hover:border-[#C97D60] hover:text-[#C97D60] transition-colors text-sm font-medium uppercase tracking-wider"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
                        Back to Editor
                    </Link>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative z-10 py-16 px-6 text-center border-b border-[#3A3530] bg-gradient-to-b from-[#25201B] to-[#1A1612]">
                <div className="max-w-3xl mx-auto space-y-6">
                    <h2 className="text-4xl md:text-5xl font-serif text-[#C97D60]">Discover & Share</h2>
                    <p className="text-lg text-[#8A8578] max-w-2xl mx-auto leading-relaxed">
                        Explore the best themes created by the Innioasis Y1 community. Customize your device with unique styles, or share your own creations.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                        <a
                            href="https://discord.gg/3zbfaTNN7V"
                            target="_blank"
                            rel="noreferrer"
                            className="px-6 py-3 rounded bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium transition-colors flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 127.14 96.36" fill="currentColor">
                                <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.11,77.11,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.82,105.82,0,0,0,126.6,80.22c2.31-23.73-2.1-47.65-18.9-72.15ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
                            </svg>
                            Join Discord Community
                        </a>
                        <a
                            href="https://github.com/karliky/InnioasisY1Themes-tool"
                            target="_blank"
                            rel="noreferrer"
                            className="px-6 py-3 rounded bg-[#333] hover:bg-[#444] text-white font-medium transition-colors flex items-center gap-2 border border-[#555]"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                            </svg>
                            Submit Theme on GitHub
                        </a>
                    </div>
                </div>
            </section>

            {/* Gallery Grid */}
            <main className="max-w-7xl mx-auto px-6 py-12 relative z-10">
                {loadingStatus ? (
                    <div className="flex flex-col items-center justify-center h-40 space-y-4">
                        <div className="w-8 h-8 border-2 border-[#C97D60] border-t-transparent rounded-full animate-spin"></div>
                        <div className="text-[#C97D60] font-mono animate-pulse">{loadingStatus}</div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {themes.map((theme) => {
                            const coverUrl = getThemeCoverUrl(theme);
                            const title = theme.spec.theme_info?.title || theme.id;
                            const author = theme.spec.theme_info?.author || 'Unknown Author';
                            const description = theme.spec.theme_info?.description || 'No description provided.';

                            return (
                                <div key={theme.id} className="group editorial-card bg-[#25201B] flex flex-col transition-transform hover:-translate-y-1">
                                    <div className="aspect-[4/3] bg-[#000] relative overflow-hidden group-hover:opacity-90 transition-opacity flex items-center justify-center">
                                        {coverUrl ? (
                                            <img src={coverUrl} alt={title} className="absolute inset-0 w-full h-full object-cover" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                                        ) : (
                                            <div className="text-[#333] font-bold text-2xl opacity-30">NO PREVIEW</div>
                                        )}

                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 z-10">
                                            <button
                                                onClick={() => handlePreview(theme)}
                                                className="px-6 py-2 bg-[#C97D60] text-[#1A1612] font-bold uppercase tracking-wider rounded-sm hover:scale-105 transition-transform"
                                            >
                                                Preview
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-5 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-lg font-bold text-[#E8E3D5] truncate w-full" title={title}>{title}</h3>
                                        </div>

                                        <p className="text-sm text-[#8A8578] mb-4 flex-1 line-clamp-2">{description}</p>

                                        <div className="flex items-center justify-between pt-4 border-t border-[#3A3530]">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-[#3A3530] flex items-center justify-center text-xs">
                                                    {author.charAt(0)}
                                                </div>
                                                <span className="text-xs text-[#D4A574] truncate max-w-[100px]" title={author}>{author}</span>
                                            </div>
                                            {theme.isEditable && (
                                                <span className="text-xs text-[#6B7A47] font-mono border border-[#6B7A47]/30 px-1.5 py-0.5 rounded">Local</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Preview Modal */}
            {selectedThemeId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="relative w-full max-w-5xl h-[90vh] flex flex-col md:flex-row gap-8 items-center justify-center">

                        {/* Close Button */}
                        <button
                            onClick={closePreview}
                            className="absolute top-0 right-0 md:-right-12 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>

                        {loadingPreview ? (
                            <div className="text-[#C97D60] font-mono text-xl animate-pulse">
                                Loading theme simulation...
                            </div>
                        ) : (
                            <>
                                {/* Device Simulator */}
                                <div className="h-full flex items-center justify-center scale-[0.6] md:scale-75 lg:scale-90 origin-center">
                                    {previewTheme ? (
                                        <DeviceShell
                                            deviceColor="silver"
                                            screenContent={
                                                <ThemeDisplay
                                                    loadedTheme={previewTheme}
                                                    themeViewId={themeViewId}
                                                    themeSelectedIndex={themeSelectedIndex}
                                                    currentSong={currentSong}
                                                    selectedSongIndex={selectedSongIndex}
                                                    batteryLevel={batteryLevel}
                                                    isCharging={isCharging}
                                                    showToast={false}
                                                    onHideToast={() => { }}
                                                    playState={isPlaying ? 'playing' : 'pause'}
                                                    headsetState={null}
                                                    bluetoothState={'connected'}
                                                    ringtoneEnabled={true}
                                                    vibratorEnabled={true}
                                                    elapsedTime={0}
                                                    playbackProgress={0}
                                                    showTimeInTitle={true}
                                                    dialogState={dialogState}
                                                    onDialogSelect={() => { }}
                                                    timedShutdownValue={timedShutdownValue}
                                                    backlightValue={backlightValue}
                                                />
                                            }
                                            clickWheel={
                                                <ClickWheel
                                                    onScroll={handleScroll}
                                                    onCenterClick={handleCenterClick}
                                                    onMenuClick={handleMenuClick}
                                                    onNextClick={() => { }}
                                                    onPrevClick={() => { }}
                                                    onPlayPauseClick={handlePlayPause}
                                                    size={180}
                                                    isPlaying={isPlaying}
                                                />
                                            }
                                        />
                                    ) : (
                                        <div className="text-red-500">Failed to load preview</div>
                                    )}
                                </div>

                                {/* Sidebar Info */}
                                <div className="hidden md:flex flex-col w-80 text-left space-y-6">
                                    <div>
                                        <h3 className="text-2xl font-bold text-white mb-2">{previewTheme?.spec.theme_info?.title || previewTheme?.id}</h3>
                                        <p className="text-[#8A8578]">{previewTheme?.spec.theme_info?.description || 'No description provided.'}</p>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-[#333]">
                                        <div className="bg-[#222] p-4 rounded border border-[#333]">
                                            <div className="text-xs text-[#666] uppercase mb-1">Controls</div>
                                            <ul className="text-sm text-[#AAA] space-y-2">
                                                <li>• This is a simulation using the default theme structure.</li>
                                                <li>• Interaction is limited in preview mode.</li>
                                                <li>• Press play/pause on controls to animate.</li>
                                            </ul>
                                        </div>

                                        <button
                                            onClick={() => window.open('https://github.com/karliky/InnioasisY1Themes-tool', '_blank')}
                                            className="w-full py-3 bg-[#C97D60] hover:bg-[#B85D3A] text-[#1A1612] font-bold uppercase tracking-wide rounded transition-colors"
                                        >
                                            Download Custom Theme
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GalleryPage;
