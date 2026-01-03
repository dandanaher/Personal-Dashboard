import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Available card types
export type CardId = 'tasks' | 'habits' | 'goals' | 'mood-tracker' | 'mood-yearly';

// Card size in grid columns (1 = normal, 2 = double width)
export type CardSize = 1 | 2;

// Card configuration stored in state
export interface CardConfig {
  id: CardId;
  size: CardSize;
  order: number;
}

interface HomepageState {
  cards: CardConfig[];
  isEditMode: boolean;

  // Actions
  setEditMode: (enabled: boolean) => void;
  addCard: (cardId: CardId, defaultSize?: CardSize) => void;
  removeCard: (cardId: CardId) => void;
  reorderCards: (cards: CardConfig[]) => void;
  setCardSize: (cardId: CardId, size: CardSize) => void;
  resetToDefault: () => void;
}

// Default card configuration
const DEFAULT_CARDS: CardConfig[] = [
  { id: 'tasks', size: 1, order: 0 },
  { id: 'habits', size: 1, order: 1 },
  { id: 'goals', size: 1, order: 2 },
];

// Default sizes for each card type
const DEFAULT_CARD_SIZES: Record<CardId, CardSize> = {
  'tasks': 1,
  'habits': 1,
  'goals': 1,
  'mood-tracker': 1,
  'mood-yearly': 2,
};

export const useHomepageStore = create<HomepageState>()(
  persist(
    (set, get) => ({
      cards: DEFAULT_CARDS,
      isEditMode: false,

      setEditMode: (enabled) => set({ isEditMode: enabled }),

      addCard: (cardId, defaultSize) => {
        const { cards } = get();
        // Don't add if already exists
        if (cards.some((c) => c.id === cardId)) return;

        const size = defaultSize ?? DEFAULT_CARD_SIZES[cardId];
        set({
          cards: [
            ...cards,
            {
              id: cardId,
              size,
              order: cards.length,
            },
          ],
        });
      },

      removeCard: (cardId) => {
        const { cards } = get();
        const filtered = cards.filter((c) => c.id !== cardId);
        // Re-index orders
        const reordered = filtered.map((card, index) => ({
          ...card,
          order: index,
        }));
        set({ cards: reordered });
      },

      reorderCards: (cards) => {
        // Ensure orders are sequential
        const reordered = cards.map((card, index) => ({
          ...card,
          order: index,
        }));
        set({ cards: reordered });
      },

      setCardSize: (cardId, size) => {
        set({
          cards: get().cards.map((c) => (c.id === cardId ? { ...c, size } : c)),
        });
      },

      resetToDefault: () => set({ cards: DEFAULT_CARDS, isEditMode: false }),
    }),
    {
      name: 'mydash-homepage-layout',
    }
  )
);
