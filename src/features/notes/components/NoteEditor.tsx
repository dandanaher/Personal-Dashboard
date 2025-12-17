import { useState, useEffect, useCallback } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { X, Save, Trash2 } from 'lucide-react';
import { useNotesStore } from '@/stores/notesStore';
import { useThemeStore } from '@/stores/themeStore';

// Predefined color palette
const colorOptions = [
  '#ffffff', // White
  '#fef3c7', // Amber-100
  '#d1fae5', // Emerald-100
  '#dbeafe', // Blue-100
  '#ede9fe', // Violet-100
  '#fce7f3', // Pink-100
  '#fecaca', // Red-100
  '#fed7aa', // Orange-100
  '#e5e7eb', // Gray-200
  '#1f2937', // Gray-800 (dark)
];

function NoteEditor() {
  const accentColor = useThemeStore((state) => state.accentColor);
  const {
    selectedNoteId,
    getSelectedNote,
    updateNoteContent,
    updateNoteColor,
    deleteNote,
    setSelectedNoteId,
  } = useNotesStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteColor, setNoteColor] = useState('#ffffff');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load note data when selectedNoteId changes
  useEffect(() => {
    if (selectedNoteId) {
      const note = getSelectedNote();
      if (note) {
        setTitle(note.title);
        setContent(note.content);
        setNoteColor(note.color);
      }
    }
  }, [selectedNoteId, getSelectedNote]);

  const handleSave = useCallback(async () => {
    if (!selectedNoteId) return;

    setIsSaving(true);
    await updateNoteContent(selectedNoteId, title, content);
    setIsSaving(false);
    setSelectedNoteId(null);
  }, [selectedNoteId, title, content, updateNoteContent, setSelectedNoteId]);

  const handleClose = useCallback(() => {
    setSelectedNoteId(null);
  }, [setSelectedNoteId]);

  const handleDelete = useCallback(async () => {
    if (!selectedNoteId) return;

    if (window.confirm('Are you sure you want to delete this note?')) {
      await deleteNote(selectedNoteId);
      setSelectedNoteId(null);
    }
  }, [selectedNoteId, deleteNote, setSelectedNoteId]);

  const handleColorChange = useCallback(
    async (color: string) => {
      if (!selectedNoteId) return;
      setNoteColor(color);
      await updateNoteColor(selectedNoteId, color);
      setShowColorPicker(false);
    },
    [selectedNoteId, updateNoteColor]
  );

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  if (!selectedNoteId) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-secondary-900">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-900">
        <div className="flex items-center gap-3 flex-1">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors text-secondary-500"
            aria-label="Close editor"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Title input */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title..."
            className="flex-1 text-lg font-semibold bg-transparent border-none outline-none text-secondary-900 dark:text-white placeholder:text-secondary-400"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Color picker */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
              aria-label="Change color"
            >
              <div
                className="w-5 h-5 rounded-full border-2 border-secondary-300"
                style={{ backgroundColor: noteColor }}
              />
            </button>

            {showColorPicker && (
              <div className="absolute right-0 top-full mt-2 p-2 bg-white dark:bg-secondary-800 rounded-xl shadow-xl border border-secondary-200 dark:border-secondary-700 z-10">
                <div className="grid grid-cols-5 gap-1">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleColorChange(color)}
                      className="w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: color,
                        borderColor: color === noteColor ? accentColor : 'transparent',
                      }}
                      aria-label={`Set color to ${color}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Delete button */}
          <button
            onClick={handleDelete}
            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-500"
            aria-label="Delete note"
          >
            <Trash2 className="h-5 w-5" />
          </button>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: accentColor }}
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Saving...' : 'Save & Close'}</span>
          </button>
        </div>
      </header>

      {/* Editor */}
      <div className="flex-1 overflow-hidden" data-color-mode="auto">
        <MDEditor
          value={content}
          onChange={(val: string | undefined) => setContent(val || '')}
          height="100%"
          preview="live"
          hideToolbar={false}
          className="!h-full !border-none"
          textareaProps={{
            placeholder: 'Write your note in Markdown...',
          }}
        />
      </div>
    </div>
  );
}

export default NoteEditor;
