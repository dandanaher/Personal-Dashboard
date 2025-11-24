import type { CompletedExercise, Exercise } from '@/lib/types';
import { formatRestTime } from '../lib/workoutEngine';

interface RestBetweenExercisesProps {
  remainingSeconds: number;
  totalSeconds: number;
  completedExercise?: CompletedExercise;
  nextExercise?: Exercise;
  notes: string;
  onNotesChange: (notes: string) => void;
  onSkip: () => void;
  highlightColor?: string;
}

const formatDuration = (seconds = 0) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return `${secs}s`;
};

const getSummaryLines = (exercise: CompletedExercise | undefined): string[] => {
  if (!exercise) return [];

  const type = exercise.type || 'strength';
  const mainSets = exercise.main_sets || [];
  const failure = exercise.failure_set;
  const lines: string[] = [];
  const totalSets = mainSets.length + (failure ? 1 : 0);

  if (type === 'strength') {
    lines.push(`${totalSets} set${totalSets === 1 ? '' : 's'} completed`);

    const volume =
      mainSets.reduce((sum, set) => sum + (set.reps || 0) * (set.weight || 0), 0) +
      (failure ? (failure.reps || 0) * (failure.weight || 0) : 0);
    if (volume > 0) {
      lines.push(`Volume: ${volume.toFixed(0)}kg`);
    }

    const last = failure || mainSets[mainSets.length - 1];
    if (last && (last.reps !== undefined || last.weight !== undefined)) {
      const repsText =
        last.reps !== undefined && last.reps !== null ? `${last.reps} reps` : undefined;
      const weightText =
        last.weight !== undefined && last.weight !== null ? `${last.weight}kg` : undefined;
      const connector = repsText && weightText ? ' @ ' : '';
      lines.push(`Last: ${repsText || ''}${connector}${weightText || ''}`.trim());
    }
  } else if (type === 'cardio') {
    const totalDistance = mainSets.reduce((sum, set) => sum + (set.distance || 0), 0);
    const totalTime = mainSets.reduce((sum, set) => sum + (set.time || 0), 0);

    if (totalDistance > 0) {
      lines.push(`Distance: ${totalDistance.toFixed(2)} ${exercise.distance_unit || 'km'}`);
    }
    if (totalTime > 0) {
      lines.push(`Time: ${formatDuration(totalTime)}`);
    }
  } else if (type === 'timed') {
    lines.push(`${totalSets} hold${totalSets === 1 ? '' : 's'} logged`);

    const totalTime = mainSets.reduce((sum, set) => sum + (set.time || 0), 0);
    if (totalTime > 0) {
      lines.push(`Time: ${formatDuration(totalTime)}`);
    }

    const lastWeight = mainSets[mainSets.length - 1]?.weight;
    if (lastWeight) {
      lines.push(`Last weight: ${lastWeight}kg`);
    }
  }

  if (lines.length === 0) {
    lines.push('Sets logged');
  }

  return lines;
};

const getNextExercisePreview = (exercise: Exercise | undefined): string => {
  if (!exercise) return '';

  const type = exercise.type || 'strength';
  switch (type) {
    case 'strength':
      return `${exercise.sets} x ${exercise.reps_per_set || '—'} reps @ ${exercise.weight ?? '—'}kg`;
    case 'cardio': {
      const distance = exercise.distance ?? 0;
      const unit = exercise.distance_unit || 'km';
      const time = exercise.target_time ? ` • ${formatDuration(exercise.target_time)}` : '';
      return `${distance} ${unit}${time}`;
    }
    case 'timed': {
      const time = exercise.target_time || 60;
      const weightText = exercise.weight ? ` @ ${exercise.weight}kg` : '';
      return `${exercise.sets} x ${formatDuration(time)} holds${weightText}`;
    }
    default:
      return '';
  }
};

export default function RestBetweenExercises({
  remainingSeconds,
  totalSeconds,
  completedExercise,
  nextExercise,
  notes,
  onNotesChange,
  onSkip,
  highlightColor,
}: RestBetweenExercisesProps) {
  const progress =
    totalSeconds > 0 ? Math.min(1, Math.max(0, 1 - remainingSeconds / totalSeconds)) : 1;
  const circumference = 2 * Math.PI * 140;
  const strokeDashoffset = circumference * (1 - progress);

  const summaryLines = getSummaryLines(completedExercise);
  const nextPreview = getNextExercisePreview(nextExercise);
  const setsLogged =
    (completedExercise?.main_sets.length || 0) + (completedExercise?.failure_set ? 1 : 0);

  if (!completedExercise || !nextExercise) return null;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 text-white" data-no-tap>
      <div className="relative w-80 h-80 mx-auto">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="160"
            cy="160"
            r="140"
            stroke={highlightColor || 'currentColor'}
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx="160"
            cy="160"
            r="140"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="text-white transition-all duration-1000 ease-linear"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
          <div className="text-sm font-semibold text-white/70 mb-1">REST</div>
          <span className="text-6xl font-bold text-white tabular-nums mb-3">
            {formatRestTime(remainingSeconds)}
          </span>
          <div className="text-sm text-white/70 mb-4">Next: {nextExercise.name}</div>
          <button
            onClick={onSkip}
            className="px-6 py-2 rounded-full text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            Skip Rest
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-black/15 rounded-2xl p-4 border border-white/10 text-left">
          <div className="text-xs font-semibold uppercase text-white/60 mb-1">Completed</div>
          <div className="text-lg font-semibold">{completedExercise.name}</div>
          <ul className="mt-2 space-y-1 text-sm text-white/80">
            {summaryLines.map((line, idx) => (
              <li key={idx}>{line}</li>
            ))}
          </ul>
        </div>

        <div className="bg-black/15 rounded-2xl p-4 border border-white/10 text-left">
          <div className="text-xs font-semibold uppercase text-white/60 mb-1">Next Up</div>
          <div className="text-lg font-semibold">{nextExercise.name}</div>
          {nextPreview && <div className="mt-2 text-sm text-white/80">{nextPreview}</div>}
        </div>
      </div>

      <div className="bg-black/20 rounded-2xl p-4 border border-white/10 text-left">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold uppercase text-white/60">
            Add notes for {completedExercise.name}
          </div>
          <span className="text-xs text-white/50">
            {setsLogged} set{setsLogged === 1 ? '' : 's'} logged
          </span>
        </div>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="How did it feel? Form cues, adjustments, or wins..."
          rows={3}
          className="w-full rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/60 p-3 focus:outline-none focus:ring-2 focus:ring-white/40 resize-none"
        />
      </div>
    </div>
  );
}
