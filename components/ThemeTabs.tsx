import React, { useState, useRef, useEffect } from 'react';
import { LoadedTheme } from '../types';
import { Tooltip } from './Tooltip';

interface ThemeTabsProps {
  themes: LoadedTheme[];
  activeTheme: LoadedTheme | null;
  onSelectTheme: (theme: LoadedTheme) => void;
  onCloseTheme: (themeId: string) => void;
  onRenameTheme?: (themeId: string, newName: string) => Promise<void>;
}

const ThemeTabs: React.FC<ThemeTabsProps> = ({
  themes,
  activeTheme,
  onSelectTheme,
  onCloseTheme,
  onRenameTheme,
}) => {
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingThemeId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingThemeId]);

  const handleDoubleClick = (theme: LoadedTheme) => {
    const currentName = (theme as any)?.spec?.theme_info?.title || 
                       theme.id.replace(/_clone_\d+$/, '').replace(/^imported_[a-z0-9]+_/, '');
    setEditingThemeId(theme.id);
    setEditingName(currentName);
  };

  const handleSaveName = async (themeId: string) => {
    if (editingName.trim() && onRenameTheme) {
      try {
        await onRenameTheme(themeId, editingName.trim());
        setEditingThemeId(null);
        setEditingName('');
      } catch (error) {
        console.error('Failed to rename theme:', error);
      }
    } else {
      setEditingThemeId(null);
      setEditingName('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, themeId: string) => {
    if (e.key === 'Enter') {
      handleSaveName(themeId);
    } else if (e.key === 'Escape') {
      setEditingThemeId(null);
      setEditingName('');
    }
  };

  if (themes.length === 0) return null;

  return (
    <div className="flex items-center gap-0 bg-[#252525] border-b border-[#1A1A1A] px-3 py-0 overflow-x-auto" style={{ minHeight: '38px' }}>
      {themes.map((theme) => {
        const isActive = activeTheme?.id === theme.id;
        const isEditing = editingThemeId === theme.id;
        const displayName = (theme as any)?.spec?.theme_info?.title || 
                          theme.id.replace(/_clone_\d+$/, '').replace(/^imported_[a-z0-9]+_/, '');
        
        return (
          <div
            key={theme.id}
            className={`flex items-center gap-2 px-4 py-2 min-w-[140px] max-w-[220px] cursor-pointer transition-all relative ${
              isActive
                ? 'bg-[#1E1E1E] text-white'
                : 'bg-transparent text-[#A0A0A0] hover:bg-[#2A2A2A] hover:text-white'
            }`}
            style={{
              borderTop: isActive ? '2px solid #6B7A47' : '2px solid transparent',
              marginTop: isActive ? '-2px' : '0',
            }}
          >
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => handleSaveName(theme.id)}
                onKeyDown={(e) => handleKeyDown(e, theme.id)}
                className="flex-1 text-xs bg-[#3A3A3A] text-white px-2 py-1 rounded border border-[#6B7A47] outline-none"
                style={{ minWidth: '80px' }}
              />
            ) : (
              <button
                onClick={() => onSelectTheme(theme)}
                onDoubleClick={() => handleDoubleClick(theme)}
                className="flex-1 text-xs text-left truncate font-medium hover:opacity-80 transition-opacity"
                title={displayName}
              >
                {displayName}
              </button>
            )}
            <Tooltip content="Close theme">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTheme(theme.id);
                }}
                className="flex-shrink-0 w-4 h-4 flex items-center justify-center hover:bg-[#4A4A4A] rounded-sm transition-colors opacity-60 hover:opacity-100"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </Tooltip>
          </div>
        );
      })}
    </div>
  );
};

export default ThemeTabs;
