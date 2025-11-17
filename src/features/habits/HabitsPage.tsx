import { Grid, Plus } from 'lucide-react';
import { Card, Button } from '@/components/ui';

function HabitsPage() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Habits</h1>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      {/* Placeholder content */}
      <Card variant="outlined" className="text-center py-12">
        <Grid className="h-12 w-12 mx-auto text-secondary-400 dark:text-secondary-500 mb-4" />
        <h2 className="text-lg font-semibold text-secondary-700 dark:text-secondary-300 mb-2">
          No habits yet
        </h2>
        <p className="text-secondary-500 dark:text-secondary-400 mb-4">
          Build better habits by tracking them daily.
        </p>
        <Button variant="primary">
          <Plus className="h-4 w-4 mr-2" />
          Create Habit
        </Button>
      </Card>

      {/* Feature info */}
      <Card variant="default" padding="md">
        <h3 className="font-semibold text-secondary-900 dark:text-white mb-2">Coming Soon</h3>
        <ul className="text-sm text-secondary-600 dark:text-secondary-400 space-y-1">
          <li>Track daily habits</li>
          <li>View streak history</li>
          <li>Set reminders</li>
          <li>Visualize habit completion</li>
        </ul>
      </Card>
    </div>
  );
}

export default HabitsPage;
