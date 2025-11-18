import { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Target, Link, Unlink, AlertTriangle } from 'lucide-react';
import { endOfWeek, endOfMonth, endOfQuarter, endOfYear, format, differenceInDays, parseISO } from 'date-fns';
import { Card, Button, Input } from '@/components/ui';
import { Goal, Habit } from '@/lib/types';
import { ProgressBar } from './ProgressBar';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

type GoalType = Goal['type'];

interface AddGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goalData: {
    title: string;
    description?: string | null;
    type: GoalType;
    target_date?: string | null;
    progress?: number;
    linked_habit_id?: string | null;
    target_completions?: number | null;
  }) => Promise<boolean>;
  editingGoal?: Goal | null;
}

// Get default target date based on goal type
function getDefaultTargetDate(type: GoalType): string {
  const now = new Date();
  let targetDate: Date;

  switch (type) {
    case 'weekly':
      targetDate = endOfWeek(now, { weekStartsOn: 1 }); // End of week (Sunday)
      break;
    case 'monthly':
      targetDate = endOfMonth(now);
      break;
    case 'quarterly':
      targetDate = endOfQuarter(now);
      break;
    case 'yearly':
      targetDate = endOfYear(now);
      break;
    default:
      targetDate = endOfMonth(now);
  }

  return format(targetDate, 'yyyy-MM-dd');
}

