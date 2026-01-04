import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import type { HabitLog } from '@/lib/types';

interface HabitCalendarProps {
  logs: HabitLog[];
  color: string;
  onDayClick: (date: string) => void;
}

export function HabitCalendar({ logs, color, onDayClick }: HabitCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState(() => today.getMonth());
  const [currentYear, setCurrentYear] = useState(() => today.getFullYear());

  // Create a set of completed dates for quick lookup
  const completedDates = useMemo(() => {
    return new Set(logs.map((log) => log.date));
  }, [logs]);

  // Check if we can navigate to the next month (can't go past current month)
  const canGoNext = useMemo(() => {
    if (currentYear < today.getFullYear()) return true;
    if (currentYear === today.getFullYear() && currentMonth < today.getMonth()) return true;
    return false;
  }, [currentMonth, currentYear, today]);

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (!canGoNext) return;

    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Get the day of the week for the first day (0 = Sunday, 1 = Monday, etc.)
    // Adjust so Monday is 0
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;

    const days: Array<{
      date: number;
      month: number;
      year: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isCompleted: boolean;
      isFuture: boolean;
    }> = [];

    // Add days from previous month
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const month = currentMonth === 0 ? 11 : currentMonth - 1;
      const year = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      days.push({
        date: day,
        month,
        year,
        isCurrentMonth: false,
        isToday: false,
        isCompleted: completedDates.has(dateStr),
        isFuture: false,
      });
    }

    // Add days from current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday =
        day === today.getDate() &&
        currentMonth === today.getMonth() &&
        currentYear === today.getFullYear();

      // Check if this date is in the future
      const dateObj = new Date(currentYear, currentMonth, day);
      const isFuture = dateObj > today;

      days.push({
        date: day,
        month: currentMonth,
        year: currentYear,
        isCurrentMonth: true,
        isToday,
        isCompleted: completedDates.has(dateStr),
        isFuture,
      });
    }

    // Add days from next month to fill the grid (6 rows * 7 days = 42)
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const month = currentMonth === 11 ? 0 : currentMonth + 1;
      const year = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      days.push({
        date: day,
        month,
        year,
        isCurrentMonth: false,
        isToday: false,
        isCompleted: completedDates.has(dateStr),
        isFuture: true,
      });
    }

    return days;
  }, [currentMonth, currentYear, completedDates, today]);

  const handleDayClick = (day: (typeof calendarDays)[0]) => {
    if (day.isFuture) return;

    const dateStr = `${day.year}-${String(day.month + 1).padStart(2, '0')}-${String(day.date).padStart(2, '0')}`;
    onDayClick(dateStr);
  };

  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {dayNames.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-secondary-500 dark:text-secondary-400 py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 mt-1">
        {calendarDays.map((day, index) => {
          return (
            <button
              key={index}
              onClick={() => handleDayClick(day)}
              disabled={day.isFuture}
              className={`
                aspect-square flex items-center justify-center text-sm rounded-lg
                transition-colors relative
                ${
                  day.isCurrentMonth
                    ? 'text-secondary-900 dark:text-white'
                    : 'text-secondary-400 dark:text-secondary-600'
                }
                ${
                  day.isFuture
                    ? 'cursor-not-allowed opacity-50'
                    : 'cursor-pointer hover:bg-secondary-100 dark:hover:bg-secondary-800'
                }
                ${day.isToday ? 'font-bold' : ''}
              `}
            >
              {day.isCompleted && (
                <div
                  className="absolute inset-1 rounded-lg opacity-30"
                  style={{ backgroundColor: color }}
                />
              )}
              <span className={`relative z-10 ${day.isToday ? 'font-bold' : ''}`}>{day.date}</span>
            </button>
          );
        })}
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-secondary-100 dark:bg-secondary-800 text-sm font-medium text-secondary-700 dark:text-secondary-300">
          <Calendar className="w-4 h-4" />
          {monthNames[currentMonth]} {currentYear}
        </button>

        <div className="flex gap-2">
          <button
            onClick={goToPreviousMonth}
            className="p-2 rounded-lg bg-secondary-100 dark:bg-secondary-800 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5 text-secondary-700 dark:text-secondary-300" />
          </button>
          <button
            onClick={goToNextMonth}
            disabled={!canGoNext}
            className={`
              p-2 rounded-lg transition-colors
              ${
                canGoNext
                  ? 'bg-secondary-100 dark:bg-secondary-800 hover:bg-secondary-200 dark:hover:bg-secondary-700'
                  : 'bg-secondary-100 dark:bg-secondary-800 opacity-50 cursor-not-allowed'
              }
            `}
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5 text-secondary-700 dark:text-secondary-300" />
          </button>
        </div>
      </div>
    </div>
  );
}
