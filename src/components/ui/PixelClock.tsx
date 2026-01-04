import { memo, useState, useEffect } from 'react';
import { useThemeStore } from '@/stores/themeStore';

// 5x5 pixel patterns for digits 0-9 (1 = filled, 0 = empty)
const DIGIT_PATTERNS: Record<string, number[][]> = {
  '0': [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
  ],
  '1': [
    [0, 0, 1, 0, 0],
    [0, 1, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
  ],
  '2': [
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
  ],
  '3': [
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [0, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
  ],
  '4': [
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
  ],
  '5': [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
  ],
  '6': [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
  ],
  '7': [
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
  ],
  '8': [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
  ],
  '9': [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
  ],
  ':': [
    [0, 0, 0, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0],
  ],
};

interface PixelDigitProps {
  char: string;
  pixelSize: number;
  gap: number;
  activeColor: string;
  inactiveColor: string;
}

const PixelDigit = memo(function PixelDigit({
  char,
  pixelSize,
  gap,
  activeColor,
  inactiveColor,
}: PixelDigitProps) {
  const pattern = DIGIT_PATTERNS[char];
  if (!pattern) return null;

  const gridSize = pixelSize * 5 + gap * 4;

  return (
    <div
      className="grid grid-rows-5"
      style={{
        gap: `${gap}px`,
        width: gridSize,
        height: gridSize,
      }}
    >
      {pattern.map((row, rowIndex) => (
        <div key={rowIndex} className="flex" style={{ gap: `${gap}px` }}>
          {row.map((pixel, colIndex) => (
            <div
              key={colIndex}
              className="rounded-sm transition-colors duration-300"
              style={{
                width: pixelSize,
                height: pixelSize,
                backgroundColor: pixel ? activeColor : inactiveColor,
                borderRadius: pixelSize * 0.25,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
});

interface PixelClockProps {
  pixelSize?: number;
  gap?: number;
  showSeconds?: boolean;
  className?: string;
}

export const PixelClock = memo(function PixelClock({
  pixelSize = 6,
  gap = 2,
  showSeconds = false,
  className = '',
}: PixelClockProps) {
  const [time, setTime] = useState(() => new Date());
  const accentColor = useThemeStore((state) => state.accentColor);
  const darkMode = useThemeStore((state) => state.darkMode);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');

  const timeString = showSeconds
    ? `${hours}:${minutes}:${seconds}`
    : `${hours}:${minutes}`;

  // Inactive pixels are subtle
  const inactiveColor = darkMode
    ? 'rgba(255, 255, 255, 0.08)'
    : 'rgba(0, 0, 0, 0.06)';

  return (
    <div className={`flex items-center ${className}`} style={{ gap: `${gap * 3}px` }}>
      {timeString.split('').map((char, index) => (
        <PixelDigit
          key={index}
          char={char}
          pixelSize={pixelSize}
          gap={gap}
          activeColor={accentColor}
          inactiveColor={inactiveColor}
        />
      ))}
    </div>
  );
});

export default PixelClock;
