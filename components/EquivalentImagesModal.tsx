import React, { useMemo, useState, useEffect } from 'react';
import { LoadedTheme } from '../types';
import { deduplicateImagesByHash } from '../utils/imageHashUtils';

interface EquivalentImagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (themeId: string, fileName: string) => void;
  currentThemeName: string;
  currentImageFileName: string;
  currentImageConfigKey?: string;
  availableThemes: LoadedTheme[];
}

interface GroupedImage {
  themeName: string;
  themeId: string;
  fileName: string;
  url: string;
  configKey?: string;
  hash?: string;
}

const EquivalentImagesModal: React.FC<EquivalentImagesModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  currentThemeName,
  currentImageFileName,
  currentImageConfigKey,
  availableThemes
}) => {
  const [equivalentImages, setEquivalentImages] = useState<GroupedImage[]>([]);
  const [groupedByHash, setGroupedByHash] = useState<Map<string, GroupedImage[]>>(new Map());
  const [loading, setLoading] = useState(false);

  // Find equivalent images from other themes based on configKey
  const equivalentImagesList = useMemo(() => {
    if (!currentImageConfigKey) return [];
    
    const images: GroupedImage[] = [];
    
    for (const theme of availableThemes) {
      if (theme.id === currentThemeName) continue; // Skip current theme
      
      // Look for assets with the same configKey
      const matchingAsset = theme.loadedAssets.find(a => a.configKey === currentImageConfigKey);
      if (matchingAsset) {
        images.push({
          themeName: theme.id,
          themeId: theme.id,
          fileName: matchingAsset.fileName,
          url: matchingAsset.url,
          configKey: matchingAsset.configKey,
        });
      }
    }
    
    return images;
  }, [availableThemes, currentThemeName, currentImageConfigKey]);

  // Deduplicate equivalent images by hash
  useEffect(() => {
    if (equivalentImagesList.length === 0) {
      setEquivalentImages([]);
      setGroupedByHash(new Map());
      return;
    }

    setLoading(true);
    
    const processImages = async () => {
      try {
        const hashMap = await deduplicateImagesByHash(
          equivalentImagesList.map(img => ({
            url: img.url,
            themeName: img.themeName,
            fileName: img.fileName,
            configKey: img.configKey
          }))
        );

        // Keep only one representative from each hash group
        const deduped: GroupedImage[] = [];
        for (const [hash, images] of hashMap) {
          if (images.length > 0) {
            deduped.push({
              ...images[0],
              themeName: images[0].themeName,
              themeId: images[0].themeName,
              hash
            });
          }
        }

        setEquivalentImages(deduped);
        setGroupedByHash(hashMap);
      } catch (error) {
        console.error('Failed to deduplicate images:', error);
        // Fallback: show all images if deduplication fails
        setEquivalentImages(equivalentImagesList);
      } finally {
        setLoading(false);
      }
    };

    processImages();
  }, [equivalentImagesList]);

  if (!isOpen) return null;

  const hasImages = equivalentImages.length > 0;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#1A1612',
          borderRadius: 8,
          border: '2px solid #3A3530',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          width: '90%',
          maxWidth: 900,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 24px',
            borderBottom: '2px solid #3A3530',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#25201B'
          }}
        >
          <div>
            <h2 style={{ margin: 0, color: '#D4A574', fontSize: 20, fontWeight: 'bold' }}>
              Replace Image
            </h2>
            <p style={{ margin: '4px 0 0 0', color: '#8A8578', fontSize: 12 }}>
              {currentImageFileName} from {currentThemeName}
            </p>
            {currentImageConfigKey && (
              <p style={{ margin: '2px 0 0 0', color: '#6B7A47', fontSize: 11, fontFamily: 'monospace' }}>
                {currentImageConfigKey}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#D4A574',
              fontSize: 24,
              cursor: 'pointer',
              padding: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 24,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {loading && (
            <div style={{ textAlign: 'center', color: '#8A8578', padding: 40 }}>
              <p style={{ fontSize: 14, marginBottom: 8 }}>Loading equivalent images...</p>
              <div style={{ fontSize: 12, opacity: 0.7 }}>This may take a moment for large galleries</div>
            </div>
          )}

          {!loading && !hasImages && (
            <div
              style={{
                textAlign: 'center',
                color: '#8A8578',
                padding: 60,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div
                style={{
                  fontSize: 48,
                  marginBottom: 16,
                  opacity: 0.5
                }}
              >
                🔍
              </div>
              <p style={{ fontSize: 14, marginBottom: 4 }}>
                No equivalent images found
              </p>
              <p style={{ fontSize: 12, opacity: 0.7 }}>
                {currentImageConfigKey
                  ? `No other themes have a "${currentImageConfigKey}" asset`
                  : 'Could not determine asset type'}
              </p>
            </div>
          )}

          {!loading && hasImages && (
            <div>
              <p style={{ color: '#D4A574', fontSize: 12, marginBottom: 16, fontFamily: 'monospace' }}>
                Found {equivalentImages.length} equivalent image{equivalentImages.length !== 1 ? 's' : ''} across themes (deduplicated by visual similarity)
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: 16
                }}
              >
                {equivalentImages.map((image, idx) => (
                  <button
                    key={`${image.themeId}_${idx}`}
                    onClick={() => onSelect(image.themeId, image.fileName)}
                    style={{
                      background: 'none',
                      border: '2px solid #4A4540',
                      borderRadius: 8,
                      padding: 12,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      backgroundColor: '#2F2A25',
                      _hover: {
                        borderColor: '#C97D60',
                        backgroundColor: '#3A342F'
                      }
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLElement).style.borderColor = '#C97D60';
                      (e.target as HTMLElement).style.backgroundColor = '#3A342F';
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLElement).style.borderColor = '#4A4540';
                      (e.target as HTMLElement).style.backgroundColor = '#2F2A25';
                    }}
                  >
                    {/* Thumbnail */}
                    <div
                      style={{
                        width: '100%',
                        aspectRatio: '1',
                        backgroundColor: '#1A1612',
                        border: '1px solid #3A3530',
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                      }}
                    >
                      <img
                        src={image.url}
                        alt={image.fileName}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain'
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>

                    {/* Info */}
                    <div style={{ width: '100%' }}>
                      <p
                        style={{
                          color: '#E8E3D5',
                          fontSize: 11,
                          margin: 0,
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={image.themeName}
                      >
                        {image.themeName}
                      </p>
                      <p
                        style={{
                          color: '#8A8578',
                          fontSize: 10,
                          margin: '2px 0 0 0',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontFamily: 'monospace'
                        }}
                        title={image.fileName}
                      >
                        {image.fileName.split('/').pop()}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: '2px solid #3A3530',
            padding: '16px 24px',
            backgroundColor: '#25201B',
            textAlign: 'right'
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: '#3A342F',
              border: '2px solid #4A4540',
              color: '#D4A574',
              padding: '8px 16px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = '#4A4540';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = '#3A342F';
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EquivalentImagesModal;
