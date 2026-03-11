import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/theme';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  dynamicColors: any; // Using any to avoid complex type mapping for now
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const getDynamicColors = (isDarkMode: boolean) => {
  if (isDarkMode && COLORS.dark) {
    return {
      ...COLORS,
      primary: COLORS.dark.primary,
      secondary: COLORS.dark.secondary,
      textDark: COLORS.dark.textDark,
      textLight: COLORS.dark.textLight,
      textMuted: COLORS.dark.textMuted,
      backgroundLight: COLORS.dark.backgroundLight,
      backgroundDark: COLORS.dark.backgroundDark,
      card: COLORS.dark.card,
      border: COLORS.dark.border,
      error: COLORS.dark.error,
    };
  } else {
    return COLORS;
  }
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoadingTheme, setIsLoadingTheme] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('isDarkMode');
        if (storedTheme !== null) {
          setIsDarkMode(JSON.parse(storedTheme));
        }
      } catch (error) {
        console.error("Failed to load theme from storage", error);
      } finally {
        setIsLoadingTheme(false);
      }
    };
    loadTheme();
  }, []);

  const toggleDarkMode = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    try {
      await AsyncStorage.setItem('isDarkMode', JSON.stringify(newMode));
    } catch (error) {
      console.error("Failed to save theme to storage", error);
    }
  };

  const dynamicColors = getDynamicColors(isDarkMode);

  if (isLoadingTheme) {
    return null; 
  }

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, dynamicColors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // This error happens if useTheme is called outside ThemeProvider
    // We'll return a default theme to prevent crash in some edge cases during development
    return {
      isDarkMode: false,
      toggleDarkMode: () => {},
      dynamicColors: COLORS
    };
  }
  return context;
};
