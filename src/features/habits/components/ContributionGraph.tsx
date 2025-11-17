import { useMemo, useState, useRef, useEffect } from 'react';
import { format, addDays, subDays, startOfWeek } from 'date-fns';
import type { HabitLog } from '@/lib/types';

interface ContributionGraphProps {
  logs: HabitLog[];
  color: string;
  onDayClick: (date: string) => void;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function ContributionGraph({ logs, color, onDayClick }: ContributionGraphProps) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the right (current day) on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, []);

  // Create a Set of completed dates for quick lookup
  const completedDates = useMemo(() => {
    return new Set(logs.filter(log => log.completed).map(log => log.date));
  }, [logs]);

  // Generate the grid data (52 weeks + partial week)
  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    // Start from 52 weeks ago, aligned to Sunday
    const startDate = startOfWeek(subDays(today, 364), { weekStartsOn: 0 });

    const weeksData: Date[][] = [];
    const monthLabelsData: { month: string; weekIndex: number }[] = [];

    let currentDate = startDate;
    let weekIndex = 0;
    let lastMonth = -1;

    // Generate up to 53 weeks to cover full year
    while (currentDate <= today || weeksData.length < 53) {
      const week: Date[] = [];

      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const dateToAdd = addDays(currentDate, dayOfWeek);
        week.push(dateToAdd);

        // Track month labels
        const month = dateToAdd.getMonth();
        if (month !== lastMonth && dayOfWeek === 0) {
          monthLabelsData.push({
            month: MONTHS[month],
            weekIndex,
          });
          lastMonth = month;
        }
      }

      weeksData.push(week);
      currentDate = addDays(currentDate, 7);
      weekIndex++;

      // Stop if we've passed today and have enough weeks
      if (currentDate > today && weeksData.length >= 53) {
        break;
      }
    }

    return { weeks: weeksData, monthLabels: monthLabelsData };
  }, []);

  // Get color with opacity for completed/not completed
  const getCellColor = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const isCompleted = completedDates.has(dateStr);

    if (isCompleted) {
      return color;
    }

    // Empty cell color
    return 'var(--graph-empty)';
  };

  // Check if date is in the future
  const isFutureDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  };

  return (
    <div className="relative">
      {/* Month labels */}
      <div className="flex ml-8 mb-1 text-xs text-secondary-500 dark:text-secondary-400">
        {monthLabels.map((label, idx) => (
          <div
            key={idx}
            className="absolute"
            style={{ left: `calc(${label.weekIndex * 14}px + 32px)` }}
          >
            {label.month}
          </div>
        ))}
      </div>

      <div className="flex mt-6">
        {/* Day labels */}
        <div className="flex flex-col gap-[3px] mr-2 text-xs text-secondary-500 dark:text-secondary-400">
          {DAYS_OF_WEEK.map((day, idx) => (
            <div
              key={day}
              className="h-[11px] md:h-[13px] flex items-center"
              style={{ visibility: idx % 2 === 1 ? 'visible' : 'hidden' }}
            >
              {day[0]}
            </div>
          ))}
        </div>

        {/* Graph grid */}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto scrollbar-hide"
        >
          <div
            className="inline-flex gap-[3px]"
            style={{
              '--graph-empty': 'rgb(229 231 235)',
            } as React.CSSProperties}
          >
            <style>
              {`
                .dark [style*="--graph-empty"] {
                  --graph-empty: rgb(55 65 81);
                }
                .scrollbar-hide {
                  -ms-overflow-style: none;
                  scrollbar-width: none;
                }
                .scrollbar-hide::-webkit-scrollbar {
                  display: none;
                }
              `}
            </style>
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-[3px]">
                {week.map((date, dayIdx) => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const isCompleted = completedDates.has(dateStr);
                  const isFuture = isFutureDate(date);

                  return (
                    <button
                      key={dayIdx}
                      type="button"
                      className={`
                        w-[11px] h-[11px] md:w-[13px] md:h-[13px] rounded-sm
                        transition-all duration-100
                        ${isFuture ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-secondary-400 dark:hover:ring-secondary-500'}
                        focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500
                      `}
                      style={{ backgroundColor: getCellColor(date) }}
                      onClick={() => !isFuture && onDayClick(dateStr)}
                      onMouseEnter={() => setHoveredDate(dateStr)}
                      onMouseLeave={() => setHoveredDate(null)}
                      disabled={isFuture}
                      aria-label={`${format(date, 'MMMM d, yyyy')} - ${isCompleted ? 'Completed' : 'Not completed'}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredDate && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-secondary-900 dark:bg-secondary-700 text-white text-xs rounded shadow-lg whitespace-nowrap pointer-events-none z-10">
          {format(new Date(hoveredDate + 'T00:00:00'), 'MMM d, yyyy')} - {completedDates.has(hoveredDate) ? 'Completed' : 'Not completed'}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-3 text-xs text-secondary-500 dark:text-secondary-400">
        <span>Less</span>
        <div className="flex gap-1">
          <div
            className="w-[11px] h-[11px] md:w-[13px] md:h-[13px] rounded-sm"
            style={{ backgroundColor: 'var(--graph-empty)' }}
          />
          <div
            className="w-[11px] h-[11px] md:w-[13px] md:h-[13px] rounded-sm"
            style={{ backgroundColor: color, opacity: 0.4 }}
          />
          <div
            className="w-[11px] h-[11px] md:w-[13px] md:h-[13px] rounded-sm"
            style={{ backgroundColor: color, opacity: 0.7 }}
          />
          <div
            className="w-[11px] h-[11px] md:w-[13px] md:h-[13px] rounded-sm"
            style={{ backgroundColor: color }}
          />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
