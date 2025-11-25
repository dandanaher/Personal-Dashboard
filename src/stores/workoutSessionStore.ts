import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type {
  WorkoutTemplate,
  CompletedExercise,
  CompletedSet,
  WorkoutSessionData,
  Exercise,
} from '@/lib/types';
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
} from '@/features/workout/lib/workoutEngine';
import { incrementXP } from '@/features/gamification/hooks/useProfileStats';
import { XP_REWARDS } from '@/features/gamification/utils';

interface WorkoutSessionStoreState {
  activeTemplate: WorkoutTemplate | null;
  phase: WorkoutPhase;
  sessionData: CompletedExercise[];
  startTime: Date | null;
  elapsedSeconds: number;
  currentWeight: number;
  currentReps: number;
  exerciseNotesHistory: Record<string, string[]>;
  isActive: boolean;
  isMinimized: boolean;
  skippedExercises: number[];
}

interface WorkoutSessionActions {
  startWorkout: (template: WorkoutTemplate) => void;
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
  loadExerciseNotesHistory: (template: WorkoutTemplate) => Promise<void>;
}

type SetCompletionData = {
  reps?: number;
  weight?: number;
  distance?: number;
  time?: number;
};

type WorkoutSessionStore = WorkoutSessionStoreState & WorkoutSessionActions;

let elapsedInterval: ReturnType<typeof setInterval> | null = null;
let restInterval: ReturnType<typeof setInterval> | null = null;
let restEndTime: number | null = null;
let restNextState: { exerciseIdx: number; setIdx?: number; isFailure?: boolean } | null = null;

const defaultState: WorkoutSessionStoreState = {
  activeTemplate: null,
  phase: { type: 'idle' },
  sessionData: [],
  startTime: null,
  elapsedSeconds: 0,
  currentWeight: 0,
  currentReps: 0,
  exerciseNotesHistory: {},
  isActive: false,
  isMinimized: false,
  skippedExercises: [],
};

