import { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, FileText, Layout, MoreVertical, Edit2, Trash2, Folder, FolderPlus, ChevronRight, ChevronDown, ArrowLeft } from 'lucide-react';
import { Button, Card, LoadingSpinner } from '@/components/ui';
import { useThemeStore } from '@/stores/themeStore';
import { useAuthStore } from '@/stores/authStore';
import { useNotesStore } from '@/stores/notesStore';
import { useCanvases, useFolders } from '../hooks';
import { supabase } from '@/lib/supabase';
import type { Note, Canvas, Folder as FolderType } from '@/lib/types';

type FilterType = 'all' | 'notes' | 'canvases' | 'folders';

type LibraryItem =
    | { type: 'note'; data: Note }
    | { type: 'canvas'; data: Canvas }
    | { type: 'folder'; data: FolderType };

interface MobileNotesViewProps {
    onNoteClick: (noteId: string) => void;
    onCanvasClick: (canvasId: string) => void;
}

export function MobileNotesView({ onNoteClick, onCanvasClick }: MobileNotesViewProps) {
    const accentColor = useThemeStore((state) => state.accentColor);
    const { libraryNotes, fetchLibraryNotes, createNote, deleteNote } = useNotesStore();
    const { canvases, loading: canvasesLoading, createCanvas, deleteCanvas } = useCanvases();
    const { folders, loading: foldersLoading, createFolder, deleteFolder } = useFolders();

    const [filter, setFilter] = useState<FilterType>('all');
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [notesLoading, setNotesLoading] = useState(true);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

    // Fetch notes on mount
    useEffect(() => {
        const loadNotes = async () => {
            setNotesLoading(true);
            await fetchLibraryNotes();
            setNotesLoading(false);
        };
        void loadNotes();
    }, [fetchLibraryNotes]);

    // Get current folder
    const currentFolder = useMemo(() => {
        if (!currentFolderId) return null;
        return folders.find((f) => f.id === currentFolderId) || null;
    }, [currentFolderId, folders]);

    // Get folder breadcrumb path
    const folderPath = useMemo(() => {
        if (!currentFolderId) return [];
        const path: FolderType[] = [];
        let current = folders.find((f) => f.id === currentFolderId);
        while (current) {
            path.unshift(current);
            const parentId = current.parent_id;
            current = parentId ? folders.find((f) => f.id === parentId) : undefined;
        }
        return path;
    }, [currentFolderId, folders]);

    // Notes in current folder (or root if no folder selected)
    const notesInCurrentFolder = useMemo(() => {
        return libraryNotes.filter((note) => {
            if (!note.canvas_id) {
                if (currentFolderId) {
                    return note.folder_id === currentFolderId;
                }
                return !note.folder_id;
            }
            return false;
        });
    }, [libraryNotes, currentFolderId]);

    // Subfolders of current folder
    const subfoldersInCurrentFolder = useMemo(() => {
        return folders.filter((folder) => {
            if (currentFolderId) {
                return folder.parent_id === currentFolderId;
            }
            return !folder.parent_id;
        });
    }, [folders, currentFolderId]);

    // Standalone notes (for 'all' view - notes not on canvas and at root level)
    const standaloneNotes = useMemo(() => {
        return libraryNotes.filter((note) => !note.canvas_id);
    }, [libraryNotes]);

    const loading = notesLoading || canvasesLoading || foldersLoading;

    // Filter counts
    const counts = useMemo(() => ({
        all: standaloneNotes.length + canvases.length + folders.length,
        notes: standaloneNotes.length,
        canvases: canvases.length,
        folders: folders.length,
    }), [standaloneNotes, canvases, folders]);

    // Combined and sorted items based on filter and current folder
    const items = useMemo(() => {
        const result: LibraryItem[] = [];

        if (filter === 'folders' || currentFolderId) {
            // Show folder contents
            result.push(...subfoldersInCurrentFolder.map((folder) => ({ type: 'folder' as const, data: folder })));
            result.push(...notesInCurrentFolder.map((note) => ({ type: 'note' as const, data: note })));
        } else {
            // Standard filtering
            if (filter === 'all') {
                result.push(...folders.filter(f => !f.parent_id).map((folder) => ({ type: 'folder' as const, data: folder })));
                result.push(...libraryNotes.filter(n => !n.canvas_id && !n.folder_id).map((note) => ({ type: 'note' as const, data: note })));
                result.push(...canvases.map((canvas) => ({ type: 'canvas' as const, data: canvas })));
            } else if (filter === 'notes') {
                result.push(...standaloneNotes.map((note) => ({ type: 'note' as const, data: note })));
            } else if (filter === 'canvases') {
                result.push(...canvases.map((canvas) => ({ type: 'canvas' as const, data: canvas })));
            }
        }

        // Sort: folders first, then by updated_at descending
        const getTimestamp = (item: Note | Canvas | FolderType) => {
            const updatedAt = 'updated_at' in item ? item.updated_at : undefined;
            const fallbackDate = updatedAt || item.created_at;
            return new Date(fallbackDate).getTime();
        };

        result.sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            const aDate = getTimestamp(a.data);
            const bDate = getTimestamp(b.data);
            return bDate - aDate;
        });

        return result;
    }, [filter, currentFolderId, subfoldersInCurrentFolder, notesInCurrentFolder, folders, libraryNotes, standaloneNotes, canvases]);

    // Handlers
    const handleAddNote = async () => {
        setShowAddMenu(false);
        const noteId = await createNote({
            canvasId: null,
            folderId: currentFolderId,
            title: 'New Note'
        });
        if (noteId) {
            onNoteClick(noteId);
        }
    };

    const handleAddCanvas = async () => {
        setShowAddMenu(false);
        const canvas = await createCanvas('New Canvas');
        if (canvas) {
            onCanvasClick(canvas.id);
        }
    };

    const handleAddFolder = async () => {
        setShowAddMenu(false);
        await createFolder('New Folder', currentFolderId);
    };

    const handleDeleteNote = async (noteId: string) => {
        if (window.confirm('Delete this note?')) {
            await deleteNote(noteId);
        }
        setActiveMenu(null);
    };

    const handleDeleteCanvas = async (canvasId: string) => {
        if (window.confirm('Delete this canvas and all its contents?')) {
            await deleteCanvas(canvasId);
        }
        setActiveMenu(null);
    };

    const handleDeleteFolder = async (folderId: string) => {
        if (window.confirm('Delete this folder? Notes inside will be moved to root.')) {
            // Unlink notes from this folder before deletion
            const { user } = useAuthStore.getState();
            if (user) {
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
            await fetchLibraryNotes(); // Refresh to show unlinked notes
        }
        setActiveMenu(null);
    };

    const handleFolderClick = useCallback((folderId: string) => {
        setCurrentFolderId(folderId);
        setFilter('folders');
    }, []);

    const handleBackClick = useCallback(() => {
        if (currentFolder?.parent_id) {
            setCurrentFolderId(currentFolder.parent_id);
        } else {
            setCurrentFolderId(null);
            setFilter('all');
        }
    }, [currentFolder]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    };

    const getItemDate = (item: Note | Canvas | FolderType) => {
        const updatedAt = 'updated_at' in item ? item.updated_at : undefined;
        return updatedAt || item.created_at;
    };

    const getItemTitle = (item: LibraryItem) => {
        if (item.type === 'note') return item.data.title || 'Untitled';
        if (item.type === 'canvas') return item.data.name || 'Untitled Canvas';
        if (item.type === 'folder') return item.data.name || 'Untitled Folder';
        return 'Untitled';
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {currentFolderId && (
                        <button
                            onClick={handleBackClick}
                            className="p-2 -ml-2 rounded-lg text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                    )}
                    <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">
                        {currentFolder ? currentFolder.name : 'Notes'}
                    </h1>
                </div>
                {currentFolderId ? (
                    /* In folder view: Add button creates note immediately */
                    <Button size="sm" onClick={() => void handleAddNote()} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add
                    </Button>
                ) : (
                    /* In library view: Add button opens dropdown */
                    <div className="relative">
                        <Button size="sm" onClick={() => setShowAddMenu(!showAddMenu)} className="gap-2">
                            <ChevronDown
                                className={`h-4 w-4 transition-transform duration-200 ${showAddMenu ? 'rotate-180' : ''}`}
                            />
                            Add
                        </Button>

                        {showAddMenu && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowAddMenu(false)} />
                                <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-secondary-800 rounded-lg shadow-lg border border-secondary-200 dark:border-secondary-700 py-1 min-w-[140px]">
                                    <button
                                        onClick={() => void handleAddNote()}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-secondary-700 dark:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-700"
                                    >
                                        <FileText className="h-4 w-4" />
                                        New Note
                                    </button>
                                    <button
                                        onClick={() => void handleAddFolder()}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-secondary-700 dark:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-700"
                                    >
                                        <FolderPlus className="h-4 w-4" />
                                        New Folder
                                    </button>
                                    <button
                                        onClick={() => void handleAddCanvas()}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-secondary-700 dark:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-700"
                                    >
                                        <Layout className="h-4 w-4" />
                                        New Canvas
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Breadcrumb Path (when in a folder) */}
            {folderPath.length > 0 && (
                <div className="flex items-center gap-1 text-sm text-secondary-500 dark:text-secondary-400 overflow-x-auto">
                    <button
                        onClick={() => { setCurrentFolderId(null); setFilter('all'); }}
                        className="hover:text-secondary-700 dark:hover:text-secondary-200"
                    >
                        Notes
                    </button>
                    {folderPath.map((folder, index) => (
                        <span key={folder.id} className="flex items-center gap-1">
                            <ChevronRight className="h-3 w-3" />
                            <button
                                onClick={() => setCurrentFolderId(folder.id)}
                                className={index === folderPath.length - 1 ? 'font-medium text-secondary-900 dark:text-white' : 'hover:text-secondary-700 dark:hover:text-secondary-200'}
                            >
                                {folder.name}
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* Filter Tabs (only show when not in a folder) */}
            {!currentFolderId && (
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                    {(['all', 'notes', 'canvases', 'folders'] as FilterType[]).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`
                px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0
                ${filter === f
                                    ? 'text-white'
                                    : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700'
                                }
              `}
                            style={filter === f ? { backgroundColor: accentColor } : undefined}
                        >
                            {f === 'all' ? 'All' : f === 'notes' ? 'Notes' : f === 'canvases' ? 'Canvases' : 'Folders'} ({counts[f]})
                        </button>
                    ))}
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <LoadingSpinner size="md" />
                </div>
            )}

            {/* Empty State */}
            {!loading && items.length === 0 && (
                <Card variant="outlined" className="text-center py-8">
                    <div className="text-secondary-400 dark:text-secondary-500 mb-3">
                        {currentFolderId ? (
                            <Folder className="h-10 w-10 mx-auto mb-3" />
                        ) : filter === 'folders' ? (
                            <Folder className="h-10 w-10 mx-auto mb-3" />
                        ) : filter === 'canvases' ? (
                            <Layout className="h-10 w-10 mx-auto mb-3" />
                        ) : (
                            <FileText className="h-10 w-10 mx-auto mb-3" />
                        )}
                    </div>
                    <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-1">
                        {currentFolderId ? 'This folder is empty' :
                            filter === 'all' ? 'No notes, canvases, or folders yet' :
                                filter === 'notes' ? 'No notes yet' :
                                    filter === 'canvases' ? 'No canvases yet' : 'No folders yet'}
                    </p>
                    <p className="text-xs text-secondary-400 dark:text-secondary-500">
                        Tap the Add button to get started
                    </p>
                </Card>
            )}

            {/* Items List */}
            {!loading && items.length > 0 && (
                <div className="space-y-2">
                    {items.map((item) => {
                        const id = item.data.id;
                        const title = getItemTitle(item);
                        const updatedAt = getItemDate(item.data);

                        const handleClick = () => {
                            if (item.type === 'folder') {
                                handleFolderClick(id);
                            } else if (item.type === 'note') {
                                onNoteClick(id);
                            } else {
                                onCanvasClick(id);
                            }
                        };

                        const handleDelete = () => {
                            if (item.type === 'folder') {
                                void handleDeleteFolder(id);
                            } else if (item.type === 'note') {
                                void handleDeleteNote(id);
                            } else {
                                void handleDeleteCanvas(id);
                            }
                        };

                        return (
                            <Card key={id} variant="outlined" padding="none" className="relative">
                                <button
                                    onClick={handleClick}
                                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition-colors"
                                >
                                    <div
                                        className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                                        style={{ backgroundColor: item.type === 'folder' ? `${accentColor}10` : `${accentColor}20` }}
                                    >
                                        {item.type === 'folder' ? (
                                            <Folder className="h-5 w-5" style={{ color: accentColor }} />
                                        ) : item.type === 'note' ? (
                                            <FileText className="h-5 w-5" style={{ color: accentColor }} />
                                        ) : (
                                            <Layout className="h-5 w-5" style={{ color: accentColor }} />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-secondary-900 dark:text-white truncate">{title}</p>
                                        <p className="text-xs text-secondary-500 dark:text-secondary-400">
                                            {item.type === 'folder' ? 'Folder' : item.type === 'note' ? 'Note' : 'Canvas'} • {formatDate(updatedAt)}
                                        </p>
                                    </div>

                                </button>

                                {/* More Menu Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenu(activeMenu === id ? null : id);
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700"
                                >
                                    <MoreVertical className="h-5 w-5" />
                                </button>

                                {/* Context Menu */}
                                {activeMenu === id && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                                        <div className="absolute right-2 top-12 z-50 bg-white dark:bg-secondary-800 rounded-lg shadow-lg border border-secondary-200 dark:border-secondary-700 py-1 min-w-[120px]">
                                            {item.type !== 'folder' && (
                                                <button
                                                    onClick={() => {
                                                        setActiveMenu(null);
                                                        handleClick();
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-secondary-700 dark:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-700"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                    Edit
                                                </button>
                                            )}
                                            <button
                                                onClick={handleDelete}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Delete
                                            </button>
                                        </div>
                                    </>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Summary */}
            {!loading && items.length > 0 && !currentFolderId && (
                <div className="text-center">
                    <p className="text-xs text-secondary-400 dark:text-secondary-500">
                        {counts.folders} {counts.folders === 1 ? 'folder' : 'folders'} • {counts.notes} {counts.notes === 1 ? 'note' : 'notes'} • {counts.canvases} {counts.canvases === 1 ? 'canvas' : 'canvases'}
                    </p>
                </div>
            )}
        </div>
    );
}

export default MobileNotesView;
