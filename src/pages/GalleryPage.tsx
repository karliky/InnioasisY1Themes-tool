import React, { useState, useEffect } from 'react';
import { useDeviceSimulator } from '../hooks/useDeviceSimulator';
import { Link } from 'react-router-dom';
import { LoadedTheme } from '../../types';
import ThemeDisplay from '../../components/ThemeDisplay';
import ClickWheel from '../../components/ClickWheel';
import DeviceShell from '../../components/DeviceShell';
import { loadAvailableThemes, loadClonedThemes } from '../../services/themeService';
import { MOCK_SONGS } from '../../constants';

// --- BIOMIMETIC STYLES & INTERFACE ---
// Speculative Solarpunk / Organism Aesthetic
const BIO_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,500;1,400&family=Space+Grotesk:wght@300;500&display=swap');

:root {
  --bio-deep: #000000; /* True black for infinity depth */
  --bio-fluid: rgba(255, 255, 255, 0.03);
  --bio-accent-1: #2AF598; /* Sharper, cleaner mint */
  --bio-accent-2: #009EFD; /* Electric yet deep blue */
  --bio-text: #f5f5f7; /* Apple-esque off-white */
}

/* Smooth scroll & base */
.bio-page {
  font-family: 'Cormorant Garamond', serif;
  background-color: var(--bio-deep);
  color: var(--bio-text);
  height: 100vh; /* Changed from min-height to height */
  position: relative;
  overflow-y: auto; /* Enable internal scrolling */
  overflow-x: hidden;
  cursor: url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='12' cy='12' r='8' stroke='%2300ffaa' stroke-width='1.5' stroke-opacity='0.7'/%3E%3Ccircle cx='12' cy='12' r='2' fill='%2300ffaa'/%3E%3C/svg%3E") 12 12, auto;
  scrollbar-width: thin;
  scrollbar-color: var(--bio-accent-1) var(--bio-deep);
}

/* Custom Scrollbar for Webkit */
.bio-page::-webkit-scrollbar {
  width: 8px;
}
.bio-page::-webkit-scrollbar-track {
  background: var(--bio-deep);
}
.bio-page::-webkit-scrollbar-thumb {
  background-color: var(--bio-accent-1);
  border-radius: 4px;
  border: 2px solid var(--bio-deep);
}


/* Background Organism */
.bio-substrate {
  position: fixed;
  inset: 0;
  z-index: 0;
  background-color: #050505;
  background-image: 
    linear-gradient(rgba(42, 245, 152, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(42, 245, 152, 0.03) 1px, transparent 1px),
    radial-gradient(circle at 50% 0%, rgba(0, 158, 253, 0.15), transparent 70%),
    radial-gradient(circle at 50% 100%, rgba(138, 43, 226, 0.1), transparent 70%);
  background-size: 60px 60px, 60px 60px, 100% 100%, 100% 100%;
  animation: grid-pulse 10s ease-in-out infinite alternate;
  pointer-events: none;
}

.bio-noise {
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
  z-index: 0;
  pointer-events: none;
  opacity: 0.07;
  mix-blend-mode: screen; /* Visible on black */
}

@keyframes grid-pulse {
  0% { background-position: 0 0, 0 0, 50% 0%, 50% 100%; opacity: 0.8; }
  50% { background-position: 0 0, 0 0, 50% -2%, 50% 102%; opacity: 1; }
  100% { background-position: 0 0, 0 0, 50% 0%, 50% 100%; opacity: 0.8; }
}

/* Floating Navigation Cell */
.bio-nav-cell {
  position: fixed;
  top: 2rem;
  right: 2rem;
  z-index: 100;
  padding: 1rem 2rem;
  background: rgba(255,255,255,0.03);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 50px;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
  box-shadow: 0 4px 30px rgba(0,0,0,0.1);
}

.bio-nav-cell:hover {
  background: rgba(255,255,255,0.08);
  transform: scale(1.05);
  box-shadow: 0 0 30px rgba(0, 255, 170, 0.1);
}

.bio-link {
  color: var(--bio-text);
  text-decoration: none;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  opacity: 0.7;
  transition: opacity 0.3s;
}
.bio-link:hover { opacity: 1; }

/* Slime Layout */
.bio-colony {
  position: relative;
  z-index: 10;
  padding: 8rem 4rem;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4rem;
}

/* Individual Cell (Theme Card) */
.bio-cell {
  position: relative;
  width: 280px;
  height: 380px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.bio-cell:nth-child(2n) {
  margin-top: 4rem; /* Irregular grid */
}

.bio-cell:hover {
  transform: translateY(-10px) scale(1.05);
  z-index: 20;
}

/* The Membrane (Card Shape) */
.bio-membrane {
  position: absolute;
  inset: 0;
  background: linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01));
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; /* Organic Blob */
  box-shadow: 
    inset 0 0 20px rgba(0,0,0,0.5),
    0 20px 50px rgba(0,0,0,0.3);
  transition: all 0.8s ease;
  overflow: hidden;
  animation: membrane-breath 8s ease-in-out infinite alternate;
}