export const useWorkoutSessionStore = create<WorkoutSessionStore>((set, get) => {
  const clearRestTimer = () => {
    if (restInterval) {
      clearInterval(restInterval);
      restInterval = null;
    }
    restEndTime = null;
    restNextState = null;
  };

  const clearElapsedTimer = () => {
    if (elapsedInterval) {
      clearInterval(elapsedInterval);
      elapsedInterval = null;
    }
  };

  const initializeExerciseState = (exerciseIdx: number) => {
    const template = get().activeTemplate;
    if (!template) return;
    const exercise = template.exercises[exerciseIdx];
    if (!exercise) return;

    const exerciseType = exercise.type || 'strength';
    set({
      currentWeight: exercise.weight || 0,
      currentReps: exerciseType === 'strength' ? exercise.reps_per_set || 8 : 0,
    });
  };

  const startElapsedTimer = (start: Date) => {
    clearElapsedTimer();
    elapsedInterval = setInterval(() => {
      set({ elapsedSeconds: Math.floor((Date.now() - start.getTime()) / 1000) });
    }, 1000);
  };

  const startRestTimer = (seconds: number, exerciseIdx: number, setIdx: number) => {
    clearRestTimer();

    const endTime = Date.now() + seconds * 1000;
    restEndTime = endTime;
    restNextState = { exerciseIdx, setIdx };

    set({
      phase: {
        type: 'resting',
        exerciseIdx,
        setIdx,
        remainingSeconds: seconds,
      },
    });

    restInterval = setInterval(() => {
      const remaining = Math.ceil((restEndTime! - Date.now()) / 1000);
      if (remaining <= 0) {
        clearRestTimer();
        vibrateRestComplete();
        set({
          phase: {
            type: 'active',
            exerciseIdx,
            setIdx,
          },
        });
      } else {
        set((prev) => {
          if (prev.phase.type !== 'resting') return prev;
          return {
            ...prev,
            phase: { ...prev.phase, remainingSeconds: remaining },
          };
        });
      }
    }, 250);
  };

  const findNextUnskippedExercise = (startIdx: number): number | null => {
    const template = get().activeTemplate;
    if (!template) return null;
    const skipped = get().skippedExercises;
    for (let i = startIdx; i < template.exercises.length; i++) {
      if (!skipped.includes(i)) return i;
    }
    return null;
  };

  const startRestTimerForFailure = (seconds: number, exerciseIdx: number) => {
    clearRestTimer();

    const endTime = Date.now() + seconds * 1000;
    restEndTime = endTime;
    restNextState = { exerciseIdx, isFailure: true };

    set({
      phase: {
        type: 'resting_for_failure',
        exerciseIdx,
        remainingSeconds: seconds,
      },
    });

    restInterval = setInterval(() => {
      const remaining = Math.ceil((restEndTime! - Date.now()) / 1000);
      if (remaining <= 0) {
        clearRestTimer();
        vibrateRestComplete();
        set({ phase: { type: 'failure_set', exerciseIdx } });
      } else {
        set((prev) => {
          if (prev.phase.type !== 'resting_for_failure') return prev;
          return {
            ...prev,
            phase: { ...prev.phase, remainingSeconds: remaining },
          };
        });
      }
    }, 250);
  };

  const startRestTimerBetweenExercises = (
    seconds: number,
    completedIdx: number,
    nextIdx: number
  ) => {
    clearRestTimer();

    const endTime = Date.now() + seconds * 1000;
    restEndTime = endTime;
    restNextState = { exerciseIdx: nextIdx, setIdx: 0 };

    set({
      phase: {
        type: 'resting_between_exercises',
        completedExerciseIdx: completedIdx,
        nextExerciseIdx: nextIdx,
        remainingSeconds: seconds,
      },
    });

    restInterval = setInterval(() => {
      const remaining = Math.ceil((restEndTime! - Date.now()) / 1000);
      if (remaining <= 0) {
        clearRestTimer();
        vibrateRestComplete();
        initializeExerciseState(nextIdx);
        set({ phase: { type: 'active', exerciseIdx: nextIdx, setIdx: 0 } });
      } else {
        set((prev) => {
          if (prev.phase.type !== 'resting_between_exercises') return prev;
          return {
            ...prev,
            phase: { ...prev.phase, remainingSeconds: remaining },
          };
        });
      }
    }, 250);
  };

  const loadExerciseNotesHistory = async (template: WorkoutTemplate) => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ exerciseNotesHistory: {} });
      return;
    }

    try {
      let query = supabase
        .from('workout_sessions')
        .select('data, started_at, template_id, template_name')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(50);

      if (template.id) {
        query = query.eq('template_id', template.id);
      } else {
        query = query.eq('template_name', template.name);
      }

      const { data, error } = await query;
      if (error) throw error;

      const notesMap: Record<string, string[]> = {};

      (data || []).forEach((session) => {
        const exercises = (session as { data: WorkoutSessionData | null }).data?.exercises || [];
        exercises.forEach((exercise) => {
          if (exercise?.completion_notes) {
            const key = exercise.name.toLowerCase();
            if (!notesMap[key]) notesMap[key] = [];
            notesMap[key].push(exercise.completion_notes);
          }
        });
      });

      set({ exerciseNotesHistory: notesMap });
    } catch (err) {
      console.error('Error loading exercise notes history:', err);
    }
  };

  const resetSession = () => {
    clearRestTimer();
    clearElapsedTimer();
    releaseWakeLock();
    set({ ...defaultState });
  };

  return {
    ...defaultState,

    loadExerciseNotesHistory,

    startWorkout: (template: WorkoutTemplate) => {
      const start = new Date();
      clearRestTimer();
      clearElapsedTimer();
      releaseWakeLock();
      set({
        activeTemplate: template,
        isActive: true,
        isMinimized: false,
        startTime: start,
        elapsedSeconds: 0,
        phase: { type: 'active', exerciseIdx: 0, setIdx: 0 },
        sessionData: template.exercises.map(createEmptyExerciseData),
        skippedExercises: [],
      });

      initializeExerciseState(0);
      startElapsedTimer(start);
      requestWakeLock();
      loadExerciseNotesHistory(template);
    },

    completeSet: (data?: SetCompletionData | number) => {
      const state = get();
      const { phase, activeTemplate, currentWeight, currentReps, skippedExercises } = state;
      if (phase.type !== 'active' || !activeTemplate) return;

      const { exerciseIdx, setIdx } = phase;
      const exercise = activeTemplate.exercises[exerciseIdx];
      if (!exercise) return;

      vibrateSetComplete();

      const exerciseType = exercise.type || 'strength';
      let completedSet: CompletedSet;

      if (typeof data === 'number') {
        completedSet = {
          reps: data,
          weight: currentWeight,
          completed_at: new Date().toISOString(),
        };
      } else if (data) {
        completedSet = {
          reps: data.reps,
          weight: data.weight ?? currentWeight,
          distance: data.distance,
          time: data.time,
          completed_at: new Date().toISOString(),
        };
      } else {
        switch (exerciseType) {
          case 'strength':
            completedSet = {
              reps: currentReps,
              weight: currentWeight,
              completed_at: new Date().toISOString(),
            };
            break;
          case 'cardio':
            completedSet = {
              distance: exercise.distance,
              time: exercise.target_time,
              completed_at: new Date().toISOString(),
            };
            break;
          case 'timed':
            completedSet = {
              time: exercise.target_time,
              weight: currentWeight || undefined,
              completed_at: new Date().toISOString(),
            };
            break;
          default:
            completedSet = {
              reps: currentReps,
              weight: currentWeight,
              completed_at: new Date().toISOString(),
            };
        }
      }

      set((prev) => {
        const updated = [...prev.sessionData];
        updated[exerciseIdx] = addSetToExercise(updated[exerciseIdx], completedSet);
        return { sessionData: updated };
      });

      if (setIdx < exercise.sets - 1) {
        startRestTimer(exercise.rest_time, exerciseIdx, setIdx + 1);
        return;
      }

      if (exercise.to_failure && exerciseType === 'strength') {
        startRestTimerForFailure(exercise.rest_time, exerciseIdx);
        return;
      }

      const nextIdx = findNextUnskippedExercise(exerciseIdx + 1);
      if (nextIdx !== null) {
        const restTime = exercise.rest_time;
        startRestTimerBetweenExercises(restTime, exerciseIdx, nextIdx);
        return;
      }

      if (skippedExercises.length > 0) {
        set({ phase: { type: 'skipped_exercises_prompt' } });
      } else {
        vibrateWorkoutComplete();
        set({ phase: { type: 'complete' } });
      }
    },

    completeFailureSet: (reps: number) => {
      const state = get();
      const { phase, activeTemplate, currentWeight, skippedExercises } = state;
      if ((phase.type !== 'failure_set' && phase.type !== 'failure_input') || !activeTemplate) {
        return;
      }

      const { exerciseIdx } = phase;
      vibrateSetComplete();

      const failureSet: CompletedSet = {
        reps,
        weight: currentWeight,
        completed_at: new Date().toISOString(),
      };

      set((prev) => {
        const updated = [...prev.sessionData];
        updated[exerciseIdx] = addFailureSetToExercise(updated[exerciseIdx], failureSet);
        return { sessionData: updated };
      });

      const nextIdx = findNextUnskippedExercise(exerciseIdx + 1);
      if (nextIdx !== null) {
        const exercise = activeTemplate.exercises[exerciseIdx];
        startRestTimerBetweenExercises(exercise.rest_time, exerciseIdx, nextIdx);
      } else if (skippedExercises.length > 0) {
        set({ phase: { type: 'skipped_exercises_prompt' } });
      } else {
        vibrateWorkoutComplete();
        set({ phase: { type: 'complete' } });
      }
    },

    skipExercise: () => {
      const state = get();
      const { phase, activeTemplate, skippedExercises } = state;
      if (phase.type !== 'active' || !activeTemplate) return;

      const alreadySkipped = skippedExercises.includes(phase.exerciseIdx);
      const updatedSkipped = alreadySkipped
        ? skippedExercises
        : [...skippedExercises, phase.exerciseIdx];
      set({ skippedExercises: updatedSkipped });

      const nextIdx = findNextUnskippedExercise(phase.exerciseIdx + 1);
      if (nextIdx !== null) {
        initializeExerciseState(nextIdx);
        set({ phase: { type: 'active', exerciseIdx: nextIdx, setIdx: 0 } });
      } else if (updatedSkipped.length > 0) {
        set({ phase: { type: 'skipped_exercises_prompt' } });
      } else {
        vibrateWorkoutComplete();
        set({ phase: { type: 'complete' } });
      }
    },

    returnToSkipped: (exerciseIdx: number) => {
      const template = get().activeTemplate;
      if (!template) return;
      set((prev) => ({
        skippedExercises: prev.skippedExercises.filter((idx) => idx !== exerciseIdx),
      }));
      initializeExerciseState(exerciseIdx);
      set({ phase: { type: 'active', exerciseIdx, setIdx: 0 } });
    },

    skipRest: () => {
      const state = get();
      const { phase } = state;
      clearRestTimer();

      if (phase.type === 'resting') {
        set({ phase: { type: 'active', exerciseIdx: phase.exerciseIdx, setIdx: phase.setIdx } });
      } else if (phase.type === 'resting_for_failure') {
        set({ phase: { type: 'failure_set', exerciseIdx: phase.exerciseIdx } });
      } else if (phase.type === 'resting_between_exercises') {
        initializeExerciseState(phase.nextExerciseIdx);
        set({ phase: { type: 'active', exerciseIdx: phase.nextExerciseIdx, setIdx: 0 } });
      }
    },

    togglePause: () => {
      const state = get();
      const { phase } = state;

      if (phase.type === 'paused') {
        const prev = phase.previousPhase;
        if (prev.type === 'resting') {
          startRestTimer(prev.remainingSeconds, prev.exerciseIdx, prev.setIdx);
        } else if (prev.type === 'resting_for_failure') {
          startRestTimerForFailure(prev.remainingSeconds, prev.exerciseIdx);
        } else if (prev.type === 'resting_between_exercises') {
          startRestTimerBetweenExercises(
            prev.remainingSeconds,
            prev.completedExerciseIdx,
            prev.nextExerciseIdx
          );
        } else {
          set({ phase: prev });
        }
      } else if (phase.type !== 'idle' && phase.type !== 'complete') {
        clearRestTimer();
        set({ phase: { type: 'paused', previousPhase: phase } });
      }
    },

    endWorkout: async (): Promise<string | null> => {
      const user = useAuthStore.getState().user;
      const { startTime, sessionData, activeTemplate } = get();
      if (!user || !startTime || !activeTemplate) return null;

      releaseWakeLock();
      clearRestTimer();
      clearElapsedTimer();

      const duration = Math.floor((Date.now() - startTime.getTime()) / 1000);

      try {
        const sessionPayload: WorkoutSessionData = {
          exercises: sessionData,
        };

        const { data, error } = await supabase
          .from('workout_sessions')
          .insert({
            user_id: user.id,
            template_id: activeTemplate.id,
            template_name: activeTemplate.name,
            started_at: startTime.toISOString(),
            completed_at: new Date().toISOString(),
            duration,
            data: sessionPayload,
            notes: null,
          })
          .select()
          .single();

        if (error) throw error;

        await incrementXP(user.id, 'vitality', XP_REWARDS.WORKOUT_COMPLETE);

        if (activeTemplate.linked_habit_id) {
          const today = new Date().toISOString().slice(0, 10);
          const { data: existingLog } = await supabase
            .from('habit_logs')
            .select('id')
            .eq('habit_id', activeTemplate.linked_habit_id)
            .eq('user_id', user.id)
            .eq('date', today)
            .single();

          if (!existingLog) {
            const { error: habitError } = await supabase.from('habit_logs').insert({
              habit_id: activeTemplate.linked_habit_id,
              user_id: user.id,
              date: today,
              completed: true,
            });

            if (!habitError) {
              await incrementXP(user.id, 'consistency', XP_REWARDS.HABIT_COMPLETE);
            }
          }
        }

        set({ phase: { type: 'complete' } });
        return data.id;
      } catch (err) {
        console.error('Error saving workout:', err);
        return null;
      }
    },

    adjustWeight: (delta: number) => {
      set((prev) => ({ currentWeight: Math.max(0, prev.currentWeight + delta) }));
    },

    adjustReps: (delta: number) => {
      set((prev) => ({ currentReps: Math.max(1, prev.currentReps + delta) }));
    },

    setWeight: (weight: number) => set({ currentWeight: weight }),
    setReps: (reps: number) => set({ currentReps: reps }),

    setExerciseNotes: (exerciseIdx: number, notes: string) => {
      set((prev) => {
        const updated = [...prev.sessionData];
        if (updated[exerciseIdx]) {
          updated[exerciseIdx] = { ...updated[exerciseIdx], completion_notes: notes };
        }
        return { sessionData: updated };
      });
    },

    minimizeWorkout: () => set({ isMinimized: true }),
    resumeWorkout: () => set({ isMinimized: false }),
    resetSession,
  };
});

export default useWorkoutSessionStore;
