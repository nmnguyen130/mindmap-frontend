import React, { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme } from "react-native";

import { databaseService } from "@/shared/database/sqlite-client";

export type Theme = "light" | "dark" | "system";

export interface ThemeColors {
  // Primary colors
  primary: string;
  primaryForeground: string;

  // Secondary colors
  secondary: string;
  secondaryForeground: string;

  // Background colors
  background: string;
  foreground: string;

  // Surface colors
  surface: string;
  surfaceForeground: string;

  // Border colors
  border: string;

  // Node colors (for mind map)
  nodeBackground: string;
  nodeForeground: string;
  nodeBorder: string;

  // Connection colors
  connection: string;
  connectionHover: string;

  // Status colors
  success: string;
  warning: string;
  error: string;

  // Text colors
  muted: string;
  mutedForeground: string;
}

const lightTheme: ThemeColors = {
  primary: "#3b82f6",
  primaryForeground: "#ffffff",
  secondary: "#f1f5f9",
  secondaryForeground: "#0f172a",
  background: "#ffffff",
  foreground: "#0f172a",
  surface: "#f8fafc",
  surfaceForeground: "#1e293b",
  border: "#e2e8f0",
  nodeBackground: "#ffffff",
  nodeForeground: "#1e293b",
  nodeBorder: "#cbd5e1",
  connection: "#60a5fa",
  connectionHover: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  muted: "#6b7280",
  mutedForeground: "#9ca3af",
};

const darkTheme: ThemeColors = {
  primary: "#3b82f6",
  primaryForeground: "#ffffff",
  secondary: "#1e293b",
  secondaryForeground: "#f8fafc",
  background: "#0f172a",
  foreground: "#f8fafc",
  surface: "#1e293b",
  surfaceForeground: "#f1f5f9",
  border: "#334155",
  nodeBackground: "#1e293b",
  nodeForeground: "#f1f5f9",
  nodeBorder: "#475569",
  connection: "#60a5fa",
  connectionHover: "#93c5fd",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  muted: "#9ca3af",
  mutedForeground: "#6b7280",
};

interface ThemeContextType {
  theme: Theme;
  colors: ThemeColors;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

export const ThemeProvider = ({
  children,
  defaultTheme = "system",
}: ThemeProviderProps) => {
  const deviceTheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [isLoading, setIsLoading] = useState(true);

  // Load theme from SQLite on mount
  useEffect(() => {
    async function loadTheme() {
      try {
        const db = await databaseService.initialize();
        const result = await db.getFirstAsync<{ value: string }>(
          "SELECT value FROM settings WHERE key = 'theme'"
        );
        if (result?.value) {
          setThemeState(result.value as Theme);
        }
      } catch (error) {
        console.log("Could not load theme from database:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadTheme();
  }, []);

  const isDark =
    theme === "dark" || (theme === "system" && deviceTheme === "dark");
  const colors = isDark ? darkTheme : lightTheme;

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    // Save to SQLite
    try {
      const db = await databaseService.initialize();
      await db.runAsync(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('theme', ?)",
        [newTheme]
      );
      // console.log("Theme saved to database:", newTheme);
    } catch (error) {
      console.error("Could not save theme to database:", error);
    }
  };

  const value = {
    theme,
    colors,
    setTheme,
    isDark,
  };

  // Don't render children until theme is loaded
  if (isLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
