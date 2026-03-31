import { create } from 'zustand';

export interface Essential {
  id: string;
  url: string;
  title: string;
  favicon: string;
}

interface EssentialsState {
  essentials: Essential[];
  addEssential: (essential: Omit<Essential, 'id'>) => void;
  removeEssential: (id: string) => void;
}

const MAX_ESSENTIALS = 5;

const loadEssentials = (): Essential[] => {
  try {
    return JSON.parse(localStorage.getItem('aura-essentials') || '[]');
  } catch { return []; }
};

export const useEssentialsStore = create<EssentialsState>((set) => ({
  essentials: loadEssentials(),
  addEssential: (essential) => set((state) => {
    if (state.essentials.length >= MAX_ESSENTIALS) return state;
    const newEssential = { ...essential, id: Date.now().toString() };
    const updated = [...state.essentials, newEssential];
    localStorage.setItem('aura-essentials', JSON.stringify(updated));
    return { essentials: updated };
  }),
  removeEssential: (id) => set((state) => {
    const updated = state.essentials.filter(e => e.id !== id);
    localStorage.setItem('aura-essentials', JSON.stringify(updated));
    return { essentials: updated };
  }),
}));
