import { useThemeStore } from '@/stores/themeStore';

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
  const { stylePreset, accentColor } = useThemeStore();
  const clampedProgress = Math.min(100, Math.max(0, progress));

  // Retro Style Rendering
  if (stylePreset === 'retro') {
    // Increase blocks to fill width better (approx 68 chars fits most screens in mono)
    const totalBlocks = 68;
    const filledBlocks = Math.round((clampedProgress / 100) * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;
    
    return (
      <div className={`${className} font-mono text-xs w-full`}>
        {showLabel && (
          <div className="flex items-center justify-between mb-1">
            <span className="uppercase tracking-wider text-secondary-600 dark:text-secondary-400">
              Progress
            </span>
            <span className="font-bold text-secondary-900 dark:text-white">
              {clampedProgress}%
            </span>
          </div>
        )}
        <div
          className="text-secondary-900 dark:text-white whitespace-nowrap overflow-hidden font-bold flex"
          role="progressbar"
          aria-valuenow={clampedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress: ${clampedProgress}%`}
        >
          <span style={{ color: accentColor }}>{'▓'.repeat(filledBlocks)}</span>
          <span className="opacity-30">{'░'.repeat(emptyBlocks)}</span>
        </div>
      </div>
    );
  }

  // Modern (Default) Style Rendering
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
      <div
        className={`w-full ${height} bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden`}
      >
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
