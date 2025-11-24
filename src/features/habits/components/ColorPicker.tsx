import { Check } from 'lucide-react';

export const HABIT_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Cyan', value: '#06b6d4' },
] as const;

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="grid grid-cols-5 gap-3">
      {HABIT_COLORS.map((color) => (
        <button
          key={color.value}
          type="button"
          className={`
            relative w-10 h-10 rounded-full border-2 transition-all duration-150
            hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
            ${
              value === color.value
                ? 'border-secondary-900 dark:border-white scale-110'
                : 'border-transparent'
            }
          `}
          style={{ backgroundColor: color.value }}
          onClick={() => onChange(color.value)}
          aria-label={`Select ${color.name} color`}
          aria-pressed={value === color.value}
        >
          {value === color.value && (
            <span className="absolute inset-0 flex items-center justify-center">
              <Check className="w-5 h-5 text-white drop-shadow-md" />
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
