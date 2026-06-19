import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export type Theme = "light" | "dark" | "blue";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  highContrast: boolean;
  toggleHighContrast: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const HIGH_CONTRAST_LINK_ID = "high-contrast-css";
const THEME_CLASSES: Record<Theme, string | null> = {
  light: null,
  dark: "dark",
  blue: "theme-blue",
};

function isValidTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "blue";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem("mpbf_theme");
    return isValidTheme(stored) ? stored : "light";
  });

  const [highContrast, setHighContrast] = useState<boolean>(() => {
    return localStorage.getItem("mpbf_high_contrast") === "true";
  });

  useEffect(() => {
    const root = document.documentElement;
    // Remove all theme classes first, then apply the active one.
    Object.values(THEME_CLASSES).forEach((cls) => {
      if (cls) root.classList.remove(cls);
    });
    const activeClass = THEME_CLASSES[theme];
    if (activeClass) {
      root.classList.add(activeClass);
    }
    localStorage.setItem("mpbf_theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("mpbf_high_contrast", String(highContrast));

    if (highContrast) {
      if (!document.getElementById(HIGH_CONTRAST_LINK_ID)) {
        const link = document.createElement("link");
        link.id = HIGH_CONTRAST_LINK_ID;
        link.rel = "stylesheet";
        link.href = "/client/src/index-high-contrast.css";
        document.head.appendChild(link);
      }
      document.documentElement.classList.add("high-contrast");
    } else {
      const existing = document.getElementById(HIGH_CONTRAST_LINK_ID);
      if (existing) {
        existing.remove();
      }
      document.documentElement.classList.remove("high-contrast");
    }
  }, [highContrast]);

  // Cycle through the available themes: light -> dark -> blue -> light.
  const toggleTheme = () => {
    setThemeState((prev) =>
      prev === "light" ? "dark" : prev === "dark" ? "blue" : "light",
    );
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleHighContrast = () => {
    setHighContrast((prev) => !prev);
  };

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, setTheme, highContrast, toggleHighContrast }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
