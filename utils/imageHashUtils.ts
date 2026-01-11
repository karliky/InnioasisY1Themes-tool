/**
 * Utility to compute simple hash digests of images for deduplication
 */

/**
 * Compute a simple hash of an image for comparison
 * Uses canvas to create a visual signature
 */
export const getImageHash = async (imageUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 8; // Small size for quick comparison
        canvas.height = 8;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas not supported'));
          return;
        }
        
        // Draw image at small size
        ctx.drawImage(img, 0, 0, 8, 8);
        
        // Get pixel data and create a hash
        const imageData = ctx.getImageData(0, 0, 8, 8);
        const data = imageData.data;
        
        // Simple hash: sum of alternating bytes
        let hash = 0;
        for (let i = 0; i < data.length; i += 4) {
          hash = ((hash << 5) - hash) + (data[i] ^ data[i + 1] ^ data[i + 2]);
          hash = hash & hash; // Convert to 32-bit integer
        }
        
        resolve(Math.abs(hash).toString(16));
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${imageUrl}`));
    };
    
    img.src = imageUrl;
  });
};

/**
 * Compare multiple images and group by similarity
 * Returns a map of hash -> array of image data
 */
export const deduplicateImagesByHash = async (
  images: Array<{ url: string; themeName: string; fileName: string; configKey?: string }>
): Promise<Map<string, typeof images>> => {
  const hashMap = new Map<string, typeof images>();
  
  for (const image of images) {
    try {
      const hash = await getImageHash(image.url);
      const existing = hashMap.get(hash) || [];
      existing.push(image);
      hashMap.set(hash, existing);
    } catch (error) {
      console.warn(`Failed to hash image ${image.fileName} from ${image.themeName}:`, error);
      // Add to unique hash if it fails
      const fallbackHash = `error_${image.themeName}_${image.fileName}`;
      const existing = hashMap.get(fallbackHash) || [];
      existing.push(image);
      hashMap.set(fallbackHash, existing);
    }
  }
  
  return hashMap;
};
