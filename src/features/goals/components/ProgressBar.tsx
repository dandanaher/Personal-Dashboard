interface ProgressBarProps {
  progress: number;
  color?: string;
  height?: string;
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({
  progress,
  color,
  height = 'h-2',
  showLabel = false,
  className = '',
}: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  // Determine color based on progress if not provided
  const barColor = color || getProgressColor(clampedProgress);

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-secondary-600 dark:text-secondary-400">Progress</span>
          <span className="text-sm font-semibold text-secondary-900 dark:text-white">
            {clampedProgress}%
          </span>
        </div>
      )}
      <div className={`w-full ${height} bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden`}>
        <div
          className={`${height} ${barColor} transition-all duration-300 ease-out rounded-full`}
          style={{ width: `${clampedProgress}%` }}
          role="progressbar"
          aria-valuenow={clampedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress: ${clampedProgress}%`}
        />
      </div>
    </div>
  );
}

// Helper function to get color based on progress
export function getProgressColor(progress: number): string {
  if (progress >= 100) return 'bg-green-500';
  if (progress >= 67) return 'bg-blue-500';
  if (progress >= 34) return 'bg-yellow-500';
  return 'bg-orange-500';
}

export default ProgressBar;
