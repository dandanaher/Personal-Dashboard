import { X } from 'lucide-react';
import { HabitStats } from './HabitStats';
import { ContributionGraph } from './ContributionGraph';
import type { HabitStats as HabitStatsType } from '../hooks';
import type { HabitLog, Habit } from '@/lib/types';

interface HabitDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  habit: Habit;
  logs: HabitLog[];
  stats: HabitStatsType;
  onDayClick: (date: string) => void;
}

export function HabitDetailModal({
  isOpen,
  onClose,
  habit,
  logs,
  stats,
  onDayClick,
}: HabitDetailModalProps) {
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
          max-h-[85vh] overflow-y-auto
        "
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-modal-title"
      >
        {/* Handle bar for mobile */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-secondary-300 dark:bg-secondary-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-secondary-200 dark:border-secondary-700">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: habit.color }}
              aria-hidden="true"
            />
            <h2
              id="detail-modal-title"
              className="text-lg font-semibold text-secondary-900 dark:text-white"
            >
              {habit.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-secondary-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Contribution Graph */}
          <div>
            <h3 className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-3">
              Activity
            </h3>
            <ContributionGraph
              logs={logs}
              color={habit.color}
              onDayClick={onDayClick}
            />
          </div>

          {/* Stats */}
          <HabitStats stats={stats} />

          {/* Description if exists */}
          {habit.description && (
            <div className="text-sm text-secondary-600 dark:text-secondary-400">
              {habit.description}
            </div>
          )}
        </div>
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
