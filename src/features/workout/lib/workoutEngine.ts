// Workout state machine and engine utilities

import type {
  Exercise,
  CompletedExercise,
  CompletedSet,
  WorkoutSession,
  WorkoutTemplate,
} from '@/lib/types';

// =============================================================================
// Volume Aggregation Types
// =============================================================================

export interface WorkoutVolume {
  /** Total weight volume (reps × weight) for strength exercises */
  weightVolume: number;
  /** Total distance for cardio exercises */
  totalDistance: number;
  /** Distance unit for display */
  distanceUnit: 'km' | 'm' | 'mi';
  /** Total time in seconds for timed/cardio exercises */
  totalTime: number;
  /** Breakdown by exercise type */
  exerciseCount: {
    strength: number;
    cardio: number;
    timed: number;
  };
}

// =============================================================================
// Workout Phase State Machine
// =============================================================================

export type WorkoutPhase =
  | { type: 'idle' }
  | { type: 'ready'; exerciseIdx: number; setIdx: number }
  | { type: 'active'; exerciseIdx: number; setIdx: number }
  | { type: 'resting'; exerciseIdx: number; setIdx: number; remainingSeconds: number }
  | { type: 'resting_for_failure'; exerciseIdx: number; remainingSeconds: number }
  | {
      type: 'resting_between_exercises';
      completedExerciseIdx: number;
      nextExerciseIdx: number;
      remainingSeconds: number;
    }
  | { type: 'failure_set'; exerciseIdx: number }
  | { type: 'failure_input'; exerciseIdx: number }
  | { type: 'skipped_exercises_prompt' }
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
  return exercises.reduce((total, exercise) => {
    const type = exercise.type || 'strength';

    switch (type) {
      case 'strength': {
        const setTime = exercise.sets * 30; // 30s per set execution
        const restTime = (exercise.sets - 1) * exercise.rest_time;
        const failureTime = exercise.to_failure ? 30 + exercise.rest_time : 0;
        return total + setTime + restTime + failureTime;
      }
      case 'cardio': {
        // Use target time directly for cardio
        return total + (exercise.target_time || 0);
      }
      case 'timed': {
        // Duration per set + rest time
        const setTime = exercise.sets * (exercise.target_time || 60);
        const restTime = (exercise.sets - 1) * exercise.rest_time;
        return total + setTime + restTime;
      }
      default:
        return total + exercise.sets * 30;
    }
  }, 0);
}

/**
 * Calculate weight volume (reps × weight) for strength exercises only
 * Kept for backward compatibility
 */
export function calculateTotalVolume(exercises: CompletedExercise[]): number {
  return exercises.reduce((total, exercise) => {
    const type = exercise.type || 'strength';
    if (type !== 'strength') return total;

    const mainVolume = exercise.main_sets.reduce(
      (sum, set) => sum + (set.reps || 0) * (set.weight || 0),
      0
    );
    const failureVolume = exercise.failure_set
      ? (exercise.failure_set.reps || 0) * (exercise.failure_set.weight || 0)
      : 0;
    return total + mainVolume + failureVolume;
  }, 0);
}

/**
 * Calculate comprehensive volume data for all exercise types
 */
export function calculateWorkoutVolume(exercises: CompletedExercise[]): WorkoutVolume {
  const result: WorkoutVolume = {
    weightVolume: 0,
    totalDistance: 0,
    distanceUnit: 'km',
    totalTime: 0,
    exerciseCount: {
      strength: 0,
      cardio: 0,
      timed: 0,
    },
  };

  for (const exercise of exercises) {
    const type = exercise.type || 'strength';
    result.exerciseCount[type]++;

    switch (type) {
      case 'strength': {
        const mainVolume = exercise.main_sets.reduce(
          (sum, set) => sum + (set.reps || 0) * (set.weight || 0),
          0
        );
        const failureVolume = exercise.failure_set
          ? (exercise.failure_set.reps || 0) * (exercise.failure_set.weight || 0)
          : 0;
        result.weightVolume += mainVolume + failureVolume;
        break;
      }
      case 'cardio': {
        // Sum up actual distances covered
        const distance = exercise.main_sets.reduce((sum, set) => sum + (set.distance || 0), 0);
        result.totalDistance += distance;
        // Use the exercise's distance unit (prefer first cardio exercise's unit)
        if (exercise.distance_unit) {
          result.distanceUnit = exercise.distance_unit;
        }
        // Sum actual times
        const time = exercise.main_sets.reduce((sum, set) => sum + (set.time || 0), 0);
        result.totalTime += time;
        break;
      }
      case 'timed': {
        // Sum actual hold times
        const time = exercise.main_sets.reduce((sum, set) => sum + (set.time || 0), 0);
        result.totalTime += time;
        // Timed exercises can also have weight volume
        const weightVolume = exercise.main_sets.reduce(
          (sum, set) => sum + (set.time || 0) * (set.weight || 0),
          0
        );
        result.weightVolume += weightVolume;
        break;
      }
    }
  }

  return result;
}

