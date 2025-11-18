import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { ColorPicker, HABIT_COLORS } from './ColorPicker';
import type { Habit } from '@/lib/types';

interface AddHabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, color: string, description?: string) => Promise<boolean>;
  editingHabit?: Habit | null;
  onUpdate?: (id: string, updates: { name: string; color: string; description?: string }) => Promise<boolean>;
}

export function AddHabitModal({
  isOpen,
  onClose,
  onSave,
  editingHabit,
  onUpdate,
}: AddHabitModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string>(HABIT_COLORS[0].value);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!editingHabit;

  // Reset form when modal opens/closes or when editing habit changes
  useEffect(() => {
    if (isOpen) {
      if (editingHabit) {
        setName(editingHabit.name);
        setDescription(editingHabit.description || '');
        setColor(editingHabit.color);
      } else {
        setName('');
        setDescription('');
        setColor(HABIT_COLORS[0].value);
      }
      // Focus input after a brief delay for animation
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, editingHabit]);

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
      });
    } else {
      success = await onSave(name.trim(), color, description.trim() || undefined);
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div
        className="
          w-full md:max-w-md
          bg-white dark:bg-secondary-900
          rounded-t-2xl md:rounded-2xl
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
          <h2
            id="modal-title"
            className="text-lg font-semibold text-secondary-900 dark:text-white"
          >
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
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name Input */}
          <div>
            <label
              htmlFor="habit-name"
              className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1"
            >
              Habit Name
            </label>
            <Input
              ref={nameInputRef}
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
    </div>
  );
}
