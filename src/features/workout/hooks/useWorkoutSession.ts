// Custom hook for managing live workout session state

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { WorkoutTemplate, Exercise, CompletedExercise, CompletedSet, WorkoutSessionData } from '@/lib/types';
import {
  WorkoutPhase,
  requestWakeLock,
  releaseWakeLock,
  vibrateSetComplete,
  vibrateRestComplete,
  vibrateWorkoutComplete,
  createEmptyExerciseData,
  addSetToExercise,
  addFailureSetToExercise,
} from '../lib/workoutEngine';

// =============================================================================
// Types
// =============================================================================

interface CurrentExerciseState {
  exercise: Exercise;
  exerciseIdx: number;
  setIdx: number;
  // Adjusted values (user can modify before completing set)
  currentWeight: number;
  currentReps: number;
}

interface UseWorkoutSessionReturn {
  // State
  phase: WorkoutPhase;
  sessionData: CompletedExercise[];
  elapsedSeconds: number;
  currentExercise: CurrentExerciseState | null;

  // Actions
  startWorkout: () => void;
  completeSet: (actualReps?: number) => void;
  completeFailureSet: (reps: number) => void;
  skipRest: () => void;
  togglePause: () => void;
  endWorkout: () => Promise<string | null>;

  // Quick adjustments
  adjustWeight: (delta: number) => void;
  adjustReps: (delta: number) => void;
  setWeight: (weight: number) => void;
  setReps: (reps: number) => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useWorkoutSession(template: WorkoutTemplate): UseWorkoutSessionReturn {
  const { user } = useAuthStore();

  // Core state
  const [phase, setPhase] = useState<WorkoutPhase>({ type: 'idle' });
  const [sessionData, setSessionData] = useState<CompletedExercise[]>([]);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Current exercise adjustments
  const [currentWeight, setCurrentWeight] = useState(0);
  const [currentReps, setCurrentReps] = useState(0);

  // Refs for interval management
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // =============================================================================
  // Computed State
  // =============================================================================

  const getCurrentExercise = useCallback((): CurrentExerciseState | null => {
    if (phase.type === 'idle' || phase.type === 'complete') return null;

    let exerciseIdx: number;
    let setIdx: number = 0;

    if (phase.type === 'paused') {
      const prev = phase.previousPhase;
      if (prev.type === 'idle' || prev.type === 'complete') return null;
      exerciseIdx = prev.exerciseIdx;
      setIdx = 'setIdx' in prev ? prev.setIdx : 0;
    } else {
      exerciseIdx = phase.exerciseIdx;
      setIdx = 'setIdx' in phase ? phase.setIdx : 0;
    }

    const exercise = template.exercises[exerciseIdx];
    if (!exercise) return null;

    return {
      exercise,
      exerciseIdx,
      setIdx,
      currentWeight,
      currentReps,
    };
  }, [phase, template.exercises, currentWeight, currentReps]);

  const currentExercise = getCurrentExercise();

  // =============================================================================
  // Initialize Exercise State
  // =============================================================================

  const initializeExerciseState = useCallback((exerciseIdx: number) => {
    const exercise = template.exercises[exerciseIdx];
    if (exercise) {
      setCurrentWeight(exercise.weight);
      setCurrentReps(exercise.reps_per_set);
    }
  }, [template.exercises]);

  // =============================================================================
  // Timer Management
  // =============================================================================

  // Elapsed time ticker
  useEffect(() => {
    if (!startTime || phase.type === 'paused' || phase.type === 'idle' || phase.type === 'complete') {
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current);
        elapsedIntervalRef.current = null;
      }
      return;
    }

    elapsedIntervalRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((new Date().getTime() - startTime.getTime()) / 1000));
    }, 1000);

    return () => {
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current);
        elapsedIntervalRef.current = null;
      }
    };
  }, [startTime, phase.type]);

  // =============================================================================
  // Workout Actions
  // =============================================================================

  // Start workout
  const startWorkout = useCallback(() => {
    setStartTime(new Date());
    setPhase({ type: 'active', exerciseIdx: 0, setIdx: 0 });

    // Initialize first exercise
    initializeExerciseState(0);

    // Initialize session data
    const initialData = template.exercises.map(createEmptyExerciseData);
    setSessionData(initialData);

    // Keep screen on
    requestWakeLock();
  }, [template.exercises, initializeExerciseState]);

  // Start rest timer
  const startRestTimer = useCallback((seconds: number, nextExerciseIdx: number, nextSetIdx: number) => {
    // Clear any existing rest interval
    if (restIntervalRef.current) {
      clearInterval(restIntervalRef.current);
    }

    setPhase({
      type: 'resting',
      exerciseIdx: nextExerciseIdx,
      setIdx: nextSetIdx,
      remainingSeconds: seconds,
    });

    restIntervalRef.current = setInterval(() => {
      setPhase(prev => {
        if (prev.type !== 'resting') {
          if (restIntervalRef.current) {
            clearInterval(restIntervalRef.current);
            restIntervalRef.current = null;
          }
          return prev;
        }

        if (prev.remainingSeconds <= 1) {
          if (restIntervalRef.current) {
            clearInterval(restIntervalRef.current);
            restIntervalRef.current = null;
          }
          vibrateRestComplete();
          return { type: 'active', exerciseIdx: nextExerciseIdx, setIdx: nextSetIdx };
        }

        // Vibrate at key moments
        if (prev.remainingSeconds === 11) {
          // 10 seconds warning
        }

        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);
  }, []);

  // Start rest timer before failure set
  const startRestTimerForFailure = useCallback((seconds: number, exerciseIdx: number) => {
    // Clear any existing rest interval
    if (restIntervalRef.current) {
      clearInterval(restIntervalRef.current);
    }

    setPhase({
      type: 'resting_for_failure',
      exerciseIdx,
      remainingSeconds: seconds,
    });

    restIntervalRef.current = setInterval(() => {
      setPhase(prev => {
        if (prev.type !== 'resting_for_failure') {
          if (restIntervalRef.current) {
            clearInterval(restIntervalRef.current);
            restIntervalRef.current = null;
          }
          return prev;
        }

        if (prev.remainingSeconds <= 1) {
          if (restIntervalRef.current) {
            clearInterval(restIntervalRef.current);
            restIntervalRef.current = null;
          }
          vibrateRestComplete();
          return { type: 'failure_set', exerciseIdx };
        }

        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);
  }, []);

  // Complete current set
  const completeSet = useCallback((actualReps?: number) => {
    if (phase.type !== 'active') return;

    const { exerciseIdx, setIdx } = phase;
    const exercise = template.exercises[exerciseIdx];
    if (!exercise) return;

    vibrateSetComplete();

    // Create completed set data
    const completedSet: CompletedSet = {
      reps: actualReps ?? currentReps,
      weight: currentWeight,
      completed_at: new Date().toISOString(),
    };

    // Update session data
    setSessionData(prev => {
      const updated = [...prev];
      updated[exerciseIdx] = addSetToExercise(updated[exerciseIdx], completedSet);
      return updated;
    });

    // Determine next phase
    if (setIdx < exercise.sets - 1) {
      // More main sets to do
      startRestTimer(exercise.rest_time, exerciseIdx, setIdx + 1);
    } else if (exercise.to_failure) {
      // Rest before failure set
      startRestTimerForFailure(exercise.rest_time, exerciseIdx);
    } else if (exerciseIdx < template.exercises.length - 1) {
      // Next exercise
      const nextIdx = exerciseIdx + 1;
      initializeExerciseState(nextIdx);
      setPhase({ type: 'active', exerciseIdx: nextIdx, setIdx: 0 });
    } else {
      // Workout complete
      vibrateWorkoutComplete();
      setPhase({ type: 'complete' });
    }
  }, [phase, template.exercises, currentWeight, currentReps, startRestTimer, startRestTimerForFailure, initializeExerciseState]);

  // Complete failure set
  const completeFailureSet = useCallback((reps: number) => {
    if (phase.type !== 'failure_set' && phase.type !== 'failure_input') return;

    const { exerciseIdx } = phase;

    vibrateSetComplete();

    // Create failure set data
    const failureSet: CompletedSet = {
      reps,
      weight: currentWeight,
      completed_at: new Date().toISOString(),
    };

    // Update session data
    setSessionData(prev => {
      const updated = [...prev];
      updated[exerciseIdx] = addFailureSetToExercise(updated[exerciseIdx], failureSet);
      return updated;
    });

    // Move to next exercise or complete
    if (exerciseIdx < template.exercises.length - 1) {
      const nextIdx = exerciseIdx + 1;
      initializeExerciseState(nextIdx);
      setPhase({ type: 'active', exerciseIdx: nextIdx, setIdx: 0 });
    } else {
      vibrateWorkoutComplete();
      setPhase({ type: 'complete' });
    }
  }, [phase, template.exercises.length, currentWeight, initializeExerciseState]);

  // Skip rest
  const skipRest = useCallback(() => {
    // Clear rest interval
    if (restIntervalRef.current) {
      clearInterval(restIntervalRef.current);
      restIntervalRef.current = null;
    }

    if (phase.type === 'resting') {
      setPhase({ type: 'active', exerciseIdx: phase.exerciseIdx, setIdx: phase.setIdx });
    } else if (phase.type === 'resting_for_failure') {
      setPhase({ type: 'failure_set', exerciseIdx: phase.exerciseIdx });
    }
  }, [phase]);

  // Toggle pause
  const togglePause = useCallback(() => {
    if (phase.type === 'paused') {
      // Resume
      const { previousPhase } = phase;

      // If we were resting, restart the timer
      if (previousPhase.type === 'resting') {
        startRestTimer(
          previousPhase.remainingSeconds,
          previousPhase.exerciseIdx,
          previousPhase.setIdx
        );
      } else if (previousPhase.type === 'resting_for_failure') {
        startRestTimerForFailure(
          previousPhase.remainingSeconds,
          previousPhase.exerciseIdx
        );
      } else {
        setPhase(previousPhase);
      }
    } else if (phase.type !== 'idle' && phase.type !== 'complete') {
      // Pause
      // Clear rest interval if running
      if (restIntervalRef.current) {
        clearInterval(restIntervalRef.current);
        restIntervalRef.current = null;
      }

      setPhase({ type: 'paused', previousPhase: phase });
    }
  }, [phase, startRestTimer, startRestTimerForFailure]);

  // End workout and save
  const endWorkout = useCallback(async (): Promise<string | null> => {
    if (!user || !startTime) return null;

    // Clean up
    releaseWakeLock();
    if (restIntervalRef.current) {
      clearInterval(restIntervalRef.current);
      restIntervalRef.current = null;
    }

    const duration = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);

    try {
      const sessionPayload: WorkoutSessionData = {
        exercises: sessionData,
      };

      const { data, error } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: user.id,
          template_id: template.id,
          template_name: template.name,
          started_at: startTime.toISOString(),
          completed_at: new Date().toISOString(),
          duration,
          data: sessionPayload,
          notes: null,
        })
        .select()
        .single();

      if (error) throw error;

      setPhase({ type: 'complete' });
      return data.id;
    } catch (err) {
      console.error('Error saving workout:', err);
      return null;
    }
  }, [user, startTime, sessionData, template]);

  // =============================================================================
  // Quick Adjustments
  // =============================================================================

  const adjustWeight = useCallback((delta: number) => {
    setCurrentWeight(prev => Math.max(0, prev + delta));
  }, []);

  const adjustReps = useCallback((delta: number) => {
    setCurrentReps(prev => Math.max(1, prev + delta));
  }, []);

  // =============================================================================
  // Cleanup
  // =============================================================================

  useEffect(() => {
    return () => {
      releaseWakeLock();
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current);
      }
      if (restIntervalRef.current) {
        clearInterval(restIntervalRef.current);
      }
    };
  }, []);

  return {
    phase,
    sessionData,
    elapsedSeconds,
    currentExercise,
    startWorkout,
    completeSet,
    completeFailureSet,
    skipRest,
    togglePause,
    endWorkout,
    adjustWeight,
    adjustReps,
    setWeight: setCurrentWeight,
    setReps: setCurrentReps,
  };
}
