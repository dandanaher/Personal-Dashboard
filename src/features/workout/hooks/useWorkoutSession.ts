// Thin wrapper around the global workout session store for component consumption

import { useMemo, useCallback, useState } from 'react';
import type {
  WorkoutTemplate,
  Exercise,
  CompletedExercise,
  CompletedSet,
  WorkoutSessionData,
} from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useWorkoutSessionStore } from '@/stores/workoutSessionStore';
import type { WorkoutPhase } from '../lib/workoutEngine';

interface CurrentExerciseState {
  exercise: Exercise;
  exerciseIdx: number;
  setIdx: number;
  currentWeight: number;
  currentReps: number;
}

interface UseWorkoutSessionReturn {
  phase: WorkoutPhase;
  sessionData: CompletedExercise[];
  elapsedSeconds: number;
  actualDuration: number;
  currentExercise: CurrentExerciseState | null;
  exerciseNotesHistory: Record<string, string[]>;
  isMinimized: boolean;
  isActive: boolean;
  skippedExercises: number[];
  activeTemplate: WorkoutTemplate | null;
  startWorkout: () => void;
  completeSet: (data?: SetCompletionData | number) => void;
  completeFailureSet: (reps: number) => void;
  skipExercise: () => void;
  returnToSkipped: (exerciseIdx: number) => void;
  skipRest: () => void;
  togglePause: () => void;
  endWorkout: () => Promise<string | null>;
  adjustWeight: (delta: number) => void;
  adjustReps: (delta: number) => void;
  setWeight: (weight: number) => void;
  setReps: (reps: number) => void;
  setExerciseNotes: (exerciseIdx: number, notes: string) => void;
  minimizeWorkout: () => void;
  resumeWorkout: () => void;
  resetSession: () => void;
}

type SetCompletionData = {
  reps?: number;
  weight?: number;
  distance?: number;
  time?: number;
};

export function useWorkoutSession(template?: WorkoutTemplate): UseWorkoutSessionReturn {
  const store = useWorkoutSessionStore();
  const { user } = useAuthStore();
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const {
    activeTemplate,
    phase,
    sessionData,
    elapsedSeconds,
    currentReps,
    currentWeight,
    exerciseNotesHistory,
    isMinimized,
    isActive,
    skippedExercises,
    startWorkout: storeStartWorkout,
    completeSet,
    completeFailureSet,
    skipExercise,
    returnToSkipped,
    skipRest,
    togglePause,
    endWorkout: storeEndWorkout,
    adjustWeight,
    adjustReps,
    setWeight,
    setReps,
    setExerciseNotes,
    minimizeWorkout,
    resumeWorkout,
    resetSession,
  } = store;

  const resolvedTemplate = activeTemplate || template || null;

  const startWorkout = useCallback(() => {
    if (!template) return;
    // Prevent restarting the same active template
    if (!activeTemplate || activeTemplate.id !== template.id) {
      storeStartWorkout(template);
    }
    setSaveState('idle');
  }, [activeTemplate, storeStartWorkout, template]);

  const endWorkout = useCallback(async (): Promise<string | null> => {
    if (saveState !== 'idle') return null;
    setSaveState('saving');

    // Ensure we have a user and template before attempting to save
    if (!user || !resolvedTemplate) {
      setSaveState('idle');
      return null;
    }

    const sessionId = await storeEndWorkout();

    // Persist any updated starting weights back to the template
    if (sessionId && resolvedTemplate?.id && user) {
      try {
        // Fetch the latest template to avoid persisting transient flags (e.g., ad-hoc test failure sets)
        const { data: existingTemplate } = await supabase
          .from('workout_templates')
          .select('exercises')
          .eq('id', resolvedTemplate.id)
          .eq('user_id', user.id)
          .single();

        const mergedExercises =
          existingTemplate?.exercises?.map((exercise: Exercise) => {
            const updated = resolvedTemplate.exercises.find(
              (ex) => ex.name.toLowerCase() === exercise.name.toLowerCase()
            );
            if (!updated) return exercise;
            return { ...exercise, weight: updated.weight };
          }) || resolvedTemplate.exercises;

        await supabase
          .from('workout_templates')
          .update({
            exercises: mergedExercises,
            updated_at: new Date().toISOString(),
          })
          .eq('id', resolvedTemplate.id)
          .eq('user_id', user.id);
      } catch (err) {
        console.error('Error updating template weights after workout:', err);
      }
    }

    if (sessionId) {
      setSaveState('saved');
    } else {
      setSaveState('idle');
    }
    return sessionId;
  }, [saveState, storeEndWorkout, resolvedTemplate, user]);

  const getCurrentExercise = useCallback((): CurrentExerciseState | null => {
    if (!resolvedTemplate) return null;

    if (
      phase.type === 'idle' ||
      phase.type === 'complete' ||
      phase.type === 'resting_between_exercises' ||
      phase.type === 'skipped_exercises_prompt'
    ) {
      return null;
    }

    let exerciseIdx: number;
    let setIdx: number = 0;

    if (phase.type === 'paused') {
      const prev = phase.previousPhase;
      if (
        prev.type === 'idle' ||
        prev.type === 'complete' ||
        prev.type === 'resting_between_exercises'
      ) {
        return null;
      }
      exerciseIdx = prev.exerciseIdx;
      setIdx = 'setIdx' in prev ? prev.setIdx : 0;
    } else {
      exerciseIdx = phase.exerciseIdx;
      setIdx = 'setIdx' in phase ? phase.setIdx : 0;
    }

    const exercise = resolvedTemplate.exercises[exerciseIdx];
    if (!exercise) return null;

    return {
      exercise,
      exerciseIdx,
      setIdx,
      currentWeight,
      currentReps,
    };
  }, [phase, resolvedTemplate, currentWeight, currentReps]);

  const currentExercise = useMemo(() => getCurrentExercise(), [getCurrentExercise]);

  return {
    phase,
    sessionData,
    elapsedSeconds,
    actualDuration: elapsedSeconds,
    currentExercise,
    exerciseNotesHistory,
    isMinimized,
    isActive,
    skippedExercises,
    activeTemplate: resolvedTemplate,
    startWorkout,
    completeSet,
    completeFailureSet,
    skipExercise,
    returnToSkipped,
    skipRest,
    togglePause,
    endWorkout,
    adjustWeight,
    adjustReps,
    setWeight,
    setReps,
    setExerciseNotes,
    minimizeWorkout,
    resumeWorkout,
    resetSession,
  };
}

export type { WorkoutPhase, CompletedExercise, CompletedSet, WorkoutSessionData };
