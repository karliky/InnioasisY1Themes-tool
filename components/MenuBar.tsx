import React, { useState, useRef, useEffect } from 'react';
import { LoadedTheme, ThemeAssetInfo } from '../types';
import SearchPalette from './SearchPalette';
import '../styles/MenuBar.css';

interface MenuBarProps {
  activeTheme: LoadedTheme | null;
  availableThemes: LoadedTheme[];
  isLeftSidebarOpen: boolean;
  isRightSidebarOpen: boolean;
  deviceColor: 'black' | 'silver' | 'yellow' | 'teal' | 'blue' | 'orange';
  assets?: ThemeAssetInfo[];
  spec?: any;
  onSetActiveTheme: (theme: LoadedTheme | null) => void;
  onToggleLeftSidebar: (open: boolean) => void;
  onToggleRightSidebar: (open: boolean) => void;
  onSetDeviceColor: (color: 'black' | 'silver' | 'yellow' | 'teal' | 'blue' | 'orange') => void;
  onNewTheme: () => Promise<void>;
  onOpenTheme: () => void;
  onExportTheme: (format: 'zip' | 'metadata') => Promise<void>;
  onImportThemes: (format: 'zip' | 'url') => Promise<void>;
  onDeleteTheme: (themeId: string) => Promise<void>;
  onDuplicateTheme: () => Promise<LoadedTheme | null>;
  onCloneCurrentTheme: () => Promise<LoadedTheme | null>;
  onRevertTheme: () => Promise<void>;
  onShowPreferences: () => void;
  onSearchAssetSelect?: (asset: { type: 'image' | 'color' | 'metadata'; id: string; configKey?: string }) => void;
}

type MenuType = 'file' | 'edit' | 'theme' | 'view' | 'help';

