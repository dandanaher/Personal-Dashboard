import { useState, useEffect } from 'react';
import { X, Plus, AlertCircle } from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import type { WorkoutTemplate, Exercise } from '@/lib/types';
import ExerciseBuilder, { ExerciseItem } from './ExerciseBuilder';

interface TemplateBuilderProps {
  template?: WorkoutTemplate;
  onSave: (name: string, description: string | null, exercises: Exercise[]) => Promise<boolean>;
  onClose: () => void;
}

export default function TemplateBuilder({
  template,
  onSave,
  onClose,
}: TemplateBuilderProps) {
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [exercises, setExercises] = useState<Exercise[]>(template?.exercises || []);
  const [editingExerciseIndex, setEditingExerciseIndex] = useState<number | null>(null);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddExercise = (exercise: Exercise) => {
    setExercises(prev => [...prev, exercise]);
    setShowAddExercise(false);
  };

  const handleUpdateExercise = (index: number, exercise: Exercise) => {
    setExercises(prev => prev.map((e, i) => (i === index ? exercise : e)));
    setEditingExerciseIndex(null);
  };

  const handleDeleteExercise = (index: number) => {
    setExercises(prev => prev.filter((_, i) => i !== index));
  };

  const handleMoveExercise = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= exercises.length) return;

    setExercises(prev => {
      const newExercises = [...prev];
      const [moved] = newExercises.splice(fromIndex, 1);
      newExercises.splice(toIndex, 0, moved);
      return newExercises;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Template name is required');
      return;
    }

    if (exercises.length === 0) {
      setError('Add at least one exercise');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const success = await onSave(
        name.trim(),
        description.trim() || null,
        exercises
      );

      if (success) {
        onClose();
      } else {
        setError('Failed to save template');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed top-0 left-0 w-full h-full z-[60] flex items-end md:items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div
        className="
          w-full md:max-w-lg
          bg-white dark:bg-secondary-900
          rounded-t-2xl md:rounded-2xl
          shadow-xl
          animate-slide-up md:animate-fade-in
          max-h-[90vh] overflow-hidden flex flex-col
        "
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-modal-title"
      >
        {/* Handle bar for mobile */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-secondary-300 dark:bg-secondary-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-secondary-200 dark:border-secondary-700">
          <h2
            id="template-modal-title"
            className="text-lg font-semibold text-secondary-900 dark:text-secondary-100"
          >
            {template ? 'Edit Template' : 'New Template'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 text-secondary-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <form id="template-form" onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <Input
              label="Template Name"
              placeholder="e.g., Push Day"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />

            <Input
              label="Description (optional)"
              placeholder="e.g., Chest, shoulders, triceps"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300">
                  Exercises ({exercises.length})
                </label>
                {exercises.length > 0 && !showAddExercise && editingExerciseIndex === null && (
                  <button
                    type="button"
                    onClick={() => setShowAddExercise(true)}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </button>
                )}
              </div>

              {/* Exercise list */}
              <div className="space-y-2">
                {exercises.map((exercise, index) => (
                  <div key={index}>
                    {editingExerciseIndex === index ? (
                      <Card className="p-4">
                        <ExerciseBuilder
                          exercise={exercise}
                          onSave={updated => handleUpdateExercise(index, updated)}
                          onCancel={() => setEditingExerciseIndex(null)}
                        />
                      </Card>
                    ) : (
                      <ExerciseItem
                        exercise={exercise}
                        index={index}
                        onEdit={() => setEditingExerciseIndex(index)}
                        onDelete={() => handleDeleteExercise(index)}
                        dragHandleProps={{
                          onDoubleClick: () => {
                            // Simple move up on double click
                            handleMoveExercise(index, index - 1);
                          },
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Add exercise form */}
              {showAddExercise && (
                <Card className="p-4 mt-2">
                  <ExerciseBuilder
                    onSave={handleAddExercise}
                    onCancel={() => setShowAddExercise(false)}
                  />
                </Card>
              )}

              {/* Empty state */}
              {exercises.length === 0 && !showAddExercise && (
                <div className="text-center py-6 border-2 border-dashed border-secondary-300 dark:border-secondary-700 rounded-lg">
                  <p className="text-secondary-500 dark:text-secondary-400 mb-3">
                    No exercises added yet
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddExercise(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Exercise
                  </Button>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-secondary-200 dark:border-secondary-700">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="template-form" isLoading={saving}>
            {template ? 'Save Changes' : 'Create Template'}
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
