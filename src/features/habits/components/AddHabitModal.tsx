import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { ColorPicker } from './ColorPicker';
import { HABIT_COLORS } from './habitColors';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useThemeStore, getColorVariants } from '@/stores/themeStore';
import type { Habit } from '@/lib/types';

interface AddHabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    name: string,
    color: string,
    description?: string,
    habitType?: string
  ) => Promise<boolean>;
  editingHabit?: Habit | null;
  onUpdate?: (
    id: string,
    updates: { name: string; color: string; description?: string; habitType?: string }
  ) => Promise<boolean>;
  existingTypes?: string[];
  defaultType?: string | null; // Pre-fill habit type when adding new habit
}

export function AddHabitModal({
  isOpen,
  onClose,
  onSave,
  editingHabit,
  onUpdate,
  existingTypes = [],
  defaultType,
}: AddHabitModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string>(HABIT_COLORS[0].value);
  const [habitType, setHabitType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);

  const accentColor = useThemeStore((state) => state.accentColor);
  const accentVariants = getColorVariants(accentColor);

  const isEditing = !!editingHabit;

  // Reset form when modal opens/closes or when editing habit changes
  useEffect(() => {
    if (isOpen) {
      if (editingHabit) {
        setName(editingHabit.name);
        setDescription(editingHabit.description || '');
        setColor(editingHabit.color);
        setHabitType(editingHabit.habit_type || '');
      } else {
        setName('');
        setDescription('');
        setColor(HABIT_COLORS[0].value);
        setHabitType(defaultType || '');
      }
    }
  }, [isOpen, editingHabit, defaultType]);

  // Prevent body scroll when modal is open
  useScrollLock(isOpen);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    setIsSubmitting(true);

    let success = false;

    if (isEditing && onUpdate && editingHabit) {
      success = await onUpdate(editingHabit.id, {
        name: name.trim(),
        color,
        description: description.trim() || undefined,
        habitType: habitType.trim() || undefined,
      });
    } else {
      success = await onSave(
        name.trim(),
        color,
        description.trim() || undefined,
        habitType.trim() || undefined
      );
    }

    setIsSubmitting(false);

    if (success) {
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed top-0 left-0 w-full h-full z-[60] flex items-end md:items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div
        className="
          w-full md:max-w-md
          bg-white dark:bg-secondary-900
          rounded-t-3xl md:rounded-3xl
          shadow-xl
          animate-slide-up md:animate-fade-in
          max-h-[90vh] overflow-y-auto
        "
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-secondary-200 dark:border-secondary-700">
          <h2 id="modal-title" className="text-lg font-semibold text-secondary-900 dark:text-white">
            {isEditing ? 'Edit Habit' : 'New Habit'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-secondary-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={(event) => void handleSubmit(event)} className="p-4 space-y-4">
          {/* Name Input */}
          <div>
            <label
              htmlFor="habit-name"
              className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1"
            >
              Habit Name
            </label>
            <Input
              id="habit-name"
              type="text"
              placeholder="e.g., Meditation, Exercise, Read..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Description Input */}
          <div>
            <label
              htmlFor="habit-description"
              className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1"
            >
              Description <span className="text-secondary-400">(optional)</span>
            </label>
            <textarea
              id="habit-description"
              placeholder="Add notes or details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              rows={3}
              className="
                w-full px-4 py-3 rounded-lg
                border border-secondary-300 dark:border-secondary-600
                bg-white dark:bg-secondary-800
                text-secondary-900 dark:text-white
                placeholder:text-secondary-400
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                disabled:opacity-50 disabled:cursor-not-allowed
                resize-none
              "
            />
          </div>

          {/* Habit Type Input */}
          <div>
            <label
              htmlFor="habit-type"
              className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1"
            >
              Type/Tag <span className="text-secondary-400">(optional)</span>
            </label>
            <Input
              id="habit-type"
              type="text"
              placeholder="e.g., Health, Productivity, Personal..."
              value={habitType}
              onChange={(e) => setHabitType(e.target.value)}
              disabled={isSubmitting}
            />
            {existingTypes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {existingTypes.map((type) => {
                  const isHovered = hoveredTag === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setHabitType(type)}
                      onMouseEnter={() => setHoveredTag(type)}
                      onMouseLeave={() => setHoveredTag(null)}
                      disabled={isSubmitting}
                      className={`
                        px-3 py-1 rounded-full text-xs font-medium
                        transition-colors
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${!isHovered ? 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300' : ''}
                      `}
                      style={{
                        backgroundColor: isHovered ? accentVariants.light : undefined,
                        color: isHovered ? accentColor : undefined,
                      }}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Color
            </label>
            <ColorPicker value={color} onChange={setColor} />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              fullWidth
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!name.trim()}
              isLoading={isSubmitting}
              fullWidth
            >
              {isEditing ? 'Save Changes' : 'Create Habit'}
            </Button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>,
    document.body
  );
}
