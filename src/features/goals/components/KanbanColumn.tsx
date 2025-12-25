import { Goal } from '@/lib/types';
import { GoalCard } from './GoalCard';

interface HabitCompletionData {
    habitId: string;
    habitName: string;
    completions: number;
}

interface KanbanColumnProps {
    title: string;
    goals: Goal[];
    habitData: Map<string, HabitCompletionData>;
    accentColor: string;
    onEdit: (goal: Goal) => void;
    onDelete: (goalId: string) => void;
    onProgressChange: (goalId: string, progress: number) => void;
    onToggleComplete: (goalId: string) => void;
    emptyMessage?: string;
    hideHeader?: boolean;
}

export function KanbanColumn({
    title,
    goals,
    habitData,
    accentColor,
    onEdit,
    onDelete,
    onProgressChange,
    onToggleComplete,
    emptyMessage = 'No goals',
    hideHeader = false,
}: KanbanColumnProps) {
    return (
        <div className="flex flex-col min-w-[280px] w-full lg:w-auto lg:flex-1 flex-shrink-0 snap-center">
            {/* Column Header */}
            <div
                className={`items-center gap-2 px-3 py-2 mb-3 rounded-xl ${hideHeader ? 'hidden lg:flex' : 'flex'}`}
                style={{ backgroundColor: `${accentColor}15` }}
            >
                <h2
                    className="text-sm font-semibold"
                    style={{ color: accentColor }}
                >
                    {title}
                </h2>
                <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: accentColor, color: 'white' }}
                >
                    {goals.length}
                </span>
            </div>

            {/* Column Content */}
            <div className="flex-1 space-y-3 overflow-y-auto pb-4">
                {goals.length === 0 ? (
                    <div className="text-center py-8 text-secondary-500 dark:text-secondary-400 text-sm">
                        {emptyMessage}
                    </div>
                ) : (
                    goals.map((goal) => {
                        const hData = goal.linked_habit_id
                            ? habitData.get(goal.linked_habit_id)
                            : undefined;
                        return (
                            <GoalCard
                                key={goal.id}
                                goal={goal}
                                onEdit={() => onEdit(goal)}
                                onDelete={() => onDelete(goal.id)}
                                onProgressChange={(progress) => onProgressChange(goal.id, progress)}
                                onToggleComplete={() => onToggleComplete(goal.id)}
                                linkedHabitName={hData?.habitName}
                                habitCompletions={hData?.completions}
                            />
                        );
                    })
                )}
            </div>
        </div>
    );
}

export default KanbanColumn;
