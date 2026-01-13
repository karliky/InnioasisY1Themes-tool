import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LoadedTheme, ThemeAssetInfo } from '../types';

interface SearchResult {
  type: 'theme' | 'image' | 'color' | 'metadata';
  id: string;
  label: string;
  description?: string;
  themeId?: string;
  metadata?: {
    fileName?: string;
    configKey?: string;
    colorKey?: string;
  };
}

interface SearchPaletteProps {
  availableThemes: LoadedTheme[];
  activeTheme: LoadedTheme | null;
  assets?: ThemeAssetInfo[];
  spec?: any;
  onThemeSelect: (theme: LoadedTheme) => void;
  onAssetSelect?: (asset: { type: 'image' | 'color' | 'metadata'; id: string; configKey?: string }) => void;
}

const SearchPalette: React.FC<SearchPaletteProps> = ({
  availableThemes,
  activeTheme,
  assets = [],
  spec,
  onThemeSelect,
  onAssetSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate search results
  const results = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase().trim();
    const searchResults: SearchResult[] = [];

    // Search themes
    availableThemes.forEach((theme) => {
      if (theme.id.toLowerCase().includes(query)) {
        searchResults.push({
          type: 'theme',
          id: theme.id,
          label: theme.id,
          description: theme.isEditable ? 'Cloned Theme' : 'Installed Theme',
          themeId: theme.id,
        });
      }
    });

    // Search current theme resources
    if (activeTheme) {
      // Search images
      assets.forEach((asset) => {
        if (
          asset.fileName.toLowerCase().includes(query) ||
          asset.configKey?.toLowerCase().includes(query)
        ) {
          searchResults.push({
            type: 'image',
            id: asset.fileName,
            label: asset.fileName,
            description: asset.configKey || 'Image',
            metadata: {
              fileName: asset.fileName,
              configKey: asset.configKey,
            },
          });
        }
      });

      // Search colors
      if (spec) {
        const colorKeys: Array<{ path: string; label: string }> = [
          { path: 'itemConfig.itemTextColor', label: 'Item Text' },
          { path: 'itemConfig.itemSelectedTextColor', label: 'Item Text (Selected)' },
          { path: 'dialogConfig.dialogOptionTextColor', label: 'Dialog Option Text' },
          { path: 'dialogConfig.dialogOptionSelectedTextColor', label: 'Dialog Option Text (Selected)' },
          { path: 'dialogConfig.dialogBackgroundColor', label: 'Dialog Background' },
          { path: 'dialogConfig.dialogTextColor', label: 'Dialog Text' },
          { path: 'menuConfig.menuBackgroundColor', label: 'Menu Background' },
          { path: 'menuConfig.menuItemTextColor', label: 'Menu Item Text' },
          { path: 'menuConfig.menuItemSelectedTextColor', label: 'Menu Item Text (Selected)' },
          { path: 'homePageConfig.selectedColor', label: 'Home Selected' },
          { path: 'homePageConfig.unselectedColor', label: 'Home Unselected' },
          { path: 'settingConfig.selectedColor', label: 'Settings Selected' },
          { path: 'settingConfig.unselectedColor', label: 'Settings Unselected' },
          { path: 'statusConfig.statusBarColor', label: 'Status Bar' },
          { path: 'playerConfig.progressColor', label: 'Player Progress' },
          { path: 'playerConfig.progressBackgroundColor', label: 'Player Progress BG' },
        ];

        colorKeys.forEach(({ path, label }) => {
          const parts = path.split('.');
          let value = spec;
          for (const part of parts) {
            value = value?.[part];
          }
          
          if (typeof value === 'string' && (label.toLowerCase().includes(query) || value.toLowerCase().includes(query))) {
            searchResults.push({
              type: 'color',
              id: path,
              label: label,
              description: `Color: ${value}`,
              metadata: {
                colorKey: path,
              },
            });
          }
        });
      }

      // Search metadata
      if (spec?.theme_info) {
        Object.entries(spec.theme_info).forEach(([key, value]: [string, any]) => {
          if (
            typeof value === 'string' &&
            (key.toLowerCase().includes(query) || value.toLowerCase().includes(query))
          ) {
            searchResults.push({
              type: 'metadata',
              id: key,
              label: key,
              description: value,
              metadata: {
                configKey: `theme_info.${key}`,
              },
            });
          }
        });
      }
    }

    return searchResults;
  }, [searchQuery, availableThemes, activeTheme, assets, spec]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen && (e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
        return;
      }

      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelectResult(results[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setSearchQuery('');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectResult = (result: SearchResult) => {
    if (result.type === 'theme' && result.themeId) {
      const theme = availableThemes.find((t) => t.id === result.themeId);
      if (theme) {
        onThemeSelect(theme);
        setIsOpen(false);
        setSearchQuery('');
      }
    } else if (result.type !== 'theme' && onAssetSelect) {
      onAssetSelect({
        type: result.type as 'image' | 'color' | 'metadata',
        id: result.id,
        configKey: result.metadata?.configKey || result.metadata?.colorKey,
      });
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'theme':
        return '🎨';
      case 'image':
        return '🖼️';
      case 'color':
        return '🎨';
      case 'metadata':
        return '📝';
      default:
        return '📌';
    }
  };

  return (
    <div ref={searchRef} className="relative">
      {/* Search Input */}
      <div className="search-palette">
        <span>🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (e.target.value.trim()) {
              setIsOpen(true);
            }
          }}
          onFocus={() => searchQuery.trim() && setIsOpen(true)}
          placeholder="Search themes, images, colors... (⌘K)"
          className="search-input"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="text-[#666666] hover:text-[#CCCCCC] transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="search-results">
          <div className="search-results-header">
            <span className="text-[11px] text-[#666666] font-medium uppercase tracking-wide">
              {results.length} Result{results.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="search-results-list">
            {results.map((result, index) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => handleSelectResult(result)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`search-result-item ${index === selectedIndex ? 'selected' : ''}`}
              >
                <span className="search-result-icon">{getResultIcon(result.type)}</span>
                <div className="search-result-content">
                  <div className="search-result-label">{result.label}</div>
                  {result.description && (
                    <div className="search-result-description">{result.description}</div>
                  )}
                </div>
                {index === selectedIndex && (
                  <span className="search-result-highlight">→</span>
                )}
              </button>
            ))}
          </div>

          <div className="search-results-footer">
            <span className="text-[9px] text-[#555555]">
              ↑↓ navigate • Enter select • Esc close
            </span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {isOpen && searchQuery.trim() && results.length === 0 && (
        <div className="search-results">
          <div className="search-results-empty">
            <span className="text-[12px] text-[#666666]">No results found</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPalette;
