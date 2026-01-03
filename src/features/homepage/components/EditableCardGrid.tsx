import { memo, Suspense, useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { useHomepageStore, type CardId } from '@/stores/homepageStore';
import { CARD_REGISTRY } from '../cardRegistry';
import { CardWrapper } from './CardWrapper';
import { AddCardModal } from './AddCardModal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface EditableCardGridProps {
  className?: string;
}

export const EditableCardGrid = memo(function EditableCardGrid({
  className = '',
}: EditableCardGridProps) {
  const { cards, isEditMode, reorderCards, removeCard } = useHomepageStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Sort cards by order
  const sortedCards = [...cards].sort((a, b) => a.order - b.order);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = sortedCards.findIndex((c) => c.id === active.id);
        const newIndex = sortedCards.findIndex((c) => c.id === over.id);

        const newCards = arrayMove(sortedCards, oldIndex, newIndex);
        reorderCards(newCards);
      }
    },
    [sortedCards, reorderCards]
  );

  const handleRemoveCard = useCallback(
    (cardId: CardId) => {
      removeCard(cardId);
    },
    [removeCard]
  );

  // Loading fallback for lazy-loaded cards
  const CardLoadingFallback = (
    <div className="bg-white dark:bg-secondary-800 rounded-3xl border border-secondary-200 dark:border-secondary-700 p-8 flex items-center justify-center min-h-[120px]">
      <LoadingSpinner />
    </div>
  );

  return (
    <div className={className}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedCards.map((c) => c.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
            {sortedCards.map((cardConfig) => {
              const definition = CARD_REGISTRY[cardConfig.id];
              if (!definition) return null;

              const CardComponent = definition.component;

              return (
                <CardWrapper
                  key={cardConfig.id}
                  id={cardConfig.id}
                  size={cardConfig.size}
                  isEditMode={isEditMode}
                  onRemove={handleRemoveCard}
                >
                  <Suspense fallback={CardLoadingFallback}>
                    <CardComponent />
                  </Suspense>
                </CardWrapper>
              );
            })}

            {/* Add Card Button (only in edit mode) */}
            {isEditMode && (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="min-h-[120px] rounded-3xl border-2 border-dashed border-secondary-300 dark:border-secondary-600 flex flex-col items-center justify-center gap-2 text-secondary-500 dark:text-secondary-400 hover:border-secondary-400 dark:hover:border-secondary-500 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors"
              >
                <Plus size={24} />
                <span className="text-sm font-medium">Add Card</span>
              </button>
            )}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add Card Modal */}
      <AddCardModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
});
