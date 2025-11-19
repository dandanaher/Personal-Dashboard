import { useState, useRef, useEffect } from 'react';
import { Plus, ChevronDown, ChevronUp, Calendar, X } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { useThemeStore } from '@/stores/themeStore';

interface AddTaskFormProps {
  onAdd: (title: string, description?: string, date?: string | null) => Promise<boolean>;
  /** The default date for new tasks (null for dateless) */
  defaultDate?: string | null;
  /** Whether to show the date toggle option */
  showDateToggle?: boolean;
}

export function AddTaskForm({ onAdd, defaultDate, showDateToggle = false }: AddTaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showDescription, setShowDescription] = useState(false);
  const [isDateless, setIsDateless] = useState(defaultDate === null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const { accentColor } = useThemeStore();

  // Auto-focus title input when form is rendered
  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    setIsSubmitting(true);

    // Determine the date to use
    const taskDate = isDateless ? null : defaultDate;

    const success = await onAdd(
      trimmedTitle,
      description.trim() || undefined,
      taskDate
    );

    setIsSubmitting(false);

    if (success) {
      // Clear form
      setTitle('');
      setDescription('');
      setShowDescription(false);
      setIsDateless(defaultDate === null);
      // Re-focus title input for quick entry
      titleInputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Enter in title field (unless Shift is held for multiline)
    if (e.key === 'Enter' && !e.shiftKey && e.currentTarget === titleInputRef.current) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            ref={titleInputRef}
            type="text"
            placeholder="Add a task..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
            className="w-full"
            aria-label="Task title"
          />
        </div>
        <Button
          type="submit"
          disabled={!title.trim() || isSubmitting}
          isLoading={isSubmitting}
          className="flex-shrink-0"
        >
          <Plus className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">Add</span>
        </Button>
      </div>

      {/* Options row */}
      <div className="flex items-center gap-4">
        {/* Description toggle */}
        <button
          type="button"
          onClick={() => setShowDescription(!showDescription)}
          className="
            flex items-center gap-1 text-sm text-secondary-500 dark:text-secondary-400
            hover:text-secondary-700 dark:hover:text-secondary-300
            transition-colors
          "
        >
          {showDescription ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Hide description
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Add description
            </>
          )}
        </button>

        {/* Dateless toggle */}
        {showDateToggle && defaultDate !== null && (
          <button
            type="button"
            onClick={() => setIsDateless(!isDateless)}
            className={`
              flex items-center gap-1 text-sm transition-colors
              ${isDateless
                ? 'text-secondary-700 dark:text-secondary-300'
                : 'text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300'
              }
            `}
          >
            {isDateless ? (
              <>
                <X className="h-3 w-3" />
                No date
              </>
            ) : (
              <>
                <Calendar className="h-3 w-3" />
                With date
              </>
            )}
          </button>
        )}
      </div>

      {/* Description field */}
      {showDescription && (
        <div>
          <textarea
            placeholder="Task description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
            rows={2}
            className="
              w-full px-3 py-2 rounded-lg
              bg-white dark:bg-secondary-900
              border border-secondary-300 dark:border-secondary-700
              text-secondary-900 dark:text-white
              placeholder-secondary-400 dark:placeholder-secondary-500
              focus:outline-none focus:ring-2 focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              resize-none
              text-sm
            "
            style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
            aria-label="Task description"
          />
        </div>
      )}
    </form>
  );
}

export default AddTaskForm;
