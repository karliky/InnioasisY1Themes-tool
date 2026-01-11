import { LoadedTheme, ThemeSpec, ThemeAssetInfo } from '../types';
import { indexedDBService, ClonedThemeData, IndexedDBError } from './indexedDBService';

// Descriptions for config keys from the manifest
const CONFIG_DESCRIPTIONS: Record<string, string> = {
  // Top level
  'themeCover': 'Theme preview image used in theme list',
  'desktopWallpaper': 'Desktop wallpaper',
  'globalWallpaper': 'Global wallpaper',
  'desktopMask': 'Desktop overlay mask',
  'fontFamily': 'Font file used to override monospace system font',
  // itemConfig
  'itemConfig.itemBackground': 'List item background',
  'itemConfig.itemSelectedBackground': 'Selected list item background',
  'itemConfig.itemRightArrow': 'Right arrow icon for list items',
  // homePageConfig
  'homePageConfig.nowPlaying': 'Now Playing menu icon',
  'homePageConfig.music': 'Music menu icon',
  'homePageConfig.video': 'Video menu icon',
  'homePageConfig.audiobooks': 'Audiobooks menu icon',
  'homePageConfig.photos': 'Photos menu icon',
  'homePageConfig.fm': 'FM Radio menu icon',
  'homePageConfig.bluetooth': 'Bluetooth menu icon',
  'homePageConfig.settings': 'Settings menu icon',
  'homePageConfig.shuffleQuick': 'Quick Shuffle menu icon',
  'homePageConfig.ebook': 'E-book menu icon',
  'homePageConfig.calculator': 'Calculator menu icon',
  'homePageConfig.calendar': 'Calendar menu icon',
  // statusConfig
  'statusConfig.playing': 'Playing status icon',
  'statusConfig.audiobookPlaying': 'Audiobook playing status icon',
  'statusConfig.pause': 'Pause status icon',
  'statusConfig.fmPlaying': 'FM playing status icon',
  'statusConfig.stop': 'Stop status icon',
  'statusConfig.blConnected': 'Bluetooth connected icon',
  'statusConfig.blConnecting': 'Bluetooth connecting icon',
  'statusConfig.blDisconnected': 'Bluetooth disconnected icon',
  'statusConfig.headsetWithMic': 'Headset with mic icon',
  'statusConfig.headsetWithoutMic': 'Headset without mic icon',
  'statusConfig.battery[0]': 'Battery level 0 (0-25%)',
  'statusConfig.battery[1]': 'Battery level 1 (25-50%)',
  'statusConfig.battery[2]': 'Battery level 2 (50-75%)',
  'statusConfig.battery[3]': 'Battery level 3 (75-100%)',
  'statusConfig.batteryCharging[0]': 'Battery charging level 0',
  'statusConfig.batteryCharging[1]': 'Battery charging level 1',
  'statusConfig.batteryCharging[2]': 'Battery charging level 2',
  'statusConfig.batteryCharging[3]': 'Battery charging level 3',
  // fileConfig
  'fileConfig.folderIcon': 'Folder icon',
  'fileConfig.musicIcon': 'Music file icon',
  // settingConfig
  'settingConfig.settingMask': 'Settings screen mask',
  'settingConfig.shutdown': 'Shutdown icon',
  'settingConfig.shuffleOn': 'Shuffle on icon',
  'settingConfig.shuffleOff': 'Shuffle off icon',
  'settingConfig.repeatOff': 'Repeat off icon',
  'settingConfig.repeatAll': 'Repeat all icon',
  'settingConfig.repeatOne': 'Repeat one icon',
  // playerConfig (colors only, no images)
  // dialogConfig / menuConfig
  'dialogConfig.dialogOptionBackground': 'Dialog option background',
  'dialogConfig.dialogOptionSelectedBackground': 'Dialog selected option background',
  'menuConfig.menuItemBackground': 'Menu item background',
  'menuConfig.menuItemSelectedBackground': 'Menu selected item background',
};

// Helper to extract all referenced file paths from a theme config
function extractReferencedFiles(spec: any): Map<string, string> {
  const fileMap = new Map<string, string>(); // fileName -> configKey

  const addIfFile = (value: any, key: string) => {
    if (typeof value === 'string' && value.trim() !== '' && !value.startsWith('#')) {
      // Skip color values
      if (/\.(png|jpg|jpeg|svg|ttf|otf|woff|woff2)$/i.test(value)) {
        fileMap.set(value, key);
      }
    }
  };

  // Top-level paths
  addIfFile(spec.themeCover, 'themeCover');
  addIfFile(spec.desktopWallpaper, 'desktopWallpaper');
  addIfFile(spec.globalWallpaper, 'globalWallpaper');
  addIfFile(spec.desktopMask, 'desktopMask');
  addIfFile(spec.fontFamily, 'fontFamily');

  // Nested configs
  const configs = ['itemConfig', 'dialogConfig', 'menuConfig', 'homePageConfig', 'fileConfig', 'settingConfig', 'statusConfig'];
  for (const cfgName of configs) {
    const cfg = spec[cfgName];
    if (!cfg || typeof cfg !== 'object') continue;
    for (const [k, v] of Object.entries(cfg)) {
      if (Array.isArray(v)) {
        v.forEach((item, idx) => addIfFile(item, `${cfgName}.${k}[${idx}]`));
      } else {
        addIfFile(v, `${cfgName}.${k}`);
      }
    }
  }

  return fileMap;
}

