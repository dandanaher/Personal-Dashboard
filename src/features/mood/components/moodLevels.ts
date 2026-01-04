import { Frown, Annoyed, Meh, Smile, Laugh } from 'lucide-react';

export const MOOD_LEVELS = [
  { level: 1 as const, label: 'Bad', icon: Frown, color: '#ef4444' },
  { level: 2 as const, label: 'Poor', icon: Annoyed, color: '#f97316' },
  { level: 3 as const, label: 'Okay', icon: Meh, color: '#eab308' },
  { level: 4 as const, label: 'Good', icon: Smile, color: '#22c55e' },
  { level: 5 as const, label: 'Great', icon: Laugh, color: '#10b981' },
] as const;

export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export function getMoodInfo(level: MoodLevel) {
  const info = MOOD_LEVELS.find((m) => m.level === level);
  if (!info) {
    throw new Error(`Unknown mood level: ${level}`);
  }
  return info;
}

export function getMoodColor(level: MoodLevel): string {
  return getMoodInfo(level).color;
}
