import JSZip from 'jszip';
import { LoadedTheme } from '../types';
import { optimizeThemeAssets } from './imageOptimization';

/**
 * Convert the simulator's ThemeSpec to Y1 device config.json format
 * Based on docs/theme_manifest.json specification
 */
function convertToY1Config(spec: any): any {
  const config: any = {};
  
  // Include theme metadata if present
  if (spec.theme_info) config.theme_info = { ...spec.theme_info };
  
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

export interface ExportProgress {
  step: 'optimizing' | 'packaging';
  progress: number; // 0-100
  currentFile?: string;
  totalFiles?: number;
  processedFiles?: number;
}

/**
 * Download a theme as a .zip file compatible with Y1 device
 * @param theme - The loaded theme to export
 * @param themeName - Optional custom name for the theme folder/file
 * @param onProgress - Optional callback for progress updates
 */
export async function downloadTheme(
  theme: LoadedTheme, 
  themeName?: string,
  onProgress?: (progress: ExportProgress) => void
): Promise<void> {
  const spec = theme.spec as any; // Cast to any to access optional properties like theme_info
  // Prioritize edited title from metadata, then fall back to provided name or theme id
  const name = spec?.theme_info?.title || themeName || theme.id || 'theme';
  
  // Sanitize theme name for filesystem
  const sanitizedName = name.replace(/[^a-zA-Z0-9_\-\s]/g, '').replace(/\s+/g, '_');
  
  try {
    // Step 1: Optimize and resize images
    onProgress?.({
      step: 'optimizing',
      progress: 0,
      totalFiles: theme.loadedAssets.length,
      processedFiles: 0
    });

    const optimizedAssets = await optimizeThemeAssets(
      theme.loadedAssets,
      (current, total, fileName) => {
        const progress = Math.round((current / total) * 100);
        onProgress?.({
          step: 'optimizing',
          progress,
          currentFile: fileName,
          totalFiles: total,
          processedFiles: current
        });
      }
    );

    onProgress?.({
      step: 'packaging',
      progress: 0,
      totalFiles: theme.loadedAssets.length + 1, // +1 for config.json
      processedFiles: theme.loadedAssets.length
    });

    // Step 2: Generate config.json in Y1 device format
    const y1Config = convertToY1Config(theme.spec);
    const zip = new JSZip();
    zip.file('config.json', JSON.stringify(y1Config, null, 2));
    
    // Step 3: Add all optimized assets to ZIP
    let addedCount = 0;
    for (const asset of theme.loadedAssets) {
      const optimizedBlob = optimizedAssets.get(asset.fileName);
      if (optimizedBlob) {
        zip.file(asset.fileName, optimizedBlob);
        addedCount++;
        console.log(`✓ Added optimized ${asset.fileName} to ZIP`);
        
        onProgress?.({
          step: 'packaging',
          progress: Math.round((addedCount / theme.loadedAssets.length) * 50), // First 50% for adding files
          currentFile: asset.fileName,
          totalFiles: theme.loadedAssets.length + 1,
          processedFiles: addedCount + 1 // +1 for config.json
        });
      } else {
        console.warn(`⚠️ No optimized blob found for ${asset.fileName}`);
      }
    }
    
    // Step 4: Generate the ZIP file
    onProgress?.({
      step: 'packaging',
      progress: 50,
      currentFile: 'Generating ZIP...',
      totalFiles: theme.loadedAssets.length + 1,
      processedFiles: theme.loadedAssets.length + 1
    });

    console.log('📦 Generating ZIP file...');
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 9 // Maximum compression
      },
      streamFiles: true
    }, (metadata) => {
      // Update progress during ZIP generation (50-100%)
      const zipProgress = 50 + Math.round((metadata.percent / 100) * 50);
      onProgress?.({
        step: 'packaging',
        progress: zipProgress,
        currentFile: 'Compressing...',
        totalFiles: theme.loadedAssets.length + 1,
        processedFiles: theme.loadedAssets.length + 1
      });
    });
    
    onProgress?.({
      step: 'packaging',
      progress: 100,
      totalFiles: theme.loadedAssets.length + 1,
      processedFiles: theme.loadedAssets.length + 1
    });
    
    // Step 5: Trigger download
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