// Discover all themes in /themes/*/config.json and their assets
export const loadAvailableThemes = (): LoadedTheme[] => {
  // Load JSON specs
  const specModules = import.meta.glob('/themes/*/config.json', { eager: true });
  // Load asset files (images, fonts) as URLs
  const assetModules: Record<string, string> = import.meta.glob(
    '/themes/*/*.{png,PNG,jpg,jpeg,svg,ttf,TTF,otf,OTF,woff,WOFF,woff2,WOFF2}',
    { eager: true, query: '?url', import: 'default' }
  ) as any;

  // Case-insensitive index to handle filename case mismatches (e.g., .PNG vs .png)
  const assetLowerIndex = new Map<string, string>();
  for (const [path, url] of Object.entries(assetModules)) {
    assetLowerIndex.set(path.toLowerCase(), url as string);
  }

  const themes: LoadedTheme[] = [];

  for (const [path, mod] of Object.entries(specModules)) {
    const themeFolder = path.substring(0, path.lastIndexOf('/')); // /themes/<id>
    const spec = (mod as any).default ?? (mod as any) as ThemeSpec;
    
    // Skip if not even a basic theme object
    if (!spec || typeof spec !== 'object') {
      console.warn(`Skipping invalid theme at ${path}: not an object`);
      continue;
    }
    
    const id = spec.theme_info?.title || themeFolder.split('/').pop() || 'unknown';

    const assetUrlForFile = (fileName: string): string | undefined => {
      // Normalize spaces and special characters in path
      // Compose full path to file within the theme folder
      const fullPathVariants = [
        `${themeFolder}/${fileName}`,
        `${themeFolder}/${encodeURI(fileName)}`,
      ];
      for (const p of fullPathVariants) {
        const url = assetModules[p];
        if (url) return url;

        const lowerUrl = assetLowerIndex.get(p.toLowerCase());
        if (lowerUrl) return lowerUrl;
      }
      return undefined;
    };

    const assetUrlForId = (imageId: string): string | undefined => {
      const entry = spec.assets?.images?.find(img => img.id === imageId);
      if (!entry) return undefined;
      return assetUrlForFile(entry.file);
    };

    // Build loaded assets list
    const referencedFiles = extractReferencedFiles(spec);
    const loadedAssets: ThemeAssetInfo[] = [];
    
    for (const [fileName, configKey] of referencedFiles.entries()) {
      const url = assetUrlForFile(fileName);
      if (url) {
        loadedAssets.push({
          fileName,
          url,
          configKey,
          description: CONFIG_DESCRIPTIONS[configKey] || configKey
        });
      }
    }

    // Sort by configKey for consistent ordering
    loadedAssets.sort((a, b) => (a.configKey || '').localeCompare(b.configKey || ''));

    const initialViewId = spec.navigation?.initial_view_id ?? 'n/a';
    console.log(`✅ Loaded theme: ${id} (${initialViewId}) - ${loadedAssets.length} assets`);
    themes.push({ 
      id, 
      spec, 
      assetUrlForId, 
      assetUrlForFile, 
      loadedAssets,
      isEditable: false // Installed themes are read-only
    });
  }

  return themes;
};

// Migrate data from localStorage to IndexedDB (one-time migration)
const migrateFromLocalStorage = async (): Promise<void> => {
  try {
    const stored = localStorage.getItem('clonedThemes');
    if (!stored) return; // Nothing to migrate
    
    const clonedData = JSON.parse(stored);
    
    // Save each theme to IndexedDB
    for (const [id, data] of Object.entries(clonedData)) {
      const themeData = data as any;
      await indexedDBService.saveTheme({
        id,
        spec: themeData.spec,
        loadedAssets: themeData.loadedAssets || [],
        assetOverrides: themeData.assetOverrides || {},
        originalThemeId: themeData.originalThemeId,
        clonedDate: themeData.clonedDate
      });
    }
    
    // Clear localStorage after successful migration
    localStorage.removeItem('clonedThemes');
    console.log('Successfully migrated themes from localStorage to IndexedDB');
  } catch (error) {
    console.error('Error migrating themes from localStorage:', error);
    // Don't throw - allow app to continue even if migration fails
  }
};

