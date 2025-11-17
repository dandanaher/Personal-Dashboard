import { useState, useRef, useEffect } from 'react';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { Button, Input } from '@/components/ui';

interface AddTaskFormProps {
  onAdd: (title: string, description?: string) => Promise<boolean>;
}

export function AddTaskForm({ onAdd }: AddTaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showDescription, setShowDescription] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus title input when form is rendered
  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    setIsSubmitting(true);

    const success = await onAdd(
      trimmedTitle,
      description.trim() || undefined
    );

    setIsSubmitting(false);

    if (success) {
      // Clear form
      setTitle('');
      setDescription('');
      setShowDescription(false);
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

      {/* Description toggle and field */}
      <div>
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

        {showDescription && (
          <div className="mt-2">
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
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                disabled:opacity-50 disabled:cursor-not-allowed
                resize-none
                text-sm
              "
              aria-label="Task description"
            />
          </div>
        )}
      </div>
    </form>
  );
}

export default AddTaskForm;
