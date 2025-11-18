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
      <div className="text-xl font-semibold text-white mb-6">
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
            className="text-primary-400"
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
            className="text-white transition-all duration-1000 ease-linear"
          />
        </svg>
        {/* Timer text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-5xl font-bold text-white tabular-nums">
            {formatRestTime(remainingSeconds)}
          </span>
        </div>
      </div>

      {/* Next set info */}
      <div className="text-primary-100 mb-6">
        Next: {nextSetInfo}
      </div>

      {/* Skip button */}
      <button
        onClick={onSkip}
        className="px-6 py-2 text-sm font-medium text-primary-100 hover:text-white transition-colors"
      >
        Skip Rest
      </button>
    </div>
  );
}
