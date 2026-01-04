import { memo } from 'react';
import { MOOD_LEVELS, type MoodLevel } from './moodLevels';

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
