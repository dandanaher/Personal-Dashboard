import { useState, useRef } from 'react';
import { Dumbbell, History, TrendingUp, Plus } from 'lucide-react';
import { useWorkoutTemplates, useWorkoutSessions } from './hooks';
import type { WorkoutTemplate, Exercise } from '@/lib/types';
import { useAuthStore } from '@/stores/authStore';
import { useWorkoutSessionStore } from '@/stores/workoutSessionStore';
import { useSidebarStore } from '@/stores/sidebarStore';
import { useThemeStore } from '@/stores/themeStore';
import { shallow } from 'zustand/shallow';
import { useStoreWithEqualityFn } from 'zustand/traditional';
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
    return { showToast: () => { } };
  }
  return context;
}

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      const id = Math.random().toString(36).substring(7);
      setToasts((prev) => [...prev, { id, message, type }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-[60] space-y-2">
        {toasts.map((toast) => (
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
  const { isCollapsed } = useSidebarStore();
  const { accentColor } = useThemeStore();

  // Desktop layout classes
  const desktopPageClasses = `hidden lg:flex fixed inset-0 ${isCollapsed ? 'lg:left-20' : 'lg:left-64'} transition-all duration-300`;

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
  const [showOverloadSuggestions, setShowOverloadSuggestions] = useState(false);
  const [overloadSuggestions, setOverloadSuggestions] = useState<
    Map<string, ProgressiveSuggestion>
  >(new Map());
  const [selectedTemplateForWorkout, setSelectedTemplateForWorkout] =
    useState<WorkoutTemplate | null>(null);
  const [showActiveWorkoutWarning, setShowActiveWorkoutWarning] = useState(false);
  const warningTimeoutRef = useRef<number | null>(null);

  const {
    isActive: isWorkoutActive,
    isMinimized: isWorkoutMinimized,
    activeTemplate,
    startWorkout: startWorkoutSession,
    resetSession,
  } = useStoreWithEqualityFn(
    useWorkoutSessionStore,
    (state) => ({
      isActive: state.isActive,
      isMinimized: state.isMinimized,
      activeTemplate: state.activeTemplate,
      startWorkout: state.startWorkout,
      resetSession: state.resetSession,
    }),
    shallow
  );

  // Handle template actions
  const handleCreateTemplate = async (
    name: string,
    description: string | null,
    exercises: Exercise[],
    linkedHabitId: string | null
  ) => {
    const result = await createTemplate(name, description, exercises, linkedHabitId);
    if (result) {
      showToast('Template created');
      return true;
    }
    showToast('Failed to create template', 'error');
    return false;
  };

  const handleUpdateTemplate = async (
    name: string,
    description: string | null,
    exercises: Exercise[],
    linkedHabitId: string | null
  ) => {
    if (!editingTemplate) return false;

    const result = await updateTemplate(editingTemplate.id, {
      name,
      description,
      exercises,
      linked_habit_id: linkedHabitId,
    });
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
    if (isWorkoutActive) {
      setShowActiveWorkoutWarning(true);
      if (warningTimeoutRef.current) {
        window.clearTimeout(warningTimeoutRef.current);
      }
      warningTimeoutRef.current = window.setTimeout(() => {
        setShowActiveWorkoutWarning(false);
      }, 3000);
      return;
    }

    // Calculate progressive overload suggestions
    const suggestions = await calculateTemplateOverloads(
      user.id,
      template.exercises
        .filter((e) => e.weight !== undefined && e.reps_per_set !== undefined)
        .map((e) => ({
          name: e.name,
          weight: e.weight!,
          reps_per_set: e.reps_per_set!,
          to_failure: e.to_failure,
        }))
    );

    // Check if any suggestions recommend action
    const hasSuggestions = Array.from(suggestions.values()).some(
      (s) => s.shouldIncrease || s.shouldAddTestSet
    );

    if (hasSuggestions) {
      setOverloadSuggestions(suggestions);
      setSelectedTemplateForWorkout(template);
      setShowOverloadSuggestions(true);
    } else {
      // Start workout directly
      startWorkoutSession(template);
    }
  };

  const handleConfirmWorkoutStart = (updatedExercises?: Exercise[]) => {
    if (!selectedTemplateForWorkout) return;

    // Create a modified template if exercises were updated
    const workoutTemplate = updatedExercises
      ? { ...selectedTemplateForWorkout, exercises: updatedExercises }
      : selectedTemplateForWorkout;

    startWorkoutSession(workoutTemplate);
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
  if (isWorkoutActive && !isWorkoutMinimized && activeTemplate) {
    return (
      <LiveWorkout
        template={activeTemplate}
        onComplete={() => {
          resetSession();
          showToast('Workout saved!');
          refetchSessions();
        }}
        onCancel={() => {
          resetSession();
        }}
      />
    );
  }

  // Shared content components
  const TabContent = () => (
    <>
      {activeTab === 'templates' && (
        <TemplateList
          templates={templates}
          sessions={sessions}
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
    </>
  );

  return (
    <>
      {/* Active Workout Warning Banner */}
      {showActiveWorkoutWarning && isWorkoutActive && (
        <div className="fixed bottom-32 left-0 right-0 z-[55] flex justify-center px-4 pointer-events-none">
          <div className="bg-white text-secondary-900 border border-secondary-200 dark:bg-secondary-800 dark:text-secondary-100 dark:border-secondary-700 rounded-full shadow-lg shadow-black/15 px-4 py-2 flex items-center gap-3 pointer-events-auto">
            <span className="text-sm">You already have a workout in progress.</span>
          </div>
        </div>
      )}

      {/* Mobile View */}
      <div className="lg:hidden pb-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Workouts</h1>
          <Button size="sm" onClick={() => setShowBuilder(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 mb-6 bg-secondary-100 dark:bg-secondary-800 rounded-full">
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
        <TabContent />
      </div>

      {/* Desktop View */}
      <div className={desktopPageClasses}>
        {/* Left Panel - Tab Navigation */}
        <div className="w-64 flex-shrink-0 h-full border-r border-secondary-200 dark:border-secondary-800 bg-white dark:bg-secondary-900 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="h-[60px] flex items-center justify-between px-4 border-b border-secondary-200 dark:border-secondary-800 flex-shrink-0">
            <h1 className="text-xl font-bold text-secondary-900 dark:text-white">Workouts</h1>
            <Button size="sm" onClick={() => setShowBuilder(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>

          {/* Tab List */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="space-y-1">
              <button
                onClick={() => setActiveTab('templates')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'templates'
                    ? 'text-white'
                    : 'text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800'
                  }`}
                style={activeTab === 'templates' ? { backgroundColor: accentColor } : undefined}
              >
                <Dumbbell className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 text-left">Templates</span>
                <span className="text-xs opacity-70">{templates.length}</span>
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'history'
                    ? 'text-white'
                    : 'text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800'
                  }`}
                style={activeTab === 'history' ? { backgroundColor: accentColor } : undefined}
              >
                <History className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 text-left">History</span>
                <span className="text-xs opacity-70">{sessions.length}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-light-bg dark:bg-secondary-900">
          {/* Header */}
          <div className="h-[60px] flex items-center px-6 border-b border-secondary-200 dark:border-secondary-800 bg-white dark:bg-secondary-900 flex-shrink-0">
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
              {activeTab === 'templates' ? 'Workout Templates' : 'Workout History'}
            </h2>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <TabContent />
          </div>
        </div>
      </div>

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
                    className={`p-3 rounded-lg ${suggestion.shouldIncrease
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                        : suggestion.shouldAddTestSet
                          ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                          : 'bg-secondary-50 dark:bg-secondary-800'
                      }`}
                  >
                    <div className="font-medium text-secondary-900 dark:text-secondary-100 mb-1">
                      {exercise.name}
                    </div>
                    {suggestion.shouldIncrease ? (
                      <div className="text-sm">
                        <span className="text-secondary-600 dark:text-secondary-400">
                          {`${exercise.weight}kg -> `}
                        </span>
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          {suggestion.suggestedWeight}kg
                        </span>
                      </div>
                    ) : suggestion.shouldAddTestSet ? (
                      <div className="text-sm text-secondary-600 dark:text-secondary-300">
                        Add a test (failure) set this session
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
                  // Apply suggested weights and add test sets when recommended
                  const updatedExercises = selectedTemplateForWorkout.exercises.map((exercise) => {
                    const suggestion = overloadSuggestions.get(exercise.name);
                    const nextWeight = suggestion?.shouldIncrease
                      ? suggestion.suggestedWeight
                      : exercise.weight;
                    const addTestSet = suggestion?.shouldAddTestSet ? true : false;

                    return {
                      ...exercise,
                      weight: nextWeight,
                      to_failure: exercise.to_failure || addTestSet,
                    };
                  });
                  handleConfirmWorkoutStart(updatedExercises);
                }}
              >
                Start with Suggested Weights
              </Button>
              <Button fullWidth variant="outline" onClick={() => handleConfirmWorkoutStart()}>
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
    </>
  );
}

export default function WorkoutPage() {
  return (
    <ToastProvider>
      <WorkoutPageContent />
    </ToastProvider>
  );
}
