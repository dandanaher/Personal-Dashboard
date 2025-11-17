import { Dumbbell, Plus } from 'lucide-react';
import { Card, Button } from '@/components/ui';

function WorkoutPage() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Workout</h1>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      {/* Placeholder content */}
      <Card variant="outlined" className="text-center py-12">
        <Dumbbell className="h-12 w-12 mx-auto text-secondary-400 dark:text-secondary-500 mb-4" />
        <h2 className="text-lg font-semibold text-secondary-700 dark:text-secondary-300 mb-2">
          No workouts yet
        </h2>
        <p className="text-secondary-500 dark:text-secondary-400 mb-4">
          Start logging your workouts to track your fitness journey.
        </p>
        <Button variant="primary">
          <Plus className="h-4 w-4 mr-2" />
          Start Workout
        </Button>
      </Card>

      {/* Feature info */}
      <Card variant="default" padding="md">
        <h3 className="font-semibold text-secondary-900 dark:text-white mb-2">Coming Soon</h3>
        <ul className="text-sm text-secondary-600 dark:text-secondary-400 space-y-1">
          <li>Create workout templates</li>
          <li>Log exercises with sets/reps</li>
          <li>Track workout history</li>
          <li>View progress over time</li>
        </ul>
      </Card>
    </div>
  );
}

export default WorkoutPage;
