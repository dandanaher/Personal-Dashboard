// Progressive overload calculation utilities

import { supabase } from '@/lib/supabase';
import type { CompletedExercise, CompletedSet } from '@/lib/types';
import { getWeightIncrement, roundToNearestIncrement } from './workoutEngine';

// =============================================================================
// Types
// =============================================================================

export interface ProgressiveSuggestion {
  suggestedWeight: number;
  reason: string;
  previousSessions: SessionSummary[];
  shouldIncrease: boolean;
}

export interface SessionSummary {
  date: string;
  weight: number;
  sets: number;
  avgReps: number;
  allTargetHit: boolean;
}

export interface ExerciseHistory {
  exerciseName: string;
  sessions: SessionSummary[];
  personalRecord: {
    weight: number;
    reps: number;
    date: string;
  } | null;
}

// =============================================================================
// Progressive Overload Calculation
// =============================================================================

export async function calculateProgressiveOverload(
  userId: string,
  exerciseName: string,
  currentWeight: number,
  targetReps: number
): Promise<ProgressiveSuggestion> {
  // Fetch last 10 sessions to find relevant exercise data
  const { data: sessions, error } = await supabase
    .from('workout_sessions')
    .select('data, started_at')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(10);

  if (error || !sessions) {
    return {
      suggestedWeight: currentWeight,
      reason: 'Unable to fetch history',
      previousSessions: [],
      shouldIncrease: false,
    };
  }

  // Find sessions with this exercise (case-insensitive match)
  const relevantSessions: SessionSummary[] = sessions
    .map(session => {
      const exercise = session.data.exercises.find(
        (e: CompletedExercise) =>
          e.name.toLowerCase() === exerciseName.toLowerCase()
      );

      if (!exercise || exercise.main_sets.length === 0) return null;

      const avgReps =
        exercise.main_sets.reduce((sum: number, s: CompletedSet) => sum + (s.reps || 0), 0) /
        exercise.main_sets.length;

      const allTargetHit = exercise.main_sets.every(
        (s: CompletedSet) => (s.reps || 0) >= exercise.target_reps
      );

      return {
        date: session.started_at,
        weight: exercise.weight,
        sets: exercise.main_sets.length,
        avgReps: Math.round(avgReps * 10) / 10,
        allTargetHit,
      };
    })
    .filter((s): s is SessionSummary => s !== null)
    .slice(0, 3);

  if (relevantSessions.length < 2) {
    return {
      suggestedWeight: currentWeight,
      reason: 'Not enough history (need 2+ sessions)',
      previousSessions: relevantSessions,
      shouldIncrease: false,
    };
  }

  // Check if user hit target reps on all sets in last 2 sessions
  const lastTwoSessions = relevantSessions.slice(0, 2);
  const allSetsComplete = lastTwoSessions.every(session => session.allTargetHit);

  if (allSetsComplete) {
    // Suggest weight increase
    const increment = getWeightIncrement(exerciseName);
    const suggestedWeight = roundToNearestIncrement(currentWeight + increment, 1.25);

    return {
      suggestedWeight,
      reason: `Hit ${targetReps}+ reps on all sets in last 2 sessions`,
      previousSessions: relevantSessions,
      shouldIncrease: true,
    };
  }

  // Check if user is struggling (missing reps consistently)
  const recentAvgReps = lastTwoSessions.reduce((sum, s) => sum + s.avgReps, 0) / 2;
  if (recentAvgReps < targetReps - 2) {
    // Suggest reducing weight if struggling significantly
    const increment = getWeightIncrement(exerciseName);
    const suggestedWeight = roundToNearestIncrement(
      Math.max(currentWeight - increment, increment),
      1.25
    );

    return {
      suggestedWeight,
      reason: `Struggling with reps (avg ${recentAvgReps.toFixed(1)}). Consider reducing.`,
      previousSessions: relevantSessions,
      shouldIncrease: false,
    };
  }

  return {
    suggestedWeight: currentWeight,
    reason: 'Keep current weight and focus on hitting target reps',
    previousSessions: relevantSessions,
    shouldIncrease: false,
  };
}

// =============================================================================
// Exercise History
// =============================================================================

export async function getExerciseHistory(
  userId: string,
  exerciseName: string,
  limit: number = 10
): Promise<ExerciseHistory> {
  const { data: sessions, error } = await supabase
    .from('workout_sessions')
    .select('data, started_at')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(50);

  if (error || !sessions) {
    return {
      exerciseName,
      sessions: [],
      personalRecord: null,
    };
  }

  let personalRecord: ExerciseHistory['personalRecord'] = null;

  const relevantSessions: SessionSummary[] = sessions
    .map(session => {
      const exercise = session.data.exercises.find(
        (e: CompletedExercise) =>
          e.name.toLowerCase() === exerciseName.toLowerCase()
      );

      if (!exercise || exercise.main_sets.length === 0) return null;

      // Track personal record (highest weight with target reps hit)
      for (const set of exercise.main_sets) {
        if (
          !personalRecord ||
          set.weight > personalRecord.weight ||
          (set.weight === personalRecord.weight && set.reps > personalRecord.reps)
        ) {
          personalRecord = {
            weight: set.weight,
            reps: set.reps,
            date: session.started_at,
          };
        }
      }

      const avgReps =
        exercise.main_sets.reduce((sum: number, s: CompletedSet) => sum + (s.reps || 0), 0) /
        exercise.main_sets.length;

      const allTargetHit = exercise.main_sets.every(
        (s: CompletedSet) => (s.reps || 0) >= exercise.target_reps
      );

      return {
        date: session.started_at,
        weight: exercise.weight,
        sets: exercise.main_sets.length,
        avgReps: Math.round(avgReps * 10) / 10,
        allTargetHit,
      };
    })
    .filter((s): s is SessionSummary => s !== null)
    .slice(0, limit);

  return {
    exerciseName,
    sessions: relevantSessions,
    personalRecord,
  };
}

// =============================================================================
// Batch Progressive Overload for Template
// =============================================================================

export async function calculateTemplateOverloads(
  userId: string,
  exercises: { name: string; weight: number; reps_per_set: number }[]
): Promise<Map<string, ProgressiveSuggestion>> {
  const suggestions = new Map<string, ProgressiveSuggestion>();

  // Process all exercises in parallel
  const results = await Promise.all(
    exercises.map(async exercise => {
      const suggestion = await calculateProgressiveOverload(
        userId,
        exercise.name,
        exercise.weight,
        exercise.reps_per_set
      );
      return { name: exercise.name, suggestion };
    })
  );

  for (const { name, suggestion } of results) {
    suggestions.set(name, suggestion);
  }

  return suggestions;
}
