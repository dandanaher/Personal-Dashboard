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

// Note data stored in ReactFlow node
export interface NoteNodeData {
  id: string;
  title: string;
  content: string;
  color: string;
  onDoubleClick: (noteId: string) => void;
}

interface NotesState {
  nodes: Node<NoteNodeData>[];
  edges: Edge[];
  selectedNoteId: string | null;
  loading: boolean;
  error: string | null;
}

interface NotesActions {
  fetchNotes: () => Promise<void>;
  createNote: (x?: number, y?: number) => Promise<void>;
  updateNotePosition: (noteId: string, x: number, y: number) => void;
  updateNoteContent: (noteId: string, title: string, content: string) => Promise<void>;
  updateNoteColor: (noteId: string, color: string) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  connectNotes: (connection: Connection) => Promise<void>;
  deleteEdge: (edgeId: string) => Promise<void>;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  setSelectedNoteId: (noteId: string | null) => void;
  getSelectedNote: () => Note | null;
}

type NotesStore = NotesState & NotesActions;

// Convert database note to ReactFlow node
function noteToNode(note: Note, onDoubleClick: (noteId: string) => void): Node<NoteNodeData> {
  return {
    id: note.id,
    type: 'noteNode',
    position: { x: note.position_x, y: note.position_y },
    data: {
      id: note.id,
      title: note.title,
      content: note.content,
      color: note.color,
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

export const useNotesStore = create<NotesStore>((set, get) => ({
  // State
  nodes: [],
  edges: [],
  selectedNoteId: null,
  loading: false,
  error: null,

  // Actions
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

  createNote: async (x = 100, y = 100) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    try {
      const newNote = {
        user_id: user.id,
        title: 'New Note',
        content: '',
        position_x: x,
        position_y: y,
        color: '#ffffff',
      };

      const { data, error } = await supabase.from('notes').insert(newNote).select().single();

      if (error) throw error;

      const onDoubleClick = (noteId: string) => {
        get().setSelectedNoteId(noteId);
      };

      const newNode = noteToNode(data as Note, onDoubleClick);
      set((state) => ({
        nodes: [...state.nodes, newNode],
      }));
    } catch (error) {
      console.error('Failed to create note:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to create note' });
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

  updateNoteContent: async (noteId: string, title: string, content: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    // Optimistic update
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === noteId ? { ...node, data: { ...node.data, title, content } } : node
      ),
    }));

    try {
      const { error } = await supabase
        .from('notes')
        .update({ title, content, updated_at: new Date().toISOString() })
        .eq('id', noteId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update note content:', error);
      // Refetch to restore correct state
      get().fetchNotes();
    }
  },

  updateNoteColor: async (noteId: string, color: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    // Optimistic update
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === noteId ? { ...node, data: { ...node.data, color } } : node
      ),
    }));

    try {
      const { error } = await supabase
        .from('notes')
        .update({ color, updated_at: new Date().toISOString() })
        .eq('id', noteId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update note color:', error);
      get().fetchNotes();
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
      get().fetchNotes();
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

    if (existingEdge) return;

    try {
      const newEdge = {
        user_id: user.id,
        source_note_id: connection.source,
        target_note_id: connection.target,
      };

      const { data, error } = await supabase.from('note_edges').insert(newEdge).select().single();

      if (error) throw error;

      const edge = noteEdgeToEdge(data as NoteEdge);
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
      get().fetchNotes();
    }
  },

  onNodesChange: (changes: NodeChange[]) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
    }));

    // Handle position changes after drag ends
    changes.forEach((change: NodeChange) => {
      if (change.type === 'position' && change.dragging === false && change.position) {
        get().updateNotePosition(change.id, change.position.x, change.position.y);
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
        get().deleteEdge(change.id);
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
      color: node.data.color,
      created_at: '',
      updated_at: '',
    } as Note;
  },
}));

export default useNotesStore;
