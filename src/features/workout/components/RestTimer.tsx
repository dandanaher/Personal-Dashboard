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
  const circumference = 2 * Math.PI * 140;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="text-center">
      {/* Large circular timer containing all content */}
      <div className="relative w-80 h-80 mx-auto">
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="160"
            cy="160"
            r="140"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-primary-400"
          />
          {/* Progress circle */}
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
        {/* Content inside circle */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8">
          <div className="text-lg font-semibold text-white mb-3">
            REST
          </div>

          <span className="text-6xl font-bold text-white tabular-nums mb-4">
            {formatRestTime(remainingSeconds)}
          </span>

          <div className="text-sm text-primary-100 mb-4 text-center">
            Next: {nextSetInfo}
          </div>

          <button
            onClick={onSkip}
            className="px-6 py-2 text-sm font-medium text-primary-100 hover:text-white transition-colors"
          >
            Skip Rest
          </button>
        </div>
      </div>
    </div>
  );
}
