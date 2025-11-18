import { useState, useEffect } from 'react';
import { Check, AlertTriangle } from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import type { WorkoutTemplate } from '@/lib/types';
import { useWorkoutSession } from '../hooks';
import { useThemeStore } from '@/stores/themeStore';
import {
  formatTime,
  calculateTotalVolume,
  calculateTotalSets,
  calculateTotalReps,
} from '../lib/workoutEngine';
import WorkoutControls from './WorkoutControls';
import SetDisplay from './SetDisplay';
import RestTimer from './RestTimer';
import QuickAdjust from './QuickAdjust';

interface LiveWorkoutProps {
  template: WorkoutTemplate;
  onComplete: () => void;
  onCancel: () => void;
}

export default function LiveWorkout({
  template,
  onComplete,
  onCancel: _onCancel,
}: LiveWorkoutProps) {
  const {
    phase,
    sessionData,
    elapsedSeconds,
    actualDuration,
    currentExercise,
    startWorkout,
    completeSet,
    completeFailureSet,
    skipRest,
    togglePause,
    endWorkout,
    adjustWeight,
    adjustReps,
  } = useWorkoutSession(template);

  const { accentColor } = useThemeStore();

  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [failureReps, setFailureReps] = useState('');
  const [showFailureInput, setShowFailureInput] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Auto-start workout
  useEffect(() => {
    if (phase.type === 'idle') {
      startWorkout();
    }
  }, [phase.type, startWorkout]);

  // Auto-save when workout completes naturally
  useEffect(() => {
    if (phase.type === 'complete' && !isSaved) {
      endWorkout().then((sessionId) => {
        if (sessionId) {
          setIsSaved(true);
        }
      });
    }
  }, [phase.type, isSaved, endWorkout]);

  // Handle end workout
  const handleEndWorkout = async () => {
    const sessionId = await endWorkout();
    if (sessionId) {
      onComplete();
    }
  };

  // Handle screen tap for completing set
  const handleScreenTap = (e: React.MouseEvent | React.TouchEvent) => {
    // Don't trigger if clicking on buttons or inputs
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('[data-no-tap]')
    ) {
      return;
    }

    if (phase.type === 'active') {
      completeSet();
    } else if (phase.type === 'failure_set') {
      setShowFailureInput(true);
    }
  };

  // Handle failure set completion
  const handleFailureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const reps = parseInt(failureReps);
    if (reps > 0) {
      completeFailureSet(reps);
      setFailureReps('');
      setShowFailureInput(false);
    }
  };

  // Get progress string
  const getExerciseProgress = () => {
    if (!currentExercise) return '';
    return `Exercise ${currentExercise.exerciseIdx + 1}/${template.exercises.length}`;
  };

  // Render complete screen
  if (phase.type === 'complete') {
    const totalVolume = calculateTotalVolume(sessionData);
    const totalSets = calculateTotalSets(sessionData);
    const totalReps = calculateTotalReps(sessionData);

    return (
      <div className="pb-20">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-sm w-full">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>

            <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100 mb-2">
              Workout Complete!
            </h1>
            <p className="text-secondary-600 dark:text-secondary-400 mb-8">
              {template.name}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                  {formatTime(actualDuration)}
                </div>
                <div className="text-xs text-secondary-500 dark:text-secondary-400">
                  Duration
                </div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                  {totalSets}
                </div>
                <div className="text-xs text-secondary-500 dark:text-secondary-400">
                  Sets
                </div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                  {totalReps}
                </div>
                <div className="text-xs text-secondary-500 dark:text-secondary-400">
                  Reps
                </div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                  {(totalVolume / 1000).toFixed(1)}k
                </div>
                <div className="text-xs text-secondary-500 dark:text-secondary-400">
                  Volume (kg)
                </div>
              </Card>
            </div>

            <Button onClick={onComplete} size="lg" fullWidth>
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Render paused overlay
  const isPaused = phase.type === 'paused';

  // Create a slightly darker border color
  const borderColor = `${accentColor}cc`;

  return (
    <div
      className="pb-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-8rem)] flex flex-col select-none"
      style={{ backgroundColor: accentColor }}
      onClick={handleScreenTap}
      onTouchEnd={handleScreenTap}
    >
      {/* Header controls */}
      <div className="flex-shrink-0 py-4 border-b" style={{ borderColor }}>
        <WorkoutControls
          isPaused={isPaused}
          elapsedTime={formatTime(elapsedSeconds)}
          exerciseProgress={getExerciseProgress()}
          onTogglePause={togglePause}
          onEnd={() => setShowEndConfirm(true)}
        />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center justify-center py-6">
        {/* Paused overlay */}
        {isPaused && (
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-4">
              PAUSED
            </div>
            <Button onClick={togglePause} size="lg" variant="secondary">
              Resume
            </Button>
          </div>
        )}

        {/* Resting state */}
        {phase.type === 'resting' && currentExercise && (
          <RestTimer
            remainingSeconds={phase.remainingSeconds}
            totalSeconds={currentExercise.exercise.rest_time}
            nextSetInfo={`Set ${phase.setIdx + 1}/${currentExercise.exercise.sets} • ${currentExercise.currentReps} reps @ ${currentExercise.currentWeight}kg`}
            onSkip={skipRest}
          />
        )}

        {/* Resting before failure set */}
        {phase.type === 'resting_for_failure' && currentExercise && (
          <RestTimer
            remainingSeconds={phase.remainingSeconds}
            totalSeconds={currentExercise.exercise.rest_time}
            nextSetInfo={`Failure Set • ${currentExercise.currentWeight}kg`}
            onSkip={skipRest}
          />
        )}

        {/* Active state */}
        {phase.type === 'active' && currentExercise && (
          <div className="w-full max-w-sm">
            <SetDisplay
              exerciseName={currentExercise.exercise.name}
              currentSet={currentExercise.setIdx + 1}
              totalSets={currentExercise.exercise.sets}
              reps={currentExercise.currentReps}
              weight={currentExercise.currentWeight}
            />

            <div className="mt-8 text-center">
              <p className="text-sm text-primary-100 mb-2">
                Tap anywhere to complete set
              </p>
            </div>
          </div>
        )}

        {/* Failure set state */}
        {(phase.type === 'failure_set' || phase.type === 'failure_input') && currentExercise && (
          <div className="w-full max-w-sm">
            {showFailureInput ? (
              <div className="text-center" data-no-tap>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {currentExercise.exercise.name}
                </h2>
                <p className="text-primary-100 mb-6">
                  How many reps did you get?
                </p>

                <form onSubmit={handleFailureSubmit} className="space-y-4">
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={failureReps}
                    onChange={e => setFailureReps(e.target.value)}
                    placeholder="Enter reps"
                    className="text-center text-2xl bg-white"
                    autoFocus
                  />
                  <Button
                    type="submit"
                    size="lg"
                    fullWidth
                    variant="secondary"
                    disabled={!failureReps || parseInt(failureReps) < 1}
                  >
                    Confirm
                  </Button>
                </form>
              </div>
            ) : (
              <>
                <SetDisplay
                  exerciseName={currentExercise.exercise.name}
                  currentSet={0}
                  totalSets={0}
                  reps={0}
                  weight={currentExercise.currentWeight}
                  isFailureSet
                />

                <div className="mt-8 text-center">
                  <p className="text-sm text-primary-100 mb-2">
                    Tap when complete
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Quick adjust footer */}
      {(phase.type === 'active' || phase.type === 'ready') && currentExercise && (
        <div className="flex-shrink-0 py-4 border-t" style={{ borderColor }} data-no-tap>
          <QuickAdjust
            weight={currentExercise.currentWeight}
            reps={currentExercise.currentReps}
            onAdjustWeight={adjustWeight}
            onAdjustReps={adjustReps}
          />
        </div>
      )}

      {/* End workout confirmation */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4" data-no-tap>
          <Card className="w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="font-semibold text-secondary-900 dark:text-secondary-100">
                  End Workout?
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Your progress will be saved
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                fullWidth
                onClick={() => setShowEndConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                fullWidth
                onClick={handleEndWorkout}
              >
                End Workout
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
