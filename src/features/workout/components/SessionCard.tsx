import { format } from 'date-fns';
import { Clock, Dumbbell, ChevronRight, Trash2, Route, Timer } from 'lucide-react';
import { Card } from '@/components/ui';
import type { WorkoutSession } from '@/lib/types';
import {
  formatTime,
  calculateTotalSets,
  calculateWorkoutVolume,
  getVolumeLabel,
} from '../lib/workoutEngine';

interface SessionCardProps {
  session: WorkoutSession;
  onView: (session: WorkoutSession) => void;
  onDelete?: (session: WorkoutSession) => void;
}

export default function SessionCard({ session, onView, onDelete }: SessionCardProps) {
  const totalSets = calculateTotalSets(session.data.exercises);
  const volume = calculateWorkoutVolume(session.data.exercises);
  const volumeLabel = getVolumeLabel(session.data.exercises);
  const exerciseCount = session.data.exercises.length;
  const { exerciseCount: typeCounts } = volume;

  // Determine dominant type for icon display
  const hasCardio = typeCounts.cardio > 0;
  const hasTimed = typeCounts.timed > 0;
  const hasStrength = typeCounts.strength > 0;

  // Get volume label text based on workout type
  const getVolumeTypeLabel = () => {
    if (typeCounts.cardio > typeCounts.strength && typeCounts.cardio > typeCounts.timed) {
      return 'Total Distance';
    } else if (typeCounts.timed > typeCounts.strength && typeCounts.timed > typeCounts.cardio) {
      return 'Total Time';
    }
    return 'Total Volume';
  };

  return (
    <Card
      variant="outlined"
      className="p-4 cursor-pointer hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition-colors"
      onClick={() => onView(session)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-secondary-900 dark:text-secondary-100 truncate">
            {session.template_name}
          </h3>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-0.5">
            {format(new Date(session.started_at), 'EEEE, MMM d • h:mm a')}
          </p>

          <div className="flex items-center gap-4 mt-2 text-xs text-secondary-500 dark:text-secondary-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {session.duration ? formatTime(session.duration) : '--'}
            </span>
            <span className="flex items-center gap-1">
              <Dumbbell className="h-3.5 w-3.5" />
              {exerciseCount} exercises
            </span>
            <span>{totalSets} sets</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(session);
              }}
              className="p-2 text-secondary-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
              aria-label="Delete session"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <ChevronRight className="h-5 w-5 text-secondary-400" />
        </div>
      </div>

      {/* Volume summary */}
      <div className="mt-3 pt-3 border-t border-secondary-200 dark:border-secondary-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-secondary-500 dark:text-secondary-400 flex items-center gap-1">
            {hasCardio && typeCounts.cardio >= typeCounts.strength && (
              <Route className="h-3.5 w-3.5" />
            )}
            {hasTimed && typeCounts.timed >= typeCounts.strength && !hasCardio && (
              <Timer className="h-3.5 w-3.5" />
            )}
            {hasStrength &&
              typeCounts.strength > typeCounts.cardio &&
              typeCounts.strength > typeCounts.timed && <Dumbbell className="h-3.5 w-3.5" />}
            {getVolumeTypeLabel()}
          </span>
          <span className="font-semibold text-secondary-900 dark:text-secondary-100">
            {volumeLabel}
          </span>
        </div>
      </div>
    </Card>
  );
}