export function AddGoalModal({ isOpen, onClose, onSave, editingGoal }: AddGoalModalProps) {
  const { user } = useAuthStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<GoalType>('monthly');
  const [targetDate, setTargetDate] = useState('');
  const [progress, setProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Habit linking state
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loadingHabits, setLoadingHabits] = useState(false);
  const [linkToHabit, setLinkToHabit] = useState(false);
  const [selectedHabitId, setSelectedHabitId] = useState<string>('');
  const [targetCompletions, setTargetCompletions] = useState(10);

  // Calculate days remaining and max allowed completions
  const { daysRemaining, maxCompletions, completionsExceedDays } = useMemo(() => {
    if (!targetDate) {
      return { daysRemaining: null, maxCompletions: 365, completionsExceedDays: false };
    }
    const days = differenceInDays(parseISO(targetDate), new Date()) + 1; // +1 to include today
    const maxDays = Math.max(1, days);
    return {
      daysRemaining: days,
      maxCompletions: maxDays,
      completionsExceedDays: linkToHabit && targetCompletions > maxDays,
    };
  }, [targetDate, linkToHabit, targetCompletions]);

  // Fetch habits when modal opens
  useEffect(() => {
    if (isOpen && user) {
      setLoadingHabits(true);
      supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true })
        .then(({ data, error }) => {
          if (!error && data) {
            setHabits(data);
          }
          setLoadingHabits(false);
        });
    }
  }, [isOpen, user]);

  // Reset form when modal opens/closes or editing goal changes
  useEffect(() => {
    if (isOpen) {
      if (editingGoal) {
        setTitle(editingGoal.title);
        setDescription(editingGoal.description || '');
        setType(editingGoal.type);
        setTargetDate(editingGoal.target_date || '');
        setProgress(editingGoal.progress);
        // Habit linking
        if (editingGoal.linked_habit_id && editingGoal.target_completions) {
          setLinkToHabit(true);
          setSelectedHabitId(editingGoal.linked_habit_id);
          setTargetCompletions(editingGoal.target_completions);
        } else {
          setLinkToHabit(false);
          setSelectedHabitId('');
          setTargetCompletions(10);
        }
      } else {
        setTitle('');
        setDescription('');
        setType('monthly');
        setTargetDate(getDefaultTargetDate('monthly'));
        setProgress(0);
        setLinkToHabit(false);
        setSelectedHabitId('');
        setTargetCompletions(10);
      }
      setError(null);
    }
  }, [isOpen, editingGoal]);

  // Update target date when type changes (only for new goals)
  const handleTypeChange = (newType: GoalType) => {
    setType(newType);
    if (!editingGoal) {
      setTargetDate(getDefaultTargetDate(newType));
    }
  };

  // Clamp target completions when max changes (due to date change)
  useEffect(() => {
    if (linkToHabit) {
      setTargetCompletions(prev => prev > maxCompletions ? maxCompletions : prev);
    }
  }, [maxCompletions, linkToHabit]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (linkToHabit && !selectedHabitId) {
      setError('Please select a habit to link');
      return;
    }

    if (linkToHabit && targetCompletions < 1) {
      setError('Target completions must be at least 1');
      return;
    }

    if (completionsExceedDays) {
      setError(`Target completions cannot exceed ${maxCompletions} (days remaining until deadline)`);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const success = await onSave({
        title: title.trim(),
        description: description.trim() || null,
        type,
        target_date: targetDate || null,
        progress: linkToHabit ? 0 : progress, // Reset progress for habit-linked goals
        linked_habit_id: linkToHabit ? selectedHabitId : null,
        target_completions: linkToHabit ? targetCompletions : null,
      });

      if (success) {
        onClose();
      } else {
        setError('Failed to save goal. Please try again.');
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
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <Card
        variant="default"
        padding="none"
        className="relative w-full sm:max-w-md sm:mx-4 max-h-[90vh] overflow-hidden rounded-t-2xl sm:rounded-2xl animate-slide-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-secondary-200 dark:border-secondary-700">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
              {editingGoal ? 'Edit Goal' : 'New Goal'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-secondary-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto overflow-x-hidden max-h-[calc(90vh-8rem)]">
          {/* Error message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label
              htmlFor="goal-title"
              className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1"
            >
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              id="goal-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Launch website redesign"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="goal-description"
              className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1"
            >
              Description
            </label>
            <textarea
              id="goal-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about your goal..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Time Period
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['weekly', 'monthly', 'quarterly', 'yearly'] as GoalType[]).map((goalType) => (
                <button
                  key={goalType}
                  type="button"
                  onClick={() => handleTypeChange(goalType)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                    type === goalType
                      ? 'bg-primary-500 text-white'
                      : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700'
                  }`}
                >
                  {goalType}
                </button>
              ))}
            </div>
          </div>

          {/* Target Date */}
          <div>
            <label
              htmlFor="goal-target-date"
              className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1"
            >
              <Calendar className="w-4 h-4 inline mr-1" />
              Target Date
            </label>
            <Input
              id="goal-target-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
            <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-400">
              Auto-suggested based on time period
            </p>
          </div>

          {/* Habit Linking Section */}
          <div className="border-t border-secondary-200 dark:border-secondary-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
                Link to Habit (Optional)
              </label>
              <button
                type="button"
                onClick={() => setLinkToHabit(!linkToHabit)}
                className={`p-2 rounded-lg transition-colors ${
                  linkToHabit
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-500'
                }`}
                aria-label={linkToHabit ? 'Unlink habit' : 'Link habit'}
              >
                {linkToHabit ? <Link className="w-4 h-4" /> : <Unlink className="w-4 h-4" />}
              </button>
            </div>

            {linkToHabit && (
              <div className="space-y-3 p-3 rounded-lg bg-secondary-50 dark:bg-secondary-800/50">
                {loadingHabits ? (
                  <p className="text-sm text-secondary-500">Loading habits...</p>
                ) : habits.length === 0 ? (
                  <p className="text-sm text-secondary-500">No habits found. Create a habit first.</p>
                ) : (
                  <>
                    {/* Habit Select */}
                    <div>
                      <label
                        htmlFor="habit-select"
                        className="block text-xs font-medium text-secondary-600 dark:text-secondary-400 mb-1"
                      >
                        Select Habit
                      </label>
                      <select
                        id="habit-select"
                        value={selectedHabitId}
                        onChange={(e) => setSelectedHabitId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Choose a habit...</option>
                        {habits.map((habit) => (
                          <option key={habit.id} value={habit.id}>
                            {habit.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Target Completions */}
                    <div>
                      <label
                        htmlFor="target-completions"
                        className="block text-xs font-medium text-secondary-600 dark:text-secondary-400 mb-1"
                      >
                        Target Completions
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="target-completions"
                          type="number"
                          min="1"
                          max={maxCompletions}
                          value={targetCompletions}
                          onChange={(e) => setTargetCompletions(Math.max(1, parseInt(e.target.value) || 1))}
                          className={`flex-1 ${completionsExceedDays ? 'border-red-500 focus:ring-red-500' : ''}`}
                        />
                        <span className="text-sm text-secondary-500">times</span>
                      </div>
                      {completionsExceedDays ? (
                        <div className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                          <AlertTriangle className="w-3 h-3" />
                          <span>
                            Cannot exceed {maxCompletions} days until deadline
                          </span>
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-secondary-500">
                          Complete this habit {targetCompletions} times to reach 100%
                          {daysRemaining !== null && ` (max: ${maxCompletions})`}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Initial Progress (only if not linked to habit) */}
          {!linkToHabit && (
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                Initial Progress
              </label>
              <ProgressBar progress={progress} showLabel />
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full h-2 mt-2 bg-secondary-200 dark:bg-secondary-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                aria-label="Initial progress"
              />
            </div>
          )}

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
              disabled={isSaving || !title.trim() || completionsExceedDays}
            >
              {editingGoal ? 'Save Changes' : 'Create Goal'}
            </Button>
          </div>
        </form>
      </Card>

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export default AddGoalModal;