.bio-cell:hover .bio-membrane {
  border-radius: 50% / 50%;
  background: linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
  box-shadow: 0 0 30px rgba(0, 255, 170, 0.15);
  border-color: rgba(0, 255, 170, 0.3);
}

@keyframes membrane-breath {
  0% { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; }
  50% { border-radius: 50% 50% 40% 60% / 50% 40% 50% 50%; }
  100% { border-radius: 60% 40% 30% 70% / 60% 50% 40% 60%; }
}

/* Image inside membran */
.bio-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.6;
  mix-blend-mode: luminosity;
  transition: all 0.5s ease;
  transform: scale(1.1);
}

.bio-cell:hover .bio-preview-img {
  opacity: 0.8;
  mix-blend-mode: normal;
  transform: scale(1);
}

/* Nucleus (Content) */
.bio-nucleus {
  position: absolute;
  bottom: 10%;
  left: 0;
  width: 100%;
  text-align: center;
  padding: 0 1rem;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.4s ease 0.1s;
}

.bio-cell:hover .bio-nucleus {
  opacity: 1;
  transform: translateY(0);
}

.bio-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.2rem;
  font-weight: 500;
  margin-bottom: 0.2rem;
  color: #fff;
  text-shadow: 0 0 10px rgba(0,0,0,0.8);
}

.bio-meta {
  font-size: 0.8rem;
  color: #aaa;
  font-style: italic;
}

/* Header Typography */
.bio-hero {
  text-align: center;
  padding-top: 8rem;
  position: relative;
  z-index: 10;
}

.bio-hero h1 {
  font-size: 5rem;
  font-weight: 300;
  letter-spacing: -0.02em;
  background: linear-gradient(180deg, #fff, #888);
  -webkit-background-clip: text;
  color: transparent;
  animation: float-text 6s ease-in-out infinite;
}

.bio-hero p {
  font-size: 1.2rem;
  color: rgba(255,255,255,0.5);
  max-width: 600px;
  margin: 1rem auto;
  line-height: 1.6;
}

@keyframes float-text {
  0%, 100% { transform: translateY(0); filter: blur(0px); }
  50% { transform: translateY(-10px); filter: blur(1px); }
}

/* Modal Portal */
.bio-portal {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.9);
  backdrop-filter: blur(20px);
  animation: portal-open 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}

@keyframes portal-open {
  from { opacity: 0; backdrop-filter: blur(0); }
  to { opacity: 1; backdrop-filter: blur(20px); }
}

.bio-portal-content {
  display: flex;
  gap: 4rem;
  align-items: center;
  width: 90vw;
  max-width: 1200px;
  height: 80vh;
}

.bio-device-sac {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

/* Glow behind device */
.bio-device-sac::before {
  content: '';
  position: absolute;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(0, 255, 170, 0.2), transparent 70%);
  filter: blur(40px);
  animation: pulse-glow 4s infinite alternate;
}

@keyframes pulse-glow {
  0% { transform: scale(1); opacity: 0.5; }
  100% { transform: scale(1.2); opacity: 0.8; }
}

.bio-info-panel {
  flex: 0 0 350px;
  color: #fff;
  font-family: 'Space Grotesk';
}

.bio-info-title {
  font-size: 3rem;
  line-height: 1;
  margin-bottom: 1rem;
  color: var(--bio-accent-1);
}

.bio-close-btn {
  position: absolute;
  top: 2rem;
  right: 2rem;
  background: none;
  border: none;
  color: rgba(255,255,255,0.5);
  font-size: 2rem;
  cursor: pointer;
  transition: color 0.3s;
}
.bio-close-btn:hover { color: #fff; }

/* Loading State - Spore Cloud */
.bio-loading {
  height: 50vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--bio-accent-1);
  font-family: 'Space Grotesk';
  gap: 1rem;
}

.spore {
  width: 20px;
  height: 20px;
  background: var(--bio-accent-1);
  border-radius: 50%;
  animation: spore-ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
}

@keyframes spore-ping {
  75%, 100% { transform: scale(2); opacity: 0; }
}

