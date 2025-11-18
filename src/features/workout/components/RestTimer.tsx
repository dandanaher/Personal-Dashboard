import { formatRestTime } from '../lib/workoutEngine';

interface RestTimerProps {
  remainingSeconds: number;
  totalSeconds: number;
  nextSetInfo: string;
  onSkip: () => void;
}

export default function RestTimer({
  remainingSeconds,
  totalSeconds,
  nextSetInfo,
  onSkip,
}: RestTimerProps) {
  const progress = 1 - remainingSeconds / totalSeconds;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="text-center">
      <div className="text-xl font-semibold text-primary-600 dark:text-primary-400 mb-6">
        REST
      </div>

      {/* Circular timer */}
      <div className="relative w-40 h-40 mx-auto mb-6">
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="80"
            cy="80"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-secondary-200 dark:text-secondary-700"
          />
          {/* Progress circle */}
          <circle
            cx="80"
            cy="80"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="text-primary-500 transition-all duration-1000 ease-linear"
          />
        </svg>
        {/* Timer text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-5xl font-bold text-secondary-900 dark:text-secondary-100 tabular-nums">
            {formatRestTime(remainingSeconds)}
          </span>
        </div>
      </div>

      {/* Next set info */}
      <div className="text-secondary-600 dark:text-secondary-400 mb-6">
        Next: {nextSetInfo}
      </div>

      {/* Skip button */}
      <button
        onClick={onSkip}
        className="px-6 py-2 text-sm font-medium text-secondary-600 dark:text-secondary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
      >
        Skip Rest
      </button>
    </div>
  );
}
