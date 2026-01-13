import React, { useMemo, useState } from 'react';
import { ThemeAssetInfo, LoadedTheme } from '../types';
import EquivalentImagesModal from './EquivalentImagesModal';
import { downloadTheme, getExportPreview } from '../utils/themeExport';
import { Tooltip } from './Tooltip';

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
  const [imageSearchFilter, setImageSearchFilter] = useState('');
  const [colorSearchFilter, setColorSearchFilter] = useState('');
  const [selectedImageTags, setSelectedImageTags] = useState<string[]>([]);

  // Function to determine tags for an asset based on its config key
  const getImageTags = (configKey: string): string[] => {
    const key = configKey.toLowerCase();
    const tags: string[] = [];

    // Wallpapers
    if (key.includes('wallpaper')) {
      tags.push('Wallpapers');
    }

    // UI Elements
    if (key.includes('itemconfig') || key.includes('dialogconfig') || key.includes('menuconfig')) {
      if (key.includes('background') || key.includes('arrow')) {
        tags.push('UI Elements');
      }
    }

    // Status Icons
    if (key.includes('statusconfig') || key.includes('battery') || key.includes('charging')) {
      tags.push('Status Icons');
    }

    // Home Menu Icons
    if (key.includes('homepageconfig')) {
      tags.push('Home Menu');
    }

    // Settings Icons
    if (key.includes('settingconfig') && !key.includes('wallpaper')) {
      tags.push('Settings Icons');
    }

    // File Icons
    if (key.includes('fileconfig')) {
      tags.push('File Icons');
    }

    // Covers & Masks
    if (key.includes('cover') || key.includes('mask')) {
      tags.push('Cover & Mask');
    }

    return tags.length > 0 ? tags : ['Other'];
  };

  const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Failed to read image data'));
    reader.readAsDataURL(blob);
  });

  // Handle keyboard copy (Ctrl+C / Cmd+C) and paste (Ctrl+V / Cmd+V)
  React.useEffect(() => {
    const handleSearchAssetSelected = (event: CustomEvent<{ type: 'image' | 'color' | 'metadata'; id: string; configKey?: string }>) => {
      const { type, id, configKey } = event.detail;
      
      if (type === 'image') {
        setActiveTab('assets');
        setExpandedAsset(id);
        // Scroll to element after a brief delay to ensure DOM is updated
        setTimeout(() => {
          const element = document.getElementById(`asset-${id}`);
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      } else if (type === 'color') {
        setActiveTab('colors');
        // Scroll to color item
        setTimeout(() => {
          const element = document.getElementById(`color-${id}`);
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      } else if (type === 'metadata') {
        setActiveTab('metadata');
        // Scroll to metadata item
        setTimeout(() => {
          const element = document.getElementById(`metadata-${id}`);
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    };

    window.addEventListener('searchAssetSelected', handleSearchAssetSelected as EventListener);
    return () => window.removeEventListener('searchAssetSelected', handleSearchAssetSelected as EventListener);
  }, []);

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
  
  // Get all unique tags from image assets
  const allImageTags = useMemo(() => {
    const tags = new Set<string>();
    imageAssets.forEach(asset => {
      getImageTags(asset.configKey || '').forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [imageAssets]);

  // Filter images based on search and tags
  const filteredImageAssets = useMemo(() => {
    let filtered = imageAssets;

    // Apply search filter
    if (imageSearchFilter.trim()) {
      const searchLower = imageSearchFilter.toLowerCase().trim();
      filtered = filtered.filter(asset => {
        const fileNameMatch = asset.fileName.toLowerCase().includes(searchLower);
        const configKeyMatch = asset.configKey?.toLowerCase().includes(searchLower);
        return fileNameMatch || configKeyMatch;
      });
    }

    // Apply tag filter
    if (selectedImageTags.length > 0) {
      filtered = filtered.filter(asset => {
        const assetTags = getImageTags(asset.configKey || '');
        return selectedImageTags.some(tag => assetTags.includes(tag));
      });
    }

    return filtered;
  }, [imageAssets, imageSearchFilter, selectedImageTags]);

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
      case 'woff2': return 'text-[#C0C0C0]';
      default: return 'text-[#999999]';
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

  // Filter colors based on search
  const filteredColorEntries = useMemo(() => {
    if (!colorSearchFilter.trim()) return colorEntries;
    const searchLower = colorSearchFilter.toLowerCase().trim();
    return colorEntries.filter(entry => {
      const labelMatch = entry.label.toLowerCase().includes(searchLower);
      const pathMatch = entry.path.toLowerCase().includes(searchLower);
      const descriptionMatch = entry.description.toLowerCase().includes(searchLower);
      return labelMatch || pathMatch || descriptionMatch;
    });
  }, [colorEntries, colorSearchFilter]);

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
    <div className="w-80 border-l border-[#3A3A3A] bg-[#2D2D2D] flex flex-col z-30 overflow-hidden relative editorial-sidebar" style={{ boxShadow: '-2px 0 8px rgba(0,0,0,0.5)' }}>
      <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar relative z-10">
        {/* Section Title */}
        <section className="space-y-4 editorial-section">
          <h3 className="text-[11px] font-bold text-[#C0C0C0] uppercase tracking-[0.15em] border-b border-[#3C7FD5] pb-2 flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)' }}>
            <svg className="w-4 h-4 text-[#3C7FD5] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="truncate" title={themeName}>{themeName}</span>
          </h3>
        </section>

        {/* Read-Only Warning - Shown at top of content */}
        {!isEditable && (
          <div className="bg-[#3A3A3A] border border-[#4A4A4A] p-2.5 rounded-sm">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-[#999999] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-[#C0C0C0] uppercase tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Read-Only Theme</p>
                <p className="text-[9px] text-[#999999] mt-1" style={{ fontFamily: 'var(--font-body)' }}>Clone this theme to make it editable.</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Tab Navigation */}
        <div className="flex gap-1">
          <Tooltip content="Show assets">
            <button
              onClick={() => setActiveTab('assets')}
              className={`px-2 py-1 text-[10px] rounded-sm border ${activeTab === 'assets' ? 'bg-[#3C7FD5] border-[#5A9FFF] text-white' : 'bg-[#3A3A3A] border-[#4A4A4A] text-[#999999]'}`}
              style={{ fontFamily: 'var(--font-mono)' }}
            >Assets</button>
          </Tooltip>
          <Tooltip content="Edit colors">
            <button
              onClick={() => setActiveTab('colors')}
              className={`px-2 py-1 text-[10px] rounded-sm border ${activeTab === 'colors' ? 'bg-[#3C7FD5] border-[#5A9FFF] text-white' : 'bg-[#3A3A3A] border-[#4A4A4A] text-[#999999]'}`}
              style={{ fontFamily: 'var(--font-mono)' }}
            >Colors</button>
          </Tooltip>
          <Tooltip content="Edit metadata">
            <button
              onClick={() => setActiveTab('metadata')}
              className={`px-2 py-1 text-[10px] rounded-sm border ${activeTab === 'metadata' ? 'bg-[#3C7FD5] border-[#5A9FFF] text-white' : 'bg-[#3A3A3A] border-[#4A4A4A] text-[#999999]'}`}
              style={{ fontFamily: 'var(--font-mono)' }}
            >Info</button>
          </Tooltip>
        </div>

        {activeTab === 'colors' && (
          <section className="space-y-4 editorial-section">
            <h3 className="text-[11px] font-bold text-[#C0C0C0] uppercase tracking-[0.15em] border-b border-[#3C7FD5] pb-2 flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)' }}>
              <svg className="w-4 h-4 text-[#3C7FD5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055a9 9 0 106.9 15.9L12 12l-.945-8.945z" />
              </svg>
              Colors ({filteredColorEntries.length}{colorSearchFilter ? ` of ${colorEntries.length}` : ''})
            </h3>
            <div className="pl-2 mb-3">
              <div className="relative">
                <input
                  type="text"
                  value={colorSearchFilter}
                  onChange={(e) => setColorSearchFilter(e.target.value)}
                  placeholder="Filter by name or config key..."
                  className="w-full bg-[#3A3A3A] border border-[#4A4A4A] px-3 py-2 pr-8 text-xs text-[#CCCCCC] focus:outline-none focus:ring-2 focus:ring-[#3C7FD5] focus:border-[#3C7FD5] rounded-sm"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
                {colorSearchFilter && (
                  <Tooltip content="Clear filter">
                    <button
                      onClick={() => setColorSearchFilter('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[#404040] rounded transition-colors"
                    >
                      <svg className="w-4 h-4 text-[#999999] hover:text-[#C0C0C0]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </Tooltip>
                )}
              </div>
            </div>
            <div className="space-y-3 pl-2">
              {filteredColorEntries.map((entry) => {
                const value = entry.value;
                const hasAlpha = isColorString(value) && value.length === 9;
                const rgbValue = isColorString(value) ? (value.length === 9 ? `#${value.slice(3)}` : value) : '#ffffff';
                return (
                  <div key={entry.path} id={`color-${entry.path}`} className="border border-[#4A4A4A] bg-[#3A3A3A] hover:border-[#3C7FD5] transition-colors">
                    <div className="p-3 flex items-start gap-3">
                      <div className="w-12 h-12 rounded-sm border border-[#4A4A4A] flex-shrink-0" style={{ backgroundColor: isColorString(value) ? rgbValue : 'transparent' }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="text-xs text-[#CCCCCC] truncate font-medium" style={{ fontFamily: 'var(--font-body)' }}>{entry.label}</span>
                          <span
                            className="text-[9px] font-bold text-[#999999] bg-[#3A3A3A] border border-[#4A4A4A] px-1.5 py-0.5 truncate whitespace-nowrap overflow-hidden"
                            style={{ fontFamily: 'var(--font-mono)', maxWidth: '220px' }}
                            title={entry.path}
                          >
                            {entry.path}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#999999] mt-1.5" style={{ fontFamily: 'var(--font-mono)' }}>{entry.description}</p>
                        <div className="mt-3 flex items-center gap-3 flex-wrap">
                          <input
                            type="text"
                            value={value || ''}
                            onChange={(e) => isEditable && onUpdateColor && onUpdateColor(entry.path, e.target.value)}
                            placeholder="#RRGGBB or #AARRGGBB"
                            disabled={!isEditable}
                            className={`flex-1 bg-[#3A3A3A] border border-[#4A4A4A] px-3 py-2 text-xs font-medium focus:outline-none ${
                            isEditable
                                ? 'text-[#CCCCCC] focus:ring-2 focus:ring-[#3C7FD5] focus:border-[#3C7FD5]'
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
                            className={`flex-shrink-0 w-16 h-10 md:w-20 md:h-10 bg-[#3A3A3A] border border-[#4A4A4A] rounded-sm ${
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
            <h3 className="text-[11px] font-bold text-[#C0C0C0] uppercase tracking-[0.15em] border-b border-[#3C7FD5] pb-2 flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)' }}>
              <svg className="w-4 h-4 text-[#3C7FD5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Theme Info
            </h3>
            <div className="space-y-4 pl-2">
              {/* Title */}
              <div id="metadata-title" className="border-2 border-[#4A4540] bg-[#2F2A25] hover:border-[#6B7A47] transition-colors" style={{ boxShadow: '2px 2px 0 0 #1A1612' }}>
                <div className="p-3 flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-[#C0C0C0] uppercase tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Theme Title</label>
                  <input
                    type="text"
                    value={(spec as any)?.theme_info?.title || ''}
                    onChange={(e) => isEditable && onUpdateColor && onUpdateColor('theme_info.title', e.target.value)}
                    placeholder="e.g., HoloPebble"
                    disabled={!isEditable}
                    className={`bg-[#3A3A3A] border border-[#4A4A4A] px-3 py-2 text-xs font-medium focus:outline-none ${
                    isEditable
                        ? 'text-[#CCCCCC] focus:ring-2 focus:ring-[#3C7FD5] focus:border-[#3C7FD5]'
                        : 'text-[#6B6560] cursor-not-allowed opacity-60'
                    }`}
                    style={{ fontFamily: 'var(--font-body)' }}
                    title={!isEditable ? 'Clone this theme to edit metadata' : undefined}
                  />
                  <p className="text-[10px] text-[#999999]" style={{ fontFamily: 'var(--font-mono)' }}>Display name for your theme</p>
                </div>
              </div>

              {/* Author */}
              <div id="metadata-author" className="border border-[#4A4A4A] bg-[#3A3A3A] transition-colors">
                <div className="p-3 flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-[#C0C0C0] uppercase tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Author</label>
                  <input
                    type="text"
                    value={(spec as any)?.theme_info?.author || ''}
                    onChange={(e) => isEditable && onUpdateColor && onUpdateColor('theme_info.author', e.target.value)}
                    placeholder="Your name or pseudonym"
                    disabled={!isEditable}
                    className={`bg-[#3A3A3A] border border-[#4A4A4A] px-3 py-2 text-xs font-medium focus:outline-none ${
                      isEditable 
                        ? 'text-[#CCCCCC] focus:ring-2 focus:ring-[#3C7FD5] focus:border-[#3C7FD5]' 
                        : 'text-[#6B6560] cursor-not-allowed opacity-60'
                    }`}
                    style={{ fontFamily: 'var(--font-body)' }}
                    title={!isEditable ? 'Clone this theme to edit metadata' : undefined}
                  />
                  <p className="text-[10px] text-[#999999]" style={{ fontFamily: 'var(--font-mono)' }}>Creator of this theme</p>
                </div>
              </div>

              {/* Author URL */}
              <div id="metadata-authorUrl" className="border border-[#4A4A4A] bg-[#3A3A3A] transition-colors">
                <div className="p-3 flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-[#C0C0C0] uppercase tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Author URL</label>
                  <input
                    type="text"
                    value={(spec as any)?.theme_info?.authorUrl || ''}
                    onChange={(e) => isEditable && onUpdateColor && onUpdateColor('theme_info.authorUrl', e.target.value)}
                    placeholder="https://yourwebsite.com"
                    disabled={!isEditable}
                    className={`bg-[#3A3A3A] border border-[#4A4A4A] px-3 py-2 text-xs font-medium focus:outline-none ${
                      isEditable 
                        ? 'text-[#CCCCCC] focus:ring-2 focus:ring-[#3C7FD5] focus:border-[#3C7FD5]' 
                        : 'text-[#6B6560] cursor-not-allowed opacity-60'
                    }`}
                    style={{ fontFamily: 'var(--font-body)' }}
                    title={!isEditable ? 'Clone this theme to edit metadata' : undefined}
                  />
                  <p className="text-[10px] text-[#999999]" style={{ fontFamily: 'var(--font-mono)' }}>Portfolio, Reddit post, or donation link</p>
                </div>
              </div>

              {/* Description */}
              <div id="metadata-description" className="border border-[#4A4A4A] bg-[#3A3A3A] transition-colors">
                <div className="p-3 flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-[#C0C0C0] uppercase tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Description</label>
                  <textarea
                    value={(spec as any)?.theme_info?.description || ''}
                    onChange={(e) => isEditable && onUpdateColor && onUpdateColor('theme_info.description', e.target.value)}
                    placeholder="Brief description of your theme's inspiration and features"
                    rows={4}
                    disabled={!isEditable}
                    className={`bg-[#3A3A3A] border border-[#4A4A4A] px-3 py-2 text-xs font-medium focus:outline-none resize-none ${
                      isEditable 
                        ? 'text-[#CCCCCC] focus:ring-2 focus:ring-[#3C7FD5] focus:border-[#3C7FD5]' 
                        : 'text-[#6B6560] cursor-not-allowed opacity-60'
                    }`}
                    style={{ fontFamily: 'var(--font-body)' }}
                    title={!isEditable ? 'Clone this theme to edit metadata' : undefined}
                  />
                  <p className="text-[10px] text-[#999999]" style={{ fontFamily: 'var(--font-mono)' }}>What makes this theme special?</p>
                </div>
              </div>

              {/* Download Theme Section */}
              <div className="border border-[#4A4A4A] bg-[#3A3A3A] transition-colors">
                <div className="p-3 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#3C7FD5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    <label className="text-[10px] font-bold text-[#3C7FD5] uppercase tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>Download Theme</label>
                  </div>
                  <p className="text-[10px] text-[#999999]" style={{ fontFamily: 'var(--font-mono)' }}>
                    Export this theme as a .zip file compatible with Y1 device
                  </p>
                  
                  {exportPreview && (
                    <div className="bg-[#2D2D2D] border border-[#4A4A4A] p-2 rounded-sm space-y-1">
                      <div className="flex items-center justify-between text-[9px]" style={{ fontFamily: 'var(--font-mono)' }}>
                        <span className="text-[#999999]">Files:</span>
                        <span className="text-[#CCCCCC]">{exportPreview.files.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-[9px]" style={{ fontFamily: 'var(--font-mono)' }}>
                        <span className="text-[#999999]">Assets:</span>
                        <span className="text-[#CCCCCC]">{exportPreview.assetCount}</span>
                      </div>
                      <div className="flex items-center justify-between text-[9px]" style={{ fontFamily: 'var(--font-mono)' }}>
                        <span className="text-[#999999]">Est. size:</span>
                        <span className="text-[#CCCCCC]">{exportPreview.totalEstimatedSize}</span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleDownloadTheme}
                    disabled={!currentTheme || downloadStatus.status === 'downloading'}
                    className={`w-full px-4 py-2.5 rounded-sm font-bold text-xs uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${
                      downloadStatus.status === 'downloading'
                        ? 'bg-[#4A4A4A] cursor-wait text-[#CCCCCC]'
                        : !currentTheme
                        ? 'bg-[#3A3A3A] cursor-not-allowed text-[#666666]'
                        : 'bg-[#3C7FD5] hover:bg-[#4A8FE5] text-white border border-[#4A8FE5]'
                    }`}
                    style={{ fontFamily: 'var(--font-mono)' }}
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
            <h3 className="text-[11px] font-bold text-[#C0C0C0] uppercase tracking-[0.15em] border-b border-[#3C7FD5] pb-2 flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)' }}>
              <svg className="w-4 h-4 text-[#3C7FD5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
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
                    className="border border-[#4A4A4A] p-3 bg-[#3A3A3A] hover:border-[#3C7FD5] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#2D2D2D] border border-[#4A4A4A] flex-shrink-0 flex items-center justify-center" style={{ boxShadow: 'inset 1px 1px 2px rgba(0,0,0,0.3)' }}>
                        <span className="text-[#3C7FD5] text-sm font-bold" style={{ fontFamily: 'var(--font-editorial)' }}>Aa</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-[#CCCCCC] truncate font-medium" title={fileName} style={{ fontFamily: 'var(--font-body)' }}>
                            {fileName}
                          </span>
                          <span className={`text-[9px] font-bold ${getExtensionColor(ext)} bg-[#2D2D2D] border border-[#4A4A4A] px-1.5 py-0.5`} style={{ fontFamily: 'var(--font-mono)' }}>
                            {ext}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#999999] mt-1.5" style={{ fontFamily: 'var(--font-mono)' }}>
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
            <h3 className="text-[11px] font-bold text-[#C0C0C0] uppercase tracking-[0.15em] border-b border-[#3C7FD5] pb-2 flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)' }}>
              <svg className="w-4 h-4 text-[#3C7FD5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
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
                  className="w-full bg-[#3A3A3A] border border-[#4A4A4A] px-3 py-2 pr-8 text-xs text-[#CCCCCC] focus:outline-none focus:ring-2 focus:ring-[#3C7FD5] focus:border-[#3C7FD5] rounded-sm"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
                {imageSearchFilter && (
                  <Tooltip content="Clear filter">
                    <button
                      onClick={() => setImageSearchFilter('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[#404040] rounded transition-colors"
                    >
                      <svg className="w-4 h-4 text-[#999999] hover:text-[#C0C0C0]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </Tooltip>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  onClick={() => setSelectedImageTags([])}
                  className={`px-3 py-2 text-[10px] rounded-sm border transition-colors font-medium ${
                    selectedImageTags.length === 0
                      ? 'bg-[#3C7FD5] border-[#5A9FFF] text-white'
                      : 'bg-[#3A3A3A] border-[#4A4A4A] text-[#999999] hover:border-[#3C7FD5]'
                  }`}
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  All
                </button>
                {allImageTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSelectedImageTags(selectedImageTags.includes(tag) ? [] : [tag]);
                    }}
                    className={`px-3 py-2 text-[10px] rounded-sm border transition-colors font-medium ${
                      selectedImageTags.includes(tag)
                        ? 'bg-[#3C7FD5] border-[#5A9FFF] text-white'
                        : 'bg-[#3A3A3A] border-[#4A4A4A] text-[#999999] hover:border-[#3C7FD5]'
                    }`}
                    style={{ fontFamily: 'var(--font-mono)' }}
                    title={`Filter by ${tag}`}
                  >
                    {tag}
                  </button>
                ))}
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
                    id={`asset-${asset.fileName}`}
                    className="border border-[#4A4A4A] overflow-hidden bg-[#3A3A3A] hover:border-[#3C7FD5] transition-colors"
                  >
                    <button 
                      onClick={() => setExpandedAsset(isExpanded ? null : asset.fileName)}
                      className="w-full text-left p-3 flex items-start gap-3 hover:bg-[#404040] transition-colors"
                    >
                      {/* Thumbnail */}
                      <div className="w-12 h-12 bg-[#2D2D2D] border border-[#4A4A4A] flex-shrink-0 overflow-hidden flex items-center justify-center" style={{ boxShadow: 'inset 1px 1px 2px rgba(0,0,0,0.3)' }}>
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
                          <span className="text-xs text-[#CCCCCC] truncate font-medium" title={fileName} style={{ fontFamily: 'var(--font-body)' }}>
                            {fileName}
                          </span>
                          <span className={`text-[9px] font-bold ${getExtensionColor(ext)} bg-[#2D2D2D] border border-[#4A4A4A] px-1.5 py-0.5`} style={{ fontFamily: 'var(--font-mono)' }}>
                            {ext}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#999999] mt-1.5 line-clamp-2" style={{ fontFamily: 'var(--font-mono)' }}>
                          {asset.description}
                        </p>
                      </div>

                      {/* Expand indicator */}
                      <svg 
                        className={`w-4 h-4 text-[#999999] flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
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
                      <div className="border-t border-[#4A4A4A] p-4 bg-[#2D2D2D]">
                        <div className="bg-[#2D2D2D] border border-[#4A4A4A] p-3 flex items-center justify-center mb-3 relative" style={{ boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.3)' }}>
                          <img 
                            src={asset.url} 
                            alt={fileName}
                            className="max-w-full max-h-32 object-contain"
                          />
                            {/* Copy and Paste buttons overlay */}
                            <div className="absolute top-2 right-2 flex gap-2">
                              <Tooltip content="Copy image to clipboard">
                                <button
                                  onClick={() => handleCopyImage(asset.fileName, asset.url)}
                                  className="p-2 bg-[#3C7FD5] hover:bg-[#4A8FE5] text-white rounded transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              </Tooltip>
                              {isEditable && (
                                <>
                                  <Tooltip content="Paste image from clipboard (Ctrl/Cmd+V)">
                                    <button
                                      onClick={() => handlePasteImage(asset.fileName)}
                                      className="p-2 bg-[#5A9FFF] hover:bg-[#6AAFFF] text-white rounded transition-colors"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                      </svg>
                                    </button>
                                  </Tooltip>
                                  {asset.configKey && availableThemes.length > 0 && (
                                    <Tooltip content="Replace with equivalent image from another theme">
                                      <button
                                        onClick={() => {
                                          setSelectedAssetForReplace(asset);
                                          setReplaceModalOpen(true);
                                        }}
                                        className="p-2 bg-[#7FB8FF] hover:bg-[#8FC8FF] text-white rounded transition-colors"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                      </button>
                                    </Tooltip>
                                  )}
                                </>
                              )}
                            </div>
                        </div>
                          {/* Copy status message */}
                          {copyStatus && copyStatus.fileName === asset.fileName && (
                            <div className={`mb-3 p-2 text-xs rounded border ${
                              copyStatus.status === 'success' 
                                ? 'bg-[#3C7FD5] border-[#5A9FFF] text-white' 
                                : 'bg-[#CC5544] border-[#DD6655] text-white'
                            }`} style={{ fontFamily: 'var(--font-mono)' }}>
                              {copyStatus.message}
                            </div>
                          )}
                          {/* Paste status message */}
                        {pasteStatus && pasteStatus.fileName === asset.fileName && (
                          <div className={`mb-3 p-2 text-xs rounded border ${
                            pasteStatus.status === 'success' 
                              ? 'bg-[#5A9FFF] border-[#6AAFFF] text-white' 
                              : 'bg-[#CC5544] border-[#DD6655] text-white'
                          }`} style={{ fontFamily: 'var(--font-mono)' }}>
                            {pasteStatus.message}
                          </div>
                        )}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-[#C0C0C0] uppercase font-bold" style={{ fontFamily: 'var(--font-mono)' }}>File:</span>
                            <span className="text-[10px] text-[#999999] font-mono truncate">{asset.fileName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-[#C0C0C0] uppercase font-bold" style={{ fontFamily: 'var(--font-mono)' }}>Config:</span>
                            <span className="text-[10px] text-[#999999] font-mono">{asset.configKey}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-[9px] text-[#C0C0C0] uppercase font-bold" style={{ fontFamily: 'var(--font-mono)' }}>Purpose:</span>
                            <span className="text-[10px] text-[#999999]" style={{ fontFamily: 'var(--font-body)' }}>{asset.description}</span>
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
            <svg className="w-14 h-14 text-[#4A4A4A] mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-[#C0C0C0] text-sm font-medium mb-1" style={{ fontFamily: 'var(--font-body)' }}>No assets loaded</p>
            <p className="text-[#999999] text-xs" style={{ fontFamily: 'var(--font-mono)' }}>This theme has no image or font files</p>
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


    </div>
  );
};

export default ImageAssetsSidebar;
