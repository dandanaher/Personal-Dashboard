import { create } from 'zustand';
import { temporal } from 'zundo';
import type { PostgrestError } from '@supabase/supabase-js';
import {
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
  Connection,
  NodeChange,
  EdgeChange,
} from 'reactflow';
import imageCompression from 'browser-image-compression';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import type { Note, NoteEdge, CanvasGroup, NoteEdgeUpdate } from '@/lib/types';

// Per-key debounce utility
function debounceMap(
  delay: number
): (key: string, fn: () => void | Promise<void>) => void {
  const timeouts = new Map<string, ReturnType<typeof setTimeout>>();
  return (key: string, fn: () => void | Promise<void>) => {
    if (timeouts.has(key)) {
      clearTimeout(timeouts.get(key));
    }
    const timeoutId = setTimeout(() => {
      timeouts.delete(key);
      void fn();
    }, delay);
    timeouts.set(key, timeoutId);
  };
}

const positionUpdateDebouncer = debounceMap(300);
const sizeUpdateDebouncer = debounceMap(300);
const groupPositionUpdateDebouncer = debounceMap(300);
const groupSizeUpdateDebouncer = debounceMap(300);

// Note data stored in ReactFlow node
export interface NoteNodeData {
  id: string;
  title: string;
  content: string;
  color?: string;
  type?: 'text' | 'link' | 'image';
  onDoubleClick: (noteId: string) => void;
}

interface GroupNodeData {
  label: string | null;
  color: string;
}

interface NotesEdgeData {
  label?: string | null;
  color?: string | null;
}

type NotesNodeData = NoteNodeData | GroupNodeData;
type NotesNode = Node<NotesNodeData>;
type NoteCanvasNode = Node<NoteNodeData>;
type GroupCanvasNode = Node<GroupNodeData>;
type NotesEdge = Edge<NotesEdgeData>;

interface NotesState {
  nodes: NotesNode[];
  edges: NotesEdge[];
  groups: CanvasGroup[];
  selectedNoteId: string | null;
  loading: boolean;
  error: string | null;
  /** Currently active canvas ID (null for library view) */
  currentCanvasId: string | null;
  /** All notes for library sidebar (notes without canvas_id) */
  libraryNotes: Note[];
}

interface CreateNoteOptions {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  canvasId?: string | null;
  folderId?: string | null;
  groupId?: string | null;
  title?: string;
  type?: 'text' | 'link' | 'image';
  content?: string;
}

interface NotesActions {
  /** @deprecated Use fetchCanvasNotes or fetchLibraryNotes instead */
  fetchNotes: () => Promise<void>;
  /** Fetch notes for a specific canvas */
  fetchCanvasNotes: (canvasId: string) => Promise<void>;
  /** Fetch all notes without a canvas (for library sidebar) */
  fetchLibraryNotes: () => Promise<void>;
  /** Fetch a single note by ID */
  fetchNote: (noteId: string) => Promise<Note | null>;
  createNote: (options?: CreateNoteOptions) => Promise<string | null>;
  updateNotePosition: (noteId: string, x: number, y: number) => void;
  updateNoteSize: (noteId: string, width: number, height: number) => void;
  updateNoteContent: (noteId: string, title: string, content: string) => Promise<void>;
  updateNoteColor: (noteId: string, color: string) => Promise<void>;
  updateEdge: (edgeId: string, updates: { label?: string; color?: string }) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  connectNotes: (connection: Connection) => Promise<void>;
  deleteEdge: (edgeId: string) => Promise<void>;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  setSelectedNoteId: (noteId: string | null) => void;
  getSelectedNote: () => Note | null;
  /** Set the current canvas context */
  setCurrentCanvasId: (canvasId: string | null) => void;
  /** Clear canvas state when switching away */
  clearCanvasState: () => void;

