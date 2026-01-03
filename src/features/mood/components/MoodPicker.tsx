import { memo } from 'react';
import { Frown, Annoyed, Meh, Smile, Laugh } from 'lucide-react';

// Mood level configuration
export const MOOD_LEVELS = [
  { level: 1 as const, label: 'Bad', icon: Frown, color: '#ef4444' },
  { level: 2 as const, label: 'Poor', icon: Annoyed, color: '#f97316' },
  { level: 3 as const, label: 'Okay', icon: Meh, color: '#eab308' },
  { level: 4 as const, label: 'Good', icon: Smile, color: '#22c55e' },
  { level: 5 as const, label: 'Great', icon: Laugh, color: '#10b981' },
] as const;

export type MoodLevel = 1 | 2 | 3 | 4 | 5;

interface MoodPickerProps {
  selectedMood?: MoodLevel | null;
  onSelect: (mood: MoodLevel) => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export const MoodPicker = memo(function MoodPicker({
  selectedMood,
  onSelect,
  size = 'md',
  disabled = false,
}: MoodPickerProps) {
  const iconSizes = {
    sm: 18,
    md: 24,
    lg: 32,
  };

  const buttonSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  return (
    <div className="flex items-center justify-center gap-2">
      {MOOD_LEVELS.map(({ level, label, icon: Icon, color }) => {
        const isSelected = selectedMood === level;

        return (
          <button
            key={level}
            type="button"
            onClick={() => onSelect(level)}
            disabled={disabled}
            title={label}
            className={`
              ${buttonSizes[size]}
              rounded-full flex items-center justify-center
              transition-all duration-200
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-110'}
              ${isSelected ? 'ring-2 ring-offset-2 ring-secondary-400 dark:ring-secondary-600 dark:ring-offset-secondary-900' : ''}
            `}
            style={{
              backgroundColor: isSelected ? `${color}20` : 'transparent',
            }}
          >
            <Icon
              size={iconSizes[size]}
              style={{
                color: isSelected ? color : 'var(--color-secondary-400)',
              }}
              className={`transition-colors duration-200 ${!isSelected && !disabled ? 'hover:opacity-80' : ''}`}
              strokeWidth={isSelected ? 2.5 : 2}
            />
          </button>
        );
      })}
    </div>
  );
});

// Helper to get mood info by level
export function getMoodInfo(level: MoodLevel) {
  return MOOD_LEVELS.find((m) => m.level === level)!;
}

// Get color for a mood level (useful for contribution graph)
export function getMoodColor(level: MoodLevel): string {
  return getMoodInfo(level).color;
}
