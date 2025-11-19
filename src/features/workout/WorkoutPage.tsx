import { useState } from 'react';
import { Dumbbell, History, TrendingUp } from 'lucide-react';
import { useWorkoutTemplates, useWorkoutSessions } from './hooks';
import type { WorkoutTemplate, Exercise } from '@/lib/types';
import { useAuthStore } from '@/stores/authStore';
import TemplateList from './components/TemplateList';
import TemplateBuilder from './components/TemplateBuilder';
import WorkoutHistory from './components/WorkoutHistory';
import LiveWorkout from './components/LiveWorkout';
import { calculateTemplateOverloads, ProgressiveSuggestion } from './lib/progressiveOverload';
import { Card, Button } from '@/components/ui';

// Toast context for notifications
import { createContext, useContext, useCallback } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextValue {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return { showToast: () => {} };
  }
  return context;
}

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-[60] space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`
              px-4 py-2 rounded-lg shadow-lg text-sm font-medium
              ${toast.type === 'success' ? 'bg-green-500 text-white' : ''}
              ${toast.type === 'error' ? 'bg-red-500 text-white' : ''}
              ${toast.type === 'info' ? 'bg-primary-500 text-white' : ''}
              animate-in slide-in-from-bottom-4 fade-in duration-300
            `}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Tab type
type TabType = 'templates' | 'history';

