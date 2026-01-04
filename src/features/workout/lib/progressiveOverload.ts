// Progressive overload calculation utilities

import { supabase } from '@/lib/supabase';
import type { CompletedExercise, CompletedSet, WorkoutSessionData } from '@/lib/types';
import type { PostgrestError } from '@supabase/supabase-js';
import { getWeightIncrement, roundToNearestIncrement } from './workoutEngine';

// =============================================================================
// Types
// =============================================================================

export interface ProgressiveSuggestion {
  suggestedWeight: number;
  reason: string;
  previousSessions: SessionSummary[];
  shouldIncrease: boolean;
  shouldAddTestSet: boolean;
}

export interface SessionSummary {
  date: string;
  weight: number;
  sets: number;
  avgReps: number;
  allTargetHit: boolean;
  hasFailureSet: boolean;
  failureReps: number;
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

interface WorkoutSessionHistoryRow {
  data: WorkoutSessionData | null;
  started_at: string;
}

// =============================================================================
// Progressive Overload Calculation
// =============================================================================

export async function calculateProgressiveOverload(
  userId: string,
  exerciseName: string,
  currentWeight: number,
  targetReps: number,
  isTemplateFailure: boolean
): Promise<ProgressiveSuggestion> {
  // Fetch last 10 sessions to find relevant exercise data
  const historyResult = (await supabase
    .from('workout_sessions')
    .select('data, started_at')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(10)) as { data: WorkoutSessionHistoryRow[] | null; error: PostgrestError | null };
  const { data: sessions, error } = historyResult;

  if (error || !sessions) {
    return {
      suggestedWeight: currentWeight,
      reason: 'Unable to fetch history',
      previousSessions: [],
      shouldIncrease: false,
      shouldAddTestSet: false,
    };
  }

  // Find sessions with this exercise (case-insensitive match)
  const relevantSessions: SessionSummary[] = sessions
    .map((session) => {
      const exercises = session.data?.exercises ?? [];
      const exercise = exercises.find(
        (e: CompletedExercise) => e.name.toLowerCase() === exerciseName.toLowerCase()
      );

      if (!exercise || exercise.main_sets.length === 0) return null;

      const avgReps =
        exercise.main_sets.reduce((sum: number, s: CompletedSet) => sum + (s.reps || 0), 0) /
        exercise.main_sets.length;

      const allTargetHit = exercise.main_sets.every((s: CompletedSet) => (s.reps || 0) >= targetReps);

      return {
        date: session.started_at,
        weight: exercise.weight ?? 0,
        sets: exercise.main_sets.length,
        avgReps: Math.round(avgReps * 10) / 10,
        allTargetHit,
        hasFailureSet: !!exercise.failure_set,
        failureReps: exercise.failure_set?.reps || 0,
      };
    })
    .filter((s): s is SessionSummary => s !== null)
    .slice(0, 5);

  if (relevantSessions.length < 1) {
    return {
      suggestedWeight: currentWeight,
      reason: 'New exercise',
      previousSessions: relevantSessions,
      shouldIncrease: false,
      shouldAddTestSet: false,
    };
  }

  const noChange = (reason: string): ProgressiveSuggestion => ({
    suggestedWeight: currentWeight,
    reason,
    previousSessions: relevantSessions,
    shouldIncrease: false,
    shouldAddTestSet: false,
  });

  const increment = getWeightIncrement(exerciseName);

  // Path A: Template includes a failure set by default
  if (isTemplateFailure) {
    if (relevantSessions.length < 2) {
      return noChange('Need 2 sessions history');
    }

    const lastTwo = relevantSessions.slice(0, 2);
    const strongFinish = lastTwo.every(
      (s) => s.hasFailureSet && s.failureReps >= targetReps
    );

    if (strongFinish) {
      const suggestedWeight = roundToNearestIncrement(currentWeight + increment, increment);
      return {
        suggestedWeight,
        reason: `Hit ${targetReps}+ reps in failure sets 2x in a row`,
        previousSessions: relevantSessions,
        shouldIncrease: true,
        shouldAddTestSet: false,
      };
    }

    return noChange('Keep pushing on failure sets');
  }

  // Path B: Template normally does NOT have a failure set (use test sets)
  const lastSession = relevantSessions[0];

  if (lastSession.hasFailureSet) {
    if (lastSession.failureReps > targetReps) {
      const suggestedWeight = roundToNearestIncrement(currentWeight + increment, increment);
      return {
        suggestedWeight,
        reason: `Test passed (${lastSession.failureReps} reps > ${targetReps}). Increasing weight.`,
        previousSessions: relevantSessions,
        shouldIncrease: true,
        shouldAddTestSet: false,
      };
    }

    return {
      suggestedWeight: currentWeight,
      reason: `Test incomplete (${lastSession.failureReps} reps). Retesting.`,
      previousSessions: relevantSessions,
      shouldIncrease: false,
      shouldAddTestSet: true,
    };
  }

  if (relevantSessions.length < 2) return noChange('Building history');
  const lastTwo = relevantSessions.slice(0, 2);
  const solidPerformance = lastTwo.every((s) => s.allTargetHit);

  if (solidPerformance) {
    return {
      suggestedWeight: currentWeight,
      reason: '2 solid sessions. Time to test max reps.',
      previousSessions: relevantSessions,
      shouldIncrease: false,
      shouldAddTestSet: true,
    };
  }

  return noChange('Focus on hitting main set targets');
}

// =============================================================================
// Exercise History
// =============================================================================

export async function getExerciseHistory(
  userId: string,
  exerciseName: string,
  limit: number = 10
): Promise<ExerciseHistory> {
  const historyResult = (await supabase
    .from('workout_sessions')
    .select('data, started_at')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(50)) as { data: WorkoutSessionHistoryRow[] | null; error: PostgrestError | null };
  const { data: sessions, error } = historyResult;

  if (error || !sessions) {
    return {
      exerciseName,
      sessions: [],
      personalRecord: null,
    };
  }

  let personalRecord: ExerciseHistory['personalRecord'] = null;

  const relevantSessions: SessionSummary[] = sessions
    .map((session) => {
      const exercises = session.data?.exercises ?? [];
      const exercise = exercises.find(
        (e: CompletedExercise) => e.name.toLowerCase() === exerciseName.toLowerCase()
      );

      if (!exercise || exercise.main_sets.length === 0) return null;

      // Track personal record (highest weight with target reps hit)
      for (const set of exercise.main_sets) {
        const setWeight = set.weight ?? 0;
        const setReps = set.reps ?? 0;
        if (
          !personalRecord ||
          setWeight > personalRecord.weight ||
          (setWeight === personalRecord.weight && setReps > personalRecord.reps)
        ) {
          personalRecord = {
            weight: setWeight,
            reps: setReps,
            date: session.started_at,
          };
        }
      }

      const avgReps =
        exercise.main_sets.reduce((sum: number, s: CompletedSet) => sum + (s.reps || 0), 0) /
        exercise.main_sets.length;

      const targetRepsValue = exercise.target_reps ?? 0;
      const allTargetHit = exercise.main_sets.every(
        (s: CompletedSet) => (s.reps || 0) >= targetRepsValue
      );

      return {
        date: session.started_at,
        weight: exercise.weight ?? 0,
        sets: exercise.main_sets.length,
        avgReps: Math.round(avgReps * 10) / 10,
        allTargetHit,
        hasFailureSet: !!exercise.failure_set,
        failureReps: exercise.failure_set?.reps || 0,
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
  exercises: { name: string; weight: number; reps_per_set: number; to_failure?: boolean }[]
): Promise<Map<string, ProgressiveSuggestion>> {
  const suggestions = new Map<string, ProgressiveSuggestion>();

  // Process all exercises in parallel
  const results = await Promise.all(
    exercises.map(async (exercise) => {
      const suggestion = await calculateProgressiveOverload(
        userId,
        exercise.name,
        exercise.weight,
        exercise.reps_per_set,
        !!exercise.to_failure
      );
      return { name: exercise.name, suggestion };
    })
  );

  for (const { name, suggestion } of results) {
    suggestions.set(name, suggestion);
  }

  return suggestions;
}
