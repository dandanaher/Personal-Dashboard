/**
 * KanbanBoard - Goals displayed in To Do / In Progress / Complete columns
 *
 * RESPONSIVE BEHAVIOR:
 * - Desktop (lg:): All 3 columns visible side-by-side, no tab navigation
 * - Mobile: Tab navigation to switch between columns (one column visible at a time)
 *
 * Key classes:
 * - `lg:hidden` on tab navigation: tabs only shown on mobile
 * - `hidden lg:block` on columns: show/hide based on active tab (mobile) vs always show (desktop)
 */
import { useMemo, useState } from 'react';
import { parseISO, differenceInDays } from 'date-fns';
import { Target, Plus } from 'lucide-react';
import { Button } from '@/components/ui';
import { Goal } from '@/lib/types';
import { useThemeStore } from '@/stores/themeStore';
import { KanbanColumn } from './KanbanColumn';

interface HabitCompletionData {
    habitId: string;
    habitName: string;
    completions: number;
}

interface KanbanBoardProps {
    goals: Goal[];
    loading: boolean;
    habitData: Map<string, HabitCompletionData>;
    onEdit: (goal: Goal) => void;
    onDelete: (goalId: string) => void;
    onProgressChange: (goalId: string, progress: number) => void;
    onToggleComplete: (goalId: string) => void;
    onAddClick: () => void;
    emptyMessage?: string;
}

export function KanbanBoard({
    goals,
    loading,
    habitData,
    onEdit,
    onDelete,
    onProgressChange,
    onToggleComplete,
    onAddClick,
    emptyMessage = 'No goals',
}: KanbanBoardProps) {
    const { accentColor } = useThemeStore();
    const [activeTab, setActiveTab] = useState<'todo' | 'inprogress' | 'completed'>('todo');

    const renderTabButton = (id: 'todo' | 'inprogress' | 'completed', label: string, count: number) => {
        const isActive = activeTab === id;
        return (
            <button
                onClick={() => setActiveTab(id)}
                className={`flex-1 flex items-center justify-center gap-1 px-1 py-2 rounded-xl transition-all whitespace-nowrap ${isActive ? '' : 'hover:bg-secondary-100 dark:hover:bg-secondary-800'
                    }`}
                style={isActive ? { backgroundColor: `${accentColor}15` } : undefined}
            >
                <span
                    className={`text-sm font-semibold ${isActive ? '' : 'text-secondary-500 dark:text-secondary-400'}`}
                    style={isActive ? { color: accentColor } : undefined}
                >
                    {label}
                </span>
                <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${isActive ? '' : 'bg-secondary-200 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-400'
                        }`}
                    style={isActive ? { backgroundColor: accentColor, color: 'white' } : undefined}
                >
                    {count}
                </span>
            </button>
        );
    };

    // Group goals into kanban columns
    const { todoGoals, inProgressGoals, completedGoals } = useMemo(() => {
        const todo: Goal[] = [];
        const inProgress: Goal[] = [];
        const completed: Goal[] = [];

        goals.forEach((goal) => {
            if (goal.completed) {
                completed.push(goal);
            } else if (goal.progress === 0) {
                todo.push(goal);
            } else {
                inProgress.push(goal);
            }
        });

        // Sort function: overdue first, then by target date
        const sortByDate = (a: Goal, b: Goal) => {
            const now = new Date();
            const aOverdue = a.target_date ? differenceInDays(parseISO(a.target_date), now) < 0 : false;
            const bOverdue = b.target_date ? differenceInDays(parseISO(b.target_date), now) < 0 : false;

            if (aOverdue && !bOverdue) return -1;
            if (!aOverdue && bOverdue) return 1;

            if (!a.target_date && !b.target_date) return 0;
            if (!a.target_date) return 1;
            if (!b.target_date) return -1;
            return new Date(a.target_date).getTime() - new Date(b.target_date).getTime();
        };

        todo.sort(sortByDate);
        inProgress.sort(sortByDate);
        completed.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

        return { todoGoals: todo, inProgressGoals: inProgress, completedGoals: completed };
    }, [goals]);

    // Loading state
    if (loading) {
        return (
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 lg:mx-0 lg:px-0">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="min-w-[300px] w-full lg:w-1/3 flex-shrink-0 space-y-3"
                    >
                        <div className="h-10 bg-secondary-100 dark:bg-secondary-800 rounded-xl animate-pulse" />
                        <div className="h-40 bg-secondary-100 dark:bg-secondary-800 rounded-3xl animate-pulse" />
                        <div className="h-40 bg-secondary-100 dark:bg-secondary-800 rounded-3xl animate-pulse" />
                    </div>
                ))}
            </div>
        );
    }

    // Empty state
    if (goals.length === 0) {
        return (
            <div className="text-center py-12">
                <Target className="w-12 h-12 mx-auto text-secondary-400 dark:text-secondary-500 mb-4" />
                <p className="text-secondary-500 dark:text-secondary-400 mb-2">{emptyMessage}</p>
                <p className="text-sm text-secondary-400 dark:text-secondary-500 mb-4">
                    Set your first goal and start tracking progress!
                </p>
                <Button onClick={onAddClick} variant="primary" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create Goal
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* MOBILE ONLY: Tab navigation to switch between columns */}
            <div className="flex lg:hidden gap-1 mb-4">
                {renderTabButton('todo', 'To Do', todoGoals.length)}
                {renderTabButton('inprogress', 'In Progress', inProgressGoals.length)}
                {renderTabButton('completed', 'Complete', completedGoals.length)}
            </div>

            <div className="flex gap-4 overflow-x-auto lg:overflow-visible pb-4 -mx-4 px-4 lg:mx-0 lg:px-0">
                <div className={`min-w-[280px] w-full lg:w-auto lg:flex-1 shrink-0 ${activeTab === 'todo' ? 'block' : 'hidden lg:block'}`}>
                    <KanbanColumn
                        title="To Do"
                        goals={todoGoals}
                        habitData={habitData}
                        accentColor={accentColor}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onProgressChange={onProgressChange}
                        onToggleComplete={onToggleComplete}
                        emptyMessage="No goals to start"
                        hideHeader
                    />
                </div>

                <div className={`min-w-[280px] w-full lg:w-auto lg:flex-1 shrink-0 ${activeTab === 'inprogress' ? 'block' : 'hidden lg:block'}`}>
                    <KanbanColumn
                        title="In Progress"
                        goals={inProgressGoals}
                        habitData={habitData}
                        accentColor={accentColor}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onProgressChange={onProgressChange}
                        onToggleComplete={onToggleComplete}
                        emptyMessage="No goals in progress"
                        hideHeader
                    />
                </div>

                <div className={`min-w-[280px] w-full lg:w-auto lg:flex-1 shrink-0 ${activeTab === 'completed' ? 'block' : 'hidden lg:block'}`}>
                    <KanbanColumn
                        title="Complete"
                        goals={completedGoals}
                        habitData={habitData}
                        accentColor={accentColor}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onProgressChange={onProgressChange}
                        onToggleComplete={onToggleComplete}
                        emptyMessage="No completed goals"
                        hideHeader
                    />
                </div>
            </div>
        </div>
    );
}

export default KanbanBoard;
