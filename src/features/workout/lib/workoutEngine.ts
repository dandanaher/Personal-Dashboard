// Workout state machine and engine utilities

import type { Exercise, CompletedExercise, CompletedSet, WorkoutSession, WorkoutTemplate } from '@/lib/types';

// =============================================================================
// Workout Phase State Machine
// =============================================================================

export type WorkoutPhase =
  | { type: 'idle' }
  | { type: 'ready'; exerciseIdx: number; setIdx: number }
  | { type: 'active'; exerciseIdx: number; setIdx: number }
  | { type: 'resting'; exerciseIdx: number; setIdx: number; remainingSeconds: number }
  | { type: 'resting_for_failure'; exerciseIdx: number; remainingSeconds: number }
  | { type: 'failure_set'; exerciseIdx: number }
  | { type: 'failure_input'; exerciseIdx: number }
  | { type: 'complete' }
  | { type: 'paused'; previousPhase: Exclude<WorkoutPhase, { type: 'paused' }> };

// =============================================================================
// Wake Lock API
// =============================================================================

let wakeLock: WakeLockSentinel | null = null;

export async function requestWakeLock(): Promise<boolean> {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');

      // Re-request wake lock if visibility changes
      document.addEventListener('visibilitychange', async () => {
        if (wakeLock !== null && document.visibilityState === 'visible') {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      });

      return true;
    } catch (err) {
      console.error('Wake lock error:', err);
      return false;
    }
  }
  return false;
}

export function releaseWakeLock(): void {
  if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
  }
}

// =============================================================================
// Haptic Feedback
// =============================================================================

