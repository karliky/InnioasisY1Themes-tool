import React, { createContext, useContext } from 'react';
import { LoadedTheme } from '../types';

export interface ThemeContextType {
  activeTheme: LoadedTheme | null;
  availableThemes: LoadedTheme[];
  isLeftSidebarOpen: boolean;
  isRightSidebarOpen: boolean;
  deviceColor: 'black' | 'silver' | 'yellow' | 'teal' | 'blue' | 'orange';
  
  // Actions
  setActiveTheme: (theme: LoadedTheme | null) => void;
  setIsLeftSidebarOpen: (open: boolean) => void;
  setIsRightSidebarOpen: (open: boolean) => void;
  setDeviceColor: (color: 'black' | 'silver' | 'yellow' | 'teal' | 'blue' | 'orange') => void;
  deleteTheme: (themeId: string) => Promise<void>;
  saveTheme: () => Promise<void>;
  exportTheme: (format: 'zip' | 'metadata') => Promise<void>;
  revertTheme: () => Promise<void>;
  duplicateTheme: () => Promise<LoadedTheme | null>;
  cloneCurrentTheme: () => Promise<LoadedTheme | null>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within ThemeContextProvider');
  }
  return context;
};

export default ThemeContext;
