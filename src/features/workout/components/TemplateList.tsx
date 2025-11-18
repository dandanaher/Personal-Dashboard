import { Plus, Dumbbell } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import type { WorkoutTemplate } from '@/lib/types';
import TemplateCard from './TemplateCard';

interface TemplateListProps {
  templates: WorkoutTemplate[];
  loading: boolean;
  onStart: (template: WorkoutTemplate) => void;
  onEdit: (template: WorkoutTemplate) => void;
  onDuplicate: (template: WorkoutTemplate) => void;
  onDelete: (template: WorkoutTemplate) => void;
  onAdd: () => void;
}

// Loading skeleton
function TemplateSkeleton() {
  return (
    <Card className="p-4 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="h-5 w-32 bg-secondary-200 dark:bg-secondary-700 rounded" />
          <div className="h-4 w-48 bg-secondary-200 dark:bg-secondary-700 rounded mt-2" />
          <div className="flex gap-4 mt-2">
            <div className="h-3 w-20 bg-secondary-200 dark:bg-secondary-700 rounded" />
            <div className="h-3 w-16 bg-secondary-200 dark:bg-secondary-700 rounded" />
          </div>
        </div>
        <div className="w-12 h-12 rounded-full bg-secondary-200 dark:bg-secondary-700" />
      </div>
    </Card>
  );
}

export default function TemplateList({
  templates,
  loading,
  onStart,
  onEdit,
  onDuplicate,
  onDelete,
  onAdd,
}: TemplateListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        <TemplateSkeleton />
        <TemplateSkeleton />
        <TemplateSkeleton />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <Card variant="outlined" className="p-8 text-center">
        <Dumbbell className="h-12 w-12 mx-auto text-secondary-400 dark:text-secondary-600 mb-4" />
        <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-2">
          No Workout Templates
        </h3>
        <p className="text-secondary-600 dark:text-secondary-400 mb-4">
          Create your first workout template to get started
        </p>
        <Button onClick={onAdd} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Create Template
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wide">
          {templates.length} {templates.length === 1 ? 'Template' : 'Templates'}
        </h2>
        <Button onClick={onAdd} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          New
        </Button>
      </div>

      {templates.map(template => (
        <TemplateCard
          key={template.id}
          template={template}
          onStart={onStart}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
