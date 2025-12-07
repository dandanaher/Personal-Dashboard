import { useThemeStore } from '@/stores/themeStore';
import { useRef, useState, useEffect } from 'react';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [blockCount, setBlockCount] = useState(50);

  // Dynamically calculate block count based on container width (for retro style)
  // Must be called unconditionally to follow React's Rules of Hooks
  useEffect(() => {
    if (stylePreset !== 'retro') return;

    const updateBlockCount = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        // Each block character is approximately 6.8px wide in text-xs font-mono
        // Using a slightly smaller value ensures we fill the entire width
        const charWidth = 6.8;
        const calculatedBlocks = Math.floor(width / charWidth);
        // Ensure we have at least 20 blocks and cap at 120 for performance
        setBlockCount(Math.min(120, Math.max(20, calculatedBlocks)));
      }
    };

    updateBlockCount();
    // Small delay to ensure accurate width measurement after render
    setTimeout(updateBlockCount, 100);
    window.addEventListener('resize', updateBlockCount);
    return () => window.removeEventListener('resize', updateBlockCount);
  }, [stylePreset]);

  // Retro Style Rendering
  if (stylePreset === 'retro') {
    const filledBlocks = Math.round((clampedProgress / 100) * blockCount);
    const emptyBlocks = blockCount - filledBlocks;

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
          ref={containerRef}
          className="text-secondary-900 dark:text-white whitespace-nowrap overflow-hidden font-bold w-full"
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