  // Group actions
  createGroup: (bounds: { x: number, y: number, width: number, height: number }) => Promise<void>;
  updateGroup: (id: string, updates: Partial<CanvasGroup>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;

  // Dynamic grouping logic
  handleNoteDragEnd: (nodeId: string) => Promise<void>;
  recalculateGroupMembership: (groupId: string) => Promise<void>;

  // Image upload
  uploadImage: (file: File) => Promise<string>;
}

type NotesStore = NotesState & NotesActions;

// Helper to checking if a note is inside a group
function isNodeInsideGroup(
  noteRect: { x: number; y: number; width: number; height: number },
  groupRect: { x: number; y: number; width: number; height: number }
) {
  const noteCenter = {
    x: noteRect.x + noteRect.width / 2,
    y: noteRect.y + noteRect.height / 2,
  };

  return (
    noteCenter.x >= groupRect.x &&
    noteCenter.x <= groupRect.x + groupRect.width &&
    noteCenter.y >= groupRect.y &&
    noteCenter.y <= groupRect.y + groupRect.height
  );
}

const NOTE_NODE_TYPES = new Set(['noteNode', 'linkNode', 'imageNode']);

function isNoteNode(node: NotesNode): node is NoteCanvasNode {
  return NOTE_NODE_TYPES.has(node.type ?? '');
}

function isGroupNode(node: NotesNode): node is GroupCanvasNode {
  return node.type === 'groupNode';
}

// Convert database note to ReactFlow node
function noteToNode(note: Note, onDoubleClick: (noteId: string) => void): NoteCanvasNode {
  let nodeType: string;
  if (note.type === 'link') {
    nodeType = 'linkNode';
  } else if (note.type === 'image') {
    nodeType = 'imageNode';
  } else {
    nodeType = 'noteNode';
  }
  return {
    id: note.id,
    type: nodeType,
    position: { x: note.position_x, y: note.position_y },
    style: {
      width: note.width ?? 256,
      height: note.height ?? undefined,
    },
    data: {
      id: note.id,
      title: note.title,
      content: note.content,
      color: note.color,
      type: note.type,
      onDoubleClick,
    },
  };
}

// Convert database edge to ReactFlow edge
function noteEdgeToEdge(noteEdge: NoteEdge): NotesEdge | null {
  const sourceId = noteEdge.source_note_id ?? noteEdge.source_group_id;
  const targetId = noteEdge.target_note_id ?? noteEdge.target_group_id;
  if (!sourceId || !targetId) return null;

  const edge: NotesEdge = {
    id: noteEdge.id,
    source: sourceId,
    target: targetId,
    sourceHandle: noteEdge.source_handle ?? undefined,
    targetHandle: noteEdge.target_handle ?? undefined,
    type: 'floatingEdge',
    animated: true,
    data: {
      label: noteEdge.label ?? undefined,
      color: noteEdge.color ?? undefined,
    },
  };

  if (noteEdge.color) {
    edge.style = { stroke: noteEdge.color, strokeWidth: 3 };
  }

  return edge;
}

export const useNotesStore = create<NotesStore>()(
  temporal(
    (set, get) => ({
      // State
      nodes: [],
      edges: [],
      groups: [],
      selectedNoteId: null,
      loading: false,
      error: null,
      currentCanvasId: null,
      libraryNotes: [],

      // Actions
      setCurrentCanvasId: (canvasId: string | null) => {
        set({ currentCanvasId: canvasId });
      },

      clearCanvasState: () => {
        set({ nodes: [], edges: [], groups: [], currentCanvasId: null });
      },

      fetchCanvasNotes: async (canvasId: string) => {
        const user = useAuthStore.getState().user;
        if (!user) return;

        // Pause history tracking during data load to prevent false history entries
        useNotesStore.temporal.getState().pause();

        set({ loading: true, error: null, currentCanvasId: canvasId });

        try {
          // Fetch notes
          const {
            data: notes,
            error: notesError,
          }: { data: Note[] | null; error: PostgrestError | null } = await supabase
            .from('notes')
            .select('*')
            .eq('user_id', user.id)
            .eq('canvas_id', canvasId)
            .order('created_at', { ascending: true });

          if (notesError) throw notesError;

          // Fetch groups
          const {
            data: groups,
            error: groupsError,
          }: { data: CanvasGroup[] | null; error: PostgrestError | null } = await supabase
            .from('canvas_groups')
            .select('*')
            .eq('user_id', user.id)
            .eq('canvas_id', canvasId);

          if (groupsError) throw groupsError;

          // Fetch edges - fetch all for user to support group/note connections
          // We do this to ensure we catch edges between groups and notes even if filtering is complex
          const {
            data: edgesData,
            error: edgesError,
          }: { data: NoteEdge[] | null; error: PostgrestError | null } = await supabase
            .from('note_edges')
            .select('*')
            .eq('user_id', user.id);

          if (edgesError) throw edgesError;
          const noteEdges = edgesData ?? [];

          const onDoubleClick = (noteId: string) => {
            get().setSelectedNoteId(noteId);
          };

          // Process nodes
          const flowNodes = (notes ?? []).map((note) => {
            const node = noteToNode(note, onDoubleClick);
            node.zIndex = 10; // Ensure notes are above groups

            if (note.group_id) {
              const parentGroup = groups?.find((group) => group.id === note.group_id);
              if (parentGroup) {
                node.parentNode = note.group_id;
                // Calculate relative position
                node.position = {
                  x: note.position_x - parentGroup.position_x,
                  y: note.position_y - parentGroup.position_y,
                };
              }
            }
            return node;
          });

          const groupNodes: GroupCanvasNode[] = (groups ?? []).map((group) => ({
            id: group.id,
            type: 'groupNode',
            position: { x: group.position_x, y: group.position_y },
            style: { width: group.width, height: group.height },
            data: { label: group.label, color: group.color },
            zIndex: -1,
          }));

          const edges = noteEdges
            .map((edge) => noteEdgeToEdge(edge))
            .filter((edge): edge is NotesEdge => edge !== null);

          set({
            nodes: [...groupNodes, ...flowNodes],
            edges,
            groups: groups ?? [],
            loading: false,
          });

          // Clear any stale history - resume will happen in CanvasViewInner after mount
          useNotesStore.temporal.getState().clear();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch canvas notes',
            loading: false,
          });
          // Clear history on error - resume will happen in CanvasViewInner
          useNotesStore.temporal.getState().clear();
        }
      },

      fetchLibraryNotes: async () => {
        const user = useAuthStore.getState().user;
        if (!user) return;

        try {
          // Fetch all notes (for library sidebar display)
          const {
            data: notes,
            error: notesError,
          }: { data: Note[] | null; error: PostgrestError | null } = await supabase
            .from('notes')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });

          if (notesError) throw notesError;

          set({ libraryNotes: notes ?? [] });
        } catch (error) {
          console.error('Failed to fetch library notes:', error);
        }
      },

      fetchNote: async (noteId: string) => {
        const user = useAuthStore.getState().user;
        if (!user) return null;

        try {
          const {
            data,
            error,
          }: { data: Note | null; error: PostgrestError | null } = await supabase
            .from('notes')
            .select('*')
            .eq('id', noteId)
            .eq('user_id', user.id)
            .single();

          if (error) throw error;
          return data ?? null;
        } catch (error) {
          console.error('Failed to fetch note:', error);
          return null;
        }
      },

      fetchNotes: async () => {
        const user = useAuthStore.getState().user;
        if (!user) return;

        set({ loading: true, error: null });

        try {
          // Fetch notes
          const {
            data: notes,
            error: notesError,
          }: { data: Note[] | null; error: PostgrestError | null } = await supabase
            .from('notes')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

          if (notesError) throw notesError;

          // Fetch edges
          const {
            data: noteEdges,
            error: edgesError,
          }: { data: NoteEdge[] | null; error: PostgrestError | null } = await supabase
            .from('note_edges')
            .select('*')
            .eq('user_id', user.id);

          if (edgesError) throw edgesError;

          const onDoubleClick = (noteId: string) => {
            get().setSelectedNoteId(noteId);
          };

          const nodes = (notes ?? []).map((note) => noteToNode(note, onDoubleClick));
          const edges = (noteEdges ?? [])
            .map((edge) => noteEdgeToEdge(edge))
            .filter((edge): edge is NotesEdge => edge !== null);

          set({ nodes, edges, loading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch notes',
            loading: false,
          });
        }
      },

