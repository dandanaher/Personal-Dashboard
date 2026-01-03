import { memo } from 'react';
import { X, Plus } from 'lucide-react';
import { CARD_REGISTRY, ALL_CARD_IDS } from '../cardRegistry';
import { useHomepageStore, type CardId } from '@/stores/homepageStore';

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddCardModal = memo(function AddCardModal({ isOpen, onClose }: AddCardModalProps) {
  const { cards, addCard } = useHomepageStore();

  if (!isOpen) return null;

  // Get cards that are not already added
  const activeCardIds = new Set(cards.map((c) => c.id));
  const availableCards = ALL_CARD_IDS.filter((id) => !activeCardIds.has(id));

  const handleAddCard = (cardId: CardId) => {
    addCard(cardId);
    // Don't close modal - let user add multiple cards
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-secondary-800 rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-secondary-200 dark:border-secondary-700 flex items-center justify-between">
          <h3 className="font-semibold text-secondary-900 dark:text-white">Add Card</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
          >
            <X size={20} className="text-secondary-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {availableCards.length === 0 ? (
            <p className="text-center text-secondary-500 dark:text-secondary-400 py-4">
              All cards have been added to your homepage.
            </p>
          ) : (
            <div className="space-y-2">
              {availableCards.map((cardId) => {
                const definition = CARD_REGISTRY[cardId];
                return (
                  <button
                    key={cardId}
                    type="button"
                    onClick={() => handleAddCard(cardId)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-secondary-200 dark:border-secondary-700 hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors text-left"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-secondary-100 dark:bg-secondary-700 flex items-center justify-center">
                      <Plus size={18} className="text-secondary-500 dark:text-secondary-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-secondary-900 dark:text-white">
                        {definition.name}
                      </p>
                      <p className="text-xs text-secondary-500 dark:text-secondary-400 truncate">
                        {definition.description}
                        {definition.defaultSize === 2 && ' (Double width)'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-secondary-200 dark:border-secondary-700 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
});
