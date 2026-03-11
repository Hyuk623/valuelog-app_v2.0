import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FontSize = 'small' | 'medium' | 'large';

interface UIState {
    fontSize: FontSize;
    setFontSize: (size: FontSize) => void;
}

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            fontSize: 'medium',
            setFontSize: (size) => set({ fontSize: size }),
        }),
        {
            name: 'valuelog-ui-storage',
        }
    )
);
