import React, { useMemo, useState } from 'react';
import { ThemeAssetInfo, LoadedTheme } from '../types';
import EquivalentImagesModal from './EquivalentImagesModal';
import { downloadTheme, getExportPreview } from '../utils/themeExport';

interface ImageAssetsSidebarProps {
  assets: ThemeAssetInfo[];
  themeName: string;
  spec?: any;
  onClose: () => void;
  onUpdateAsset?: (fileName: string, newUrl: string) => Promise<void> | void;
  onUpdateColor?: (configPath: string, newColor: string) => void;
  availableThemes?: LoadedTheme[];
  isEditable?: boolean;  // Whether the theme can be edited (false for installed themes)
  currentTheme?: LoadedTheme;  // The full loaded theme for downloading
}

const ImageAssetsSidebar: React.FC<ImageAssetsSidebarProps> = ({ assets, themeName, spec, onClose, onUpdateAsset, onUpdateColor, availableThemes = [], isEditable = true, currentTheme }) => {
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null);
  const [pasteStatus, setPasteStatus] = useState<{ fileName: string; status: 'success' | 'error'; message: string } | null>(null);
  const [copyStatus, setCopyStatus] = useState<{ fileName: string; status: 'success' | 'error'; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'assets' | 'colors' | 'metadata'>('assets');
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [selectedAssetForReplace, setSelectedAssetForReplace] = useState<ThemeAssetInfo | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<{ status: 'idle' | 'downloading' | 'success' | 'error'; message?: string }>({ status: 'idle' });
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [imageSearchFilter, setImageSearchFilter] = useState('');

  const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Failed to read image data'));
    reader.readAsDataURL(blob);
  });

  // Handle keyboard copy (Ctrl+C / Cmd+C) and paste (Ctrl+V / Cmd+V)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const imageAssets = assets.filter(a => /\.(png|jpg|jpeg|svg)$/i.test(a.fileName));
      const activeEl = document.activeElement as HTMLElement | null;
      const tag = activeEl?.tagName?.toLowerCase();
      const isTextField = tag === 'input' || tag === 'textarea' || !!activeEl?.isContentEditable;
      const hasTextSelection = !!window.getSelection()?.toString();
      
      // Check if Ctrl+C (Windows/Linux) or Cmd+C (Mac) is pressed
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && expandedAsset) {
        // Only intercept on Assets tab, when no text selection and not typing in a field
        if (activeTab !== 'assets' || isTextField || hasTextSelection) {
          return; // allow normal copy
        }
        e.preventDefault();
        const asset = imageAssets.find(a => a.fileName === expandedAsset);
        if (asset) {
          handleCopyImage(asset.fileName, asset.url);
        }
      }
      
      // Check if Ctrl+V (Windows/Linux) or Cmd+V (Mac) is pressed
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && expandedAsset) {
        // Only intercept on Assets tab and when not focused on a text field
        if (activeTab !== 'assets' || isTextField) {
          return; // allow normal paste
        }
        e.preventDefault();
        // Prevent paste on read-only themes
        if (!isEditable) {
          setPasteStatus({ fileName: expandedAsset, status: 'error', message: 'Read-only theme: clone to paste images' });
          setTimeout(() => setPasteStatus(null), 3000);
          return;
        }
        handlePasteImage(expandedAsset);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expandedAsset, assets, activeTab, isEditable]);

  // Handle copy to clipboard
  const handleCopyImage = async (fileName: string, imageUrl: string) => {
    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
      setCopyStatus({ fileName, status: 'error', message: 'Clipboard API not available in this context' });
      setTimeout(() => setCopyStatus(null), 3000);
      return;
    }

    const toBlob = (url: string) => new Promise<Blob>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // avoid tainted canvas on same-origin assets
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas not supported');
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create blob'));
          }, 'image/png');
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = url;
    });

    try {
      const blob = await toBlob(imageUrl);
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type || 'image/png']: blob
        })
      ]);

      setCopyStatus({ fileName, status: 'success', message: 'Image copied to clipboard!' });
      setTimeout(() => setCopyStatus(null), 3000);
    } catch (error) {
      console.error('Error copying image:', error);
      setCopyStatus({ fileName, status: 'error', message: 'Failed to copy image (use HTTPS and allow clipboard)' });
      setTimeout(() => setCopyStatus(null), 3000);
    }
  };

  // Handle paste from clipboard
  const handlePasteImage = async (fileName: string) => {
    // Guard: disallow paste for non-editable themes
    if (!isEditable) {
      setPasteStatus({ fileName, status: 'error', message: 'Read-only theme: clone to paste images' });
      setTimeout(() => setPasteStatus(null), 3000);
      return;
    }
    try {
      const clipboardItems = await navigator.clipboard.read();
      
      for (const item of clipboardItems) {
        const imageTypes = item.types.filter(type => type.startsWith('image/'));
        
        if (imageTypes.length === 0) {
          setPasteStatus({ fileName, status: 'error', message: 'No image in clipboard' });
          setTimeout(() => setPasteStatus(null), 3000);
          return;
        }
        
        const blob = await item.getType(imageTypes[0]);
        const imageUrl = await blobToDataUrl(blob);
        
        // Update the asset (await to ensure persistence completes before notifying)
        if (onUpdateAsset) {
          try {
            await onUpdateAsset(fileName, imageUrl);
            setPasteStatus({ fileName, status: 'success', message: 'Image updated!' });
            setTimeout(() => setPasteStatus(null), 3000);
          } catch (updateError: any) {
            const errorMsg = updateError?.message || 'Failed to save image';
            console.error('Error saving pasted image:', updateError);
            setPasteStatus({ fileName, status: 'error', message: errorMsg });
            setTimeout(() => setPasteStatus(null), 5000);
          }
        }
        
        return;
      }
      
      setPasteStatus({ fileName, status: 'error', message: 'No valid image found' });
      setTimeout(() => setPasteStatus(null), 3000);
    } catch (error: any) {
      console.error('Error pasting image:', error);
      const errorMsg = error?.message || 'Failed to paste image';
      setPasteStatus({ fileName, status: 'error', message: errorMsg });
      setTimeout(() => setPasteStatus(null), 5000);
    }
  };

  // Separate images and fonts
  const imageAssets = assets.filter(a => /\.(png|jpg|jpeg|svg)$/i.test(a.fileName));
  const fontAssets = assets.filter(a => /\.(ttf|otf|woff|woff2)$/i.test(a.fileName));
  
  // Filter images based on search
  const filteredImageAssets = useMemo(() => {
    if (!imageSearchFilter.trim()) return imageAssets;
    const searchLower = imageSearchFilter.toLowerCase().trim();
    return imageAssets.filter(asset => {
      const fileNameMatch = asset.fileName.toLowerCase().includes(searchLower);
      const configKeyMatch = asset.configKey?.toLowerCase().includes(searchLower);
      return fileNameMatch || configKeyMatch;
    });
  }, [imageAssets, imageSearchFilter]);

  const getFileExtension = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toUpperCase() || '';
    return ext;
  };

  const getFileName = (fileName: string) => {
    const name = fileName.split('/').pop() || fileName;
    return name;
  };

  const getExtensionColor = (ext: string) => {
    switch (ext.toLowerCase()) {
      case 'png': return 'text-[#2C4A6B]';
      case 'jpg':
      case 'jpeg': return 'text-[#C97D60]';
      case 'svg': return 'text-[#6B7A47]';
      case 'ttf':
      case 'otf': return 'text-[#6B7A47]';
      case 'woff':
      case 'woff2': return 'text-[#D4A574]';
      default: return 'text-[#8A8578]';
    }
  };

  // Colors editor config
  const COLOR_KEYS: Array<{ path: string; label: string; description: string }> = [
    { path: 'itemConfig.itemTextColor', label: 'Item Text', description: 'Unselected list item text color' },
    { path: 'itemConfig.itemSelectedTextColor', label: 'Item Text (Selected)', description: 'Selected list item text color' },
    { path: 'dialogConfig.dialogOptionTextColor', label: 'Dialog Option Text', description: 'Unselected dialog option text color' },
    { path: 'dialogConfig.dialogOptionSelectedTextColor', label: 'Dialog Option Text (Selected)', description: 'Selected dialog option text color' },
    { path: 'dialogConfig.dialogBackgroundColor', label: 'Dialog Background', description: 'Dialog background color' },
    { path: 'dialogConfig.dialogTextColor', label: 'Dialog Text', description: 'General dialog text color' },
    { path: 'menuConfig.menuBackgroundColor', label: 'Menu Background', description: 'Menu background color' },
    { path: 'menuConfig.menuItemTextColor', label: 'Menu Item Text', description: 'Unselected menu item text color' },
    { path: 'menuConfig.menuItemSelectedTextColor', label: 'Menu Item Text (Selected)', description: 'Selected menu item text color' },
    { path: 'homePageConfig.selectedColor', label: 'Home Selected', description: 'Selected home menu item color' },
    { path: 'homePageConfig.unselectedColor', label: 'Home Unselected', description: 'Unselected home menu item color' },
    { path: 'settingConfig.selectedColor', label: 'Settings Selected', description: 'Selected settings item color' },
    { path: 'settingConfig.unselectedColor', label: 'Settings Unselected', description: 'Unselected settings item color' },
    { path: 'statusConfig.statusBarColor', label: 'Status Bar', description: 'Status bar background color' },
    { path: 'playerConfig.progressColor', label: 'Player Progress', description: 'Progress bar fill color' },
    { path: 'playerConfig.progressBackgroundColor', label: 'Player Progress BG', description: 'Progress bar background color' },
  ];
  const isColorString = (val?: string) => !!val && /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(val.trim());
  const readPath = (obj: any, path: string): string | undefined => {
    try {
      return path.split('.').reduce((acc: any, key: string) => (acc ? acc[key] : undefined), obj);
    } catch {
      return undefined;
    }
  };
  const colorEntries = useMemo(() => {
    const entries = COLOR_KEYS.map(k => {
      const value = readPath(spec || {}, k.path);
      return { ...k, value: typeof value === 'string' ? value : '' };
    });
    return entries;
  }, [spec]);

  // Handle theme download
  const handleDownloadTheme = async () => {
    if (!currentTheme) {
      setDownloadStatus({ status: 'error', message: 'Theme data not available' });
      setTimeout(() => setDownloadStatus({ status: 'idle' }), 3000);
      return;
    }

    setDownloadStatus({ status: 'downloading', message: 'Preparing theme package...' });
    
    try {
      await downloadTheme(currentTheme, themeName);
      setDownloadStatus({ status: 'success', message: 'Theme downloaded successfully!' });
      setTimeout(() => setDownloadStatus({ status: 'idle' }), 3000);
    } catch (error) {
      console.error('Download error:', error);
      setDownloadStatus({ status: 'error', message: 'Failed to download theme' });
      setTimeout(() => setDownloadStatus({ status: 'idle' }), 3000);
    }
  };

  // Get export preview info
  const exportPreview = useMemo(() => {
    if (!currentTheme) return null;
    return getExportPreview(currentTheme);
  }, [currentTheme]);

  return (
    <div className="w-80 border-l-2 border-[#3A3530] bg-[#1A1612] flex flex-col z-30 overflow-hidden relative editorial-sidebar" style={{ boxShadow: '-4px 0 12px rgba(0,0,0,0.3)' }}>
      <div className="p-6 border-b-2 border-[#3A3530] bg-[#25201B] relative z-10" style={{ borderBottomStyle: 'solid' }}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-[#D4A574] tracking-tight whitespace-nowrap" style={{ fontFamily: 'var(--font-editorial)' }}>{activeTab === 'assets' ? 'Theme Assets' : activeTab === 'colors' ? 'Theme Colors' : 'Theme Metadata'}</h2>
            <p className="text-[10px] text-[#6B7A47] mt-1 uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono)' }}>{themeName}</p>
            {activeTab === 'assets' ? (
              <p className="text-[10px] text-[#8A8578] mt-1.5" style={{ fontFamily: 'var(--font-mono)' }}>{imageAssets.length} images, {fontAssets.length} fonts</p>
            ) : activeTab === 'colors' ? (
              <p className="text-[10px] text-[#8A8578] mt-1.5" style={{ fontFamily: 'var(--font-mono)' }}>{colorEntries.length} color tokens</p>
            ) : (
              <p className="text-[10px] text-[#8A8578] mt-1.5" style={{ fontFamily: 'var(--font-mono)' }}>Theme credits and information</p>
            )}
          </div>
          <div className="flex items-center gap-1 ml-3">
            <button 
              onClick={() => setShowHelpModal(true)}
              className="p-1.5 hover:bg-[#2F2A25] transition-colors text-[#D4A574] hover:text-[#E8E3D5] rounded-sm flex-shrink-0"
              title="Help & Support"
              style={{ border: '1px solid transparent' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-[#2F2A25] transition-colors text-[#D4A574] hover:text-[#E8E3D5] rounded-sm flex-shrink-0"
              title="Hide sidebar"
              style={{ border: '1px solid transparent' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        {!isEditable && (
          <div className="mb-3 bg-[#C97D60] border-2 border-[#E8A576] p-2.5 rounded-sm" style={{ boxShadow: '2px 2px 0 0 #1A1612' }}>
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-white flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-white uppercase tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Read-Only Theme</p>
                <p className="text-[9px] text-white/90 mt-1" style={{ fontFamily: 'var(--font-body)' }}>This is an installed theme. Clone it from the left sidebar to make it editable.</p>
              </div>
            </div>
          </div>
        )}
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('assets')}
            className={`px-2 py-1 text-[10px] rounded-sm border ${activeTab === 'assets' ? 'bg-[#3A342F] border-[#6B7A47] text-[#E8E3D5]' : 'bg-[#2F2A25] border-[#4A4540] text-[#D4A574]'}`}
            style={{ fontFamily: 'var(--font-mono)' }}
            title="Show assets"
          >Assets</button>
          <button
            onClick={() => setActiveTab('colors')}
            className={`px-2 py-1 text-[10px] rounded-sm border ${activeTab === 'colors' ? 'bg-[#3A342F] border-[#6B7A47] text-[#E8E3D5]' : 'bg-[#2F2A25] border-[#4A4540] text-[#D4A574]'}`}
            style={{ fontFamily: 'var(--font-mono)' }}
            title="Edit colors"
          >Colors</button>
          <button
            onClick={() => setActiveTab('metadata')}
            className={`px-2 py-1 text-[10px] rounded-sm border ${activeTab === 'metadata' ? 'bg-[#3A342F] border-[#6B7A47] text-[#E8E3D5]' : 'bg-[#2F2A25] border-[#4A4540] text-[#D4A574]'}`}
            style={{ fontFamily: 'var(--font-mono)' }}
            title="Edit metadata"
          >Info</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar relative z-10">
        {activeTab === 'colors' && (
          <section className="space-y-4 editorial-section">
            <h3 className="text-[11px] font-bold text-[#D4A574] uppercase tracking-[0.15em] border-b-2 border-[#6B7A47] pb-2 flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)' }}>
              <svg className="w-4 h-4 text-[#6B7A47]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055a9 9 0 106.9 15.9L12 12l-.945-8.945z" />
              </svg>
              Colors ({colorEntries.length})
            </h3>
            <div className="space-y-3 pl-2">
              {colorEntries.map((entry) => {
                const value = entry.value;
                const hasAlpha = isColorString(value) && value.length === 9;
                const rgbValue = isColorString(value) ? (value.length === 9 ? `#${value.slice(3)}` : value) : '#ffffff';
                return (
                  <div key={entry.path} className="border-2 border-[#4A4540] bg-[#2F2A25] hover:border-[#6B7A47] transition-colors" style={{ boxShadow: '2px 2px 0 0 #1A1612' }}>
                    <div className="p-3 flex items-start gap-3">
                      <div className="w-12 h-12 rounded-sm border border-[#4A4540] flex-shrink-0" style={{ backgroundColor: isColorString(value) ? rgbValue : 'transparent' }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="text-xs text-[#E8E3D5] truncate font-medium" style={{ fontFamily: 'var(--font-body)' }}>{entry.label}</span>
                          <span
                            className="text-[9px] font-bold text-[#8A8578] bg-[#1A1612] border border-[#4A4540] px-1.5 py-0.5 truncate whitespace-nowrap overflow-hidden"
                            style={{ fontFamily: 'var(--font-mono)', maxWidth: '220px' }}
                            title={entry.path}
                          >
                            {entry.path}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#8A8578] mt-1.5" style={{ fontFamily: 'var(--font-mono)' }}>{entry.description}</p>
                        <div className="mt-3 flex items-center gap-3 flex-wrap">
                          <input
                            type="text"
                            value={value || ''}
                            onChange={(e) => isEditable && onUpdateColor && onUpdateColor(entry.path, e.target.value)}
                            placeholder="#RRGGBB or #AARRGGBB"
                            disabled={!isEditable}
                            className={`flex-1 bg-[#1A1612] border-2 border-[#4A4540] px-3 py-2 text-xs font-medium focus:outline-none ${
                              isEditable 
                                ? 'text-[#E8E3D5] focus:ring-2 focus:ring-[#6B7A47] focus:border-[#6B7A47]' 
                                : 'text-[#6B6560] cursor-not-allowed opacity-60'
                            }`}
                            style={{ fontFamily: 'var(--font-body)' }}
                            title={!isEditable ? 'Clone this theme to edit colors' : undefined}
                          />
                          <input
                            type="color"
                            value={rgbValue}
                            onChange={(e) => isEditable && onUpdateColor && onUpdateColor(entry.path, e.target.value)}
                            disabled={!isEditable}
                            className={`flex-shrink-0 w-16 h-10 md:w-20 md:h-10 bg-[#1A1612] border-2 border-[#4A4540] rounded-sm ${
                              !isEditable ? 'cursor-not-allowed opacity-60' : ''
                            }`}
                            title={!isEditable ? 'Clone this theme to edit colors' : 'Pick color'}
                          />
                        </div>
                        {hasAlpha && (
                          <p className="text-[10px] text-[#C97D60] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
                            Alpha channel detected; color picker shows RGB only.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
        {/* Metadata Section */}
        {activeTab === 'metadata' && (
          <section className="space-y-4 editorial-section">
            <h3 className="text-[11px] font-bold text-[#D4A574] uppercase tracking-[0.15em] border-b-2 border-[#6B7A47] pb-2 flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)' }}>
              <svg className="w-4 h-4 text-[#6B7A47]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Theme Info
            </h3>
            <div className="space-y-4 pl-2">
              {/* Title */}
              <div className="border-2 border-[#4A4540] bg-[#2F2A25] hover:border-[#6B7A47] transition-colors" style={{ boxShadow: '2px 2px 0 0 #1A1612' }}>
                <div className="p-3 flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-[#D4A574] uppercase tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Theme Title</label>
                  <input
                    type="text"
                    value={(spec as any)?.theme_info?.title || ''}
                    onChange={(e) => isEditable && onUpdateColor && onUpdateColor('theme_info.title', e.target.value)}
                    placeholder="e.g., HoloPebble"
                    disabled={!isEditable}
                    className={`bg-[#1A1612] border-2 border-[#4A4540] px-3 py-2 text-xs font-medium focus:outline-none ${
                      isEditable 
                        ? 'text-[#E8E3D5] focus:ring-2 focus:ring-[#6B7A47] focus:border-[#6B7A47]' 
                        : 'text-[#6B6560] cursor-not-allowed opacity-60'
                    }`}
                    style={{ fontFamily: 'var(--font-body)' }}
                    title={!isEditable ? 'Clone this theme to edit metadata' : undefined}
                  />
                  <p className="text-[10px] text-[#8A8578]" style={{ fontFamily: 'var(--font-mono)' }}>Display name for your theme</p>
                </div>
              </div>

              {/* Author */}
              <div className="border-2 border-[#4A4540] bg-[#2F2A25] hover:border-[#6B7A47] transition-colors" style={{ boxShadow: '2px 2px 0 0 #1A1612' }}>
                <div className="p-3 flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-[#D4A574] uppercase tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Author</label>
                  <input
                    type="text"
                    value={(spec as any)?.theme_info?.author || ''}
                    onChange={(e) => isEditable && onUpdateColor && onUpdateColor('theme_info.author', e.target.value)}
                    placeholder="Your name or pseudonym"
                    disabled={!isEditable}
                    className={`bg-[#1A1612] border-2 border-[#4A4540] px-3 py-2 text-xs font-medium focus:outline-none ${
                      isEditable 
                        ? 'text-[#E8E3D5] focus:ring-2 focus:ring-[#6B7A47] focus:border-[#6B7A47]' 
                        : 'text-[#6B6560] cursor-not-allowed opacity-60'
                    }`}
                    style={{ fontFamily: 'var(--font-body)' }}
                    title={!isEditable ? 'Clone this theme to edit metadata' : undefined}
                  />
                  <p className="text-[10px] text-[#8A8578]" style={{ fontFamily: 'var(--font-mono)' }}>Creator of this theme</p>
                </div>
              </div>

              {/* Author URL */}
              <div className="border-2 border-[#4A4540] bg-[#2F2A25] hover:border-[#6B7A47] transition-colors" style={{ boxShadow: '2px 2px 0 0 #1A1612' }}>
                <div className="p-3 flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-[#D4A574] uppercase tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Author URL</label>
                  <input
                    type="text"
                    value={(spec as any)?.theme_info?.authorUrl || ''}
                    onChange={(e) => isEditable && onUpdateColor && onUpdateColor('theme_info.authorUrl', e.target.value)}
                    placeholder="https://yourwebsite.com"
                    disabled={!isEditable}
                    className={`bg-[#1A1612] border-2 border-[#4A4540] px-3 py-2 text-xs font-medium focus:outline-none ${
                      isEditable 
                        ? 'text-[#E8E3D5] focus:ring-2 focus:ring-[#6B7A47] focus:border-[#6B7A47]' 
                        : 'text-[#6B6560] cursor-not-allowed opacity-60'
                    }`}
                    style={{ fontFamily: 'var(--font-body)' }}
                    title={!isEditable ? 'Clone this theme to edit metadata' : undefined}
                  />
                  <p className="text-[10px] text-[#8A8578]" style={{ fontFamily: 'var(--font-mono)' }}>Portfolio, Reddit post, or donation link</p>
                </div>
              </div>

              {/* Description */}
              <div className="border-2 border-[#4A4540] bg-[#2F2A25] hover:border-[#6B7A47] transition-colors" style={{ boxShadow: '2px 2px 0 0 #1A1612' }}>
                <div className="p-3 flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-[#D4A574] uppercase tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Description</label>
                  <textarea
                    value={(spec as any)?.theme_info?.description || ''}
                    onChange={(e) => isEditable && onUpdateColor && onUpdateColor('theme_info.description', e.target.value)}
                    placeholder="Brief description of your theme's inspiration and features"
                    rows={4}
                    disabled={!isEditable}
                    className={`bg-[#1A1612] border-2 border-[#4A4540] px-3 py-2 text-xs font-medium focus:outline-none resize-none ${
                      isEditable 
                        ? 'text-[#E8E3D5] focus:ring-2 focus:ring-[#6B7A47] focus:border-[#6B7A47]' 
                        : 'text-[#6B6560] cursor-not-allowed opacity-60'
                    }`}
                    style={{ fontFamily: 'var(--font-body)' }}
                    title={!isEditable ? 'Clone this theme to edit metadata' : undefined}
                  />
                  <p className="text-[10px] text-[#8A8578]" style={{ fontFamily: 'var(--font-mono)' }}>What makes this theme special?</p>
                </div>
              </div>

              {/* Download Theme Section */}
              <div className="border-2 border-[#2C4A6B] bg-[#2F2A25] transition-colors" style={{ boxShadow: '2px 2px 0 0 #1A1612' }}>
                <div className="p-3 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#2C4A6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    <label className="text-[10px] font-bold text-[#2C4A6B] uppercase tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Download Theme</label>
                  </div>
                  <p className="text-[10px] text-[#8A8578]" style={{ fontFamily: 'var(--font-mono)' }}>
                    Export this theme as a .zip file compatible with Y1 device
                  </p>
                  
                  {exportPreview && (
                    <div className="bg-[#1A1612] border border-[#4A4540] p-2 rounded-sm space-y-1">
                      <div className="flex items-center justify-between text-[9px]" style={{ fontFamily: 'var(--font-mono)' }}>
                        <span className="text-[#8A8578]">Files:</span>
                        <span className="text-[#E8E3D5]">{exportPreview.files.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-[9px]" style={{ fontFamily: 'var(--font-mono)' }}>
                        <span className="text-[#8A8578]">Assets:</span>
                        <span className="text-[#E8E3D5]">{exportPreview.assetCount}</span>
                      </div>
                      <div className="flex items-center justify-between text-[9px]" style={{ fontFamily: 'var(--font-mono)' }}>
                        <span className="text-[#8A8578]">Est. size:</span>
                        <span className="text-[#E8E3D5]">{exportPreview.totalEstimatedSize}</span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleDownloadTheme}
                    disabled={!currentTheme || downloadStatus.status === 'downloading'}
                    className={`w-full px-4 py-2.5 rounded-sm font-bold text-xs uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${
                      downloadStatus.status === 'downloading'
                        ? 'bg-[#6B6560] cursor-wait text-[#E8E3D5]'
                        : !currentTheme
                        ? 'bg-[#4A4540] cursor-not-allowed text-[#6B6560]'
                        : 'bg-[#2C4A6B] hover:bg-[#3C5A7B] text-white border-2 border-[#3C5A7B]'
                    }`}
                    style={{ fontFamily: 'var(--font-mono)', boxShadow: downloadStatus.status !== 'downloading' && currentTheme ? '2px 2px 0 0 #1A1612' : 'none' }}
                    title={!currentTheme ? 'Theme data not available' : 'Download theme as .zip'}
                  >
                    {downloadStatus.status === 'downloading' ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Preparing...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download .zip
                      </>
                    )}
                  </button>

                  {/* Download status message */}
                  {downloadStatus.status !== 'idle' && downloadStatus.message && (
                    <div className={`p-2 text-xs rounded border-2 ${
                      downloadStatus.status === 'success' 
                        ? 'bg-[#6B7A47] border-[#8A9A67] text-white' 
                        : downloadStatus.status === 'error'
                        ? 'bg-[#C97D60] border-[#D4A574] text-white'
                        : 'bg-[#2C4A6B] border-[#3C5A7B] text-white'
                    }`} style={{ fontFamily: 'var(--font-mono)' }}>
                      {downloadStatus.message}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
        {/* Fonts Section (shown before Images when present) */}
        {activeTab === 'assets' && fontAssets.length > 0 && (
          <section className="space-y-4 editorial-section">
            <h3 className="text-[11px] font-bold text-[#D4A574] uppercase tracking-[0.15em] border-b-2 border-[#6B7A47] pb-2 flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)' }}>
              <svg className="w-4 h-4 text-[#6B7A47]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              Fonts ({fontAssets.length})
            </h3>
            <div className="space-y-3 pl-2">
              {fontAssets.map((asset, idx) => {
                const fileName = getFileName(asset.fileName);
                const ext = getFileExtension(asset.fileName);
                
                return (
                  <div 
                    key={idx} 
                    className="border-2 border-[#4A4540] p-3 bg-[#2F2A25] hover:border-[#6B7A47] transition-colors"
                    style={{ boxShadow: '2px 2px 0 0 #1A1612' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#1A1612] border border-[#4A4540] flex-shrink-0 flex items-center justify-center" style={{ boxShadow: 'inset 1px 1px 2px rgba(0,0,0,0.3)' }}>
                        <span className="text-[#6B7A47] text-sm font-bold" style={{ fontFamily: 'var(--font-editorial)' }}>Aa</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-[#E8E3D5] truncate font-medium" title={fileName} style={{ fontFamily: 'var(--font-body)' }}>
                            {fileName}
                          </span>
                          <span className={`text-[9px] font-bold ${getExtensionColor(ext)} bg-[#1A1612] border border-[#4A4540] px-1.5 py-0.5`} style={{ fontFamily: 'var(--font-mono)' }}>
                            {ext}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#8A8578] mt-1.5" style={{ fontFamily: 'var(--font-mono)' }}>
                          {asset.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Images Section (now after Fonts) */}
        {activeTab === 'assets' && imageAssets.length > 0 && (
          <section className="space-y-4 editorial-section">
            <h3 className="text-[11px] font-bold text-[#D4A574] uppercase tracking-[0.15em] border-b-2 border-[#C97D60] pb-2 flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)' }}>
              <svg className="w-4 h-4 text-[#C97D60]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Images ({filteredImageAssets.length}{imageSearchFilter ? ` of ${imageAssets.length}` : ''})
            </h3>
            <div className="pl-2 mb-3">
              <div className="relative">
                <input
                  type="text"
                  value={imageSearchFilter}
                  onChange={(e) => setImageSearchFilter(e.target.value)}
                  placeholder="Filter by filename or config key..."
                  className="w-full bg-[#1A1612] border-2 border-[#4A4540] px-3 py-2 pr-8 text-xs text-[#E8E3D5] focus:outline-none focus:ring-2 focus:ring-[#C97D60] focus:border-[#C97D60] rounded-sm"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
                {imageSearchFilter && (
                  <button
                    onClick={() => setImageSearchFilter('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[#2F2A25] rounded transition-colors"
                    title="Clear filter"
                  >
                    <svg className="w-4 h-4 text-[#8A8578] hover:text-[#D4A574]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-3 pl-2">
              {filteredImageAssets.map((asset, idx) => {
                const isExpanded = expandedAsset === asset.fileName;
                const fileName = getFileName(asset.fileName);
                const ext = getFileExtension(asset.fileName);
                
                return (
                  <div 
                    key={idx} 
                    className="border-2 border-[#4A4540] overflow-hidden bg-[#2F2A25] hover:border-[#C97D60] transition-colors"
                    style={{ boxShadow: '2px 2px 0 0 #1A1612' }}
                  >
                    <button 
                      onClick={() => setExpandedAsset(isExpanded ? null : asset.fileName)}
                      className="w-full text-left p-3 flex items-start gap-3 hover:bg-[#3A342F] transition-colors"
                    >
                      {/* Thumbnail */}
                      <div className="w-12 h-12 bg-[#1A1612] border border-[#4A4540] flex-shrink-0 overflow-hidden flex items-center justify-center" style={{ boxShadow: 'inset 1px 1px 2px rgba(0,0,0,0.3)' }}>
                        <img 
                          src={asset.url} 
                          alt={fileName}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-[#E8E3D5] truncate font-medium" title={fileName} style={{ fontFamily: 'var(--font-body)' }}>
                            {fileName}
                          </span>
                          <span className={`text-[9px] font-bold ${getExtensionColor(ext)} bg-[#1A1612] border border-[#4A4540] px-1.5 py-0.5`} style={{ fontFamily: 'var(--font-mono)' }}>
                            {ext}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#8A8578] mt-1.5 line-clamp-2" style={{ fontFamily: 'var(--font-mono)' }}>
                          {asset.description}
                        </p>
                      </div>

                      {/* Expand indicator */}
                      <svg 
                        className={`w-4 h-4 text-[#8A8578] flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Expanded view */}
                    {isExpanded && (
                      <div className="border-t-2 border-[#4A4540] p-4 bg-[#25201B]">
                        <div className="bg-[#1A1612] border-2 border-[#4A4540] p-3 flex items-center justify-center mb-3 relative" style={{ boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.3)' }}>
                          <img 
                            src={asset.url} 
                            alt={fileName}
                            className="max-w-full max-h-32 object-contain"
                          />
                            {/* Copy and Paste buttons overlay */}
                            <div className="absolute top-2 right-2 flex gap-2">
                              <button
                                onClick={() => handleCopyImage(asset.fileName, asset.url)}
                                className="p-2 bg-[#2C4A6B] hover:bg-[#3C5A7B] text-white rounded transition-colors"
                                title="Copy image to clipboard"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                              {isEditable && (
                                <>
                                  <button
                                    onClick={() => handlePasteImage(asset.fileName)}
                                    className="p-2 bg-[#6B7A47] hover:bg-[#8A9A67] text-white rounded transition-colors"
                                    title="Paste image from clipboard (Ctrl/Cmd+V)"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                  </button>
                                  {asset.configKey && availableThemes.length > 0 && (
                                    <button
                                      onClick={() => {
                                        setSelectedAssetForReplace(asset);
                                        setReplaceModalOpen(true);
                                      }}
                                      className="p-2 bg-[#C97D60] hover:bg-[#D4A574] text-white rounded transition-colors"
                                      title="Replace with equivalent image from another theme"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                      </svg>
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                        </div>
                          {/* Copy status message */}
                          {copyStatus && copyStatus.fileName === asset.fileName && (
                            <div className={`mb-3 p-2 text-xs rounded border-2 ${
                              copyStatus.status === 'success' 
                                ? 'bg-[#2C4A6B] border-[#3C5A7B] text-white' 
                                : 'bg-[#C97D60] border-[#D4A574] text-white'
                            }`} style={{ fontFamily: 'var(--font-mono)' }}>
                              {copyStatus.message}
                            </div>
                          )}
                          {/* Paste status message */}
                        {pasteStatus && pasteStatus.fileName === asset.fileName && (
                          <div className={`mb-3 p-2 text-xs rounded border-2 ${
                            pasteStatus.status === 'success' 
                              ? 'bg-[#6B7A47] border-[#8A9A67] text-white' 
                              : 'bg-[#C97D60] border-[#D4A574] text-white'
                          }`} style={{ fontFamily: 'var(--font-mono)' }}>
                            {pasteStatus.message}
                          </div>
                        )}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-[#D4A574] uppercase font-bold" style={{ fontFamily: 'var(--font-mono)' }}>File:</span>
                            <span className="text-[10px] text-[#8A8578] font-mono truncate">{asset.fileName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-[#D4A574] uppercase font-bold" style={{ fontFamily: 'var(--font-mono)' }}>Config:</span>
                            <span className="text-[10px] text-[#8A8578] font-mono">{asset.configKey}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-[9px] text-[#D4A574] uppercase font-bold" style={{ fontFamily: 'var(--font-mono)' }}>Purpose:</span>
                            <span className="text-[10px] text-[#8A8578]" style={{ fontFamily: 'var(--font-body)' }}>{asset.description}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Empty state */}
        {activeTab === 'assets' && assets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <svg className="w-14 h-14 text-[#4A4540] mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-[#D4A574] text-sm font-medium mb-1" style={{ fontFamily: 'var(--font-body)' }}>No assets loaded</p>
            <p className="text-[#8A8578] text-xs" style={{ fontFamily: 'var(--font-mono)' }}>This theme has no image or font files</p>
          </div>
        )}
      </div>

      {/* Replacement Modal */}
      {selectedAssetForReplace && (
        <EquivalentImagesModal
          isOpen={replaceModalOpen}
          onClose={() => {
            setReplaceModalOpen(false);
            setSelectedAssetForReplace(null);
          }}
          onSelect={(themeId: string, fileName: string) => {
            // Find the theme and asset
            const sourceTheme = availableThemes.find(t => t.id === themeId);
            if (sourceTheme && selectedAssetForReplace && onUpdateAsset) {
              const sourceAsset = sourceTheme.loadedAssets.find(a => a.fileName === fileName);
              if (sourceAsset) {
                onUpdateAsset(selectedAssetForReplace.fileName, sourceAsset.url);
                setPasteStatus({
                  fileName: selectedAssetForReplace.fileName,
                  status: 'success',
                  message: `Image replaced from ${themeId}`
                });
                setTimeout(() => setPasteStatus(null), 3000);
              }
            }
            setReplaceModalOpen(false);
            setSelectedAssetForReplace(null);
          }}
          currentThemeName={themeName}
          currentImageFileName={selectedAssetForReplace.fileName}
          currentImageConfigKey={selectedAssetForReplace.configKey}
          availableThemes={availableThemes}
        />
      )}

      {/* Help & Support Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowHelpModal(false)}>
          <div className="bg-[#1A1612] border-2 border-[#D4A574] rounded-sm p-6 max-w-md w-full mx-4" style={{ boxShadow: '4px 4px 0 0 #000000' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-[#D4A574]" style={{ fontFamily: 'var(--font-editorial)' }}>Help & Support</h3>
                <p className="text-[10px] text-[#8A8578] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>Need help? Reach out!</p>
              </div>
              <button 
                onClick={() => setShowHelpModal(false)}
                className="p-1 hover:bg-[#2F2A25] transition-colors text-[#D4A574] hover:text-[#E8E3D5] rounded-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <a 
                href="https://github.com/karliky" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-[#2F2A25] hover:bg-[#3A342F] border-2 border-[#4A4540] hover:border-[#6B7A47] transition-colors rounded-sm group"
                style={{ boxShadow: '2px 2px 0 0 #000000' }}
              >
                <svg className="w-6 h-6 text-[#D4A574] group-hover:text-[#E8E3D5] transition-colors" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-xs font-bold text-[#E8E3D5]" style={{ fontFamily: 'var(--font-body)' }}>GitHub</p>
                  <p className="text-[10px] text-[#8A8578]" style={{ fontFamily: 'var(--font-mono)' }}>@karliky</p>
                </div>
                <svg className="w-4 h-4 text-[#8A8578] group-hover:text-[#D4A574] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>

              <a 
                href="https://x.com/k4rliky" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-[#2F2A25] hover:bg-[#3A342F] border-2 border-[#4A4540] hover:border-[#6B7A47] transition-colors rounded-sm group"
                style={{ boxShadow: '2px 2px 0 0 #000000' }}
              >
                <svg className="w-6 h-6 text-[#D4A574] group-hover:text-[#E8E3D5] transition-colors" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <div className="flex-1">
                  <p className="text-xs font-bold text-[#E8E3D5]" style={{ fontFamily: 'var(--font-body)' }}>Twitter / X</p>
                  <p className="text-[10px] text-[#8A8578]" style={{ fontFamily: 'var(--font-mono)' }}>Send me a DM</p>
                </div>
                <svg className="w-4 h-4 text-[#8A8578] group-hover:text-[#D4A574] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>

              <a 
                href="https://www.reddit.com/user/karliky/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-[#2F2A25] hover:bg-[#3A342F] border-2 border-[#4A4540] hover:border-[#6B7A47] transition-colors rounded-sm group"
                style={{ boxShadow: '2px 2px 0 0 #000000' }}
              >
                <svg className="w-6 h-6 text-[#D4A574] group-hover:text-[#E8E3D5] transition-colors" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
                </svg>
                <div className="flex-1">
                  <p className="text-xs font-bold text-[#E8E3D5]" style={{ fontFamily: 'var(--font-body)' }}>Reddit</p>
                  <p className="text-[10px] text-[#8A8578]" style={{ fontFamily: 'var(--font-mono)' }}>Send me a message</p>
                </div>
                <svg className="w-4 h-4 text-[#8A8578] group-hover:text-[#D4A574] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>

              <div 
                className="flex items-center gap-3 p-3 bg-[#2F2A25] border-2 border-[#4A4540] rounded-sm"
                style={{ boxShadow: '2px 2px 0 0 #000000' }}
              >
                <svg className="w-6 h-6 text-[#D4A574]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
                </svg>
                <div className="flex-1">
                  <p className="text-xs font-bold text-[#E8E3D5]" style={{ fontFamily: 'var(--font-body)' }}>Discord</p>
                  <p className="text-[10px] text-[#8A8578]" style={{ fontFamily: 'var(--font-mono)' }}>karliky</p>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-[#2F2A25] border border-[#4A4540] rounded-sm">
              <p className="text-[10px] text-[#8A8578]" style={{ fontFamily: 'var(--font-mono)' }}>
                💡 Found a bug or have a feature request? Open an issue on GitHub!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageAssetsSidebar;
