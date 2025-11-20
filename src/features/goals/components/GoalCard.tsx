import { useMemo, useRef, useCallback } from 'react';
import { Edit2, Trash2, Check, RotateCcw, Calendar, AlertTriangle, Minus, Plus, Link } from 'lucide-react';
import { parseISO, differenceInDays } from 'date-fns';
import { Card, Button } from '@/components/ui';
import { Goal } from '@/lib/types';
import { ProgressBar, getProgressColor } from './ProgressBar';

interface GoalCardProps {
  goal: Goal;
  onEdit: () => void;
  onDelete: () => void;
  onProgressChange: (progress: number) => void;
  onToggleComplete: () => void;
  linkedHabitName?: string;
  habitCompletions?: number;
}

export function GoalCard({
  goal,
  onEdit,
  onDelete,
  onProgressChange,
  onToggleComplete,
  linkedHabitName,
  habitCompletions = 0,
}: GoalCardProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const speedRef = useRef(200); // Initial interval speed in ms
  const currentProgressRef = useRef(goal.progress); // Track current progress during hold

  // Keep ref in sync with goal progress
  currentProgressRef.current = goal.progress;

  // Calculate days until target date
  const daysUntilTarget = useMemo(() => {
    if (!goal.target_date) return null;
    const target = parseISO(goal.target_date);
    return differenceInDays(target, new Date());
  }, [goal.target_date]);

  const isOverdue = daysUntilTarget !== null && daysUntilTarget < 0 && !goal.completed;

  // Check if goal is linked to a habit
  const isHabitLinked = goal.linked_habit_id && goal.target_completions;

  // Calculate actual progress for habit-linked goals
  const displayProgress = useMemo(() => {
    if (isHabitLinked && goal.target_completions) {
      return Math.min(100, Math.round((habitCompletions / goal.target_completions) * 100));
    }
    return goal.completed ? 100 : goal.progress;
  }, [goal.progress, goal.completed, isHabitLinked, habitCompletions, goal.target_completions]);

  // Get progress bar color
  const progressColor = useMemo(() => {
    return getProgressColor(displayProgress);
  }, [displayProgress]);

  // Get type badge color
  const typeBadgeColor = useMemo(() => {
    switch (goal.type) {
      case 'weekly':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'monthly':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'yearly':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'open':
        return 'bg-slate-200 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300';
      default:
        return 'bg-secondary-100 text-secondary-600 dark:bg-secondary-800 dark:text-secondary-400';
    }
  }, [goal.type]);

  const typeLabel = useMemo(() => {
    if (goal.type === 'open') return 'No deadline';
    return goal.type;
  }, [goal.type]);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    speedRef.current = 200;
  }, []);

  // Handle hold-to-accelerate for increment/decrement
  const handleHoldStart = useCallback((increment: number) => {
    // Immediate first change
    const newProgress = Math.min(100, Math.max(0, currentProgressRef.current + increment));
    currentProgressRef.current = newProgress;
    onProgressChange(newProgress);

    // Start accelerating interval after initial delay
    timeoutRef.current = setTimeout(() => {
      const tick = () => {
        const updated = Math.min(100, Math.max(0, currentProgressRef.current + increment));
        currentProgressRef.current = updated;
        onProgressChange(updated);

        // Accelerate: decrease interval time (faster updates)
        speedRef.current = Math.max(30, speedRef.current * 0.9);

        // Clear and restart with new speed
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        intervalRef.current = setInterval(tick, speedRef.current);
      };

      intervalRef.current = setInterval(tick, speedRef.current);
    }, 300); // Initial delay before repeat starts
  }, [onProgressChange]);

  // Handle mouse/touch release
  const handleHoldEnd = useCallback(() => {
    clearTimers();
  }, [clearTimers]);

  // Single click handlers
  const handleDecrement = useCallback(() => {
    if (goal.progress > 0) {
      onProgressChange(goal.progress - 1);
    }
  }, [goal.progress, onProgressChange]);

  const handleIncrement = useCallback(() => {
    if (goal.progress < 100) {
      onProgressChange(goal.progress + 1);
    }
  }, [goal.progress, onProgressChange]);

  return (
    <Card
      variant="default"
      padding="md"
      className={`transition-all duration-200 ${
        isOverdue
          ? 'border-l-4 border-l-red-500 dark:border-l-red-400'
          : goal.completed
          ? 'opacity-75'
          : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3
              className={`font-semibold text-secondary-900 dark:text-white truncate ${
                goal.completed ? 'line-through text-secondary-500 dark:text-secondary-400' : ''
              }`}
            >
              {goal.title}
            </h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeBadgeColor}`}>
              {typeLabel}
            </span>
          </div>
          {goal.description && (
            <p className="text-sm text-secondary-600 dark:text-secondary-400 line-clamp-2">
              {goal.description}
            </p>
          )}
          {/* Habit link indicator */}
          {isHabitLinked && linkedHabitName && (
            <div className="flex items-center gap-1 mt-1 text-xs text-primary-600 dark:text-primary-400">
              <Link className="w-3 h-3" />
              <span>
                {habitCompletions}/{goal.target_completions} {linkedHabitName}
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-1 ml-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            aria-label="Edit goal"
            className="p-2"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            aria-label="Delete goal"
            className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <ProgressBar
          progress={displayProgress}
          color={progressColor}
          showLabel
        />
      </div>

      {/* Footer with Progress Controls */}
      <div className="flex items-center justify-between text-sm">
        {/* Left side: Days left indicator */}
        <div className="flex items-center gap-1">
          {goal.target_date && (
            <div
              className={`flex items-center gap-1 ${
                isOverdue
                  ? 'text-red-600 dark:text-red-400 font-semibold'
                  : 'text-secondary-600 dark:text-secondary-400'
              }`}
            >
              {isOverdue ? (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  <span>Overdue by {Math.abs(daysUntilTarget!)} days</span>
                </>
              ) : daysUntilTarget === 0 ? (
                <>
                  <Calendar className="w-4 h-4" />
                  <span>Due today</span>
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  <span>{daysUntilTarget} days left</span>
                </>
              )}
            </div>
          )}
          {!goal.target_date && (
            <span className="text-secondary-500 dark:text-secondary-500 text-xs">
              No target date
            </span>
          )}
        </div>

        {/* Right side: Progress controls (for non-habit-linked) + Complete button */}
        <div className="flex items-center gap-2">
          {!goal.completed && !isHabitLinked && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDecrement}
                onMouseDown={() => handleHoldStart(-1)}
                onMouseUp={handleHoldEnd}
                onMouseLeave={handleHoldEnd}
                onTouchStart={() => handleHoldStart(-1)}
                onTouchEnd={handleHoldEnd}
                disabled={goal.progress <= 0}
                className="p-2 rounded-full bg-secondary-100 dark:bg-secondary-800 hover:bg-secondary-200 dark:hover:bg-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-none select-none"
                aria-label="Decrease progress"
              >
                <Minus className="w-4 h-4 text-secondary-700 dark:text-secondary-300" />
              </button>

              <span className="text-lg font-bold text-secondary-900 dark:text-white min-w-[3rem] text-center">
                {goal.progress}%
              </span>

              <button
                onClick={handleIncrement}
                onMouseDown={() => handleHoldStart(1)}
                onMouseUp={handleHoldEnd}
                onMouseLeave={handleHoldEnd}
                onTouchStart={() => handleHoldStart(1)}
                onTouchEnd={handleHoldEnd}
                disabled={goal.progress >= 100}
                className="p-2 rounded-full bg-secondary-100 dark:bg-secondary-800 hover:bg-secondary-200 dark:hover:bg-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-none select-none"
                aria-label="Increase progress"
              >
                <Plus className="w-4 h-4 text-secondary-700 dark:text-secondary-300" />
              </button>
            </div>
          )}

          <Button
            variant={goal.completed ? 'outline' : 'primary'}
            size="sm"
            onClick={onToggleComplete}
            className="gap-1"
          >
            {goal.completed ? (
              <>
                <RotateCcw className="w-3 h-3" />
                Reopen
              </>
            ) : (
              <>
                <Check className="w-3 h-3" />
                Complete
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default GoalCard;
