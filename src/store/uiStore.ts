import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FontSize = 'small' | 'medium' | 'large';
export type Theme = 'light' | 'dark';

interface UIState {
    fontSize: FontSize;
    setFontSize: (size: FontSize) => void;
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            fontSize: 'medium',
            setFontSize: (size) => set({ fontSize: size }),
            theme: 'light',
            setTheme: (theme) => set({ theme }),
        }),
        {
            name: 'valuelog-ui-storage',
        }
    )
);
