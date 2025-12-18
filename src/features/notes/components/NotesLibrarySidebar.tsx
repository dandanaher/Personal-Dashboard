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

// Canvas list item component
function CanvasItem({
  canvas,
  onClick,
  onRename,
  onDelete,
}: {
  canvas: Canvas;
  onClick: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const accentColor = useThemeStore((state) => state.accentColor);

  return (
    <div className="group relative flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors">
      <button
        onClick={onClick}
        className="flex items-center gap-2 flex-1 min-w-0 text-secondary-600 dark:text-secondary-400 text-sm"
      >
        <Layout className="h-4 w-4 flex-shrink-0" style={{ color: accentColor }} />
        <span className="truncate">{canvas.name}</span>
      </button>

      {/* Menu button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-opacity"
        aria-label="Canvas menu"
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

export function NotesLibrarySidebar() {
  const { addTab } = useWorkspaceStore();
  const { libraryNotes, fetchLibraryNotes, createNote } = useNotesStore();
  const { canvases, loading: canvasesLoading, createCanvas, deleteCanvas, updateCanvas } = useCanvases();
  const { folders, loading: foldersLoading, createFolder, updateFolder, deleteFolder } = useFolders();
  const accentColor = useThemeStore((state) => state.accentColor);

  const [renameCanvasId, setRenameCanvasId] = useState<string | null>(null);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

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

    const { user } = useAuthStore.getState();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notes')
        .update({ folder_id: folderId, updated_at: new Date().toISOString() })
        .eq('id', noteId)
        .eq('user_id', user.id);

      if (error) throw error;
      await fetchLibraryNotes();
    } catch (error) {
      console.error('Failed to move note to folder:', error);
    }
  };

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
    <>
      <div className="w-full border-b lg:border-b-0 flex flex-col overflow-hidden bg-white dark:bg-secondary-900 border-r border-secondary-200 dark:border-secondary-800">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-secondary-200 dark:border-secondary-800">
          <h2 className="font-semibold text-secondary-900 dark:text-white">Notes</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCreateFolder}
              className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
              style={{ color: accentColor }}
              aria-label="Create folder"
              title="New Folder"
            >
              <FolderPlus className="h-4 w-4" />
            </button>
            <button
              onClick={handleCreateNote}
              className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
              style={{ color: accentColor }}
              aria-label="Create note"
              title="New Note"
            >
              <FileText className="h-4 w-4" />
            </button>
            <button
              onClick={handleCreateCanvas}
              className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
              style={{ color: accentColor }}
              aria-label="Create canvas"
              title="New Canvas"
            >
              <Layout className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* List */}
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

          {/* Canvases */}
          {canvases.map((canvas) => (
            <CanvasItem
              key={canvas.id}
              canvas={canvas}
              onClick={() => handleCanvasClick(canvas)}
              onRename={() => handleRenameCanvas(canvas)}
              onDelete={() => handleDeleteCanvas(canvas.id)}
            />
          ))}

          {/* Empty state */}
          {libraryNotes.length === 0 && canvases.length === 0 && (
            <div className="text-center py-8 text-secondary-500 dark:text-secondary-400">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notes or canvases yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Rename Modal */}
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
    </>
  );
}

export default NotesLibrarySidebar;
