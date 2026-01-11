import JSZip from 'jszip';
import { LoadedTheme } from '../types';

/**
 * Convert the simulator's ThemeSpec to Y1 device config.json format
 * Based on docs/theme_manifest.json specification
 */
function convertToY1Config(spec: any): any {
  const config: any = {};
  
  // Extract top-level properties that map directly
  if (spec.themeCover) config.themeCover = spec.themeCover;
  if (spec.desktopWallpaper) config.desktopWallpaper = spec.desktopWallpaper;
  if (spec.globalWallpaper) config.globalWallpaper = spec.globalWallpaper;
  if (spec.desktopMask) config.desktopMask = spec.desktopMask;
  if (spec.fontFamily) config.fontFamily = spec.fontFamily;
  
  // Handle nested config objects
  if (spec.itemConfig) config.itemConfig = { ...spec.itemConfig };
  if (spec.dialogConfig) config.dialogConfig = { ...spec.dialogConfig };
  if (spec.menuConfig) config.menuConfig = { ...spec.menuConfig };
  if (spec.homePageConfig) config.homePageConfig = { ...spec.homePageConfig };
  if (spec.fileConfig) config.fileConfig = { ...spec.fileConfig };
  if (spec.settingConfig) config.settingConfig = { ...spec.settingConfig };
  if (spec.statusConfig) config.statusConfig = { ...spec.statusConfig };
  if (spec.playerConfig) config.playerConfig = { ...spec.playerConfig };
  
  return config;
}

/**
 * Fetch an image from a URL and return as Blob
 */
async function fetchImageAsBlob(url: string): Promise<Blob> {
  // Handle data URLs (base64)
  if (url.startsWith('data:')) {
    const response = await fetch(url);
    return await response.blob();
  }
  
  // Handle blob URLs
  if (url.startsWith('blob:')) {
    const response = await fetch(url);
    return await response.blob();
  }
  
  // Handle regular URLs
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  return await response.blob();
}

/**
 * Download a theme as a .zip file compatible with Y1 device
 * @param theme - The loaded theme to export
 * @param themeName - Optional custom name for the theme folder/file
 */
export async function downloadTheme(theme: LoadedTheme, themeName?: string): Promise<void> {
  const zip = new JSZip();
  const spec = theme.spec as any; // Cast to any to access optional properties like theme_info
  // Prioritize edited title from metadata, then fall back to provided name or theme id
  const name = spec?.theme_info?.title || themeName || theme.id || 'theme';
  
  // Sanitize theme name for filesystem
  const sanitizedName = name.replace(/[^a-zA-Z0-9_\-\s]/g, '').replace(/\s+/g, '_');
  
  try {
    // 1. Generate config.json in Y1 device format
    const y1Config = convertToY1Config(theme.spec);
    zip.file('config.json', JSON.stringify(y1Config, null, 2));
    
    // 2. Add all theme assets
    const fetchPromises: Promise<void>[] = [];
    
    for (const asset of theme.loadedAssets) {
      const promise = (async () => {
        try {
          const blob = await fetchImageAsBlob(asset.url);
          zip.file(asset.fileName, blob);
          console.log(`✓ Added ${asset.fileName} to ZIP`);
        } catch (error) {
          console.warn(`⚠️ Failed to add ${asset.fileName}:`, error);
          // Continue with other assets even if one fails
        }
      })();
      
      fetchPromises.push(promise);
    }
    
    // Wait for all assets to be fetched
    await Promise.all(fetchPromises);
    
    // 3. Generate the ZIP file
    console.log('📦 Generating ZIP file...');
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 9 // Maximum compression
      }
    });
    
    // 4. Trigger download
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sanitizedName}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log(`✅ Theme "${name}" downloaded successfully as ${sanitizedName}.zip`);
  } catch (error) {
    console.error('❌ Error creating theme ZIP:', error);
    throw error;
  }
}

/**
 * Get a preview of what will be exported
 */
export function getExportPreview(theme: LoadedTheme): {
  configSize: number;
  assetCount: number;
  totalEstimatedSize: string;
  files: string[];
} {
  const y1Config = convertToY1Config(theme.spec);
  const configJson = JSON.stringify(y1Config, null, 2);
  const configSize = new Blob([configJson]).size;
  
  const files = ['config.json', ...theme.loadedAssets.map(a => a.fileName)];
  
  // Rough estimate (actual size will vary)
  const estimatedAssetSize = theme.loadedAssets.length * 10 * 1024; // ~10KB per asset
  const totalSize = configSize + estimatedAssetSize;
  
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  return {
    configSize,
    assetCount: theme.loadedAssets.length,
    totalEstimatedSize: formatSize(totalSize),
    files
  };
}
