import imageCompression from 'browser-image-compression';
import { ThemeAssetInfo } from '../types';

/**
 * Determine target size for an asset based on its configKey
 */
export function getTargetSizeForAsset(asset: ThemeAssetInfo): { width: number; height: number } | null {
  const configKey = asset.configKey || '';
  const fileName = asset.fileName.toLowerCase();

  // Skip fonts - they don't need resizing
  if (fileName.endsWith('.ttf') || fileName.endsWith('.otf') || fileName.endsWith('.woff') || fileName.endsWith('.woff2')) {
    return null;
  }

  // MAIN_ICON: 166x166 - Main menu icons
  if (configKey.startsWith('homePageConfig.')) {
    return { width: 166, height: 166 };
  }

  // SETTING_ICON: 146x146 - Settings menu icons
  if (configKey.startsWith('settingConfig.')) {
    return { width: 146, height: 146 };
  }

  // ITEM: 640x91 - List item backgrounds
  if (configKey === 'itemConfig.itemBackground' || configKey === 'itemConfig.itemSelectedBackground') {
    return { width: 640, height: 91 };
  }

  // WALLPAPER: 320x240 - Background wallpapers
  if (configKey === 'desktopWallpaper' || configKey === 'globalWallpaper') {
    return { width: 320, height: 240 };
  }

  // SMALL_ICON: 64x64 - Small status icons
  if (configKey.startsWith('statusConfig.')) {
    return { width: 64, height: 64 };
  }

  // fileConfig icons - typically same as main icons
  if (configKey.startsWith('fileConfig.')) {
    return { width: 166, height: 166 };
  }

  // themeCover - keep reasonable size, but optimize
  if (configKey === 'themeCover') {
    return { width: 320, height: 240 };
  }

  // desktopMask - keep original aspect ratio but optimize
  // Return null to keep original size but still optimize compression
  if (configKey === 'desktopMask') {
    return null; // Keep original size
  }

  // dialogConfig, menuConfig backgrounds - keep original size but optimize
  if (configKey.includes('dialogConfig') || configKey.includes('menuConfig')) {
    return null; // Keep original size
  }

  // Default: keep original size but optimize compression
  return null;
}

/**
 * Optimize an image using browser-native compression
 */
export async function optimizeImage(
  imageBlob: Blob,
  targetSize: { width: number; height: number } | null,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  try {
    // Check if it's an image file
    const fileType = imageBlob.type;
    if (!fileType.startsWith('image/')) {
      // Not an image, return as-is
      return imageBlob;
    }

    // Create a File object from the Blob (required by browser-image-compression)
    const fileName = 'image.png'; // Default name
    const file = new File([imageBlob], fileName, { type: fileType });

    // Prepare compression options
    const options: any = {
      maxSizeMB: 1, // Maximum file size in MB
      useWebWorker: true, // Use web worker for better performance
      fileType: fileType, // Preserve original file type
      initialQuality: 0.92, // High quality for PNGs
    };

    // If target size is specified, resize the image first using Canvas API
    if (targetSize) {
      onProgress?.(25);
      
      // Load image to get dimensions
      const img = new Image();
      const objectUrl = URL.createObjectURL(imageBlob);
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          resolve();
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Failed to load image'));
        };
        img.src = objectUrl;
      });

      const originalWidth = img.width;
      const originalHeight = img.height;
      const aspectRatio = originalWidth / originalHeight;
      const targetAspectRatio = targetSize.width / targetSize.height;
      
      // Calculate new dimensions maintaining aspect ratio
      let newWidth = targetSize.width;
      let newHeight = targetSize.height;
      
      if (Math.abs(aspectRatio - targetAspectRatio) > 0.01) {
        // Aspect ratios differ, fit to target size while maintaining aspect ratio
        if (aspectRatio > targetAspectRatio) {
          // Image is wider - fit to width
          newWidth = targetSize.width;
          newHeight = Math.round(targetSize.width / aspectRatio);
        } else {
          // Image is taller - fit to height
          newHeight = targetSize.height;
          newWidth = Math.round(targetSize.height * aspectRatio);
        }
      }
      
      // Only resize if current size is larger than target
      if (originalWidth > newWidth || originalHeight > newHeight) {
        // Resize using Canvas
        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // Use high-quality image rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, newWidth, newHeight);
          
          // Convert canvas to blob
          const resizedBlob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to convert canvas to blob'));
              }
            }, fileType, 0.95); // High quality
          });
          
          // Update file with resized blob
          const resizedFile = new File([resizedBlob], fileName, { type: fileType });
          onProgress?.(50);
          
          // Compress the resized image
          const compressedFile = await imageCompression(resizedFile, options);
          onProgress?.(100);
          return compressedFile;
        }
      }
    }

    onProgress?.(50);

    // Compress the image without resizing
    const compressedFile = await imageCompression(file, options);
    
    onProgress?.(100);

    // Convert File back to Blob
    return compressedFile;
  } catch (error) {
    console.warn('Image optimization failed, using original:', error);
    return imageBlob; // Return original on any error
  }
}

/**
 * Optimize all theme assets
 */
export async function optimizeThemeAssets(
  assets: ThemeAssetInfo[],
  onProgress?: (current: number, total: number, fileName: string) => void
): Promise<Map<string, Blob>> {
  const optimizedAssets = new Map<string, Blob>();
  
  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    onProgress?.(i + 1, assets.length, asset.fileName);
    
    try {
      // Fetch the original image
      let imageBlob: Blob;
      
      if (asset.url.startsWith('data:')) {
        const response = await fetch(asset.url);
        imageBlob = await response.blob();
      } else if (asset.url.startsWith('blob:')) {
        const response = await fetch(asset.url);
        imageBlob = await response.blob();
      } else {
        const response = await fetch(asset.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${asset.url}: ${response.statusText}`);
        }
        imageBlob = await response.blob();
      }
      
      // Check if it's an image (not a font)
      const fileName = asset.fileName.toLowerCase();
      const isImage = fileName.endsWith('.png') || 
                     fileName.endsWith('.jpg') || 
                     fileName.endsWith('.jpeg') || 
                     fileName.endsWith('.gif') ||
                     fileName.endsWith('.webp');
      
      if (isImage) {
        const targetSize = getTargetSizeForAsset(asset);
        const optimizedBlob = await optimizeImage(imageBlob, targetSize);
        optimizedAssets.set(asset.fileName, optimizedBlob);
      } else {
        // For fonts and other non-image files, use original blob
        optimizedAssets.set(asset.fileName, imageBlob);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to optimize ${asset.fileName}:`, error);
      // Fallback: try to fetch original and use it
      try {
        const response = await fetch(asset.url);
        const blob = await response.blob();
        optimizedAssets.set(asset.fileName, blob);
      } catch (fetchError) {
        console.error(`❌ Failed to fetch ${asset.fileName}:`, fetchError);
        // Skip this asset
      }
    }
  }
  
  return optimizedAssets;
}
