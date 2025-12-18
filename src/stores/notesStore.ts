import { create } from 'zustand';
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
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Note, NoteEdge } from '@/lib/types';

// Debounce utility
function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void | Promise<void>,
  delay: number
): (...args: Args) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      void fn(...args);
    }, delay);
  };
}

// Note data stored in ReactFlow node
export interface NoteNodeData {
  id: string;
  title: string;
  content: string;
  onDoubleClick: (noteId: string) => void;
}

interface NotesState {
  nodes: Node<NoteNodeData>[];
  edges: Edge[];
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
  canvasId?: string | null;
  folderId?: string | null;
  title?: string;
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
}

type NotesStore = NotesState & NotesActions;

// Convert database note to ReactFlow node
function noteToNode(note: Note, onDoubleClick: (noteId: string) => void): Node<NoteNodeData> {
  return {
    id: note.id,
    type: 'noteNode',
    position: { x: note.position_x, y: note.position_y },
    style: {
      width: note.width ?? 256,
      height: note.height ?? undefined,
    },
    data: {
      id: note.id,
      title: note.title,
      content: note.content,
      onDoubleClick,
    },
  };
}

// Convert database edge to ReactFlow edge
function noteEdgeToEdge(noteEdge: NoteEdge): Edge {
  return {
    id: noteEdge.id,
    source: noteEdge.source_note_id,
    target: noteEdge.target_note_id,
    sourceHandle: noteEdge.source_handle || undefined,
    targetHandle: noteEdge.target_handle || undefined,
    type: 'smoothstep',
    animated: true,
  };
}

// Debounced position update function
const debouncedPositionUpdate = debounce(
  async (noteId: string, x: number, y: number) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const { error } = await supabase
      .from('notes')
      .update({ position_x: x, position_y: y, updated_at: new Date().toISOString() })
      .eq('id', noteId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to update note position:', error.message);
    }
  },
  300
);

// Debounced size update function
const debouncedSizeUpdate = debounce(
  async (noteId: string, width: number, height: number) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const { error } = await supabase
      .from('notes')
      .update({ width, height, updated_at: new Date().toISOString() })
      .eq('id', noteId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to update note size:', error.message);
    }
  },
  300
);

