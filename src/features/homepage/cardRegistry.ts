import { lazy, type ComponentType } from 'react';
import type { CardId, CardSize } from '@/stores/homepageStore';

// Import default cards directly (no lazy loading) for faster initial load
import { TasksCard } from './cards/TasksCard';
import { HabitsCard } from './cards/HabitsCard';
import { GoalsCard } from './cards/GoalsCard';

export interface CardDefinition {
  id: CardId;
  name: string;
  description: string;
  defaultSize: CardSize;
  minSize: CardSize;
  maxSize: CardSize;
  component: ComponentType<{ className?: string }>;
}

// Lazy load only the optional mood cards
const MoodTrackerCard = lazy(() =>
  import('@/features/mood/components/MoodTrackerCard').then((m) => ({ default: m.MoodTrackerCard }))
);
const MoodYearlyReviewCard = lazy(() =>
  import('@/features/mood/components/MoodYearlyReviewCard').then((m) => ({
    default: m.MoodYearlyReviewCard,
  }))
);

export const CARD_REGISTRY: Record<CardId, CardDefinition> = {
  tasks: {
    id: 'tasks',
    name: 'Tasks Today',
    description: "View your tasks for today",
    defaultSize: 1,
    minSize: 1,
    maxSize: 2,
    component: TasksCard,
  },
  habits: {
    id: 'habits',
    name: 'Habits',
    description: "Track your daily habits",
    defaultSize: 1,
    minSize: 1,
    maxSize: 2,
    component: HabitsCard,
  },
  goals: {
    id: 'goals',
    name: 'Active Goals',
    description: 'View progress on your goals',
    defaultSize: 1,
    minSize: 1,
    maxSize: 2,
    component: GoalsCard,
  },
  'mood-tracker': {
    id: 'mood-tracker',
    name: 'Mood Tracker',
    description: 'Log your daily mood',
    defaultSize: 1,
    minSize: 1,
    maxSize: 1,
    component: MoodTrackerCard,
  },
  'mood-yearly': {
    id: 'mood-yearly',
    name: 'Yearly Mood Review',
    description: 'View your mood over the past year',
    defaultSize: 2,
    minSize: 2,
    maxSize: 2,
    component: MoodYearlyReviewCard,
  },
};

// Get all available card IDs
export const ALL_CARD_IDS = Object.keys(CARD_REGISTRY) as CardId[];

// Get card definition by ID
export function getCardDefinition(id: CardId): CardDefinition {
  return CARD_REGISTRY[id];
}
