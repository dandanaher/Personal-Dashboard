import { CheckSquare, Plus } from 'lucide-react';
import { Card, Button } from '@/components/ui';

function TasksPage() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Tasks</h1>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      {/* Placeholder content */}
      <Card variant="outlined" className="text-center py-12">
        <CheckSquare className="h-12 w-12 mx-auto text-secondary-400 dark:text-secondary-500 mb-4" />
        <h2 className="text-lg font-semibold text-secondary-700 dark:text-secondary-300 mb-2">
          No tasks yet
        </h2>
        <p className="text-secondary-500 dark:text-secondary-400 mb-4">
          Start by adding your first task to stay organized.
        </p>
        <Button variant="primary">
          <Plus className="h-4 w-4 mr-2" />
          Create Task
        </Button>
      </Card>

      {/* Feature info */}
      <Card variant="default" padding="md">
        <h3 className="font-semibold text-secondary-900 dark:text-white mb-2">Coming Soon</h3>
        <ul className="text-sm text-secondary-600 dark:text-secondary-400 space-y-1">
          <li>Create and manage tasks</li>
          <li>Set priorities and due dates</li>
          <li>Mark tasks as complete</li>
          <li>Filter and sort tasks</li>
        </ul>
      </Card>
    </div>
  );
}

export default TasksPage;
