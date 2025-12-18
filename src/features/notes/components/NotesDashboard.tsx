import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Plus,
  FileText,
  Layout,
  Folder,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Trash2,
  Edit2,
  GripVertical,
} from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useThemeStore } from '@/stores/themeStore';
import { useNotesStore } from '@/stores/notesStore';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { useCanvases } from '../hooks/useCanvases';
import { useFolders } from '../hooks/useFolders';
import { LoadingSpinner } from '@/components/ui';
import type { Note, Folder as FolderType, Canvas } from '@/lib/types';

// Helper to organize notes by folder
function organizeNotesByFolder(notes: Note[], folders: FolderType[]) {
  const rootNotes: Note[] = [];
  const notesByFolder: Record<string, Note[]> = {};

  // Initialize folder buckets
  folders.forEach((folder) => {
    notesByFolder[folder.id] = [];
  });

  // Categorize notes
  notes.forEach((note) => {
    if (note.folder_id && notesByFolder[note.folder_id]) {
      notesByFolder[note.folder_id].push(note);
    } else {
      rootNotes.push(note);
    }
  });

  return { rootNotes, notesByFolder };
}

// Folder tree item component
function FolderItem({
  folder,
  notes,
  level = 0,
  onNoteClick,
  onRename,
  onDelete,
  onAddNote,
  onNoteDrop,
}: {
  folder: FolderType;
  notes: Note[];
  level?: number;
  onNoteClick: (note: Note) => void;
  onRename: (folder: FolderType) => void;
  onDelete: (folderId: string) => void;
  onAddNote: (folderId: string) => void;
  onNoteDrop: (noteId: string, folderId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const accentColor = useThemeStore((state) => state.accentColor);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const noteId = e.dataTransfer.getData('noteId');
    if (noteId) {
      onNoteDrop(noteId, folder.id);
    }
  };

  return (
    <div className="select-none">
      {/* Folder header */}
      <div
        className={`group relative flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${
          isDragOver
            ? 'bg-accent-100 dark:bg-accent-900/20 border-2 border-dashed'
            : 'hover:bg-secondary-100 dark:hover:bg-secondary-800'
        }`}
        style={{
          paddingLeft: `${level * 16 + 8}px`,
          borderColor: isDragOver ? accentColor : 'transparent',
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 flex-1 min-w-0 text-secondary-700 dark:text-secondary-300 text-sm"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-secondary-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-secondary-400 flex-shrink-0" />
          )}
          <Folder className="h-4 w-4 flex-shrink-0" style={{ color: accentColor }} />
          <span className="truncate font-medium">{folder.name}</span>
        </button>

        <span className="text-xs text-secondary-400">{notes.length}</span>

        {/* Quick add note button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddNote(folder.id);
          }}
          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-opacity"
          style={{ color: accentColor }}
          aria-label="Add note to folder"
          title="Add note to folder"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>

        {/* Menu button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-opacity"
          aria-label="Folder menu"
        >
          <MoreVertical className="h-3.5 w-3.5 text-secondary-500" />
        </button>

        {/* Dropdown menu */}
        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
              }}
            />
            <div className="absolute top-8 right-2 z-20 bg-white dark:bg-secondary-800 rounded-lg shadow-lg border border-secondary-200 dark:border-secondary-700 py-1 min-w-[120px]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  onRename(folder);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700"
              >
                <Edit2 className="h-4 w-4" />
                Rename
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  onDelete(folder.id);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </>
        )}
      </div>

      {/* Folder contents */}
      {isExpanded && notes.length > 0 && (
        <div className="mt-0.5">
          {notes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              level={level + 1}
              onClick={() => onNoteClick(note)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Note list item component
function NoteItem({
  note,
  level = 0,
  onClick,
}: {
  note: Note;
  level?: number;
  onClick: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('noteId', note.id);
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <button
      onClick={onClick}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-600 dark:text-secondary-400 text-sm transition-colors cursor-move ${
        isDragging ? 'opacity-50' : ''
      }`}
      style={{ paddingLeft: `${level * 16 + 28}px` }}
    >
      <FileText className="h-4 w-4 flex-shrink-0" />
      <span className="truncate flex-1 text-left">{note.title || 'Untitled'}</span>
    </button>
  );
}

// Canvas card component
function CanvasCard({
  canvas,
  onClick,
  onDelete,
  onRename,
}: {
  canvas: Canvas;
  onClick: () => void;
  onDelete: () => void;
  onRename: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const accentColor = useThemeStore((state) => state.accentColor);

  return (
    <div
      className="group relative bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 hover:shadow-lg transition-all cursor-pointer"
      onClick={onClick}
    >
      {/* Canvas preview placeholder */}
      <div
        className="h-24 rounded-lg mb-3 flex items-center justify-center"
        style={{ backgroundColor: `${accentColor}10` }}
      >
        <Layout className="h-8 w-8" style={{ color: accentColor, opacity: 0.5 }} />
      </div>

      {/* Canvas info */}
      <h3 className="font-medium text-secondary-900 dark:text-white truncate">
        {canvas.name}
      </h3>
      {canvas.description && (
        <p className="text-sm text-secondary-500 dark:text-secondary-400 truncate mt-1">
          {canvas.description}
        </p>
      )}
      <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-2">
        Last opened:{' '}
        {new Date(canvas.last_accessed_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        })}
      </p>

      {/* Menu button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-all"
      >
        <MoreVertical className="h-4 w-4 text-secondary-500" />
      </button>

      {/* Dropdown menu */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
            }}
          />
          <div className="absolute top-8 right-2 z-20 bg-white dark:bg-secondary-800 rounded-lg shadow-lg border border-secondary-200 dark:border-secondary-700 py-1 min-w-[120px]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
                onRename();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700"
            >
              <Edit2 className="h-4 w-4" />
              Rename
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
                onDelete();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function NotesDashboard() {
  const { addTab } = useWorkspaceStore();
  const { libraryNotes, fetchLibraryNotes, createNote } = useNotesStore();
  const { canvases, loading: canvasesLoading, createCanvas, deleteCanvas, updateCanvas } = useCanvases();
  const { folders, loading: foldersLoading, createFolder, updateFolder, deleteFolder } = useFolders();
  const accentColor = useThemeStore((state) => state.accentColor);

  const [renameCanvasId, setRenameCanvasId] = useState<string | null>(null);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [leftPanelWidth, setLeftPanelWidth] = useState(320); // Default width in pixels
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(320);

  useEffect(() => {
    fetchLibraryNotes();
  }, [fetchLibraryNotes]);

  const { rootNotes, notesByFolder } = organizeNotesByFolder(libraryNotes, folders);

  const handleNoteClick = (note: Note) => {
    addTab('note', note.id, note.title || 'Untitled');
  };

  const handleCanvasClick = async (canvas: Canvas) => {
    addTab('canvas', canvas.id, canvas.name);
  };

  const handleCreateNote = async () => {
    const noteId = await createNote({ canvasId: null, title: 'New Note' });
    if (noteId) {
      addTab('note', noteId, 'New Note');
    }
  };

  const handleCreateFolder = async () => {
    await createFolder('New Folder');
  };

  const handleCreateCanvas = async () => {
    const canvas = await createCanvas('Untitled Canvas');
    if (canvas) {
      addTab('canvas', canvas.id, canvas.name);
    }
  };

  const handleRenameFolder = (folder: FolderType) => {
    setRenameFolderId(folder.id);
    setRenameValue(folder.name);
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (window.confirm('Delete this folder? Notes inside will be moved to root.')) {
      await deleteFolder(folderId);
    }
  };

  const handleAddNoteToFolder = async (folderId: string) => {
    const noteId = await createNote({ canvasId: null, folderId, title: 'New Note' });
    if (noteId) {
      addTab('note', noteId, 'New Note');
    }
  };

  const handleNoteDrop = async (noteId: string, folderId: string) => {
    const note = libraryNotes.find((n) => n.id === noteId);
    if (!note) return;

    // Update note's folder_id via the notesStore
    // We need to use Supabase directly since updateNoteContent doesn't handle folder_id
    const { user } = useAuthStore.getState();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notes')
        .update({ folder_id: folderId, updated_at: new Date().toISOString() })
        .eq('id', noteId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Refetch to update UI
      await fetchLibraryNotes();
    } catch (error) {
      console.error('Failed to move note to folder:', error);
    }
  };

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = leftPanelWidth;
  }, [leftPanelWidth]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const delta = e.clientX - resizeStartX.current;
    const newWidth = Math.max(280, Math.min(600, resizeStartWidth.current + delta));
    setLeftPanelWidth(newWidth);
  }, [isResizing]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Set up global mouse event listeners for resizing
  useEffect(() => {
    if (!isResizing) return;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  const handleDeleteCanvas = async (id: string) => {
    if (window.confirm('Delete this canvas? All notes on it will be deleted.')) {
      await deleteCanvas(id);
    }
  };

  const handleRenameCanvas = (canvas: Canvas) => {
    setRenameCanvasId(canvas.id);
    setRenameValue(canvas.name);
  };

  const handleRenameSubmit = async () => {
    if (renameCanvasId && renameValue.trim()) {
      await updateCanvas(renameCanvasId, { name: renameValue.trim() });
      setRenameCanvasId(null);
    }
    if (renameFolderId && renameValue.trim()) {
      await updateFolder(renameFolderId, { name: renameValue.trim() });
      setRenameFolderId(null);
    }
    setRenameValue('');
  };

  const isLoading = canvasesLoading || foldersLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden bg-light-bg dark:bg-secondary-900">
      {/* Left Column: Notes Library */}
      <div
        className="w-full border-b lg:border-b-0 flex flex-col overflow-hidden"
        style={{ width: `${leftPanelWidth}px`, minWidth: '280px', maxWidth: '600px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-secondary-200 dark:border-secondary-800">
          <h2 className="font-semibold text-secondary-900 dark:text-white">Notes Library</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCreateFolder}
              className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
              style={{ color: accentColor }}
              aria-label="Create folder"
              title="New Folder"
            >
              <FolderPlus className="h-5 w-5" />
            </button>
            <button
              onClick={handleCreateNote}
              className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
              style={{ color: accentColor }}
              aria-label="Create note"
              title="New Note"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto p-2">
          {/* Folders */}
          {folders
            .filter((f) => !f.parent_id)
            .map((folder) => (
              <FolderItem
                key={folder.id}
                folder={folder}
                notes={notesByFolder[folder.id] || []}
                onNoteClick={handleNoteClick}
                onRename={handleRenameFolder}
                onDelete={handleDeleteFolder}
                onAddNote={handleAddNoteToFolder}
                onNoteDrop={handleNoteDrop}
              />
            ))}

          {/* Root notes (not in any folder) */}
          {rootNotes.map((note) => (
            <NoteItem key={note.id} note={note} onClick={() => handleNoteClick(note)} />
          ))}

          {/* Empty state */}
          {libraryNotes.length === 0 && (
            <div className="text-center py-8 text-secondary-500 dark:text-secondary-400">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notes yet</p>
              <button
                onClick={handleCreateNote}
                className="mt-2 text-sm font-medium hover:underline"
                style={{ color: accentColor }}
              >
                Create your first note
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Resizable Divider */}
      <div
        className="hidden lg:flex items-center justify-center w-1 bg-secondary-200 dark:bg-secondary-800 hover:bg-accent-500 dark:hover:bg-accent-500 cursor-col-resize transition-colors relative group"
        onMouseDown={handleResizeStart}
        style={{
          cursor: isResizing ? 'col-resize' : 'ew-resize',
          backgroundColor: isResizing ? accentColor : undefined,
        }}
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
        <GripVertical
          className="h-4 w-4 text-secondary-400 dark:text-secondary-500 opacity-0 group-hover:opacity-100 transition-opacity absolute"
          style={{ pointerEvents: 'none' }}
        />
      </div>

      {/* Right Column: Canvas Gallery */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-secondary-200 dark:border-secondary-800">
          <h2 className="font-semibold text-secondary-900 dark:text-white">Canvases</h2>
          <button
            onClick={handleCreateCanvas}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
          >
            <Plus className="h-4 w-4" />
            New Canvas
          </button>
        </div>

        {/* Canvas grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {canvases.map((canvas) => (
              <CanvasCard
                key={canvas.id}
                canvas={canvas}
                onClick={() => handleCanvasClick(canvas)}
                onDelete={() => handleDeleteCanvas(canvas.id)}
                onRename={() => handleRenameCanvas(canvas)}
              />
            ))}
          </div>

          {/* Empty state */}
          {canvases.length === 0 && (
            <div className="text-center py-12 text-secondary-500 dark:text-secondary-400">
              <Layout className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No canvases yet</p>
              <p className="text-sm mt-1">Canvases let you visually organize related notes</p>
              <button
                onClick={handleCreateCanvas}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium mx-auto transition-colors"
                style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
              >
                <Plus className="h-4 w-4" />
                Create your first canvas
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Rename Modal (for both Canvas and Folder) */}
      {(renameCanvasId || renameFolderId) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
              {renameCanvasId ? 'Rename Canvas' : 'Rename Folder'}
            </h3>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit();
                if (e.key === 'Escape') {
                  setRenameCanvasId(null);
                  setRenameFolderId(null);
                  setRenameValue('');
                }
              }}
              className="w-full px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setRenameCanvasId(null);
                  setRenameFolderId(null);
                  setRenameValue('');
                }}
                className="px-4 py-2 text-sm font-medium text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameSubmit}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                style={{ backgroundColor: accentColor }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotesDashboard;
