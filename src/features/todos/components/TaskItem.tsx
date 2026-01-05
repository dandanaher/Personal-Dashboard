import { useState, useRef, memo } from 'react';
import { Check, Trash2, Pencil, X, Save } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { useThemeStore } from '@/stores/themeStore';
import { formatRelativeDate } from '@/lib/dateUtils';
import type { Task, TaskUpdate, TaskPriority } from '@/lib/types';

// Priority colors matching AddTaskModal
const PRIORITY_COLORS: Record<1 | 2 | 3, string> = {
  1: '#EF4444', // High - red
  2: '#F59E0B', // Medium - amber
  3: '#3B82F6', // Low - blue
};

function getPriorityColor(priority: TaskPriority): string | null {
  if (priority === null) return null;
  return PRIORITY_COLORS[priority];
}

interface TaskItemProps {
  task: Task;
  onToggle: (taskId: string) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
  onEdit?: (taskId: string, updates: TaskUpdate) => Promise<boolean>;
  onEditClick?: (task: Task) => void;
  showDate?: boolean;
}

export const TaskItem = memo(function TaskItem({
  task,
  onToggle,
  onDelete,
  onEdit,
  onEditClick,
  showDate = false,
}: TaskItemProps) {
  const [showActions, setShowActions] = useState(false);
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
      const newTranslateX = Math.min(0, Math.max(-160, deltaX));
      setTranslateX(newTranslateX);
    }
  };

  const handleTouchEnd = () => {
    // Snap to show action buttons if swiped more than 40px
    if (translateX < -40) {
      setTranslateX(-160);
      setShowActions(true);
    } else {
      setTranslateX(0);
      setShowActions(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(task.id);
    setIsDeleting(false);
  };

  const resetSwipe = () => {
    setTranslateX(0);
    setShowActions(false);
  };

  const handleStartEdit = () => {
    if (onEditClick) {
      // Use modal if onEditClick is provided
      onEditClick(task);
      resetSwipe();
    } else if (onEdit) {
      // Fall back to inline edit
      setEditTitle(task.title);
      setEditDescription(task.description || '');
      setIsEditing(true);
      resetSwipe();
    }
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
      void handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };


  // Edit mode rendering
  if (isEditing) {
    return (
      <div className="bg-white dark:bg-secondary-800 rounded-lg p-3 space-y-2">
        <Input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Task title"
          autoFocus
          className="w-full text-sm"
        />
        <textarea
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Description (optional)"
          rows={2}
          className="
            w-full px-2.5 py-2 rounded-lg
            bg-white dark:bg-secondary-900
            border border-secondary-300 dark:border-secondary-700
            text-secondary-900 dark:text-white
            placeholder-secondary-400 dark:placeholder-secondary-500
            focus:outline-none focus:ring-2 focus:border-transparent
            resize-none text-xs
          "
          style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
        />
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" size="sm" onClick={handleCancelEdit} disabled={isSaving} className="text-xs">
            <X className="h-3.5 w-3.5 mr-1" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => void handleSaveEdit()}
            disabled={!editTitle.trim() || isSaving}
            isLoading={isSaving}
            className="text-xs"
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg cv-item-sm">
      {/* Action buttons revealed on swipe */}
      <div className="absolute inset-y-0 right-0 flex items-center">
        {(onEditClick || onEdit) && (
          <div className="h-full flex items-center bg-blue-500 px-3">
            <Button
              variant="ghost"
              size="sm"
            onClick={() => handleStartEdit()}
              className="text-white hover:text-white hover:bg-blue-600 p-1.5"
              aria-label="Edit task"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="h-full flex items-center bg-red-500 px-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleDelete()}
            disabled={isDeleting}
            className="text-white hover:text-white hover:bg-red-600 p-1.5"
            aria-label="Delete task"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Task content */}
      <div
        className={`
          relative bg-white dark:bg-secondary-800
          transition-transform duration-200 ease-out
          ${showActions ? '' : 'hover:bg-secondary-50 dark:hover:bg-secondary-700'}
        `}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => showActions && resetSwipe()}
      >
        <div className="flex items-start gap-2.5 p-3">
          {/* Checkbox with priority border */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!showActions) {
              void onToggle(task.id);
              }
            }}
            className={`
              flex-shrink-0 w-5 h-5 rounded-full
              flex items-center justify-center
              transition-all duration-200 ease-in-out
              focus:outline-none focus:ring-2 focus:ring-offset-2
              ${task.completed ? 'text-white border-2' : task.priority ? 'border-[3px]' : 'border-2 border-secondary-300 dark:border-secondary-600'}
            `}
            style={
              {
                backgroundColor: task.completed ? accentColor : undefined,
                borderColor: task.completed
                  ? accentColor
                  : task.priority
                    ? getPriorityColor(task.priority) ?? undefined
                    : undefined,
                '--tw-ring-color': accentColor,
              } as React.CSSProperties
            }
            aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
          >
            {task.completed && <Check className="h-3.5 w-3.5" />}
          </button>

          {/* Task text */}
          <div className="flex-1 min-w-0">
            <p
              className={`
                text-sm transition-all duration-200
                ${
                  task.completed
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
                  text-xs mt-0.5 transition-all duration-200
                  ${
                    task.completed
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
                  text-xs mt-0.5 transition-all duration-200
                  ${
                    task.date &&
                    task.date < new Date().toISOString().split('T')[0] &&
                    !task.completed
                      ? 'text-red-500 dark:text-red-400'
                      : 'text-secondary-400 dark:text-secondary-500'
                  }
                `}
              >
                {formatRelativeDate(task.date)}
              </p>
            )}
          </div>

          {/* Desktop action buttons (visible on hover) */}
          <div className="hidden md:flex flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity gap-1">
            {(onEditClick || onEdit) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartEdit();
                }}
                className="text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 p-1.5"
                aria-label="Edit task"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                void handleDelete();
              }}
              disabled={isDeleting}
              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5"
              aria-label="Delete task"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default TaskItem;