/**
 * Get the primary volume label for a workout based on exercise composition
 */
export function getVolumeLabel(exercises: CompletedExercise[]): string {
  const volume = calculateWorkoutVolume(exercises);
  const { exerciseCount } = volume;

  // Determine dominant type
  if (exerciseCount.cardio > exerciseCount.strength && exerciseCount.cardio > exerciseCount.timed) {
    // Cardio-dominant
    return `${volume.totalDistance.toFixed(1)} ${volume.distanceUnit}`;
  } else if (
    exerciseCount.timed > exerciseCount.strength &&
    exerciseCount.timed > exerciseCount.cardio
  ) {
    // Timed-dominant
    const mins = Math.floor(volume.totalTime / 60);
    const secs = volume.totalTime % 60;
    return `${mins}:${secs.toString().padStart(2, '0')} total`;
  } else {
    // Strength-dominant or mixed
    return `${(volume.weightVolume / 1000).toFixed(1)}k kg`;
  }
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
    const type = exercise.type || 'strength';
    // Only count reps for strength exercises
    if (type !== 'strength') return total;

    const mainReps = exercise.main_sets.reduce((sum, set) => sum + (set.reps || 0), 0);
    const failureReps = exercise.failure_set?.reps || 0;
    return total + mainReps + failureReps;
  }, 0);
}

/**
 * Calculate total distance for cardio exercises
 */
export function calculateTotalDistance(exercises: CompletedExercise[]): number {
  return exercises.reduce((total, exercise) => {
    const type = exercise.type || 'strength';
    if (type !== 'cardio') return total;

    const distance = exercise.main_sets.reduce((sum, set) => sum + (set.distance || 0), 0);
    return total + distance;
  }, 0);
}

/**
 * Calculate total time for timed/cardio exercises
 */
export function calculateTotalTime(exercises: CompletedExercise[]): number {
  return exercises.reduce((total, exercise) => {
    const type = exercise.type || 'strength';
    if (type !== 'timed' && type !== 'cardio') return total;

    const time = exercise.main_sets.reduce((sum, set) => sum + (set.time || 0), 0);
    return total + time;
  }, 0);
}

/**
 * Check if a workout session was fully completed (all sets done for all exercises)
 */
export function isSessionFullyCompleted(
  session: WorkoutSession,
  template: WorkoutTemplate
): boolean {
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
  const completedSessions = sessions.filter(
    (session) =>
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
  const type = exercise.type || 'strength';
  const base = {
    name: exercise.name,
    type,
    target_sets: exercise.sets,
    main_sets: [],
    failure_set: undefined,
  };

  switch (type) {
    case 'strength':
      return {
        ...base,
        target_reps: exercise.reps_per_set,
        weight: exercise.weight,
      };
    case 'cardio':
      return {
        ...base,
        target_distance: exercise.distance,
        distance_unit: exercise.distance_unit || 'km',
        target_time: exercise.target_time,
      };
    case 'timed':
      return {
        ...base,
        target_time: exercise.target_time,
        weight: exercise.weight,
      };
    default:
      return base;
  }
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

  const isCompound = compoundMovements.some((compound) =>
    exerciseName.toLowerCase().includes(compound)
  );

  return isCompound ? 2.5 : 1.25;
}

export function roundToNearestIncrement(weight: number, increment: number = 1.25): number {
  return Math.round(weight / increment) * increment;
}