// Load cloned/custom themes from IndexedDB
export const loadClonedThemes = async (): Promise<LoadedTheme[]> => {
  try {
    // Perform one-time migration from localStorage if needed
    await migrateFromLocalStorage();
    
    const clonedData = await indexedDBService.getAllThemes();
    const clonedThemes: LoadedTheme[] = [];
    
    for (const [id, themeData] of Object.entries(clonedData)) {
      // Create asset URL functions for cloned themes
      const assetUrlForFile = (fileName: string): string | undefined => {
        return themeData.assetOverrides?.[fileName];
      };
      
      const assetUrlForId = (imageId: string): string | undefined => {
        const entry = themeData.spec.assets?.images?.find((img: any) => img.id === imageId);
        if (!entry) return undefined;
        return assetUrlForFile(entry.file);
      };
      
      clonedThemes.push({
        id,
        spec: themeData.spec,
        assetUrlForId,
        assetUrlForFile,
        loadedAssets: themeData.loadedAssets || [],
        isEditable: true,
        originalThemeId: themeData.originalThemeId,
        clonedDate: themeData.clonedDate
      });
    }
    
    return clonedThemes;
  } catch (error) {
    if (error instanceof IndexedDBError) {
      console.error('IndexedDB error loading cloned themes:', error.message);
      throw error; // Re-throw IndexedDB errors for user notification
    }
    console.error('Error loading cloned themes:', error);
    return [];
  }
};

// Clone an installed theme to make it editable
export const cloneTheme = async (sourceTheme: LoadedTheme): Promise<LoadedTheme> => {
  const timestamp = new Date().toISOString();
  const clonedId = `${sourceTheme.id}_clone_${Date.now()}`;
  
  // Deep copy the spec
  const clonedSpec = JSON.parse(JSON.stringify(sourceTheme.spec));
  
  // Update theme title to indicate it's a clone
  if (clonedSpec.theme_info) {
    clonedSpec.theme_info.title = `${clonedSpec.theme_info.title} (Clone)`;
  }
  
  // Create asset overrides map (initially using original URLs)
  const assetOverrides: Record<string, string> = {};
  sourceTheme.loadedAssets.forEach(asset => {
    assetOverrides[asset.fileName] = asset.url;
  });
  
  // Save to IndexedDB
  try {
    await indexedDBService.saveTheme({
      id: clonedId,
      spec: clonedSpec,
      loadedAssets: sourceTheme.loadedAssets,
      assetOverrides,
      originalThemeId: sourceTheme.id,
      clonedDate: timestamp
    });
  } catch (error) {
    if (error instanceof IndexedDBError) {
      throw error; // Re-throw for user notification
    }
    console.error('Error saving cloned theme:', error);
    throw new Error('Failed to save cloned theme');
  }
  
  // Create the cloned theme object
  const assetUrlForFile = (fileName: string): string | undefined => {
    return assetOverrides[fileName];
  };
  
  const assetUrlForId = (imageId: string): string | undefined => {
    const entry = clonedSpec.assets?.images?.find((img: any) => img.id === imageId);
    if (!entry) return undefined;
    return assetUrlForFile(entry.file);
  };
  
  return {
    id: clonedId,
    spec: clonedSpec,
    assetUrlForId,
    assetUrlForFile,
    loadedAssets: [...sourceTheme.loadedAssets],
    isEditable: true,
    originalThemeId: sourceTheme.id,
    clonedDate: timestamp
  };
};

// Update an asset in a cloned theme
export const updateClonedThemeAsset = async (themeId: string, fileName: string, newUrl: string): Promise<void> => {
  try {
    const themeData = await indexedDBService.getTheme(themeId);
    if (!themeData) {
      throw new Error(`Theme "${themeId}" not found`);
    }
    
    if (!themeData.assetOverrides) {
      themeData.assetOverrides = {};
    }
    
    themeData.assetOverrides[fileName] = newUrl;
    
    // Update loadedAssets array
    const assetIndex = themeData.loadedAssets.findIndex((a: ThemeAssetInfo) => a.fileName === fileName);
    if (assetIndex >= 0) {
      themeData.loadedAssets[assetIndex].url = newUrl;
    }
    
    await indexedDBService.saveTheme(themeData);
  } catch (error) {
    if (error instanceof IndexedDBError) {
      throw error; // Re-throw for user notification
    }
    console.error('Error updating cloned theme asset:', error);
    throw error;
  }
};

// Persist spec changes (colors, metadata, etc.) for a cloned theme
export const updateClonedThemeSpec = async (themeId: string, updatedSpec: any): Promise<void> => {
  try {
    const themeData = await indexedDBService.getTheme(themeId);
    if (!themeData) {
      throw new Error(`Theme "${themeId}" not found`);
    }

    themeData.spec = updatedSpec;
    await indexedDBService.saveTheme(themeData);
  } catch (error) {
    if (error instanceof IndexedDBError) {
      throw error; // Re-throw for user notification
    }
    console.error('Error updating cloned theme spec:', error);
    throw error;
  }
};

// Delete a cloned theme
export const deleteClonedTheme = async (themeId: string): Promise<void> => {
  try {
    await indexedDBService.deleteTheme(themeId);
  } catch (error) {
    if (error instanceof IndexedDBError) {
      throw error; // Re-throw for user notification
    }
    console.error('Error deleting cloned theme:', error);
    throw error;
  }
};

export const getInitialTheme = (): LoadedTheme | null => {
  const themes = loadAvailableThemes();
  return themes.length ? themes[0] : null;
};
