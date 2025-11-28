import { useMemo } from 'react';
import { format, addDays, subDays, startOfWeek } from 'date-fns';
import type { HabitLog } from '@/lib/types';

interface ContributionGraphProps {
  logs: HabitLog[];
  color: string;
  showMonthLabels?: boolean;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function ContributionGraph({
  logs,
  color,
  showMonthLabels = false,
}: ContributionGraphProps) {

  // Create a Set of completed dates for quick lookup
  const completedDates = useMemo(() => {
    return new Set(logs.filter((log) => log.completed).map((log) => log.date));
  }, [logs]);

  // Generate the grid data (52 weeks + partial week)
  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();

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
      <div className="flex">
        {/* Day labels */}
        <div
          className={`flex flex-col gap-[3px] mr-2 text-xs text-secondary-500 dark:text-secondary-400 ${showMonthLabels ? 'mt-5' : ''}`}
        >
          {DAYS_OF_WEEK.map((day, idx) => (
            <div
              key={day}
              className="h-[11px] md:h-[13px] flex items-center justify-center leading-none"
              style={{ visibility: idx % 2 === 1 ? 'visible' : 'hidden' }}
            >
              {day[0]}
            </div>
          ))}
        </div>

        {/* Non-scrollable graph container - always shows right side (current day) */}
        <div className="overflow-x-hidden flex justify-end flex-1">
          <div
            className="inline-block"
            style={
              {
                '--graph-empty': 'rgb(229 231 235)',
              } as React.CSSProperties
            }
          >
            <style>
              {`
                .dark [style*="--graph-empty"] {
                  --graph-empty: rgb(55 65 81);
                }
              `}
            </style>

            {/* Month labels */}
            {showMonthLabels && (
              <div className="flex mb-1 text-xs text-secondary-500 dark:text-secondary-400 h-4">
                {weeks.map((_week, weekIdx) => {
                  const monthLabel = monthLabels.find((m) => m.weekIndex === weekIdx);
                  return (
                    <div key={weekIdx} className="w-[14px] flex-shrink-0">
                      {monthLabel && <span className="whitespace-nowrap">{monthLabel.month}</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Graph grid */}
            <div className="inline-flex gap-[3px]">
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-[3px]">
                  {week.map((date, dayIdx) => {
                    const isFuture = isFutureDate(date);

                    return (
                      <div
                        key={dayIdx}
                        className={`
                          w-[11px] h-[11px] md:w-[13px] md:h-[13px] rounded-sm
                          ${isFuture ? 'opacity-30' : ''}
                        `}
                        style={{ backgroundColor: getCellColor(date) }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
