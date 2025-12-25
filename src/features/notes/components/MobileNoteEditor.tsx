import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Check, Loader2, Bold, Italic, List, ListOrdered } from 'lucide-react';
import { useNotesStore } from '@/stores/notesStore';
import { useThemeStore } from '@/stores/themeStore';
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

interface MobileNoteEditorProps {
    noteId: string;
    onClose: () => void;
}

export function MobileNoteEditor({ noteId, onClose }: MobileNoteEditorProps) {
    const accentColor = useThemeStore((state) => state.accentColor);
    const { fetchNote, updateNoteContent } = useNotesStore();

    const [note, setNote] = useState<Note | null>(null);
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('');
    const [hasChanges, setHasChanges] = useState(false);
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

    // Load note
    useEffect(() => {
        const loadNote = async () => {
            setLoading(true);
            const loadedNote = await fetchNote(noteId);
            if (loadedNote) {
                setNote(loadedNote);
                setTitle(loadedNote.title || '');
                const sanitizedContent = loadedNote.content.replace(/\u200B/g, '');
                lastSavedContent.current = sanitizedContent;
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
                setHasChanges(false);
            }
        }, 1000),
        [noteId, updateNoteContent, note?.title]
    );

    // Handle content changes
    const handleContentChange = useCallback(() => {
        if (!contentEditableRef.current) return;
        const newContent = contentEditableRef.current.innerHTML;
        setHasChanges(true);
        debouncedSave(title, newContent);
    }, [title, debouncedSave]);

    // Handle title changes
    const handleTitleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const newTitle = e.target.value;
            setTitle(newTitle);
            setHasChanges(true);
            if (contentEditableRef.current) {
                debouncedSave(newTitle, contentEditableRef.current.innerHTML);
            }
        },
        [debouncedSave]
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

        if (!selectionIsInEditor) return;

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

    // Save on close if there are pending changes
    const handleClose = useCallback(() => {
        if (contentEditableRef.current && hasChanges && note) {
            const finalContent = contentEditableRef.current.innerHTML.replace(/\u200B/g, '');
            updateNoteContent(noteId, title, finalContent);
        }
        onClose();
    }, [hasChanges, note, title, noteId, updateNoteContent, onClose]);

    useEffect(() => {
        refreshActiveFormats();
        document.addEventListener('selectionchange', refreshActiveFormats);
        return () => {
            document.removeEventListener('selectionchange', refreshActiveFormats);
        };
    }, [refreshActiveFormats]);

    if (loading) {
        return (
            <div className="fixed inset-0 z-[60] bg-secondary-50 dark:bg-black flex items-center justify-center pt-safe-top pb-safe-bottom">
                <Loader2 className="h-8 w-8 animate-spin text-secondary-400" />
            </div>
        );
    }

    if (!note) {
        return (
            <div className="fixed inset-0 z-[60] bg-secondary-50 dark:bg-black flex flex-col items-center justify-center pt-safe-top pb-safe-bottom">
                <p className="text-secondary-500 dark:text-secondary-400 mb-4">Note not found</p>
                <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                    style={{ backgroundColor: accentColor }}
                >
                    Go Back
                </button>
            </div>
        );
    }

    const rgb = accentColor.replace('#', '');
    const r = parseInt(rgb.substring(0, 2), 16);
    const g = parseInt(rgb.substring(2, 4), 16);
    const b = parseInt(rgb.substring(4, 6), 16);
    const accentSelectionBg = `rgba(${r}, ${g}, ${b}, 0.35)`;

    const fontSizeOptions = [
        { label: 'S', value: '2' },
        { label: 'M', value: '3' },
        { label: 'L', value: '4' },
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
            className="fixed inset-0 z-[60] bg-secondary-50 dark:bg-black flex flex-col pt-safe-top pb-0"
            data-note-editor
            style={
                {
                    '--note-selection-bg': accentSelectionBg,
                } as React.CSSProperties
            }
        >
            {/* Header */}
            <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-white dark:bg-secondary-900 border-b border-secondary-200 dark:border-secondary-800">
                <button
                    onClick={handleClose}
                    className="p-2 -ml-2 rounded-lg text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>

                <input
                    type="text"
                    value={title}
                    onChange={handleTitleChange}
                    placeholder="Note title"
                    className="flex-1 text-lg font-semibold bg-transparent text-secondary-900 dark:text-white placeholder-secondary-400 outline-none"
                />

                <div className="flex items-center gap-2">
                    {hasChanges ? (
                        <div className="w-2 h-2 rounded-full bg-amber-500" title="Unsaved changes" />
                    ) : (
                        <Check className="h-4 w-4" style={{ color: accentColor }} />
                    )}
                </div>
            </div>

            {/* Formatting Toolbar */}
            <div className="flex-shrink-0 flex items-center gap-1 px-4 py-2 bg-white dark:bg-secondary-900 border-b border-secondary-200 dark:border-secondary-800 overflow-x-auto">
                <button
                    onClick={() => {
                        applyFormat('bold');
                        refreshActiveFormats();
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                    className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-secondary-700 dark:text-secondary-200"
                    style={
                        activeFormats.bold
                            ? { backgroundColor: `${accentColor}15`, boxShadow: `0 0 0 2px ${accentColor}` }
                            : undefined
                    }
                    aria-pressed={activeFormats.bold}
                    aria-label="Bold"
                >
                    <Bold className="h-4 w-4" />
                </button>
                <button
                    onClick={() => {
                        applyFormat('italic');
                        refreshActiveFormats();
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                    className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-secondary-700 dark:text-secondary-200"
                    style={
                        activeFormats.italic
                            ? { backgroundColor: `${accentColor}15`, boxShadow: `0 0 0 2px ${accentColor}` }
                            : undefined
                    }
                    aria-pressed={activeFormats.italic}
                    aria-label="Italic"
                >
                    <Italic className="h-4 w-4" />
                </button>

                <div className="w-px h-6 mx-1 bg-secondary-200 dark:bg-secondary-700" />

                <select
                    value={selectedFontSize}
                    onMouseDown={saveSelection}
                    onChange={(e) => {
                        restoreSelection();
                        applyFormat('fontSize', e.target.value);
                        refreshActiveFormats();
                    }}
                    className="px-2 py-1.5 rounded-lg border bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100 text-sm focus:outline-none border-secondary-200 dark:border-secondary-700"
                    style={{
                        borderColor: selectedFontSize !== '3' ? accentColor : undefined,
                    }}
                    aria-label="Font size"
                >
                    {fontSizeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>

                <div className="w-px h-6 mx-1 bg-secondary-200 dark:bg-secondary-700" />

                <button
                    onClick={() => {
                        applyFormat('insertUnorderedList');
                        refreshActiveFormats();
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                    className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-secondary-700 dark:text-secondary-200"
                    style={
                        activeFormats.unorderedList
                            ? { backgroundColor: `${accentColor}15`, boxShadow: `0 0 0 2px ${accentColor}` }
                            : undefined
                    }
                    aria-pressed={activeFormats.unorderedList}
                    aria-label="Bullet List"
                >
                    <List className="h-4 w-4" />
                </button>
                <button
                    onClick={() => {
                        applyFormat('insertOrderedList');
                        refreshActiveFormats();
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                    className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-secondary-700 dark:text-secondary-200"
                    style={
                        activeFormats.orderedList
                            ? { backgroundColor: `${accentColor}15`, boxShadow: `0 0 0 2px ${accentColor}` }
                            : undefined
                    }
                    aria-pressed={activeFormats.orderedList}
                    aria-label="Numbered List"
                >
                    <ListOrdered className="h-4 w-4" />
                </button>
            </div>

            {/* Content Editor */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
                <div
                    ref={contentEditableRef}
                    contentEditable
                    onInput={handleContentChange}
                    onKeyUp={refreshActiveFormats}
                    onTouchEnd={refreshActiveFormats}
                    className="outline-none min-h-full text-secondary-900 dark:text-secondary-100"
                    style={{ caretColor: accentColor }}
                    data-placeholder="Start writing..."
                />
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

        [contenteditable] font[size="1"] { font-size: 0.75rem; }
        [contenteditable] font[size="2"] { font-size: 0.875rem; }
        [contenteditable] font[size="3"] { font-size: 1rem; }
        [contenteditable] font[size="4"] { font-size: 1.125rem; }
        [contenteditable] font[size="5"] { font-size: 1.25rem; }
        [contenteditable] font[size="6"] { font-size: 1.5rem; }
        [contenteditable] font[size="7"] { font-size: 1.875rem; }

        [contenteditable] ul,
        [contenteditable] ol {
          list-style-position: outside;
          margin: 0.5em 0;
          padding-left: 1.5em;
        }

        [contenteditable] ul { list-style-type: disc; }
        [contenteditable] ol { list-style-type: decimal; }
        [contenteditable] li { display: list-item; margin: 0.25em 0; }
        [contenteditable] p { margin: 0.5em 0; }
        [contenteditable] strong { font-weight: 600; }
        [contenteditable] em { font-style: italic; }
      `}</style>
        </div>
    );
}

export default MobileNoteEditor;