const MenuBar: React.FC<MenuBarProps> = ({
  activeTheme,
  availableThemes,
  isLeftSidebarOpen,
  isRightSidebarOpen,
  deviceColor,
  assets = [],
  spec,
  onSetActiveTheme,
  onToggleLeftSidebar,
  onToggleRightSidebar,
  onSetDeviceColor,
  onNewTheme,
  onOpenTheme,
  onExportTheme,
  onImportThemes,
  onDeleteTheme,
  onDuplicateTheme,
  onCloneCurrentTheme,
  onRevertTheme,
  onShowPreferences,
  onSearchAssetSelect,
}) => {
  const [activeMenu, setActiveMenu] = useState<MenuType | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const menuRefs = useRef<Record<MenuType, HTMLDivElement | null>>({
    file: null,
    edit: null,
    theme: null,
    view: null,
    help: null,
  });

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.menubar')) {
        setActiveMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = (menu: MenuType) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const closeMenu = () => {
    setActiveMenu(null);
  };

  const canEditTheme = activeTheme?.isEditable ?? false;

  return (
    <div className="menubar">
      <div className="menubar-left">
        {/* FILE MENU */}
        <div className="menu-item-wrapper" ref={(el) => { menuRefs.current.file = el; }}>
          <button
            className="menu-item"
            onClick={() => toggleMenu('file')}
            data-menu="file"
          >
            File
          </button>
          {activeMenu === 'file' && (
            <div className="menu-dropdown">
              <button className="menu-option" onClick={() => { onNewTheme(); closeMenu(); }}>
                New Theme
              </button>
              <button className="menu-option" onClick={() => { onOpenTheme(); closeMenu(); }}>
                Open Theme...
              </button>
              <div className="menu-divider" />
              <button
                className="menu-option"
                disabled={!activeTheme}
                onClick={() => { onExportTheme('zip'); closeMenu(); }}
              >
                Export Theme as ZIP <span className="shortcut">⌘E</span>
              </button>
            </div>
          )}
        </div>

        {/* VIEW MENU */}
        <div className="menu-item-wrapper" ref={(el) => { menuRefs.current.view = el; }}>
          <button
            className="menu-item"
            onClick={() => toggleMenu('view')}
            data-menu="view"
          >
            View
          </button>
          {activeMenu === 'view' && (
            <div className="menu-dropdown">
              <button
                className="menu-option"
                onClick={() => {
                  onToggleLeftSidebar(!isLeftSidebarOpen);
                  closeMenu();
                }}
              >
                {isLeftSidebarOpen ? '✓ ' : ''}Toggle Assets Sidebar
              </button>
              <button
                className="menu-option"
                onClick={() => {
                  onToggleRightSidebar(!isRightSidebarOpen);
                  closeMenu();
                }}
              >
                {isRightSidebarOpen ? '✓ ' : ''}Toggle Properties Panel
              </button>
              <div className="menu-divider" />
              <div className="menu-submenu">
                Device Color
                <div className="menu-submenu-items">
                  {['black', 'silver', 'yellow', 'teal', 'blue', 'orange'].map((color) => (
                    <button
                      key={color}
                      className="menu-option"
                      onClick={() => {
                        onSetDeviceColor(color as any);
                        closeMenu();
                      }}
                    >
                      {deviceColor === color ? '✓ ' : ''}{color.charAt(0).toUpperCase() + color.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* HELP MENU */}
        <div className="menu-item-wrapper" ref={(el) => { menuRefs.current.help = el; }}>
          <button
            className="menu-item"
            onClick={() => toggleMenu('help')}
            data-menu="help"
          >
            Help
          </button>
          {activeMenu === 'help' && (
            <div className="menu-dropdown">
              <a 
                href="https://github.com/karliky/InnioasisY1Themes-tool/blob/main/README.md" 
                target="_blank" 
                rel="noopener noreferrer"
                className="menu-option" 
                onClick={() => { closeMenu(); }}
              >
                Documentation
              </a>
              <div className="menu-divider" />
              <a
                href="https://github.com/karliky/InnioasisY1Themes-tool/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="menu-option"
                onClick={() => { closeMenu(); }}
              >
                Report Bug
              </a>
              <button className="menu-option" onClick={() => { setShowFeedbackModal(true); closeMenu(); }}>
                Send Feedback
              </button>
              <button className="menu-option" onClick={() => { setShowHelpModal(true); closeMenu(); }}>
                About Themes Tool
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="menubar-right">
        <SearchPalette
          availableThemes={availableThemes}
          activeTheme={activeTheme}
          assets={assets}
          spec={spec}
          onThemeSelect={onSetActiveTheme}
          onAssetSelect={onSearchAssetSelect}
        />
      </div>

      {/* Help & Support Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowHelpModal(false)}>
          <div className="bg-[#2D2D2D] border border-[#3C7FD5] rounded-sm p-6 max-w-md w-full mx-4 select-text" style={{ boxShadow: '0 8px 24px rgba(0, 0, 0, 0.8)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-[#FFFFFF]" style={{ fontFamily: 'var(--font-body)' }}>About Theme Maker Y1</h3>
                <p className="text-[10px] text-[#888888] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>Theme editor for Innioasis Y1 Classic Mp3 devices</p>
              </div>
              <button 
                onClick={() => setShowHelpModal(false)}
                className="p-1 hover:bg-[#3A3A3A] transition-colors text-[#CCCCCC] hover:text-[#FFFFFF] rounded-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <a 
                href="https://github.com/karliky/InnioasisY1Themes-tool" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-[#3A3A3A] hover:bg-[#404040] border border-[#4A4A4A] hover:border-[#3C7FD5] transition-colors rounded-sm group"
              >
                <svg className="w-6 h-6 text-[#CCCCCC] group-hover:text-[#FFFFFF] transition-colors" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-xs font-bold text-[#FFFFFF]" style={{ fontFamily: 'var(--font-body)' }}>GitHub</p>
                  <p className="text-[10px] text-[#888888]" style={{ fontFamily: 'var(--font-mono)' }}>@karliky</p>
                </div>
                <svg className="w-4 h-4 text-[#888888] group-hover:text-[#CCCCCC] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <div className="text-xs text-[#CCCCCC] mt-2">
                <span>Join the </span>
                <a href="https://discord.gg/3zbfaTNN7V" target="_blank" rel="noopener noreferrer" className="text-[#3C7FD5] underline">Timmkoo Modders Discord</a>
                <span> and head to the <span className="font-bold text-[#3C7FD5]">#themes</span> channel!</span>
              </div>
            </div>

            {/* Icon */}
            <div className="flex justify-center my-6">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 70" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ overflow: 'visible', width: '60px', height: '60px', color: '#3C7FD5' }}>
                <style>{`
                  .ipod-body-group {
                    animation: ipod-bounce 1.4s ease-in-out infinite alternate;
                    transform-origin: bottom center;
                  }
                  .ipod-face-move {
                    animation: ipod-look 7s ease-in-out infinite;
                  }
                  .ipod-blink {
                    animation: blink-eyes 3.5s infinite;
                    transform-origin: center 25px;
                  }
                  .music-vibe {
                    animation: vibe-dance 2s ease-in-out infinite;
                    transform-origin: 55px 15px;
                  }
                  @keyframes ipod-bounce {
                    0% { transform: translateY(3px) scale(1.05, 0.95); } 
                    100% { transform: translateY(-8px) scale(0.98, 1.02); } 
                  }
                  @keyframes ipod-look {
                    0%, 35% { transform: translateX(0); }
                    40%, 50% { transform: translateX(-4px); }
                    55%, 85% { transform: translateX(0); }
                    90%, 95% { transform: translateX(4px); }
                    100% { transform: translateX(0); }
                  }
                  @keyframes blink-eyes {
                    0%, 90%, 100% { transform: scaleY(1); }
                    95% { transform: scaleY(0.1); }
                  }
                  @keyframes vibe-dance {
                    0%, 100% { transform: rotate(-8deg) translateY(0); }
                    50% { transform: rotate(8deg) translateY(-3px); }
                  }
                `}</style>
                <g className="ipod-body-group">
                  <rect x="14" y="10" width="42" height="52" rx="10" ry="10" fill="white" stroke="currentColor"/>
                  <rect x="19" y="15" width="32" height="22" rx="4" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.8"/>
                  <g className="ipod-face-move">
                    <g className="ipod-blink">
                      <ellipse cx="27" cy="25" rx="2.5" ry="3.5" fill="currentColor" stroke="none"/>
                      <ellipse cx="43" cy="25" rx="2.5" ry="3.5" fill="currentColor" stroke="none"/>
                    </g>
                    <path d="M32 28 Q 33.5 30, 35 28 Q 36.5 30, 38 28" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M23 29 H 25" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
                    <path d="M45 29 H 47" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
                  </g>
                  <circle cx="35" cy="49" r="7" fill="none" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="35" cy="49" r="2" fill="currentColor" stroke="none"/>
                  <g className="music-vibe">
                    <path d="M58 10 V 2 L 64 0 V 8" fill="none" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="56" cy="10" r="2" fill="currentColor" stroke="none"/>
                    <circle cx="62" cy="8" r="2" fill="currentColor" stroke="none"/>
                  </g>
                </g>
              </svg>
            </div>

            <div className="mt-6 space-y-3">
              <p className="text-[10px] font-bold text-[#3C7FD5] uppercase tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>Credits</p>
              <a 
                href="https://x.com/k4rliky" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] text-[#CCCCCC] hover:text-[#FFFFFF] transition-colors flex items-center gap-2 group"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <span>x.com/k4rliky</span>
              </a>
              <a 
                href="https://karliky.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] text-[#CCCCCC] hover:text-[#FFFFFF] transition-colors flex items-center gap-2 group"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                <span>karliky.com</span>
              </a>
              <a 
                href="https://karliky.dev" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] text-[#CCCCCC] hover:text-[#FFFFFF] transition-colors flex items-center gap-2 group"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>karliky.dev</span>
              </a>
            </div>

            <div className="mt-4 p-3 bg-[#3A3A3A] border border-[#4A4A4A] rounded-sm">
              <p className="text-[10px] text-[#888888]" style={{ fontFamily: 'var(--font-mono)' }}>
                💡 Found a bug or have a feature request? Open an issue on GitHub!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowFeedbackModal(false)}>
          <div className="bg-[#2D2D2D] border border-[#3C7FD5] rounded-sm p-6 max-w-md w-full mx-4 select-text" style={{ boxShadow: '0 8px 24px rgba(0, 0, 0, 0.8)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-[#FFFFFF]" style={{ fontFamily: 'var(--font-body)' }}>Join the Timmkoo Modders Discord!</h3>
                <p className="text-[10px] text-[#888888] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>We'd love your feedback and ideas. Join the <a href="https://discord.gg/3zbfaTNN7V" target="_blank" rel="noopener noreferrer" className="text-[#3C7FD5] underline">Timmkoo Modders Discord</a> and head to the <span className="font-bold text-[#3C7FD5]">#themes</span> channel!</p>
              </div>
              <button 
                onClick={() => setShowFeedbackModal(false)}
                className="p-1 hover:bg-[#3A3A3A] transition-colors text-[#CCCCCC] hover:text-[#FFFFFF] rounded-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuBar;
