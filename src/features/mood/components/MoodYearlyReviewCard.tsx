import { memo, useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { format, addDays, subDays, startOfWeek } from 'date-fns';
import { X } from 'lucide-react';
import Card from '@/components/ui/Card';
import { useMoodLogs } from '../hooks/useMoodLogs';
import { getMoodColor, getMoodInfo, MOOD_LEVELS, MoodPicker, type MoodLevel } from './MoodPicker';
import { useThemeStore } from '@/stores/themeStore';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import type { MoodLog } from '@/lib/types';

// Custom event name for mood updates
export const MOOD_UPDATED_EVENT = 'mood-updated';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface MoodYearlyReviewCardProps {
  className?: string;
}

interface MoodEntryModalProps {
  date: Date;
  existingLog: MoodLog | null;
  onClose: () => void;
  onSave: (moodLevel: MoodLevel, note?: string) => Promise<void>;
  isSaving: boolean;
}

const MoodEntryModal = memo(function MoodEntryModal({
  date,
  existingLog,
  onClose,
  onSave,
  isSaving,
}: MoodEntryModalProps) {
  const [selectedMood, setSelectedMood] = useState<MoodLevel | null>(
    existingLog?.mood_level ?? null
  );
  const [noteText, setNoteText] = useState(existingLog?.note || '');
  const formattedDate = format(date, 'EEEE, MMMM d, yyyy');

  const handleSave = async () => {
    if (!selectedMood) return;
    await onSave(selectedMood, noteText.trim() || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && selectedMood) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-secondary-800 rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-secondary-200 dark:border-secondary-700 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-secondary-900 dark:text-white">{formattedDate}</h3>
            <span className="text-sm text-secondary-500 dark:text-secondary-400">
              {existingLog ? 'Edit mood' : 'Add mood entry'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
          >
            <X size={20} className="text-secondary-500" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {/* Mood Picker */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              How were you feeling?
            </label>
            <MoodPicker
              selectedMood={selectedMood}
              onSelect={setSelectedMood}
              size="md"
              disabled={isSaving}
            />
          </div>

          {/* Note Input */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Note (optional)
            </label>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What was happening that day?"
              className="w-full px-3 py-2 text-sm rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white placeholder-secondary-400 dark:placeholder-secondary-500 resize-none focus:outline-none focus:ring-2 focus:ring-secondary-300 dark:focus:ring-secondary-600"
              rows={3}
              disabled={isSaving}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm text-secondary-600 dark:text-secondary-400 hover:text-secondary-800 dark:hover:text-secondary-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !selectedMood}
              className="px-4 py-2 text-sm bg-secondary-900 dark:bg-white text-white dark:text-secondary-900 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export const MoodYearlyReviewCard = memo(function MoodYearlyReviewCard({
  className = '',
}: MoodYearlyReviewCardProps) {
  const { logs, stats, loading, refetch, addMoodLog, updateMoodLog } = useMoodLogs();
  const accentColor = useThemeStore((state) => state.accentColor);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the right (most recent days) on load
  useEffect(() => {
    if (!loading && scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [loading]);

  // Listen for mood updates from MoodTrackerCard
  useEffect(() => {
    const handleMoodUpdate = () => {
      refetch();
    };
    window.addEventListener(MOOD_UPDATED_EVENT, handleMoodUpdate);
    return () => {
      window.removeEventListener(MOOD_UPDATED_EVENT, handleMoodUpdate);
    };
  }, [refetch]);

  // Create a map of date -> mood log for quick lookup
  const logsMap = useMemo(() => {
    const map = new Map<string, MoodLog>();
    logs.forEach((log) => map.set(log.date, log));
    return map;
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

  // Check if date is in the future
  const isFutureDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  };

  const handleCellClick = (date: Date) => {
    // Don't allow clicking on future dates
    if (isFutureDate(date)) return;
    setSelectedDate(date);
  };

  const handleModalClose = useCallback(() => {
    setSelectedDate(null);
  }, []);

  const handleModalSave = useCallback(async (moodLevel: MoodLevel, note?: string) => {
    if (!selectedDate) return;

    setIsSaving(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const existingLog = logsMap.get(dateStr);

    let success: boolean;
    if (existingLog) {
      success = await updateMoodLog(existingLog.id, moodLevel, note);
    } else {
      success = await addMoodLog(dateStr, moodLevel, note);
    }

    setIsSaving(false);

    if (success) {
      setSelectedDate(null);
      // Notify other components of the update
      window.dispatchEvent(new CustomEvent(MOOD_UPDATED_EVENT));
    }
  }, [selectedDate, logsMap, addMoodLog, updateMoodLog]);

  if (loading) {
    return (
      <Card padding="none" variant="outlined" className={`overflow-hidden ${className}`}>
        <div className="px-3 py-2 border-b border-secondary-200 dark:border-secondary-700">
          <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">
            Yearly Mood Review
          </h3>
        </div>
        <div className="p-8 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card padding="none" variant="outlined" className={`overflow-hidden ${className}`}>
        <div className="px-3 py-2 border-b border-secondary-200 dark:border-secondary-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">
            Yearly Mood Review
          </h3>
          <div className="flex items-center gap-3 text-xs font-medium" style={{ color: accentColor }}>
            <span>Avg: {stats.averageMood.toFixed(1)}</span>
            <span>Streak: {stats.currentStreak}d</span>
            <span>Logged: {stats.totalLogs}d</span>
          </div>
        </div>

        <div className="p-3">
          {/* Legend */}
          <div className="flex items-center justify-end gap-2 mb-3">
            <span className="text-xs text-secondary-500 dark:text-secondary-400">Mood:</span>
            {MOOD_LEVELS.map(({ level, label, color }) => (
              <div key={level} className="flex items-center gap-1" title={label}>
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-secondary-500 dark:text-secondary-400 hidden sm:inline">
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Contribution Graph */}
          <div className="relative">
            <div className="flex">
              {/* Day labels */}
              <div className="flex flex-col gap-[3px] mr-2 text-xs text-secondary-500 dark:text-secondary-400 mt-5">
                {DAYS_OF_WEEK.map((day, idx) => (
                  <div
                    key={day}
                    className="h-[11px] md:h-[13px] flex items-center justify-center"
                    style={{ visibility: idx % 2 === 1 ? 'visible' : 'hidden' }}
                  >
                    <span className="translate-y-[5px]">{day[0]}</span>
                  </div>
                ))}
              </div>

              {/* Graph container */}
              <div ref={scrollContainerRef} className="overflow-x-auto flex-1">
                <div
                  className="inline-block min-w-full"
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
                  <div className="flex mb-1 text-xs text-secondary-500 dark:text-secondary-400 h-4">
                    {weeks.map((_week, weekIdx) => {
                      const monthLabel = monthLabels.find((m) => m.weekIndex === weekIdx);
                      return (
                        <div key={weekIdx} className="w-[14px] flex-shrink-0">
                          {monthLabel && (
                            <span className="whitespace-nowrap">{monthLabel.month}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Graph grid */}
                  <div className="inline-flex gap-[3px]">
                    {weeks.map((week, weekIdx) => (
                      <div key={weekIdx} className="flex flex-col gap-[3px]">
                        {week.map((date, dayIdx) => {
                          const isFuture = isFutureDate(date);
                          const dateStr = format(date, 'yyyy-MM-dd');
                          const log = logsMap.get(dateStr);
                          const hasNote = log?.note;

                          return (
                            <div
                              key={dayIdx}
                              className={`
                                w-[11px] h-[11px] md:w-[13px] md:h-[13px] rounded-sm
                                ${isFuture ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:ring-2 hover:ring-secondary-400 dark:hover:ring-secondary-600'}
                                ${hasNote ? 'ring-1 ring-secondary-300 dark:ring-secondary-600' : ''}
                              `}
                              style={{
                                backgroundColor: log
                                  ? getMoodColor(log.mood_level)
                                  : 'var(--graph-empty)',
                              }}
                              title={
                                isFuture
                                  ? format(date, 'MMM d')
                                  : log
                                    ? `${format(date, 'MMM d')}: ${getMoodInfo(log.mood_level).label}${hasNote ? ' (has note)' : ''}`
                                    : `${format(date, 'MMM d')}: Click to add mood`
                              }
                              onClick={() => handleCellClick(date)}
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
        </div>
      </Card>

      {/* Mood Entry/Edit Modal */}
      {selectedDate && (
        <MoodEntryModal
          date={selectedDate}
          existingLog={logsMap.get(format(selectedDate, 'yyyy-MM-dd')) || null}
          onClose={handleModalClose}
          onSave={handleModalSave}
          isSaving={isSaving}
        />
      )}
    </>
  );
});
