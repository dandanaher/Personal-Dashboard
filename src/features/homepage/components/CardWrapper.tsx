import { memo, type ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X } from 'lucide-react';
import type { CardId, CardSize } from '@/stores/homepageStore';

interface CardWrapperProps {
  id: CardId;
  size: CardSize;
  isEditMode: boolean;
  onRemove: (id: CardId) => void;
  children: ReactNode;
}

export const CardWrapper = memo(function CardWrapper({
  id,
  size,
  isEditMode,
  onRemove,
  children,
}: CardWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Determine grid column span based on size
  const colSpanClass = size === 2 ? 'lg:col-span-2' : '';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative h-full ${colSpanClass} ${isEditMode ? 'group cursor-grab active:cursor-grabbing' : ''} [&>*:first-child]:h-full`}
      {...(isEditMode ? { ...attributes, ...listeners } : {})}
    >
      {children}

      {/* Edit mode overlay controls */}
      {isEditMode && (
        <>
          {/* Remove button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(id);
            }}
            className="absolute -top-2 -right-2 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
          >
            <X size={14} />
          </button>

          {/* Edit mode border indicator */}
          <div className="absolute inset-0 rounded-3xl border-2 border-dashed border-secondary-300 dark:border-secondary-600 pointer-events-none" />
        </>
      )}
    </div>
  );
});
