import { useState, useRef } from 'react';
import { Check, Trash2, Pencil, X, Save } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { useThemeStore } from '@/stores/themeStore';
import type { Task, TaskUpdate } from '@/lib/types';

interface TaskItemProps {
  task: Task;
  onToggle: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onEdit?: (taskId: string, updates: TaskUpdate) => Promise<boolean>;
  showDate?: boolean;
}

export function TaskItem({ task, onToggle, onDelete, onEdit, showDate = false }: TaskItemProps) {
  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || '');
  const [isSaving, setIsSaving] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);
  const { accentColor } = useThemeStore();

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;

    // Only swipe horizontally if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      isSwiping.current = true;
      // Only allow left swipe (negative deltaX)
      const newTranslateX = Math.min(0, Math.max(-80, deltaX));
      setTranslateX(newTranslateX);
    }
  };

  const handleTouchEnd = () => {
    // Snap to show delete button if swiped more than 40px
    if (translateX < -40) {
      setTranslateX(-80);
      setShowDelete(true);
    } else {
      setTranslateX(0);
      setShowDelete(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(task.id);
    setIsDeleting(false);
  };

  const resetSwipe = () => {
    setTranslateX(0);
    setShowDelete(false);
  };

  const handleStartEdit = () => {
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setIsEditing(true);
    resetSwipe();
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle(task.title);
    setEditDescription(task.description || '');
  };

  const handleSaveEdit = async () => {
    if (!onEdit) return;

    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) return;

    setIsSaving(true);
    const success = await onEdit(task.id, {
      title: trimmedTitle,
      description: editDescription.trim() || null,
    });
    setIsSaving(false);

    if (success) {
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Format date for display
  const formatTaskDate = (dateStr: string | null) => {
    if (!dateStr) return 'No date';
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
    if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Edit mode rendering
  if (isEditing) {
    return (
      <div className="bg-white dark:bg-secondary-800 rounded-lg p-4 space-y-3">
        <Input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Task title"
          autoFocus
          className="w-full"
        />
        <textarea
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Description (optional)"
          rows={2}
          className="
            w-full px-3 py-2 rounded-lg
            bg-white dark:bg-secondary-900
            border border-secondary-300 dark:border-secondary-700
            text-secondary-900 dark:text-white
            placeholder-secondary-400 dark:placeholder-secondary-500
            focus:outline-none focus:ring-2 focus:border-transparent
            resize-none text-sm
          "
          style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
        />
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancelEdit}
            disabled={isSaving}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSaveEdit}
            disabled={!editTitle.trim() || isSaving}
            isLoading={isSaving}
          >
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Delete button revealed on swipe */}
      <div className="absolute inset-y-0 right-0 flex items-center bg-red-500 px-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-white hover:text-white hover:bg-red-600 p-2"
          aria-label="Delete task"
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>

      {/* Task content */}
      <div
        className={`
          relative bg-white dark:bg-secondary-800
          transition-transform duration-200 ease-out
          ${showDelete ? '' : 'hover:bg-secondary-50 dark:hover:bg-secondary-700'}
        `}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => showDelete && resetSwipe()}
      >
        <div className="flex items-start gap-3 p-4">
          {/* Checkbox */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!showDelete) {
                onToggle(task.id);
              }
            }}
            className={`
              flex-shrink-0 w-6 h-6 rounded-full border-2
              flex items-center justify-center
              transition-all duration-200 ease-in-out
              focus:outline-none focus:ring-2 focus:ring-offset-2
              ${task.completed
                ? 'text-white'
                : 'border-secondary-300 dark:border-secondary-600'
              }
            `}
            style={{
              backgroundColor: task.completed ? accentColor : undefined,
              borderColor: task.completed ? accentColor : undefined,
              '--tw-ring-color': accentColor,
            } as React.CSSProperties}
            aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
          >
            {task.completed && <Check className="h-4 w-4" />}
          </button>

          {/* Task text */}
          <div className="flex-1 min-w-0">
            <p
              className={`
                text-base transition-all duration-200
                ${task.completed
                  ? 'text-secondary-400 dark:text-secondary-500 line-through'
                  : 'text-secondary-900 dark:text-white'
                }
              `}
            >
              {task.title}
            </p>
            {task.description && (
              <p
                className={`
                  text-sm mt-1 transition-all duration-200
                  ${task.completed
                    ? 'text-secondary-400 dark:text-secondary-600 line-through'
                    : 'text-secondary-500 dark:text-secondary-400'
                  }
                `}
              >
                {task.description}
              </p>
            )}
            {showDate && (
              <p
                className={`
                  text-xs mt-1 transition-all duration-200
                  ${task.date && task.date < new Date().toISOString().split('T')[0] && !task.completed
                    ? 'text-red-500 dark:text-red-400'
                    : 'text-secondary-400 dark:text-secondary-500'
                  }
                `}
              >
                {formatTaskDate(task.date)}
              </p>
            )}
          </div>

          {/* Desktop action buttons (visible on hover) */}
          <div className="hidden md:flex flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartEdit();
                }}
                className="text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 p-2"
                aria-label="Edit task"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              disabled={isDeleting}
              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-2"
              aria-label="Delete task"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskItem;
