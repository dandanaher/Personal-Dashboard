import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  FileText,
  Layout,
  Folder,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Group as GroupIcon,
  MoreVertical,
  Trash2,
  Edit2,
} from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useThemeStore } from '@/stores/themeStore';
import { useNotesStore } from '@/stores/notesStore';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { useNotesLibraryData } from '../hooks/useNotesLibraryData';
import { LoadingSpinner } from '@/components/ui';
import type { Note, Folder as FolderType, Canvas, CanvasGroup } from '@/lib/types';

// Helper to organize notes by folder and canvas
function organizeLibraryItems(notes: Note[], folders: FolderType[], canvases: Canvas[]) {
  const rootNotes: Note[] = [];
  const notesByFolder: Record<string, Note[]> = {};
  const notesByCanvas: Record<string, Note[]> = {};

  // Initialize buckets
  folders.forEach((folder) => {
    notesByFolder[folder.id] = [];
  });
  canvases.forEach((canvas) => {
    notesByCanvas[canvas.id] = [];
  });

  // Categorize notes
  notes.forEach((note) => {
    // Priority: Canvas > Folder > Root
    if (note.canvas_id && notesByCanvas[note.canvas_id]) {
      notesByCanvas[note.canvas_id].push(note);
    } else if (note.folder_id && notesByFolder[note.folder_id]) {
      notesByFolder[note.folder_id].push(note);
    } else {
      rootNotes.push(note);
    }
  });

  return { rootNotes, notesByFolder, notesByCanvas };
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
  onNoteRename,
  onNoteDelete,
}: {
  folder: FolderType;
  notes: Note[];
  level?: number;
  onNoteClick: (note: Note) => void;
  onRename: (folder: FolderType) => void;
  onDelete: (folderId: string) => void;
  onAddNote: (folderId: string) => void;
  onNoteDrop: (noteId: string, folderId: string) => void;
  onNoteRename: (note: Note) => void;
  onNoteDelete: (noteId: string) => void;
}) {
  const getExpandedState = () => {
    const saved = localStorage.getItem(`notes-sidebar-folder-${folder.id}`);
    return saved !== null ? saved === 'true' : false;
  };

  const [isExpanded, setIsExpanded] = useState(getExpandedState);
  const [showMenu, setShowMenu] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const accentColor = useThemeStore((state) => state.accentColor);

  const toggleExpanded = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    localStorage.setItem(`notes-sidebar-folder-${folder.id}`, String(newState));
  };

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
        className={`group relative flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${isDragOver
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
          onClick={toggleExpanded}
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
              onRename={() => onNoteRename(note)}
              onDelete={() => onNoteDelete(note.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Group list item component (canvas group)
function GroupItem({
  group,
  notes,
  level = 0,
  onNoteClick,
  onNoteRename,
  onNoteDelete,
}: {
  group: CanvasGroup;
  notes: Note[];
  level?: number;
  onNoteClick: (note: Note) => void;
  onNoteRename: (note: Note) => void;
  onNoteDelete: (noteId: string) => void;
}) {
  const getExpandedState = () => {
    const saved = localStorage.getItem(`notes-sidebar-group-${group.id}`);
    return saved !== null ? saved === 'true' : true;
  };

  const [isExpanded, setIsExpanded] = useState(getExpandedState);

  const toggleExpanded = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    localStorage.setItem(`notes-sidebar-group-${group.id}`, String(newState));
  };

  const paddingLeft = `${level * 16 + 8}px`;
  const label = group.label || 'Group';

  return (
    <div className="select-none">
      <div className="group relative flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors">
        <button
          onClick={toggleExpanded}
          className="flex items-center gap-2 flex-1 min-w-0 text-secondary-700 dark:text-secondary-300 text-sm"
          style={{ paddingLeft }}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-secondary-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-secondary-400 flex-shrink-0" />
          )}
          <GroupIcon className="h-4 w-4 flex-shrink-0" style={{ color: group.color }} />
          <span className="truncate font-medium">{label}</span>
        </button>

        <span className="text-xs text-secondary-400">{notes.length}</span>
      </div>

      {isExpanded && notes.length > 0 && (
        <div className="mt-0.5">
          {notes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              level={level + 1}
              onClick={() => onNoteClick(note)}
              onRename={() => onNoteRename(note)}
              onDelete={() => onNoteDelete(note.id)}
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
  onRename,
  onDelete,
}: {
  note: Note;
  level?: number;
  onClick: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
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

  // Level 0 (root) uses 8px (px-2). Nested levels use indentation.
  const paddingLeft = level === 0 ? '8px' : `${level * 16 + 8}px`;
  const noteIconStyle = note.color ? { color: note.color } : undefined;

  return (
    <div className="group relative flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors">
      <button
        onClick={onClick}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={`flex items-center gap-2 flex-1 min-w-0 text-secondary-600 dark:text-secondary-400 text-sm cursor-move text-left ${isDragging ? 'opacity-50' : ''
          }`}
        style={{ paddingLeft }}
      >
        <FileText className="h-4 w-4 flex-shrink-0" style={noteIconStyle} />
        <span className="truncate">{note.title || 'Untitled'}</span>
      </button>

      {/* Menu button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-opacity"
        aria-label="Note menu"
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

// Canvas list item component
function CanvasItem({
  canvas,
  notes,
  groups,
  level = 0,
  onClick,
  onRename,
  onDelete,
  onAddNote,
  onNoteDrop,
  onNoteClick,
  onNoteRename,
  onNoteDelete,
}: {
  canvas: Canvas;
  notes: Note[];
  groups: CanvasGroup[];
  level?: number;
  onClick: () => void;
  onRename: () => void;
  onDelete: () => void;
  onAddNote: (canvasId: string) => void;
  onNoteDrop: (noteId: string, canvasId: string) => void;
  onNoteClick: (note: Note) => void;
  onNoteRename: (note: Note) => void;
  onNoteDelete: (noteId: string) => void;
}) {
  const getExpandedState = () => {
    const saved = localStorage.getItem(`notes-sidebar-canvas-${canvas.id}`);
    return saved !== null ? saved === 'true' : false;
  };

  const [isExpanded, setIsExpanded] = useState(getExpandedState);
  const [showMenu, setShowMenu] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const accentColor = useThemeStore((state) => state.accentColor);

  const { groupsWithNotes, notesByGroup, ungroupedNotes } = useMemo(() => {
    const nextNotesByGroup: Record<string, Note[]> = {};
    groups.forEach((group) => {
      nextNotesByGroup[group.id] = [];
    });

    const nextUngrouped: Note[] = [];
    notes.forEach((note) => {
      if (note.group_id && nextNotesByGroup[note.group_id]) {
        nextNotesByGroup[note.group_id].push(note);
        return;
      }
      nextUngrouped.push(note);
    });

    const nextGroupsWithNotes = groups.filter(
      (group) => nextNotesByGroup[group.id]?.length
    );

    return {
      groupsWithNotes: nextGroupsWithNotes,
      notesByGroup: nextNotesByGroup,
      ungroupedNotes: nextUngrouped,
    };
  }, [groups, notes]);

  const toggleExpanded = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    localStorage.setItem(`notes-sidebar-canvas-${canvas.id}`, String(newState));
  };

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
      onNoteDrop(noteId, canvas.id);
    }
  };

  return (
    <div className="select-none">
      {/* Canvas header */}
      <div
        className={`group relative flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${isDragOver
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
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded();
            }}
            className="text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 flex-shrink-0" />
            )}
          </button>

          <button
            onClick={onClick}
            className="flex items-center gap-2 flex-1 min-w-0 text-secondary-600 dark:text-secondary-400 text-sm"
          >
            <Layout className="h-4 w-4 flex-shrink-0" style={{ color: accentColor }} />
            <span className="truncate">{canvas.name}</span>
          </button>
        </div>

        <span className="text-xs text-secondary-400">{notes.length}</span>

        {/* Quick add note button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddNote(canvas.id);
          }}
          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-opacity"
          style={{ color: accentColor }}
          aria-label="Add note to canvas"
          title="Add note to canvas"
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

      {/* Canvas contents */}
      {isExpanded && notes.length > 0 && (
        <div className="mt-0.5">
          {groupsWithNotes.map((group) => (
            <GroupItem
              key={group.id}
              group={group}
              notes={notesByGroup[group.id] || []}
              level={level + 1}
              onNoteClick={onNoteClick}
              onNoteRename={onNoteRename}
              onNoteDelete={onNoteDelete}
            />
          ))}
          {ungroupedNotes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              level={level + 1}
              onClick={() => onNoteClick(note)}
              onRename={() => onNoteRename(note)}
              onDelete={() => onNoteDelete(note.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface NotesLibrarySidebarProps {
  onClose?: () => void;
}

export function NotesLibrarySidebar({ onClose }: NotesLibrarySidebarProps) {
  const { addTab, findTabByEntity, closeTab } = useWorkspaceStore();
  const {
    libraryNotes,
    fetchLibraryNotes,
    createNote,
    updateNoteContent,
    deleteNote,
    groups: activeCanvasGroups,
    currentCanvasId,
    loading: canvasLoading,
  } = useNotesStore();

  // Use combined hook for parallel data fetching (improves load time)
  const {
    canvases,
    folders,
    groups: canvasGroups,
    loading: libraryDataLoading,
    createCanvas,
    updateCanvas,
    deleteCanvas,
    createFolder,
    updateFolder,
    deleteFolder,
  } = useNotesLibraryData();

  const accentColor = useThemeStore((state) => state.accentColor);

  const [renameCanvasId, setRenameCanvasId] = useState<string | null>(null);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameNoteId, setRenameNoteId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    void fetchLibraryNotes();
  }, [fetchLibraryNotes]);

  const { rootNotes, notesByFolder, notesByCanvas } = organizeLibraryItems(libraryNotes, folders, canvases);
  const groupsByCanvasId = useMemo(() => {
    const map: Record<string, CanvasGroup[]> = {};
    canvasGroups.forEach((group) => {
      if (!group.canvas_id) return;
      if (!map[group.canvas_id]) {
        map[group.canvas_id] = [];
      }
      map[group.canvas_id].push(group);
    });
    if (currentCanvasId && !canvasLoading) {
      map[currentCanvasId] = activeCanvasGroups;
    }
    return map;
  }, [activeCanvasGroups, canvasGroups, canvasLoading, currentCanvasId]);

  const handleNoteClick = (note: Note) => {
    addTab('note', note.id, note.title || 'Untitled');
  };

  const handleCanvasClick = (canvas: Canvas) => {
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
      // Unlink notes first to prevent deletion if DB cascades
      // Use Supabase directly to ensure unlinking happened before folder deletion
      const { user } = useAuthStore.getState();
      if (user) {
        // We can't batch update easily via hook, so we do it via supabase client
        // Optimistically we know which notes are in folder
        const notesInFolder = libraryNotes.filter(n => n.folder_id === folderId);
        if (notesInFolder.length > 0) {
          await supabase
            .from('notes')
            .update({ folder_id: null })
            .in('id', notesInFolder.map(n => n.id))
            .eq('user_id', user.id);
        }
      }

      await deleteFolder(folderId);
      await fetchLibraryNotes();
    }
  };

  const handleAddNoteToFolder = async (folderId: string) => {
    const noteId = await createNote({ canvasId: null, folderId, title: 'New Note' });
    if (noteId) {
      addTab('note', noteId, 'New Note');
    }
  };

  const handleAddNoteToCanvas = async (canvasId: string) => {
    const noteId = await createNote({ canvasId, title: 'New Note' });
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
        .update({
          folder_id: folderId,
          canvas_id: null, // Move out of canvas if it was in one
          updated_at: new Date().toISOString()
        })
        .eq('id', noteId)
        .eq('user_id', user.id);

      if (error) throw error;
      await fetchLibraryNotes();
    } catch (error) {
      console.error('Failed to move note to folder:', error);
    }
  };

  const handleNoteDropToCanvas = async (noteId: string, canvasId: string) => {
    const note = libraryNotes.find((n) => n.id === noteId);
    if (!note) return;

    const { user } = useAuthStore.getState();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notes')
        .update({
          canvas_id: canvasId,
          folder_id: null, // Move out of folder if it was in one
          updated_at: new Date().toISOString()
        })
        .eq('id', noteId)
        .eq('user_id', user.id);

      if (error) throw error;
      await fetchLibraryNotes();
    } catch (error) {
      console.error('Failed to move note to canvas:', error);
    }
  };

  const handleDeleteCanvas = async (id: string) => {
    if (window.confirm('Delete this canvas? Notes inside will be moved to root.')) {
      // Unlink notes first
      const { user } = useAuthStore.getState();
      if (user) {
        const notesInCanvas = libraryNotes.filter(n => n.canvas_id === id);
        if (notesInCanvas.length > 0) {
          await supabase
            .from('notes')
            .update({ canvas_id: null })
            .in('id', notesInCanvas.map(n => n.id))
            .eq('user_id', user.id);
        }
      }

      await deleteCanvas(id);
      await fetchLibraryNotes();
    }
  };

  const handleRenameCanvas = (canvas: Canvas) => {
    setRenameCanvasId(canvas.id);
    setRenameValue(canvas.name);
  };

  const handleRenameNote = (note: Note) => {
    setRenameNoteId(note.id);
    setRenameValue(note.title || 'Untitled');
  };

  const handleDeleteNote = async (noteId: string) => {
    if (window.confirm('Delete this note? This cannot be undone.')) {
      await deleteNote(noteId);
      // Close tab if open
      const tab = findTabByEntity('note', noteId);
      if (tab) {
        closeTab(tab.id);
      }
    }
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
    if (renameNoteId && renameValue.trim()) {
      const note = libraryNotes.find(n => n.id === renameNoteId);
      if (note) {
        await updateNoteContent(renameNoteId, renameValue.trim(), note.content);
      }
      setRenameNoteId(null);
    }
    setRenameValue('');
  };

  const isLoading = libraryDataLoading;

  // Unified sorted list of items
  const sortedItems = [
    ...folders
      .filter((f) => !f.parent_id)
      .map((f) => ({ type: 'folder' as const, data: f, created_at: f.created_at })),
    ...rootNotes.map((n) => ({
      type: 'note' as const,
      data: n,
      created_at: n.created_at,
    })),
    ...canvases.map((c) => ({
      type: 'canvas' as const,
      data: c,
      created_at: c.created_at,
    })),
  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <>
      <div className="w-full h-full border-b lg:border-b-0 flex flex-col overflow-hidden bg-white dark:bg-secondary-900 lg:border-r border-secondary-200 dark:border-secondary-800">
        {/* Header - Fixed Height 60px */}
        <div className="h-[60px] flex items-center justify-between px-4 border-b border-secondary-200 dark:border-secondary-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            {onClose && (
              <button
                onClick={onClose}
                className="lg:hidden p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors text-secondary-600 dark:text-secondary-300 min-h-touch min-w-touch"
                aria-label="Close notes library"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Notes</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => void handleCreateFolder()}
              className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
              style={{ color: accentColor }}
              aria-label="Create folder"
              title="New Folder"
            >
              <FolderPlus className="h-4 w-4" />
            </button>
            <button
              onClick={() => void handleCreateNote()}
              className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
              style={{ color: accentColor }}
              aria-label="Create note"
              title="New Note"
            >
              <FileText className="h-4 w-4" />
            </button>
            <button
              onClick={() => void handleCreateCanvas()}
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
        <div className="flex-1 overflow-y-auto p-2 pb-20">
          {sortedItems.map((item) => {
            if (item.type === 'folder') {
              return (
                <FolderItem
                  key={item.data.id}
                  folder={item.data}
                  notes={notesByFolder[item.data.id] || []}
                  onNoteClick={handleNoteClick}
                  onRename={handleRenameFolder}
                  onDelete={(folderId) => void handleDeleteFolder(folderId)}
                  onAddNote={(folderId) => void handleAddNoteToFolder(folderId)}
                  onNoteDrop={(noteId, folderId) => void handleNoteDrop(noteId, folderId)}
                  onNoteRename={handleRenameNote}
                  onNoteDelete={(noteId) => void handleDeleteNote(noteId)}
                />
              );
            }
            if (item.type === 'note') {
              return (
                <NoteItem
                  key={item.data.id}
                  note={item.data}
                  level={0}
                  onClick={() => handleNoteClick(item.data)}
                  onRename={() => handleRenameNote(item.data)}
                  onDelete={() => void handleDeleteNote(item.data.id)}
                />
              );
            }
            if (item.type === 'canvas') {
              return (
                <CanvasItem
                  key={item.data.id}
                  canvas={item.data}
                  notes={notesByCanvas[item.data.id] || []}
                  groups={groupsByCanvasId[item.data.id] || []}
                  onClick={() => handleCanvasClick(item.data)}
                  onRename={() => handleRenameCanvas(item.data)}
                  onDelete={() => void handleDeleteCanvas(item.data.id)}
                  onAddNote={(canvasId) => void handleAddNoteToCanvas(canvasId)}
                  onNoteDrop={(noteId, canvasId) => void handleNoteDropToCanvas(noteId, canvasId)}
                  onNoteClick={handleNoteClick}
                  onNoteRename={handleRenameNote}
                  onNoteDelete={(noteId) => void handleDeleteNote(noteId)}
                />
              );
            }
            return null;
          })}

          {/* Empty state */}
          {sortedItems.length === 0 && (
            <div className="text-center py-8 text-secondary-500 dark:text-secondary-400">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notes or canvases yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Rename Modal */}
      {(renameCanvasId || renameFolderId || renameNoteId) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
              {renameCanvasId ? 'Rename Canvas' : renameFolderId ? 'Rename Folder' : 'Rename Note'}
            </h3>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void handleRenameSubmit();
                }
                if (e.key === 'Escape') {
                  setRenameCanvasId(null);
                  setRenameFolderId(null);
                  setRenameNoteId(null);
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
                  setRenameNoteId(null);
                  setRenameValue('');
                }}
                className="px-4 py-2 text-sm font-medium text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleRenameSubmit()}
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
