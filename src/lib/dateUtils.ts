import { format, isToday, isTomorrow, isYesterday, addDays, differenceInDays } from 'date-fns';

/**
 * Shared date formatting utilities to avoid duplication across components.
 */

/**
 * Formats a date string for display with relative labels (Today, Tomorrow, Yesterday).
 * @param dateStr - Date string in YYYY-MM-DD format, or null
 * @returns Formatted date string
 */
export function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return 'No date';

  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  if (isYesterday(date)) return 'Yesterday';

  const diffDays = differenceInDays(date, today);

  if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;

  return format(date, 'MMM d');
}

/**
 * Formats a date for section headers with day name.
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Formatted header string
 */
export function formatDateHeader(dateStr: string): string {
  if (dateStr === 'No date') return 'General Tasks';

  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isToday(date)) {
    return `Today, ${format(date, 'MMM d')}`;
  }

  const tomorrow = addDays(today, 1);
  if (date.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow, ${format(date, 'MMM d')}`;
  }

  return format(date, 'EEEE, MMM d');
}

/**
 * Formats the display date for day view navigation.
 * @param date - Date object to format
 * @returns Formatted display string
 */
export function formatDisplayDate(date: Date): string {
  if (isToday(date)) {
    return `Today, ${format(date, 'MMM d')}`;
  }
  if (isTomorrow(date)) {
    return `Tomorrow, ${format(date, 'MMM d')}`;
  }
  if (isYesterday(date)) {
    return `Yesterday, ${format(date, 'MMM d')}`;
  }
  return format(date, 'EEEE, MMM d');
}

/**
 * Converts a Date object to YYYY-MM-DD string format.
 * @param date - Date object
 * @returns Date string in YYYY-MM-DD format
 */
export function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Gets today's date as a YYYY-MM-DD string.
 * @returns Today's date string
 */
export function getTodayString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Checks if a date string is before today.
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns True if the date is before today
 */
export function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return dateStr < getTodayString();
}
