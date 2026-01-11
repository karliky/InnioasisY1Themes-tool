
export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
}

// ThemeSpec (ui_spec_version 1.0) support
export interface ThemeSpec {
  ui_spec_version: string;
  theme: {
    id: string;
    design_resolution_px: { w: number; h: number };
    orientation: 'landscape' | 'portrait';
    fonts: Array<{ id: string; file: string; default?: boolean }>;
    color_tokens: Record<string, string>;
  };
  assets: {
    base_path: string;
    images: Array<{
      id: string;
      file: string;
      size_px: { w: number; h: number };
      role: string;
    }>;
    nine_slice?: Array<{
      id: string;
      image_id: string;
      source_size_px: { w: number; h: number };
      insets_px: { left: number; top: number; right: number; bottom: number };
      notes?: string;
    }>;
  };
  layout_tokens: any;
  components: Record<string, any>;
  views: Array<ThemeView>;
  navigation: {
    initial_view_id: string;
    routes: Array<{ action: string; to: string }>;
  };
  runtime_binds?: Record<string, any>;
}

export interface ThemeView {
  id: string;
  type: 'screen';
  title?: string;
  background?: { type: 'image'; image_id: string; bounds_px: { x: number; y: number; w: number; h: number } };
  children?: any[];
}

export interface ThemeAssetInfo {
  fileName: string;
  url: string;
  configKey?: string;       // The config key this asset is used for (e.g., "desktopWallpaper", "statusConfig.playing")
  description?: string;     // Description from the manifest
}

export interface LoadedTheme {
  id: string;
  spec: ThemeSpec;
  assetUrlForId: (imageId: string) => string | undefined;
  assetUrlForFile: (fileName: string) => string | undefined;
  loadedAssets: ThemeAssetInfo[];
  isEditable: boolean;              // true if this is a cloned theme, false for installed themes
  originalThemeId?: string;         // if cloned, the ID of the source theme
  clonedDate?: string;              // ISO date string when theme was cloned
}
