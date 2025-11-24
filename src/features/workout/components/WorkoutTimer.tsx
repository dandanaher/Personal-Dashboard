import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { vibrate } from '../lib/workoutEngine';

interface WorkoutTimerProps {
  /** Target duration in seconds */
  targetTime: number;
  /** Called when timer completes (reaches 0) */
  onComplete: (actualTime: number) => void;
  /** Accent color for the timer ring */
  accentColor?: string;
  /** Whether to auto-start the timer */
  autoStart?: boolean;
}

export default function WorkoutTimer({
  targetTime,
  onComplete,
  accentColor = '#3b82f6',
  autoStart = false,
}: WorkoutTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(targetTime);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [hasStarted, setHasStarted] = useState(autoStart);
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const elapsedTimeRef = useRef(0);

  // Calculate progress percentage (0 to 1)
  const progress = 1 - timeRemaining / targetTime;

  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle timer tick
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      startTimeRef.current = Date.now() - elapsedTimeRef.current * 1000;

      intervalRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000);
        const remaining = Math.max(0, targetTime - elapsed);

        setTimeRemaining(remaining);
        elapsedTimeRef.current = elapsed;

        if (remaining === 0) {
          setIsRunning(false);
          vibrate([100, 50, 100, 50, 100]);
          onComplete(targetTime);
        }
      }, 100);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, targetTime, onComplete, timeRemaining]);

  const handleStart = () => {
    setIsRunning(true);
    setHasStarted(true);
    vibrate(30);
  };

  const handlePause = () => {
    setIsRunning(false);
    vibrate(30);
  };

  const handleReset = () => {
    setIsRunning(false);
    setHasStarted(false);
    setTimeRemaining(targetTime);
    elapsedTimeRef.current = 0;
    vibrate(30);
  };

  // SVG circle dimensions
  const size = 200;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Timer Circle */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={accentColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-200"
          />
        </svg>

        {/* Time display */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-bold text-white font-mono">
            {formatTime(timeRemaining)}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {!hasStarted ? (
          <button
            onClick={handleStart}
            className="flex items-center gap-2 px-6 py-3 rounded-full text-white font-medium transition-all hover:scale-105"
            style={{ backgroundColor: accentColor }}
          >
            <Play className="h-5 w-5" />
            Start Timer
          </button>
        ) : isRunning ? (
          <button
            onClick={handlePause}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-secondary-600 text-white font-medium transition-all hover:scale-105"
          >
            <Pause className="h-5 w-5" />
            Pause
          </button>
        ) : (
          <>
            <button
              onClick={handleStart}
              className="flex items-center gap-2 px-6 py-3 rounded-full text-white font-medium transition-all hover:scale-105"
              style={{ backgroundColor: accentColor }}
            >
              <Play className="h-5 w-5" />
              Resume
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-3 rounded-full bg-secondary-700 text-white font-medium transition-all hover:scale-105"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Status text */}
      {timeRemaining === 0 && (
        <div className="text-green-400 font-medium animate-pulse">Complete!</div>
      )}
    </div>
  );
}