export const useNotesStore = create<NotesStore>((set, get) => ({
  // State
  nodes: [],
  edges: [],
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
    set({ nodes: [], edges: [], currentCanvasId: null });
  },

  fetchCanvasNotes: async (canvasId: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    set({ loading: true, error: null, currentCanvasId: canvasId });

    try {
      // Fetch notes for this canvas
      const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .eq('canvas_id', canvasId)
        .order('created_at', { ascending: true });

      if (notesError) throw notesError;

      // Fetch edges for notes in this canvas
      const noteIds = (notes || []).map((n) => n.id);
      let noteEdges: NoteEdge[] = [];

      if (noteIds.length > 0) {
        const { data: edgesData, error: edgesError } = await supabase
          .from('note_edges')
          .select('*')
          .eq('user_id', user.id)
          .in('source_note_id', noteIds);

        if (edgesError) throw edgesError;
        noteEdges = (edgesData || []) as NoteEdge[];
      }

      const onDoubleClick = (noteId: string) => {
        get().setSelectedNoteId(noteId);
      };

      const nodes = (notes || []).map((note) => noteToNode(note as Note, onDoubleClick));
      const edges = noteEdges.map((edge) => noteEdgeToEdge(edge));

      set({ nodes, edges, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch canvas notes',
        loading: false,
      });
    }
  },

  fetchLibraryNotes: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    try {
      // Fetch all notes (for library sidebar display)
      const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (notesError) throw notesError;

      set({ libraryNotes: (notes || []) as Note[] });
    } catch (error) {
      console.error('Failed to fetch library notes:', error);
    }
  },

  fetchNote: async (noteId: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data as Note;
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
      const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (notesError) throw notesError;

      // Fetch edges
      const { data: noteEdges, error: edgesError } = await supabase
        .from('note_edges')
        .select('*')
        .eq('user_id', user.id);

      if (edgesError) throw edgesError;

      const onDoubleClick = (noteId: string) => {
        get().setSelectedNoteId(noteId);
      };

      const nodes = (notes || []).map((note) => noteToNode(note as Note, onDoubleClick));
      const edges = (noteEdges || []).map((edge) => noteEdgeToEdge(edge as NoteEdge));

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

    const { x = 100, y = 100, canvasId, folderId, title = 'New Note' } = options;
    const { currentCanvasId } = get();

    // Use provided canvasId or fall back to current canvas context
    const effectiveCanvasId = canvasId !== undefined ? canvasId : currentCanvasId;

    try {
      const newNote = {
        user_id: user.id,
        title,
        content: '',
        position_x: x,
        position_y: y,
        canvas_id: effectiveCanvasId,
        folder_id: folderId ?? null,
      };

      let { data, error } = await supabase.from('notes').insert(newNote).select().single();

      // Backwards-compatible insert for older schemas that require a per-note color column.
      if (error?.code === '23502' && /column "color"/i.test(error.message)) {
        ({ data, error } = await supabase
          .from('notes')
          .insert({ ...newNote, color: '#ffffff' })
          .select()
          .single());
      }

      if (error) throw error;

      const createdNote = data as Note;

      // If the note is on the current canvas, add it to the ReactFlow nodes
      if (effectiveCanvasId && effectiveCanvasId === currentCanvasId) {
        const onDoubleClick = (noteId: string) => {
          get().setSelectedNoteId(noteId);
        };

        const newNode = noteToNode(createdNote, onDoubleClick);
        set((state) => ({
          nodes: [...state.nodes, newNode],
        }));
      }

      // Also add to library notes
      set((state) => ({
        libraryNotes: [createdNote, ...state.libraryNotes],
      }));

      return createdNote.id;
    } catch (error) {
      console.error('Failed to create note:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to create note' });
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
    debouncedPositionUpdate(noteId, x, y);
  },

  updateNoteSize: (noteId: string, width: number, height: number) => {
    // Optimistically update the node style in state
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === noteId
          ? { ...node, style: { ...node.style, width, height } }
          : node
      ),
    }));

    // Debounced database update
    debouncedSizeUpdate(noteId, width, height);
  },

  updateNoteContent: async (noteId: string, title: string, content: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const updatedAt = new Date().toISOString();

    // Optimistic update for both nodes and library notes
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === noteId ? { ...node, data: { ...node.data, title, content } } : node
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

  deleteNote: async (noteId: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    // Optimistic update - remove node and associated edges
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== noteId),
      edges: state.edges.filter(
        (edge) => edge.source !== noteId && edge.target !== noteId
      ),
      selectedNoteId: state.selectedNoteId === noteId ? null : state.selectedNoteId,
      libraryNotes: state.libraryNotes.filter((note) => note.id !== noteId),
    }));

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', user.id);

      if (error) throw error;
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
      const newEdge = {
        user_id: user.id,
        source_note_id: connection.source,
        target_note_id: connection.target,
        source_handle: connection.sourceHandle ?? null,
        target_handle: connection.targetHandle ?? null,
      };

      let { data, error } = await supabase.from('note_edges').insert(newEdge).select().single();

      // Backwards-compatible insert for older schemas without handle columns.
      if (error && (error.code === '42703' || /source_handle|target_handle/i.test(error.message))) {
        ({ data, error } = await supabase
          .from('note_edges')
          .insert({
            user_id: user.id,
            source_note_id: connection.source,
            target_note_id: connection.target,
          })
          .select()
          .single());
      }

      if (error) throw error;

      const edge = {
        ...noteEdgeToEdge(data as NoteEdge),
        sourceHandle: connection.sourceHandle || (data as NoteEdge).source_handle || undefined,
        targetHandle: connection.targetHandle || (data as NoteEdge).target_handle || undefined,
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

  onNodesChange: (changes: NodeChange[]) => {
    const nextNodes = applyNodeChanges(changes, get().nodes);
    set({ nodes: nextNodes });

    // Handle position changes after drag ends
    changes.forEach((change: NodeChange) => {
      if (change.type === 'position' && change.dragging === false) {
        const updatedNode = nextNodes.find((node) => node.id === change.id);
        if (!updatedNode) return;

        // React Flow often omits `change.position` on drag stop. Use the updated state instead.
        debouncedPositionUpdate(change.id, updatedNode.position.x, updatedNode.position.y);
      }
    });
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
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

  getSelectedNote: () => {
    const { nodes, selectedNoteId } = get();
    if (!selectedNoteId) return null;

    const node = nodes.find((n) => n.id === selectedNoteId);
    if (!node) return null;

    return {
      id: node.id,
      user_id: '', // Not needed for editor
      title: node.data.title,
      content: node.data.content,
      position_x: node.position.x,
      position_y: node.position.y,
      width: (node.style?.width as number) || null,
      height: (node.style?.height as number) || null,
      created_at: '',
      updated_at: '',
    } as Note;
  },
}));

export default useNotesStore;
