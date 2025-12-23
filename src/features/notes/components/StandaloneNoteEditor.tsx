import { useState, useEffect, useCallback, useRef } from 'react';
import { Trash2, Bold, Italic, List, ListOrdered } from 'lucide-react';
import { useNotesStore } from '@/stores/notesStore';
import { useThemeStore } from '@/stores/themeStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { LoadingSpinner } from '@/components/ui';
import type { Note } from '@/lib/types';

// Debounce utility for auto-save
function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

interface StandaloneNoteEditorProps {
  noteId: string;
}

export function StandaloneNoteEditor({ noteId }: StandaloneNoteEditorProps) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const { fetchNote, updateNoteContent, deleteNote } = useNotesStore();
  const { closeTab, updateTabTitle, findTabByEntity } = useWorkspaceStore();

  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    fontSize: '3',
    unorderedList: false,
    orderedList: false,
  });
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const lastSavedContent = useRef('');
  const savedSelectionRef = useRef<Range | null>(null);

  // Load note data
  useEffect(() => {
    const loadNote = async () => {
      setLoading(true);
      const fetchedNote = await fetchNote(noteId);
      if (fetchedNote) {
        setNote(fetchedNote);
        setTitle(fetchedNote.title);
        const sanitizedContent = fetchedNote.content.replace(/\u200B/g, '');
        setContent(sanitizedContent);
        lastSavedContent.current = sanitizedContent;

        // Set contenteditable content
        if (contentEditableRef.current) {
          contentEditableRef.current.innerHTML = sanitizedContent || '';
        }
      }
      setLoading(false);
    };

    loadNote();
  }, [noteId, fetchNote]);

  // Auto-save debounced function
  const debouncedSave = useCallback(
    debounce((noteTitle: string, noteContent: string) => {
      const sanitizedContent = noteContent.replace(/\u200B/g, '');
      if (sanitizedContent !== lastSavedContent.current || noteTitle !== note?.title) {
        updateNoteContent(noteId, noteTitle, sanitizedContent);
        lastSavedContent.current = sanitizedContent;

        // Update tab title if it changed
        const tab = findTabByEntity('note', noteId);
        if (tab && tab.title !== noteTitle) {
          updateTabTitle(tab.id, noteTitle || 'Untitled');
        }
      }
    }, 1000),
    [noteId, updateNoteContent, updateTabTitle, findTabByEntity, note?.title]
  );

  // Handle content changes
  const handleContentChange = useCallback(() => {
    if (!contentEditableRef.current) return;

    const newContent = contentEditableRef.current.innerHTML;
    setContent(newContent);
    debouncedSave(title, newContent);
  }, [title, debouncedSave]);

  // Handle title changes
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      setTitle(newTitle);
      debouncedSave(newTitle, content);
    },
    [content, debouncedSave]
  );

  // Formatting functions
  const applyFormat = useCallback((command: string, value?: string) => {
    if (command === 'fontSize' && value) {
      const editor = contentEditableRef.current;
      const selection = window.getSelection();
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;

      if (editor && selection && range) {
        const commonAncestor = range.commonAncestorContainer;
        const selectionIsInEditor =
          editor === commonAncestor ||
          (commonAncestor instanceof Node && editor.contains(commonAncestor));

        if (selectionIsInEditor && range.collapsed) {
          const font = document.createElement('font');
          font.setAttribute('size', value);
          font.appendChild(document.createTextNode('\u200B'));

          range.insertNode(font);

          const placeholderNode = font.firstChild;
          if (placeholderNode) {
            const nextRange = document.createRange();
            nextRange.setStart(placeholderNode, 1);
            nextRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(nextRange);
            savedSelectionRef.current = nextRange.cloneRange();
          }

          editor.focus();
          return;
        }
      }
    }

    document.execCommand(command, false, value);
    contentEditableRef.current?.focus();
  }, []);

  const saveSelection = useCallback(() => {
    const editor = contentEditableRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const commonAncestor = range.commonAncestorContainer;
    const selectionIsInEditor =
      editor === commonAncestor || (commonAncestor instanceof Node && editor.contains(commonAncestor));

    if (!selectionIsInEditor) return;
    savedSelectionRef.current = range.cloneRange();
  }, []);

  const restoreSelection = useCallback(() => {
    const selection = window.getSelection();
    const range = savedSelectionRef.current;
    if (!selection || !range) return;

    selection.removeAllRanges();
    selection.addRange(range);
  }, []);

  const refreshActiveFormats = useCallback(() => {
    const editor = contentEditableRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    const selectionIsInEditor =
      !!selection?.anchorNode && (editor === selection.anchorNode || editor.contains(selection.anchorNode));

    if (!selectionIsInEditor) {
      return;
    }

    const getFontSizeFromSelection = () => {
      const anchorNode = selection?.anchorNode;
      if (!anchorNode) return null;

      let currentElement: HTMLElement | null =
        anchorNode instanceof HTMLElement ? anchorNode : anchorNode.parentElement;

      while (currentElement && currentElement !== editor) {
        if (currentElement.tagName === 'FONT') {
          const size = currentElement.getAttribute('size');
          if (size) return size;
        }
        currentElement = currentElement.parentElement;
      }

      return null;
    };

    const rawFontSize =
      getFontSizeFromSelection() ?? String(document.queryCommandValue('fontSize') || '3');
    const fontSize = /^[1-7]$/.test(rawFontSize) ? rawFontSize : '3';

    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      fontSize: fontSize || '3',
      unorderedList: document.queryCommandState('insertUnorderedList'),
      orderedList: document.queryCommandState('insertOrderedList'),
    });
  }, []);

  const handleDelete = useCallback(async () => {
    if (!note) return;

    if (window.confirm('Are you sure you want to delete this note? This cannot be undone.')) {
      await deleteNote(noteId);
      const tab = findTabByEntity('note', noteId);
      if (tab) {
        closeTab(tab.id);
      }
    }
  }, [noteId, note, deleteNote, findTabByEntity, closeTab]);

  useEffect(() => {
    refreshActiveFormats();

    document.addEventListener('selectionchange', refreshActiveFormats);
    return () => {
      document.removeEventListener('selectionchange', refreshActiveFormats);
    };
  }, [refreshActiveFormats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-light-bg dark:bg-secondary-900">
        <LoadingSpinner />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex items-center justify-center h-full bg-light-bg dark:bg-secondary-900">
        <div className="text-center">
          <p className="text-red-500 mb-2">Note not found</p>
          <p className="text-secondary-500 text-sm">This note may have been deleted.</p>
        </div>
      </div>
    );
  }

  const rgb = accentColor.replace('#', '');
  const r = parseInt(rgb.substring(0, 2), 16);
  const g = parseInt(rgb.substring(2, 4), 16);
  const b = parseInt(rgb.substring(4, 6), 16);
  const accentSelectionBg = `rgba(${r}, ${g}, ${b}, 0.35)`;

  const fontSizeOptions = [
    { label: 'Small', value: '2' },
    { label: 'Normal', value: '3' },
    { label: 'Large', value: '4' },
    { label: 'XL', value: '5' },
  ];

  const selectedFontSize = (() => {
    if (fontSizeOptions.some((o) => o.value === activeFormats.fontSize)) {
      return activeFormats.fontSize;
    }

    const parsed = Number.parseInt(activeFormats.fontSize, 10);
    if (!Number.isFinite(parsed)) return '3';
    if (parsed <= 2) return '2';
    if (parsed >= 5) return '5';
    return '3';
  })();

  return (
    <div
      className="flex flex-col h-full bg-light-bg dark:bg-secondary-900"
      data-note-editor
      style={
        {
          '--note-selection-bg': accentSelectionBg,
        } as React.CSSProperties
      }
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 lg:py-4 border-b border-secondary-200 dark:border-secondary-800">
        <div className="flex items-center gap-3 flex-1">
          {/* Title input */}
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Note title..."
            className="flex-1 text-xl font-semibold bg-transparent border-none outline-none text-secondary-900 dark:text-white placeholder:opacity-40"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Delete button */}
          <button
            onClick={handleDelete}
            className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-red-500"
            aria-label="Delete note"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Formatting Toolbar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-secondary-200 dark:border-secondary-800">
        <button
          onClick={() => {
            applyFormat('bold');
            refreshActiveFormats();
          }}
          onMouseDown={(e) => e.preventDefault()}
          className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-secondary-700 dark:text-secondary-200 opacity-70 hover:opacity-100"
          style={
            activeFormats.bold
              ? { backgroundColor: `${accentColor}15`, boxShadow: `0 0 0 2px ${accentColor}` }
              : undefined
          }
          aria-pressed={activeFormats.bold}
          aria-label="Bold"
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            applyFormat('italic');
            refreshActiveFormats();
          }}
          onMouseDown={(e) => e.preventDefault()}
          className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-secondary-700 dark:text-secondary-200 opacity-70 hover:opacity-100"
          style={
            activeFormats.italic
              ? { backgroundColor: `${accentColor}15`, boxShadow: `0 0 0 2px ${accentColor}` }
              : undefined
          }
          aria-pressed={activeFormats.italic}
          aria-label="Italic"
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>

        <div className="w-px h-6 mx-1 bg-secondary-200 dark:bg-secondary-800" />

        <select
          value={selectedFontSize}
          onMouseDown={saveSelection}
          onChange={(e) => {
            restoreSelection();
            applyFormat('fontSize', e.target.value);
            refreshActiveFormats();
          }}
          className="mx-1 px-2 py-1.5 rounded-lg border bg-white/70 dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0 border-secondary-200 dark:border-secondary-700"
          style={
            {
              borderColor: selectedFontSize !== '3' ? accentColor : undefined,
              '--tw-ring-color': accentColor,
            } as React.CSSProperties
          }
          aria-label="Font size"
          title="Font size"
        >
          {fontSizeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <div className="w-px h-6 mx-1 bg-secondary-200 dark:bg-secondary-800" />

        <button
          onClick={() => {
            applyFormat('insertUnorderedList');
            refreshActiveFormats();
          }}
          onMouseDown={(e) => e.preventDefault()}
          className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-secondary-700 dark:text-secondary-200 opacity-70 hover:opacity-100"
          style={
            activeFormats.unorderedList
              ? { backgroundColor: `${accentColor}15`, boxShadow: `0 0 0 2px ${accentColor}` }
              : undefined
          }
          aria-pressed={activeFormats.unorderedList}
          aria-label="Bullet List"
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            applyFormat('insertOrderedList');
            refreshActiveFormats();
          }}
          onMouseDown={(e) => e.preventDefault()}
          className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-secondary-700 dark:text-secondary-200 opacity-70 hover:opacity-100"
          style={
            activeFormats.orderedList
              ? { backgroundColor: `${accentColor}15`, boxShadow: `0 0 0 2px ${accentColor}` }
              : undefined
          }
          aria-pressed={activeFormats.orderedList}
          aria-label="Numbered List"
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
      </div>

      {/* Content Editor */}
      <div className="flex-1 overflow-y-auto px-4 py-6 lg:px-8 lg:py-8">
        <div className="max-w-3xl mx-auto">
          <div
            ref={contentEditableRef}
            contentEditable
            onInput={handleContentChange}
            onKeyUp={refreshActiveFormats}
            onMouseUp={refreshActiveFormats}
            className="outline-none min-h-full text-secondary-900 dark:text-secondary-100 max-w-none prose dark:prose-invert"
            style={{ caretColor: accentColor }}
            data-placeholder="Start writing..."
          />
        </div>
      </div>

      <style>{`
        [data-note-editor] ::selection {
          background: var(--note-selection-bg);
          color: inherit;
        }

        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          opacity: 0.4;
          pointer-events: none;
        }

        [contenteditable] {
          font: inherit;
          line-height: 1.6;
        }

        [contenteditable] h1 {
          font-size: 2em;
          font-weight: 700;
          margin: 1em 0 0.5em;
          line-height: 1.2;
        }

        [contenteditable] h2 {
          font-size: 1.5em;
          font-weight: 600;
          margin: 0.8em 0 0.4em;
          line-height: 1.3;
        }

        [contenteditable] h3 {
          font-size: 1.25em;
          font-weight: 600;
          margin: 0.6em 0 0.3em;
          line-height: 1.4;
        }

        /* Font size formatting */
        [contenteditable] font[size="1"] {
          font-size: 0.75rem;
        }

        [contenteditable] font[size="2"] {
          font-size: 0.875rem;
        }

        [contenteditable] font[size="3"] {
          font-size: 1rem;
        }

        [contenteditable] font[size="4"] {
          font-size: 1.125rem;
        }

        [contenteditable] font[size="5"] {
          font-size: 1.25rem;
        }

        [contenteditable] font[size="6"] {
          font-size: 1.5rem;
        }

        [contenteditable] font[size="7"] {
          font-size: 1.875rem;
        }

        [contenteditable] ul,
        [contenteditable] ol {
          list-style-position: outside;
          margin: 0.5em 0;
          padding-left: 1.5em;
        }

        [contenteditable] ul {
          list-style-type: disc;
        }

        [contenteditable] ol {
          list-style-type: decimal;
        }

        [contenteditable] li {
          display: list-item;
          margin: 0.25em 0;
        }

        [contenteditable] p {
          margin: 0.5em 0;
        }

        [contenteditable] strong {
          font-weight: 600;
        }

        [contenteditable] em {
          font-style: italic;
        }
      `}</style>
    </div>
  );
}

export default StandaloneNoteEditor;
