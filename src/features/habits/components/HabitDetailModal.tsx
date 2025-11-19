import { createPortal } from 'react-dom';
import { X, Edit2, Trash2 } from 'lucide-react';
import { HabitStats } from './HabitStats';
import { ContributionGraph } from './ContributionGraph';
import { HabitCalendar } from './HabitCalendar';
import { useScrollLock } from '@/hooks/useScrollLock';
import type { HabitStats as HabitStatsType } from '../hooks';
import type { HabitLog, Habit } from '@/lib/types';


interface HabitDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  habit: Habit;
  logs: HabitLog[];
  stats: HabitStatsType;
  onDayClick: (date: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function HabitDetailModal({
  isOpen,
  onClose,
  habit,
  logs,
  stats,
  onDayClick,
  onEdit,
  onDelete,
}: HabitDetailModalProps) {
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleEdit = () => {
    onClose();
    onEdit();
  };

  const handleDelete = () => {
    onClose();
    onDelete();
  };

  // Prevent body scroll when modal is open
  useScrollLock(isOpen);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed top-0 left-0 w-full h-full z-[60] flex items-end md:items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div
        className="
          w-full md:max-w-md
          bg-white dark:bg-secondary-900
          rounded-t-2xl md:rounded-2xl
          shadow-xl
          animate-slide-up md:animate-fade-in
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
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: habit.color }}
                aria-hidden="true"
              />
              <h2
                id="detail-modal-title"
                className="text-lg font-semibold text-secondary-900 dark:text-white truncate"
              >
                {habit.name}
              </h2>
            </div>
            {habit.description && (
              <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1 ml-7">
                {habit.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={handleEdit}
              className="p-2 rounded-lg bg-secondary-100 dark:bg-secondary-800 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
              aria-label="Edit habit"
            >
              <Edit2 className="w-4 h-4 text-secondary-600 dark:text-secondary-400" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="p-2 rounded-lg bg-secondary-100 dark:bg-secondary-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              aria-label="Delete habit"
            >
              <Trash2 className="w-4 h-4 text-secondary-600 dark:text-secondary-400 hover:text-red-500" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-secondary-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pt-3 pb-1 space-y-3 max-h-[70vh] overflow-y-auto">
          {/* Contribution Graph */}
          <div>
            <ContributionGraph
              logs={logs}
              color={habit.color}
              showMonthLabels={true}
              allowDragScroll={true}
            />
          </div>

          {/* Stats */}
          <HabitStats stats={stats} />

          {/* Calendar for day selection */}
          <HabitCalendar
            logs={logs}
            color={habit.color}
            onDayClick={onDayClick}
          />
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
    </div>,
    document.body
  );
}