function WorkoutPageContent() {
  const { user } = useAuthStore();
  const { showToast } = useToast();

  // Hooks
  const {
    templates,
    loading: templatesLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
  } = useWorkoutTemplates();

  const {
    sessions,
    loading: sessionsLoading,
    deleteSession,
    refetch: refetchSessions,
  } = useWorkoutSessions();

  // Local state
  const [activeTab, setActiveTab] = useState<TabType>('templates');
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<WorkoutTemplate | null>(null);
  const [showOverloadSuggestions, setShowOverloadSuggestions] = useState(false);
  const [overloadSuggestions, setOverloadSuggestions] = useState<Map<string, ProgressiveSuggestion>>(new Map());
  const [selectedTemplateForWorkout, setSelectedTemplateForWorkout] = useState<WorkoutTemplate | null>(null);

  // Handle template actions
  const handleCreateTemplate = async (name: string, description: string | null, exercises: Exercise[]) => {
    const result = await createTemplate(name, description, exercises);
    if (result) {
      showToast('Template created');
      return true;
    }
    showToast('Failed to create template', 'error');
    return false;
  };

  const handleUpdateTemplate = async (name: string, description: string | null, exercises: Exercise[]) => {
    if (!editingTemplate) return false;

    const result = await updateTemplate(editingTemplate.id, { name, description, exercises });
    if (result) {
      showToast('Template updated');
      setEditingTemplate(null);
      return true;
    }
    showToast('Failed to update template', 'error');
    return false;
  };

  const handleDeleteTemplate = async (template: WorkoutTemplate) => {
    if (confirm(`Delete "${template.name}"? This cannot be undone.`)) {
      const result = await deleteTemplate(template.id);
      if (result) {
        showToast('Template deleted');
      } else {
        showToast('Failed to delete template', 'error');
      }
    }
  };

  const handleDuplicateTemplate = async (template: WorkoutTemplate) => {
    const result = await duplicateTemplate(template.id, `${template.name} (Copy)`);
    if (result) {
      showToast('Template duplicated');
    } else {
      showToast('Failed to duplicate template', 'error');
    }
  };

  // Handle starting workout with progressive overload check
  const handleStartWorkout = async (template: WorkoutTemplate) => {
    if (!user) return;

    // Calculate progressive overload suggestions
    const suggestions = await calculateTemplateOverloads(
      user.id,
      template.exercises.map(e => ({
        name: e.name,
        weight: e.weight,
        reps_per_set: e.reps_per_set,
      }))
    );

    // Check if any suggestions recommend increasing
    const hasIncreases = Array.from(suggestions.values()).some(s => s.shouldIncrease);

    if (hasIncreases) {
      setOverloadSuggestions(suggestions);
      setSelectedTemplateForWorkout(template);
      setShowOverloadSuggestions(true);
    } else {
      // Start workout directly
      setActiveWorkout(template);
    }
  };

  const handleConfirmWorkoutStart = (updatedExercises?: Exercise[]) => {
    if (!selectedTemplateForWorkout) return;

    // Create a modified template if exercises were updated
    const workoutTemplate = updatedExercises
      ? { ...selectedTemplateForWorkout, exercises: updatedExercises }
      : selectedTemplateForWorkout;

    setActiveWorkout(workoutTemplate);
    setShowOverloadSuggestions(false);
    setSelectedTemplateForWorkout(null);
    setOverloadSuggestions(new Map());
  };

  // Handle session deletion
  const handleDeleteSession = async (session: { id: string; template_name: string }) => {
    if (confirm('Delete this workout session? This cannot be undone.')) {
      const result = await deleteSession(session.id);
      if (result) {
        showToast('Session deleted');
      } else {
        showToast('Failed to delete session', 'error');
      }
    }
  };

  // Live workout is active
  if (activeWorkout) {
    return (
      <LiveWorkout
        template={activeWorkout}
        onComplete={() => {
          setActiveWorkout(null);
          showToast('Workout saved!');
          refetchSessions();
        }}
        onCancel={() => setActiveWorkout(null)}
      />
    );
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
          Workouts
        </h1>
        <p className="text-secondary-600 dark:text-secondary-400">
          Track your strength training
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 mb-6 bg-secondary-100 dark:bg-secondary-800 rounded-lg">
        <button
          onClick={() => setActiveTab('templates')}
          className={`
            flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-full text-sm font-medium transition-colors
            ${activeTab === 'templates'
              ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-secondary-100 shadow-sm'
              : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-secondary-100'
            }
          `}
        >
          <Dumbbell className="h-4 w-4" />
          Templates
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`
            flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-full text-sm font-medium transition-colors
            ${activeTab === 'history'
              ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-secondary-100 shadow-sm'
              : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-secondary-100'
            }
          `}
        >
          <History className="h-4 w-4" />
          History
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'templates' && (
        <TemplateList
          templates={templates}
          loading={templatesLoading}
          onStart={handleStartWorkout}
          onEdit={setEditingTemplate}
          onDuplicate={handleDuplicateTemplate}
          onDelete={handleDeleteTemplate}
          onAdd={() => setShowBuilder(true)}
        />
      )}

      {activeTab === 'history' && (
        <WorkoutHistory
          sessions={sessions}
          loading={sessionsLoading}
          error={null}
          onDelete={handleDeleteSession}
          onRetry={refetchSessions}
        />
      )}

      {/* Template builder modal */}
      {(showBuilder || editingTemplate) && (
        <TemplateBuilder
          template={editingTemplate || undefined}
          onSave={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
          onClose={() => {
            setShowBuilder(false);
            setEditingTemplate(null);
          }}
        />
      )}

      {/* Progressive overload suggestions modal */}
      {showOverloadSuggestions && selectedTemplateForWorkout && (
        <div className="fixed top-0 left-0 w-full h-full z-[60] flex items-center justify-center p-4 bg-black/50">
          <Card className="w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-secondary-200 dark:border-secondary-700">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <h2 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                  Progressive Overload
                </h2>
              </div>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">
                Based on your recent performance
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedTemplateForWorkout.exercises.map((exercise, idx) => {
                const suggestion = overloadSuggestions.get(exercise.name);
                if (!suggestion) return null;

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg ${
                      suggestion.shouldIncrease
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                        : 'bg-secondary-50 dark:bg-secondary-800'
                    }`}
                  >
                    <div className="font-medium text-secondary-900 dark:text-secondary-100 mb-1">
                      {exercise.name}
                    </div>
                    {suggestion.shouldIncrease ? (
                      <div className="text-sm">
                        <span className="text-secondary-600 dark:text-secondary-400">
                          {exercise.weight}kg →{' '}
                        </span>
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          {suggestion.suggestedWeight}kg
                        </span>
                      </div>
                    ) : (
                      <div className="text-sm text-secondary-500 dark:text-secondary-400">
                        Keep at {exercise.weight}kg
                      </div>
                    )}
                    <div className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                      {suggestion.reason}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-secondary-200 dark:border-secondary-700 space-y-2">
              <Button
                fullWidth
                onClick={() => {
                  // Apply suggested weights
                  const updatedExercises = selectedTemplateForWorkout.exercises.map(exercise => {
                    const suggestion = overloadSuggestions.get(exercise.name);
                    if (suggestion?.shouldIncrease) {
                      return { ...exercise, weight: suggestion.suggestedWeight };
                    }
                    return exercise;
                  });
                  handleConfirmWorkoutStart(updatedExercises);
                }}
              >
                Start with Suggested Weights
              </Button>
              <Button
                fullWidth
                variant="outline"
                onClick={() => handleConfirmWorkoutStart()}
              >
                Start with Current Weights
              </Button>
              <Button
                fullWidth
                variant="ghost"
                onClick={() => {
                  setShowOverloadSuggestions(false);
                  setSelectedTemplateForWorkout(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function WorkoutPage() {
  return (
    <ToastProvider>
      <WorkoutPageContent />
    </ToastProvider>
  );
}