`;

const GalleryPage: React.FC = () => {
    // State for themes
    const [themes, setThemes] = useState<LoadedTheme[]>([]);
    const [loading, setLoading] = useState(true);

    // State for preview modal
    const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
    const [previewTheme, setPreviewTheme] = useState<LoadedTheme | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState<string | null>("Initializing ecosystem...");

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
                setLoadingStatus("Germinating local spores...");
                const installed = loadAvailableThemes();

                // Load cloned themes
                setLoadingStatus("Connecting to fungal network...");
                const cloned = await loadClonedThemes();

                // Combine and set
                setLoadingStatus("Synthesizing...");
                setThemes([...installed, ...cloned]);
            } catch (e) {
                console.error("Failed to load themes", e);
                setLoadingStatus(`Symbiosis Error: ${e instanceof Error ? e.message : String(e)}`);
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
        <div className="bio-page">
            <style>{BIO_STYLES}</style>

            <div className="bio-substrate"></div>
            <div className="bio-noise"></div>

            {/* Organic Navigation */}
            <nav className="bio-nav-cell">
                <div style={{ width: 10, height: 10, background: '#00ffaa', borderRadius: '50%', boxShadow: '0 0 10px #00ffaa' }}></div>
                <span style={{ fontWeight: 600, letterSpacing: '0.2em' }}>GALLERY</span>
                <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.2)' }}></div>
                <Link to="/" className="bio-link">Return to Theme Editor</Link>
            </nav>

            {/* Header */}
            <header className="bio-hero">
                <h1 style={{ marginBottom: '1rem' }}>Innioasis Y1 Gallery</h1>
                <p style={{ fontSize: '1.1rem', color: '#ccc', maxWidth: '600px', margin: '0 auto 2rem auto', lineHeight: '1.6' }}>
                    Discover custom themes created by the community, or <strong style={{ color: '#fff' }}>submit your own!</strong><br />
                    <span style={{ color: '#fff', opacity: 0.9 }}>Click any card</span> to preview it on the device simulator before downloading.
                </p>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                    <a href="https://discord.gg/3zbfaTNN7V" target="_blank" rel="noreferrer"
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.8rem 1.5rem',
                            background: 'rgba(0, 170, 255, 0.1)',
                            border: '1px solid rgba(0, 170, 255, 0.3)',
                            borderRadius: '30px',
                            color: '#00aaff',
                            textDecoration: 'none',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            cursor: 'pointer'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0, 170, 255, 0.2)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0, 170, 255, 0.1)'}
                    >
                        Join Discord Community
                    </a>
                    <a href="https://www.reddit.com/r/innioasis/" target="_blank" rel="noreferrer"
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.8rem 1.5rem',
                            background: 'rgba(255, 69, 0, 0.1)',
                            border: '1px solid rgba(255, 69, 0, 0.3)',
                            borderRadius: '30px',
                            color: '#ff4500',
                            textDecoration: 'none',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            cursor: 'pointer'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 69, 0, 0.2)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 69, 0, 0.1)'}
                    >
                        Join Reddit Community
                    </a>
                    <a href="https://github.com/karliky/InnioasisY1Themes-tool" target="_blank" rel="noreferrer"
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.8rem 1.5rem',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '30px',
                            color: '#ccc',
                            textDecoration: 'none',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            cursor: 'pointer'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                    >
                        Contribute on GitHub
                    </a>
                </div>
            </header>

            {/* Gallery Colony */}
            <main className="bio-colony">
                {loadingStatus ? (
                    <div className="bio-loading">
                        <div className="spore"></div>
                        <p>{loadingStatus}</p>
                    </div>
                ) : (
                    themes.map((theme, index) => {
                        const coverUrl = getThemeCoverUrl(theme);
                        const title = theme.spec.theme_info?.title || theme.id;
                        const author = theme.spec.theme_info?.author || 'Unknown';

                        return (
                            <div
                                key={theme.id}
                                className="bio-cell"
                                onClick={() => handlePreview(theme)}
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                <div className="bio-membrane">
                                    {coverUrl ? (
                                        <img src={coverUrl} alt={title} className="bio-preview-img" />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}>
                                            NO SIGNAL
                                        </div>
                                    )}
                                </div>
                                <div className="bio-nucleus">
                                    <div className="bio-title">{title}</div>
                                    <div className="bio-meta">by {author}</div>
                                </div>
                            </div>
                        );
                    })
                )}
            </main>

            {/* Preview Portal */}
            {selectedThemeId && (
                <div className="bio-portal">
                    <button onClick={closePreview} className="bio-close-btn">×</button>

                    <div className="bio-portal-content">
                        {/* Device Container */}
                        <div className="bio-device-sac">
                            {previewTheme ? (
                                <div style={{ transform: 'scale(0.8)' }}>
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
                                </div>
                            ) : (
                                <div>Loading Organism...</div>
                            )}
                        </div>

                        {/* Info Panel */}
                        <div className="bio-info-panel hidden md:block">
                            <h2 className="bio-info-title">{previewTheme?.spec.theme_info?.title}</h2>
                            <p style={{ color: '#888', marginBottom: '2rem', lineHeight: '1.6' }}>
                                {previewTheme?.spec.theme_info?.description || 'No genetic data provided for this specimen.'}
                            </p>

                            <div style={{ paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                    <span style={{ color: '#666', fontSize: '0.8rem', textTransform: 'uppercase' }}>Author</span>
                                    <span style={{ color: '#fff' }}>{previewTheme?.spec.theme_info?.author}</span>
                                </div>
                                <button className="bio-btn" style={{
                                    background: 'var(--bio-accent-1)', color: '#000', border: 'none', padding: '1rem 2rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Space Grotesk'
                                }} onClick={() => console.log('Download')}>
                                    DOWNLOAD THEME AS ZIP
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GalleryPage;