export function vibrate(pattern: number | number[] = 50): void {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

export function vibrateSetComplete(): void {
  vibrate([50, 50, 50]);
}

export function vibrateRestComplete(): void {
  vibrate([100, 50, 100, 50, 100]);
}

export function vibrateWorkoutComplete(): void {
  vibrate([200, 100, 200, 100, 400]);
}

// =============================================================================
// Time Utilities
// =============================================================================

export function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatRestTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// =============================================================================
// Workout Calculations
// =============================================================================

export function calculateEstimatedDuration(exercises: Exercise[]): number {
  // Estimate: 30s per set + rest time between sets
  return exercises.reduce((total, exercise) => {
    const setTime = exercise.sets * 30; // 30s per set execution
    const restTime = (exercise.sets - 1) * exercise.rest_time; // Rest between sets
    const failureTime = exercise.to_failure ? 30 + exercise.rest_time : 0;
    return total + setTime + restTime + failureTime;
  }, 0);
}

export function calculateTotalVolume(exercises: CompletedExercise[]): number {
  return exercises.reduce((total, exercise) => {
    const mainVolume = exercise.main_sets.reduce(
      (sum, set) => sum + set.reps * set.weight,
      0
    );
    const failureVolume = exercise.failure_set
      ? exercise.failure_set.reps * exercise.failure_set.weight
      : 0;
    return total + mainVolume + failureVolume;
  }, 0);
}

export function calculateTotalSets(exercises: CompletedExercise[]): number {
  return exercises.reduce((total, exercise) => {
    const mainSets = exercise.main_sets.length;
    const failureSets = exercise.failure_set ? 1 : 0;
    return total + mainSets + failureSets;
  }, 0);
}

export function calculateTotalReps(exercises: CompletedExercise[]): number {
  return exercises.reduce((total, exercise) => {
    const mainReps = exercise.main_sets.reduce((sum, set) => sum + set.reps, 0);
    const failureReps = exercise.failure_set?.reps || 0;
    return total + mainReps + failureReps;
  }, 0);
}

/**
 * Check if a workout session was fully completed (all sets done for all exercises)
 */
export function isSessionFullyCompleted(session: WorkoutSession, template: WorkoutTemplate): boolean {
  // Session must have completed_at and duration
  if (!session.completed_at || !session.duration) return false;

  const completedExercises = session.data.exercises;
  const templateExercises = template.exercises;

  // Must have same number of exercises
  if (completedExercises.length !== templateExercises.length) return false;

  // Check each exercise
  for (let i = 0; i < templateExercises.length; i++) {
    const templateEx = templateExercises[i];
    const completedEx = completedExercises[i];

    // Must have all main sets completed
    if (completedEx.main_sets.length < templateEx.sets) return false;

    // If to_failure is set, must have failure set
    if (templateEx.to_failure && !completedEx.failure_set) return false;
  }

  return true;
}

/**
 * Calculate average duration from fully completed sessions for a template
 */
export function calculateAverageDuration(
  sessions: WorkoutSession[],
  template: WorkoutTemplate
): number | null {
  // Filter sessions for this template that were fully completed
  const completedSessions = sessions.filter(session =>
    session.template_id === template.id &&
    session.duration &&
    isSessionFullyCompleted(session, template)
  );

  if (completedSessions.length === 0) return null;

  // Calculate average duration
  const totalDuration = completedSessions.reduce(
    (sum, session) => sum + (session.duration || 0),
    0
  );

  return Math.round(totalDuration / completedSessions.length);
}

// =============================================================================
// Exercise State Helpers
// =============================================================================

export function getExerciseProgress(
  exerciseIdx: number,
  setIdx: number,
  exercises: Exercise[]
): { currentExercise: number; totalExercises: number; currentSet: number; totalSets: number } {
  return {
    currentExercise: exerciseIdx + 1,
    totalExercises: exercises.length,
    currentSet: setIdx + 1,
    totalSets: exercises[exerciseIdx]?.sets || 0,
  };
}

export function isLastSet(exerciseIdx: number, setIdx: number, exercises: Exercise[]): boolean {
  const exercise = exercises[exerciseIdx];
  return exercise ? setIdx >= exercise.sets - 1 : true;
}

export function isLastExercise(exerciseIdx: number, exercises: Exercise[]): boolean {
  return exerciseIdx >= exercises.length - 1;
}

export function getNextPhase(
  currentPhase: WorkoutPhase,
  exercises: Exercise[],
  restTime: number
): WorkoutPhase {
  if (currentPhase.type !== 'active') {
    return currentPhase;
  }

  const { exerciseIdx, setIdx } = currentPhase;
  const exercise = exercises[exerciseIdx];

  // Check if more main sets to do
  if (setIdx < exercise.sets - 1) {
    return {
      type: 'resting',
      exerciseIdx,
      setIdx: setIdx + 1,
      remainingSeconds: restTime,
    };
  }

  // Check if this exercise has failure set
  if (exercise.to_failure) {
    return { type: 'failure_set', exerciseIdx };
  }

  // Check if more exercises
  if (exerciseIdx < exercises.length - 1) {
    return { type: 'active', exerciseIdx: exerciseIdx + 1, setIdx: 0 };
  }

  // Workout complete
  return { type: 'complete' };
}

// =============================================================================
// Session Data Management
// =============================================================================

export function createEmptyExerciseData(exercise: Exercise): CompletedExercise {
  return {
    name: exercise.name,
    target_sets: exercise.sets,
    target_reps: exercise.reps_per_set,
    weight: exercise.weight,
    main_sets: [],
    failure_set: undefined,
  };
}

export function addSetToExercise(
  exerciseData: CompletedExercise,
  set: CompletedSet
): CompletedExercise {
  return {
    ...exerciseData,
    main_sets: [...exerciseData.main_sets, set],
  };
}

export function addFailureSetToExercise(
  exerciseData: CompletedExercise,
  set: CompletedSet
): CompletedExercise {
  return {
    ...exerciseData,
    failure_set: set,
  };
}

// =============================================================================
// Weight Increment Helpers
// =============================================================================

export function getWeightIncrement(exerciseName: string): number {
  const compoundMovements = [
    'squat',
    'deadlift',
    'bench press',
    'overhead press',
    'row',
    'pull up',
    'chin up',
    'dip',
    'hip thrust',
    'leg press',
  ];

  const isCompound = compoundMovements.some(compound =>
    exerciseName.toLowerCase().includes(compound)
  );

  return isCompound ? 2.5 : 1.25;
}

export function roundToNearestIncrement(weight: number, increment: number = 1.25): number {
  return Math.round(weight / increment) * increment;
}
