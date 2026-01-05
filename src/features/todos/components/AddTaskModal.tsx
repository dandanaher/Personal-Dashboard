import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckSquare, Calendar, Flag } from 'lucide-react';
import { format } from 'date-fns';
import { Button, Input } from '@/components/ui';
import { Task, TaskPriority } from '@/lib/types';
import { useThemeStore, getColorVariants } from '@/stores/themeStore';
import { useScrollLock } from '@/hooks/useScrollLock';

// Priority configuration (ordered: None -> Low -> Medium -> High)
const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: null, label: 'None', color: '#9CA3AF' },
  { value: 3, label: 'Low', color: '#3B82F6' },
  { value: 2, label: 'Medium', color: '#F59E0B' },
  { value: 1, label: 'High', color: '#EF4444' },
];

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: {
    title: string;
    description?: string | null;
    date?: string | null;
    task_type?: string | null;
    priority?: TaskPriority;
  }) => Promise<boolean>;
  editingTask?: Task | null;
  existingTypes: string[];
  defaultDate?: string | null;
  defaultTag?: string | null;
}

export function AddTaskModal({
  isOpen,
  onClose,
  onSave,
  editingTask,
  existingTypes,
  defaultDate,
  defaultTag,
}: AddTaskModalProps) {
  const { accentColor } = useThemeStore();
  const accentVariants = getColorVariants(accentColor);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<string>('');
  const [hasDate, setHasDate] = useState(true);
  const [taskType, setTaskType] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);

  // Reset form when modal opens/closes or editing task changes
  useEffect(() => {
    if (isOpen) {
      if (editingTask) {
        setTitle(editingTask.title);
        setDescription(editingTask.description || '');
        setDate(editingTask.date || '');
        setHasDate(editingTask.date !== null);
        setTaskType(editingTask.task_type || '');
        setPriority(editingTask.priority);
      } else {
        setTitle('');
        setDescription('');
        if (defaultDate) {
          setDate(defaultDate);
          setHasDate(true);
        } else {
          setDate(format(new Date(), 'yyyy-MM-dd'));
          setHasDate(false);
        }
        setTaskType(defaultTag || '');
        setPriority(null);
      }
      setError(null);
    }
  }, [isOpen, editingTask, defaultDate, defaultTag]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const success = await onSave({
        title: title.trim(),
        description: description.trim() || null,
        date: hasDate ? date : null,
        task_type: taskType.trim() || null,
        priority,
      });

      if (success) {
        onClose();
      } else {
        setError('Failed to save task. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useScrollLock(isOpen);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed top-0 left-0 w-full h-full z-[60] flex items-end md:items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      {/* Modal */}
      <div
        className="
          w-full md:max-w-md
          bg-white dark:bg-secondary-900
          rounded-t-3xl md:rounded-3xl
          shadow-xl
          animate-slide-up md:animate-fade-in
          max-h-[90vh] overflow-hidden
        "
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
      >
        {/* Handle bar for mobile */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-secondary-300 dark:bg-secondary-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-secondary-200 dark:border-secondary-700">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5" style={{ color: accentColor }} />
            <h2
              id="task-modal-title"
              className="text-lg font-semibold text-secondary-900 dark:text-white"
            >
              {editingTask ? 'Edit Task' : 'New Task'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-secondary-500" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="p-4 space-y-4 overflow-y-auto overflow-x-hidden max-h-[calc(90vh-8rem)]"
        >
          {/* Error message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label
              htmlFor="task-title"
              className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1"
            >
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              id="task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Review project proposal"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="task-description"
              className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1"
            >
              Description
            </label>
            <textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about your task..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:border-transparent resize-none"
              style={{
                '--tw-ring-color': accentColor,
              } as React.CSSProperties}
            />
          </div>

          {/* Date */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
                <Calendar className="w-4 h-4 inline mr-1" />
                Due Date
              </label>
              <button
                type="button"
                onClick={() => setHasDate(!hasDate)}
                className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
              >
                {hasDate ? 'Remove date' : 'Add date'}
              </button>
            </div>
            {hasDate && (
              <Input
                id="task-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              <Flag className="w-4 h-4 inline mr-1" />
              Priority
            </label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => {
                const isSelected = priority === p.value;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    disabled={isSaving}
                    className={`
                      flex-1 px-3 py-2 rounded-lg text-xs font-medium
                      transition-all duration-150
                      border-2
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${isSelected
                        ? 'text-white'
                        : 'bg-white dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 border-secondary-200 dark:border-secondary-600 hover:border-secondary-300 dark:hover:border-secondary-500'
                      }
                    `}
                    style={isSelected ? {
                      backgroundColor: p.color,
                      borderColor: p.color,
                    } : undefined}
                  >
                    {p.value && <Flag className="w-3 h-3 inline mr-1" />}
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Task Type */}
          <div>
            <label
              htmlFor="task-type"
              className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1"
            >
              Tag (Optional)
            </label>
            <Input
              id="task-type"
              type="text"
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              placeholder="e.g., Work, Personal, Errands"
            />
            {existingTypes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {existingTypes.map((type) => {
                  const isHovered = hoveredTag === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setTaskType(type)}
                      onMouseEnter={() => setHoveredTag(type)}
                      onMouseLeave={() => setHoveredTag(null)}
                      disabled={isSaving}
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

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              isLoading={isSaving}
              disabled={isSaving || !title.trim()}
            >
              {editingTask ? 'Save Changes' : 'Create Task'}
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

export default AddTaskModal;
