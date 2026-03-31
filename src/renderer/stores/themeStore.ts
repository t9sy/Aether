import { create } from 'zustand';

export type ThemeName = 'aura-light' | 'deep-night' | 'cyberpunk';

interface ThemeState {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const getStoredTheme = (): ThemeName => {
  try {
    const stored = localStorage.getItem('aura-theme');
    if (stored === 'aura-light' || stored === 'deep-night' || stored === 'cyberpunk') {
      return stored;
    }
  } catch {}
  return 'deep-night';
};

export const useThemeStore = create<ThemeState>((set) => ({
  theme: getStoredTheme(),
  setTheme: (theme: ThemeName) => {
    localStorage.setItem('aura-theme', theme);
    set({ theme });
  },
}));
