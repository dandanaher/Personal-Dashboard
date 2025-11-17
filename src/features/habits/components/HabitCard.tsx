import { useState } from 'react';
import { Edit2, Trash2, Check } from 'lucide-react';
import { format } from 'date-fns';
import { Card, Button } from '@/components/ui';
import { useHabitLogs } from '../hooks';
import { ContributionGraph } from './ContributionGraph';
import { HabitDetailModal } from './HabitDetailModal';
import type { Habit } from '@/lib/types';

interface HabitCardProps {
  habit: Habit;
  onEdit: () => void;
  onDelete: () => void;
}

export function HabitCard({ habit, onEdit, onDelete }: HabitCardProps) {
  const { logs, stats, toggleLog, loading } = useHabitLogs(habit.id);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');
  const isCompletedToday = logs.some(log => log.date === today && log.completed);

  const handleTodayToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleLog(today);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  const handleCardClick = () => {
    setIsDetailOpen(true);
  };

  return (
    <>
      <Card
        variant="default"
        padding="md"
        className="overflow-hidden cursor-pointer hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition-colors"
        onClick={handleCardClick}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: habit.color }}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-secondary-900 dark:text-white truncate">
                  {habit.name}
                </h3>
                {/* Inline stats */}
                <div className="flex items-center gap-2 text-sm text-secondary-600 dark:text-secondary-400 flex-shrink-0">
                  <span title="Current streak">
                    <span aria-hidden="true">🔥</span> {stats.currentStreak}
                  </span>
                  <span title="Longest streak">
                    <span aria-hidden="true">🏆</span> {stats.longestStreak}
                  </span>
                </div>
              </div>
              {habit.description && (
                <p className="text-sm text-secondary-500 dark:text-secondary-400 truncate">
                  {habit.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Quick toggle for today */}
            <Button
              variant={isCompletedToday ? 'primary' : 'outline'}
              size="sm"
              onClick={handleTodayToggle}
              aria-label={isCompletedToday ? 'Mark today as not completed' : 'Mark today as completed'}
              className={isCompletedToday ? '' : 'border-secondary-300 dark:border-secondary-600'}
            >
              <Check className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleEditClick}
              aria-label="Edit habit"
            >
              <Edit2 className="w-4 h-4 text-secondary-500" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteClick}
              aria-label="Delete habit"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>

        {/* Contribution Graph */}
        {loading ? (
          <div className="h-32 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div onClick={(e) => e.stopPropagation()}>
            <ContributionGraph
              logs={logs}
              color={habit.color}
              onDayClick={toggleLog}
            />
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      <HabitDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        habit={habit}
        logs={logs}
        stats={stats}
        onDayClick={toggleLog}
      />
    </>
  );
}
