import { memo, useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Card from '@/components/ui/Card';
import { useTodayMood } from '../hooks/useTodayMood';
import { MoodPicker } from './MoodPicker';
import { getMoodInfo, type MoodLevel } from './moodLevels';
import { useThemeStore } from '@/stores/themeStore';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface MoodTrackerCardProps {
  className?: string;
}

export const MoodTrackerCard = memo(function MoodTrackerCard({ className = '' }: MoodTrackerCardProps) {
  const { todayMood, loading, setMood } = useTodayMood();
  const accentColor = useThemeStore((state) => state.accentColor);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const handleMoodSelect = (level: MoodLevel) => {
    void setMood(level);
  };

  const handleSaveNote = async () => {
    if (!noteText.trim() && !todayMood?.note) {
      setShowNoteInput(false);
      return;
    }

    setIsSavingNote(true);
    const success = await setMood(todayMood?.mood_level || 3, noteText.trim() || undefined);
    setIsSavingNote(false);

    if (success) {
      setShowNoteInput(false);
    }
  };

  const handleNoteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSaveNote();
    }
    if (e.key === 'Escape') {
      setShowNoteInput(false);
      setNoteText(todayMood?.note || '');
    }
  };

  const toggleNoteInput = () => {
    if (!showNoteInput) {
      setNoteText(todayMood?.note || '');
    }
    setShowNoteInput(!showNoteInput);
  };

  if (loading) {
    return (
      <Card padding="none" variant="outlined" className={`overflow-hidden ${className}`}>
        <div className="px-3 py-2 border-b border-secondary-200 dark:border-secondary-700">
          <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">Mood Tracker</h3>
        </div>
        <div className="p-4 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </Card>
    );
  }

  const todayDate = format(new Date(), 'EEEE, MMM d');
  const moodInfo = todayMood ? getMoodInfo(todayMood.mood_level) : null;

  return (
    <Card padding="none" variant="outlined" className={`overflow-hidden ${className}`}>
      <div className="px-3 py-2 border-b border-secondary-200 dark:border-secondary-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">Mood Tracker</h3>
        <span className="text-xs font-medium" style={{ color: accentColor }}>{todayDate}</span>
      </div>

      <div className="p-3 space-y-3">
        {/* Mood Status */}
        {todayMood && moodInfo && (
          <div className="text-center">
            <span
              className="text-xs font-medium"
              style={{ color: moodInfo.color }}
            >
              Feeling {moodInfo.label.toLowerCase()} today
            </span>
          </div>
        )}

        {/* Mood Picker */}
        <MoodPicker
          selectedMood={todayMood?.mood_level}
          onSelect={handleMoodSelect}
          size="md"
        />

        {/* Note Toggle Button */}
        <button
          type="button"
          onClick={toggleNoteInput}
          className="w-full flex items-center justify-center gap-1 text-xs text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300 transition-colors py-1"
        >
          {todayMood?.note ? 'Edit note' : 'Add a note'}
          {showNoteInput ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {/* Note Input */}
        {showNoteInput && (
          <div className="space-y-2">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={handleNoteKeyDown}
              placeholder="How are you feeling today?"
              className="w-full px-3 py-2 text-sm rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white placeholder-secondary-400 dark:placeholder-secondary-500 resize-none focus:outline-none focus:ring-2 focus:ring-secondary-300 dark:focus:ring-secondary-600"
              rows={2}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowNoteInput(false);
                  setNoteText(todayMood?.note || '');
                }}
                className="px-3 py-1 text-xs text-secondary-600 dark:text-secondary-400 hover:text-secondary-800 dark:hover:text-secondary-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSaveNote()}
                disabled={isSavingNote}
                className="px-3 py-1 text-xs bg-secondary-900 dark:bg-white text-white dark:text-secondary-900 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSavingNote ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Display existing note (when not editing) */}
        {!showNoteInput && todayMood?.note && (
          <div className="px-2 py-1.5 bg-secondary-50 dark:bg-secondary-800/50 rounded-lg">
            <p className="text-xs text-secondary-600 dark:text-secondary-400 line-clamp-2">
              {todayMood.note}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
});
