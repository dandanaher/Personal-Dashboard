import { Goal } from '@/lib/types';
import { useThemeStore } from '@/stores/themeStore';

export type FilterType = 'all' | Goal['type'];

interface GoalFiltersProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  counts: Record<FilterType, number>;
}

export function GoalFilters({ activeFilter, onFilterChange, counts }: GoalFiltersProps) {
  const { accentColor } = useThemeStore();

  const filters: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'open', label: 'No deadline' },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
      {filters.map(filter => (
        <button
          key={filter.value}
          className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors flex-shrink-0 ${
            activeFilter === filter.value
              ? 'text-white shadow-sm'
              : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700'
          }`}
          style={activeFilter === filter.value ? { backgroundColor: accentColor } : undefined}
          onClick={() => onFilterChange(filter.value)}
          aria-pressed={activeFilter === filter.value}
          aria-label={`Filter by ${filter.label} goals (${counts[filter.value] || 0} goals)`}
        >
          {filter.label} ({counts[filter.value] || 0})
        </button>
      ))}
    </div>
  );
}

export default GoalFilters;