      createNote: async (options: CreateNoteOptions = {}) => {
        const user = useAuthStore.getState().user;
        if (!user) return null;

        // Pause history tracking during note creation
        useNotesStore.temporal.getState().pause();

        const {
          x = 100,
          y = 100,
          width,
          height,
          canvasId,
          folderId,
          groupId,
          title = 'New Note',
          type = 'text',
          content = '',
        } = options;
        const { currentCanvasId } = get();

        // Use provided canvasId or fall back to current canvas context
        const effectiveCanvasId = canvasId !== undefined ? canvasId : currentCanvasId;

        try {
          const newNote = {
            user_id: user.id,
            title,
            content,
            type,
            position_x: x,
            position_y: y,
            canvas_id: effectiveCanvasId,
            folder_id: folderId ?? null,
            group_id: groupId ?? null,
            ...(width !== undefined ? { width } : {}),
            ...(height !== undefined ? { height } : {}),
          };

          let {
            data,
            error,
          }: { data: Note | null; error: PostgrestError | null } = await supabase
            .from('notes')
            .insert(newNote)
            .select()
            .single();

          // Backwards-compatible insert for older schemas that require a per-note color column.
          if (error?.code === '23502' && /column "color"/i.test(error.message)) {
            ({ data, error } = await supabase
              .from('notes')
              .insert({ ...newNote, color: '#ffffff' })
              .select()
              .single());
          }

          if (error) throw error;
          if (!data) throw new Error('Failed to create note');

          const createdNote = data;

          // If the note is on the current canvas, add it to the ReactFlow nodes
          if (effectiveCanvasId && effectiveCanvasId === currentCanvasId) {
            const onDoubleClick = (noteId: string) => {
              get().setSelectedNoteId(noteId);
            };

            const newNode = noteToNode(createdNote, onDoubleClick);
            newNode.zIndex = 10;
            if (createdNote.group_id) {
              const parentGroup = get().nodes.find(
                (node) => node.id === createdNote.group_id && node.type === 'groupNode'
              );
              if (parentGroup) {
                newNode.parentNode = createdNote.group_id;
                newNode.position = {
                  x: createdNote.position_x - parentGroup.position.x,
                  y: createdNote.position_y - parentGroup.position.y,
                };
              }
            }
            set((state) => ({
              nodes: [...state.nodes, newNode],
            }));
          }

          // Also add to library notes
          set((state) => ({
            libraryNotes: [createdNote, ...state.libraryNotes],
          }));

          // Clear undo history since adding notes cannot be undone (like deletion)
          // Use delayed resume to allow ReactFlow's node rendering to complete
          useNotesStore.temporal.getState().clear();
          setTimeout(() => {
            useNotesStore.temporal.getState().clear();
            useNotesStore.temporal.getState().resume();
          }, 100);

          return createdNote.id;
        } catch (error) {
          console.error('Failed to create note:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to create note' });
          // Resume tracking even on error with delay
          useNotesStore.temporal.getState().clear();
          setTimeout(() => {
            useNotesStore.temporal.getState().clear();
            useNotesStore.temporal.getState().resume();
          }, 100);
          return null;
        }
      },

      updateNotePosition: (noteId: string, x: number, y: number) => {
        // Optimistically update the node position in state
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === noteId ? { ...node, position: { x, y } } : node
          ),
        }));

        // Debounced database update
        positionUpdateDebouncer(noteId, async () => {
          const user = useAuthStore.getState().user;
          if (!user) return;

          // Re-read state to ensure we have latest parent info
          const state = useNotesStore.getState();
          const node = state.nodes.find(n => n.id === noteId);

          // x and y passed in are relative if parentNode exists (ReactFlow behavior)
          let absX = x;
          let absY = y;

          if (node && node.parentNode) {
            const parent = state.nodes.find(n => n.id === node.parentNode);
            if (parent) {
              absX += parent.position.x;
              absY += parent.position.y;
            }
          }

          const { error } = await supabase
            .from('notes')
            .update({ position_x: absX, position_y: absY, updated_at: new Date().toISOString() })
            .eq('id', noteId)
            .eq('user_id', user.id);

          if (error) {
            console.error('Failed to update note position:', error.message);
          }
        });
      },

      updateNoteSize: (noteId: string, width: number, height: number) => {
        // Round to integers (database columns are integers)
        const roundedWidth = Math.round(width);
        const roundedHeight = Math.round(height);

        // Optimistically update the node style in state
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === noteId
              ? { ...node, style: { ...node.style, width: roundedWidth, height: roundedHeight } }
              : node
          ),
        }));

        // Debounced database update
        sizeUpdateDebouncer(noteId, async () => {
          const user = useAuthStore.getState().user;
          if (!user) return;

          const { error } = await supabase
            .from('notes')
            .update({ width: roundedWidth, height: roundedHeight, updated_at: new Date().toISOString() })
            .eq('id', noteId)
            .eq('user_id', user.id);

          if (error) {
            console.error('Failed to update note size:', error.message);
          }
        });
      },

      updateNoteContent: async (noteId: string, title: string, content: string) => {
        const user = useAuthStore.getState().user;
        if (!user) return;

        const updatedAt = new Date().toISOString();

        // Optimistic update for both nodes and library notes
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === noteId && isNoteNode(node)
              ? { ...node, data: { ...node.data, title, content } }
              : node
          ),
          libraryNotes: state.libraryNotes.map((note) =>
            note.id === noteId ? { ...note, title, content, updated_at: updatedAt } : note
          ),
        }));

        try {
          const { error } = await supabase
            .from('notes')
            .update({ title, content, updated_at: updatedAt })
            .eq('id', noteId)
            .eq('user_id', user.id);

          if (error) throw error;
        } catch (error) {
          console.error('Failed to update note content:', error);
          // Refetch to restore correct state
          const { currentCanvasId } = get();
          if (currentCanvasId) {
            void get().fetchCanvasNotes(currentCanvasId);
          }
          void get().fetchLibraryNotes();
        }
      },

      updateNoteColor: async (noteId: string, color: string) => {
        const user = useAuthStore.getState().user;
        if (!user) return;

        const updatedAt = new Date().toISOString();

        // Optimistic update
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === noteId && isNoteNode(node)
              ? { ...node, data: { ...node.data, color } }
              : node
          ),
          libraryNotes: state.libraryNotes.map((note) =>
            note.id === noteId ? { ...note, color, updated_at: updatedAt } : note
          ),
        }));

        try {
          const { error } = await supabase
            .from('notes')
            .update({ color, updated_at: updatedAt })
            .eq('id', noteId)
            .eq('user_id', user.id);

          if (error) throw error;
        } catch (error) {
          console.error('Failed to update note color:', error);
          // Revert/Refetch
          const { currentCanvasId } = get();
          if (currentCanvasId) {
            void get().fetchCanvasNotes(currentCanvasId);
          }
          void get().fetchLibraryNotes();
        }
      },

      updateEdge: async (edgeId: string, updates: { label?: string; color?: string }) => {
        const user = useAuthStore.getState().user;
        if (!user) return;

        // Optimistic update
        set((state) => ({
          edges: state.edges.map((edge) =>
            edge.id === edgeId
              ? {
                ...edge,
                data: { ...(edge.data ?? {}), ...updates },
                ...(updates.color
                  ? {
                    style: {
                      ...edge.style,
                      stroke: updates.color,
                      strokeWidth: (edge.style?.strokeWidth as number | undefined) ?? 3,
                    },
                  }
                  : {}),
              }
              : edge
          ),
        }));

        try {
          // Map updates to DB columns
          const dbUpdates: NoteEdgeUpdate = {};
          if (updates.label !== undefined) dbUpdates.label = updates.label;
          if (updates.color !== undefined) dbUpdates.color = updates.color;

          const { error } = await supabase
            .from('note_edges')
            .update(dbUpdates)
            .eq('id', edgeId)
            .eq('user_id', user.id);

          if (error) throw error;
        } catch (error) {
          console.error('Failed to update edge:', error);
          const { currentCanvasId } = get();
          if (currentCanvasId) {
            void get().fetchCanvasNotes(currentCanvasId);
          }
        }
      },

      deleteNote: async (noteId: string) => {
        const user = useAuthStore.getState().user;
        if (!user) return;

        // Get the note before deleting to check if it's an image (for storage cleanup)
        const noteToDelete = get().nodes.find((node) => node.id === noteId);
        const isImageNote = noteToDelete?.type === 'imageNode';
        const imageUrl =
          noteToDelete && isImageNote && isNoteNode(noteToDelete)
            ? noteToDelete.data.content
            : null;

        // Optimistic update - remove node and associated edges
        set((state) => ({
          nodes: state.nodes.filter((node) => node.id !== noteId),
          edges: state.edges.filter(
            (edge) => edge.source !== noteId && edge.target !== noteId
          ),
          selectedNoteId: state.selectedNoteId === noteId ? null : state.selectedNoteId,
          libraryNotes: state.libraryNotes.filter((note) => note.id !== noteId),
        }));

        // Clear undo history to prevent undoing deletes (would create ghost nodes)
        useNotesStore.temporal.getState().clear();

        try {
          // Delete from database
          const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', noteId)
            .eq('user_id', user.id);

          if (error) throw error;

          // If it was an image note, also delete the file from storage
          if (imageUrl && imageUrl.includes('/canvas-assets/')) {
            try {
              // Extract file path from URL: .../canvas-assets/userId/filename.png
              const pathMatch = imageUrl.match(/\/canvas-assets\/(.+)$/);
              if (pathMatch && pathMatch[1]) {
                const filePath = pathMatch[1];
                await supabase.storage
                  .from('canvas-assets')
                  .remove([filePath]);
              }
            } catch {
              // Don't fail the whole operation if storage cleanup fails
            }
          }
        } catch (error) {
          console.error('Failed to delete note:', error);
          const { currentCanvasId } = get();
          if (currentCanvasId) {
            void get().fetchCanvasNotes(currentCanvasId);
          }
          void get().fetchLibraryNotes();
        }
      },

      connectNotes: async (connection: Connection) => {
        const user = useAuthStore.getState().user;
        if (!user || !connection.source || !connection.target) return;

        // Don't allow self-connections
        if (connection.source === connection.target) return;

        // Check if edge already exists
        const existingEdge = get().edges.find(
          (edge) =>
            (edge.source === connection.source && edge.target === connection.target) ||
            (edge.source === connection.target && edge.target === connection.source)
        );

        if (existingEdge) {
          const sourceHandle =
            existingEdge.source === connection.source ? connection.sourceHandle : connection.targetHandle;
          const targetHandle =
            existingEdge.target === connection.target ? connection.targetHandle : connection.sourceHandle;

          // Optimistically update local edge handles so the edge anchors correctly.
          set((state) => ({
            edges: state.edges.map((edge) =>
              edge.id === existingEdge.id
                ? {
                  ...edge,
                  sourceHandle: sourceHandle || undefined,
                  targetHandle: targetHandle || undefined,
                }
                : edge
            ),
          }));

          // Best-effort DB update (only works if columns exist).
          const { error } = await supabase
            .from('note_edges')
            .update({
              source_handle: sourceHandle ?? null,
              target_handle: targetHandle ?? null,
            })
            .eq('id', existingEdge.id)
            .eq('user_id', user.id);

          if (error && error.code !== '42703' && !/source_handle|target_handle/i.test(error.message)) {
            console.error('Failed to update note edge handles:', error.message);
          }

          return;
        }

        try {
          const sourceNode = get().nodes.find((node) => node.id === connection.source);
          const targetNode = get().nodes.find((node) => node.id === connection.target);
          const isSourceGroup = sourceNode?.type === 'groupNode';
          const isTargetGroup = targetNode?.type === 'groupNode';
          const { accentColor, darkMode } = useThemeStore.getState();

          const getEdgeColor = (node?: NotesNode) => {
            if (!node) return null;
            if (isGroupNode(node)) return node.data.color;
            if (isNoteNode(node) && node.data.color) return node.data.color;
            if (node.type === 'noteNode' || node.type === 'linkNode' || node.type === 'imageNode') {
              return darkMode ? '#334155' : '#e2e8f0';
            }
            return accentColor;
          };

          const edgeColor = getEdgeColor(sourceNode) ?? getEdgeColor(targetNode) ?? accentColor;

          const newEdge = {
            user_id: user.id,
            source_note_id: isSourceGroup ? null : connection.source,
            target_note_id: isTargetGroup ? null : connection.target,
            source_group_id: isSourceGroup ? connection.source : null,
            target_group_id: isTargetGroup ? connection.target : null,
            source_handle: connection.sourceHandle ?? null,
            target_handle: connection.targetHandle ?? null,
            color: edgeColor,
          };

          const {
            data,
            error,
          }: { data: NoteEdge | null; error: PostgrestError | null } = await supabase
            .from('note_edges')
            .insert(newEdge)
            .select()
            .single();

          if (error) throw error;
          if (!data) throw new Error('Failed to create edge');

          const createdEdge = noteEdgeToEdge(data);
          if (!createdEdge) return;

          const edge: NotesEdge = {
            ...createdEdge,
            sourceHandle: connection.sourceHandle ?? createdEdge.sourceHandle,
            targetHandle: connection.targetHandle ?? createdEdge.targetHandle,
          };

          set((state) => ({
            edges: [...state.edges, edge],
          }));
        } catch (error) {
          console.error('Failed to connect notes:', error);
        }
      },

      deleteEdge: async (edgeId: string) => {
        const user = useAuthStore.getState().user;
        if (!user) return;

        // Optimistic update
        set((state) => ({
          edges: state.edges.filter((edge) => edge.id !== edgeId),
        }));

        // Clear undo history to prevent undoing deletes
        useNotesStore.temporal.getState().clear();

        try {
          const { error } = await supabase
            .from('note_edges')
            .delete()
            .eq('id', edgeId)
            .eq('user_id', user.id);

          if (error) throw error;
        } catch (error) {
          console.error('Failed to delete edge:', error);
          void get().fetchNotes();
        }
      },

      // Group Actions Implementation

      createGroup: async (bounds) => {
        const { currentCanvasId, nodes } = get();
        const user = useAuthStore.getState().user;
        const accentColor = useThemeStore.getState().accentColor;
        if (!user || !currentCanvasId) return;

        // 1. Optimistic Update
        const tempId = crypto.randomUUID();
        const updatedAt = new Date().toISOString();

        const newGroup: CanvasGroup = {
          id: tempId,
          user_id: user.id,
          canvas_id: currentCanvasId,
          label: 'New Group',
          position_x: bounds.x,
          position_y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          color: accentColor,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Find nodes inside bounds
        const notesInside = nodes.filter(
          (node): node is NoteCanvasNode =>
            (node.type === 'noteNode' || node.type === 'linkNode') &&
            !node.parentNode &&
            node.position.x >= bounds.x &&
            node.position.x + (node.width || 256) <= bounds.x + bounds.width &&
            node.position.y >= bounds.y &&
            node.position.y + (node.height || 100) <= bounds.y + bounds.height
        );

        const notesInsideIds = notesInside.map(n => n.id);

        // Create the group node
        const newGroupNode: GroupCanvasNode = {
          id: tempId,
          type: 'groupNode',
          position: { x: bounds.x, y: bounds.y },
          style: { width: bounds.width, height: bounds.height },
          data: { label: 'New Group', color: accentColor },
          zIndex: -1
        };

        // Update state immediately
        set(state => ({
          groups: [...state.groups, newGroup],
          nodes: [
            ...state.nodes.map(n => {
              if (notesInsideIds.includes(n.id)) {
                return {
                  ...n,
                  parentNode: tempId,
                  position: {
                    x: n.position.x - bounds.x,
                    y: n.position.y - bounds.y
                  }
                };
              }
              return n;
            }),
            newGroupNode
          ],
          libraryNotes: notesInsideIds.length > 0
            ? state.libraryNotes.map(note =>
              notesInsideIds.includes(note.id)
                ? { ...note, group_id: tempId, updated_at: updatedAt }
                : note
            )
            : state.libraryNotes
        }));

        // 2. DB Operations
        const {
          data: dbGroup,
          error,
        }: { data: CanvasGroup | null; error: PostgrestError | null } = await supabase
          .from('canvas_groups')
          .insert({
            user_id: user.id,
            canvas_id: currentCanvasId,
            position_x: bounds.x,
            position_y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            label: 'New Group',
            color: accentColor
          })
          .select()
          .single();

        if (error || !dbGroup) {
          console.error('Failed to create group:', error);
          set({ error: error?.message || 'Failed to create group in database' });

          // Revert optimistic update
          set(state => ({
            groups: state.groups.filter(g => g.id !== tempId),
            nodes: state.nodes.filter(n => n.id !== tempId).map(n => {
              if (n.parentNode === tempId) {
                // Restore absolute position
                return {
                  ...n,
                  parentNode: undefined,
                  extent: undefined,
                  position: {
                    x: n.position.x + bounds.x,
                    y: n.position.y + bounds.y
                  }
                };
              }
              return n;
            }),
            libraryNotes: notesInsideIds.length > 0
              ? state.libraryNotes.map(note =>
                notesInsideIds.includes(note.id)
                  ? { ...note, group_id: null, updated_at: new Date().toISOString() }
                  : note
              )
              : state.libraryNotes
          }));
          return;
        }

        // 3. Update nodes in DB
        if (notesInside.length > 0) {
          const { error: updateError } = await supabase
            .from('notes')
            .update({ group_id: dbGroup.id })
            .in('id', notesInsideIds);

          if (updateError) {
            console.error('Failed to update notes group_id:', updateError);
          }
        }

        // 4. Reconcile IDs (replace tempId with dbGroup.id in store)
        const reconciledAt = new Date().toISOString();
        set(state => ({
          groups: state.groups.map(g => g.id === tempId ? dbGroup : g),
          nodes: state.nodes.map(n => {
            if (n.id === tempId) {
              return { ...n, id: dbGroup.id };
            }
            if (n.parentNode === tempId) {
              return { ...n, parentNode: dbGroup.id };
            }
            return n;
          }),
          libraryNotes: notesInsideIds.length > 0
            ? state.libraryNotes.map(note =>
              notesInsideIds.includes(note.id)
                ? { ...note, group_id: dbGroup.id, updated_at: reconciledAt }
                : note
            )
            : state.libraryNotes
        }));
      },

      updateGroup: async (id, updates) => {
        const user = useAuthStore.getState().user;
        if (!user) return;

        const dataUpdates: Partial<GroupNodeData> = {};
        if (updates.label !== undefined) dataUpdates.label = updates.label;
        if (updates.color !== undefined) dataUpdates.color = updates.color;

        const styleUpdates = {
          ...(updates.width !== undefined ? { width: updates.width } : {}),
          ...(updates.height !== undefined ? { height: updates.height } : {}),
        };

        // Optimistic update
        set((state) => ({
          groups: state.groups.map((group) => (group.id === id ? { ...group, ...updates } : group)),
          nodes: state.nodes.map((node) => {
            if (node.id !== id || !isGroupNode(node)) return node;
            return {
              ...node,
              data: { ...node.data, ...dataUpdates },
              style: { ...node.style, ...styleUpdates },
            };
          }),
        }));

        const { error } = await supabase.from('canvas_groups').update(updates).eq('id', id);
        if (error) console.error('Failed to update group', error);
      },

      deleteGroup: async (id) => {
        const user = useAuthStore.getState().user;
        if (!user) return;

        const state = get();
        const groupNode = state.nodes.find(n => n.id === id);
        if (!groupNode) return;

        const children = state.nodes.filter(n => n.parentNode === id);
        const childIds = children.map(child => child.id);
        const updatedAt = new Date().toISOString();

        // Calculate absolute positions for children to update optimistic state correctly
        const updatedChildren = children.map(child => ({
          ...child,
          parentNode: undefined,
          extent: undefined,
          position: {
            x: child.position.x + groupNode.position.x,
            y: child.position.y + groupNode.position.y
          },
          data: { ...child.data }
        }));

        set(state => ({
          groups: state.groups.filter(g => g.id !== id),
          // Remove edges connected to this group
          edges: state.edges.filter(edge => edge.source !== id && edge.target !== id),
          nodes: state.nodes.filter(n => n.id !== id).map(n => {
            const updatedChild = updatedChildren.find(c => c.id === n.id);
            return updatedChild || n;
          }),
          libraryNotes: childIds.length > 0
            ? state.libraryNotes.map(note =>
              childIds.includes(note.id)
                ? { ...note, group_id: null, updated_at: updatedAt }
                : note
            )
            : state.libraryNotes
        }));

        // Clear undo history to prevent undoing deletes
        useNotesStore.temporal.getState().clear();

        // DB Update
        const { error } = await supabase.from('canvas_groups').delete().eq('id', id);
        if (error) console.error('Failed to delete group', error);

        // DB update for children's positions to match the visual change (they shouldn't jump back)
        // Since we removed them from group, they need to have their absolute positions stored in DB.
        // But wait! We've been storing absolute positions in DB all along. 
        // So when we delete the group, the children still have their absolute positions in DB...
        // UNLESS the group moved.
        // If group moved, we updated children's positions in DB? 
        // In `onNodesChange`, we implemented logic to update children's absolute position when group moves.
        // So, if that logic works, then the DB already has correct absolute positions for children.
        // So we don't need to do anything else for children in DB.
      },

      handleNoteDragEnd: async (nodeId: string) => {
        const state = get();
        const user = useAuthStore.getState().user;
        if (!user) return;

        const node = state.nodes.find((n) => n.id === nodeId);
        if (!node || (node.type !== 'noteNode' && node.type !== 'linkNode')) return;

        // Calculate absolute position of the dragged node
        let absX = node.position.x;
        let absY = node.position.y;

        if (node.parentNode) {
          const parent = state.nodes.find((n) => n.id === node.parentNode);
          if (parent) {
            absX += parent.position.x;
            absY += parent.position.y;
          }
        }

        const noteRect = {
          x: absX,
          y: absY,
          width: (node.width ?? node.style?.width ?? 256) as number,
          height: (node.height ?? node.style?.height ?? 100) as number,
        };

        // Find a group that contains the note
        const targetGroup = state.nodes.find(
          (n) =>
            n.type === 'groupNode' &&
            isNodeInsideGroup(noteRect, {
              x: n.position.x,
              y: n.position.y,
              width: (n.width ?? n.style?.width ?? 0) as number,
              height: (n.height ?? n.style?.height ?? 0) as number,
            })
        );

        const currentParentId = node.parentNode;
        const targetGroupId = targetGroup?.id;

        // Case 1: Moved into a group (from root or another group)
        if (targetGroupId && targetGroupId !== currentParentId) {
          const groupNode = targetGroup;
          const newRelX = absX - groupNode.position.x;
          const newRelY = absY - groupNode.position.y;
          const updatedAt = new Date().toISOString();

          // Optimistic update
          set((state) => ({
            nodes: state.nodes.map((n) =>
              n.id === nodeId
                ? {
                  ...n,
                  parentNode: targetGroupId,
                  position: { x: newRelX, y: newRelY },
                  zIndex: 10,
                }
                : n
            ),
            libraryNotes: state.libraryNotes.map((note) =>
              note.id === nodeId ? { ...note, group_id: targetGroupId, updated_at: updatedAt } : note
            ),
          }));

          // DB Update
          const { error } = await supabase
            .from('notes')
            .update({
              group_id: targetGroupId,
              position_x: absX, // DB stores absolute
              position_y: absY,
              updated_at: updatedAt,
            })
            .eq('id', nodeId)
            .eq('user_id', user.id);

          if (error) console.error('Failed to update note group (absorb)', error);
        }
        // Case 2: Moved out of a group (to root)
        else if (!targetGroupId && currentParentId) {
          const updatedAt = new Date().toISOString();
          // Optimistic update
          set((state) => ({
            nodes: state.nodes.map((n) =>
              n.id === nodeId
                ? {
                  ...n,
                  parentNode: undefined,
                  extent: undefined,
                  position: { x: absX, y: absY },
                  zIndex: 10,
                }
                : n
            ),
            libraryNotes: state.libraryNotes.map((note) =>
              note.id === nodeId ? { ...note, group_id: null, updated_at: updatedAt } : note
            ),
          }));

          // DB Update
          const { error } = await supabase
            .from('notes')
            .update({
              group_id: null,
              position_x: absX,
              position_y: absY,
              updated_at: updatedAt,
            })
            .eq('id', nodeId)
            .eq('user_id', user.id);

          if (error) console.error('Failed to update note group (eject)', error);
        }
        // Case 3: Moved within same group or same root (just update pos)
        else {
          // Position update is already handled by `onNodesChange` / `updateNotePosition`
          // But we should ensure DB has absolute coords if it was relative
          if (targetGroupId) {
            // It's in a group, verify abs coords in DB
            const { error } = await supabase
              .from('notes')
              .update({
                group_id: targetGroupId,
                position_x: absX,
                position_y: absY,
                updated_at: new Date().toISOString(),
              })
              .eq('id', nodeId)
              .eq('user_id', user.id);
            if (error) console.error('Failed to sync note pos', error);
          }
        }
      },

      recalculateGroupMembership: async (groupId: string) => {
        const state = get();
        const user = useAuthStore.getState().user;
        if (!user) return;

        const groupNode = state.nodes.find((n) => n.id === groupId);
        if (!groupNode || groupNode.type !== 'groupNode') return;

        const groupRect = {
          x: groupNode.position.x,
          y: groupNode.position.y,
          width: (groupNode.width ?? groupNode.style?.width ?? 0) as number,
          height: (groupNode.height ?? groupNode.style?.height ?? 0) as number,
        };

        const notesToUpdate: {
          id: string;
          parentNode?: string;
          position: { x: number; y: number };
          extent?: 'parent' | undefined;
          absX: number;
          absY: number;
        }[] = [];

        // Check all note nodes
        state.nodes.forEach((node) => {
          if (node.type !== 'noteNode' && node.type !== 'linkNode') return;

          // Calculate absolute position
          let absX = node.position.x;
          let absY = node.position.y;
          if (node.parentNode) {
            const parent = state.nodes.find((n) => n.id === node.parentNode);
            if (parent) {
              absX += parent.position.x;
              absY += parent.position.y;
            }
          }

          const noteRect = {
            x: absX,
            y: absY,
            width: (node.width ?? node.style?.width ?? 256) as number,
            height: (node.height ?? node.style?.height ?? 100) as number,
          };

          const inside = isNodeInsideGroup(noteRect, groupRect);

          // 1. Absorb: Root node -> Inside Group
          if (inside && !node.parentNode) {
            notesToUpdate.push({
              id: node.id,
              parentNode: groupId,
              position: { x: absX - groupRect.x, y: absY - groupRect.y },
              absX,
              absY,
            });
          }
          // 2. Eject: Child of this group -> Outside Group
          else if (!inside && node.parentNode === groupId) {
            notesToUpdate.push({
              id: node.id,
              parentNode: undefined, // undefined to remove key
              extent: undefined,
              position: { x: absX, y: absY },
              absX,
              absY,
            });
          }
          // 3. Ignore: Child of OTHER group (even if inside this one, don't steal)
        });

        if (notesToUpdate.length === 0) return;

        // Apply Optimistic Updates
        const updatedAt = new Date().toISOString();
        set((state) => ({
          nodes: state.nodes.map((n) => {
            const update = notesToUpdate.find((u) => u.id === n.id);
            if (update) {
              return {
                ...n,
                parentNode: update.parentNode,
                extent: update.extent,
                position: update.position,
                zIndex: 10,
              };
            }
            return n;
          }),
          libraryNotes: state.libraryNotes.map((note) => {
            const update = notesToUpdate.find((u) => u.id === note.id);
            if (!update) return note;
            return {
              ...note,
              group_id: update.parentNode ?? null,
              updated_at: updatedAt,
            };
          }),
        }));

        // Apply DB Updates
        const updates = notesToUpdate.map((u) =>
          supabase
            .from('notes')
            .update({
              group_id: u.parentNode || null,
              updated_at: new Date().toISOString(),
              // Ensure absolute position is preserved/correct in DB
              position_x: u.absX,
              position_y: u.absY
            })
            .eq('id', u.id)
            .eq('user_id', user.id)
        );

        await Promise.all(updates);
      },

      onNodesChange: (changes: NodeChange[]) => {
        const nextNodes = applyNodeChanges<NotesNodeData>(changes, get().nodes);
        set({ nodes: nextNodes });

        changes.forEach((change: NodeChange) => {
          if (change.type === 'position' && change.dragging === false) {
            const updatedNode = nextNodes.find((node) => node.id === change.id);
            if (!updatedNode) return;

            if (updatedNode.type === 'groupNode') {
              groupPositionUpdateDebouncer(change.id, async () => {
                const user = useAuthStore.getState().user;
                if (!user) return;

                const { error } = await supabase
                  .from('canvas_groups')
                  .update({ position_x: updatedNode.position.x, position_y: updatedNode.position.y, updated_at: new Date().toISOString() })
                  .eq('id', change.id)
                  .eq('user_id', user.id);

                if (error) console.error('Failed to update group position', error);
              });

              // Update children in DB to keep them in sync with absolute position
              const children = nextNodes.filter(n => n.parentNode === change.id);
              children.forEach(child => {
                // Pass relative position; the debounced function converts to absolute using parent's current pos
                // Using the specialized debouncer ensures we don't clobber calls for different children
                positionUpdateDebouncer(child.id, async () => {
                  const user = useAuthStore.getState().user;
                  if (!user) return;

                  const state = useNotesStore.getState();
                  if (state.nodes.length === 0) return;

                  // We need to fetch the parent from state to get the LATEST position
                  const parent = state.nodes.find(n => n.id === change.id);
                  // Child x/y is relative
                  let absX = child.position.x;
                  let absY = child.position.y;

                  if (parent) {
                    absX += parent.position.x;
                    absY += parent.position.y;
                  }

                  const { error } = await supabase
                    .from('notes')
                    .update({ position_x: absX, position_y: absY, updated_at: new Date().toISOString() })
                    .eq('id', child.id)
                    .eq('user_id', user.id);

                  if (error) console.error('Failed to update note position', error);
                });
              });
            } else {
              // Normal note - update using relative pos if parent exists, debouncer handles logic
              positionUpdateDebouncer(change.id, async () => {
                const user = useAuthStore.getState().user;
                if (!user) return;

                const state = useNotesStore.getState();
                if (state.nodes.length === 0) return;

                const node = state.nodes.find(n => n.id === change.id);

                let absX = updatedNode.position.x;
                let absY = updatedNode.position.y;

                if (node && node.parentNode) {
                  const parent = state.nodes.find(n => n.id === node.parentNode);
                  if (parent) {
                    absX += parent.position.x;
                    absY += parent.position.y;
                  }
                }

                const { error } = await supabase
                  .from('notes')
                  .update({ position_x: absX, position_y: absY, updated_at: new Date().toISOString() })
                  .eq('id', change.id)
                  .eq('user_id', user.id);

                if (error) {
                  console.error('Failed to update note position:', error.message);
                }
              });
            }
          }

          if (change.type === 'dimensions') {
            const updatedNode = nextNodes.find((node) => node.id === change.id);
            if (updatedNode && updatedNode.type === 'groupNode') {
              groupSizeUpdateDebouncer(change.id, async () => {
                const user = useAuthStore.getState().user;
                if (!user) return;

                // 1. Update DB size
                const { error } = await supabase
                  .from('canvas_groups')
                  .update({ width: updatedNode.width, height: updatedNode.height, updated_at: new Date().toISOString() })
                  .eq('id', change.id)
                  .eq('user_id', user.id);

                if (error) console.error('Failed to update group size', error);

                // 2. Recalculate membership (absorb/eject notes)
                await get().recalculateGroupMembership(change.id);
              });
            }
          }
        });
      },

      onEdgesChange: (changes: EdgeChange[]) => {
        set((state) => ({
          edges: applyEdgeChanges<NotesEdgeData>(changes, state.edges),
        }));

        // Handle edge removals
        changes.forEach((change: EdgeChange) => {
          if (change.type === 'remove') {
            void get().deleteEdge(change.id);
          }
        });
      },

      setSelectedNoteId: (noteId: string | null) => {
        set({ selectedNoteId: noteId });
      },

      // Upload image to Supabase storage with compression
      uploadImage: async (file: File): Promise<string> => {
        const user = useAuthStore.getState().user;
        if (!user) throw new Error('User not authenticated');

        try {
          // Compress the image
          const compressedFile = await imageCompression(file, {
            maxSizeMB: 0.3,
            maxWidthOrHeight: 1280,
            useWebWorker: true,
          });

          // Generate unique filename
          const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const path = `${user.id}/${filename}`;

          // Upload to Supabase storage
          const { error: uploadError } = await supabase.storage
            .from('canvas-assets')
            .upload(path, compressedFile, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('canvas-assets')
            .getPublicUrl(path);

          return urlData.publicUrl;
        } catch (error) {
          console.error('Failed to upload image:', error);
          throw error instanceof Error ? error : new Error('Failed to upload image');
        }
      },

      getSelectedNote: () => {
        const { nodes, selectedNoteId } = get();
        if (!selectedNoteId) return null;

        const node = nodes.find((n) => n.id === selectedNoteId);
        if (!node || !isNoteNode(node)) return null;

        return {
          id: node.id,
          user_id: '', // Not needed for editor
          title: node.data.title ?? '',
          content: node.data.content ?? '',
          position_x: node.position.x,
          position_y: node.position.y,
          width: (node.style?.width as number) || null,
          height: (node.style?.height as number) || null,
          created_at: '',
          updated_at: '',
        } as Note;
      },
    }),
    {
      limit: 50,
      // Only create history entries when nodes, edges, or groups change
      equality: (pastState, currentState) => {
        // Handle edge cases where state might be undefined
        if (!pastState || !currentState) return pastState === currentState;
        return (
          pastState.nodes === currentState.nodes &&
          pastState.edges === currentState.edges &&
          pastState.groups === currentState.groups
        );
      },
    }
  )
);

export default useNotesStore;
