import { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import ReactFlow, {
  Background,
  MiniMap,
  Connection,
  BackgroundVariant,
  Panel,
  ConnectionMode,
  useReactFlow,
  useViewport,
  ReactFlowProvider,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Crosshair, FileText, MousePointerSquareDashed, Undo2, Redo2, RotateCw } from 'lucide-react';
import { useNotesStore } from '@/stores/notesStore';
import type { NoteNodeData } from '@/stores/notesStore';
import { useThemeStore } from '@/stores/themeStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { LoadingSpinner } from '@/components/ui';
import { useCanvases } from '../hooks/useCanvases';
import NoteNode from './NoteNode';
import LinkNode from './LinkNode';
import GroupNode from './GroupNode';
import FloatingEdge from './FloatingEdge';
import { FloatingToolbar } from './FloatingToolbar';

// Custom node types
const nodeTypes = {
  noteNode: NoteNode,
  linkNode: LinkNode,
  groupNode: GroupNode,
};

type CanvasNode = Node<NoteNodeData | { label?: string | null; color?: string | null }>;
type BoundsRect = { x: number; y: number; width: number; height: number };

const NOTE_DROP_PREVIEW_SIZE = { width: 256, height: 96 };
const NOTE_DROP_DRAG_THRESHOLD = 6;
const SELECTION_DRAG_THRESHOLD = 6;

interface CanvasControlsProps {
  isSelecting: boolean;
  setIsSelecting: (isSelecting: boolean) => void;
  isPlacingNote: boolean;
  onStartNoteDrag: (event: React.PointerEvent<HTMLButtonElement>) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onRefresh: () => void;
}

// Canvas controls component (must be inside ReactFlowProvider)
function CanvasControls({
  isSelecting,
  setIsSelecting,
  isPlacingNote,
  onStartNoteDrag,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onRefresh,
}: CanvasControlsProps) {
  const { fitView } = useReactFlow();
  const accentColor = useThemeStore((state) => state.accentColor);

  const handleRecenter = useCallback(() => {
    fitView({ padding: 0.2, duration: 200 });
  }, [fitView]);

  return (
    <>
      {/* Top Right Controls */}
      <Panel position="top-right" className="!m-4 flex flex-col gap-2">
        {/* Selection Toggle */}
        <button
          onClick={() => setIsSelecting(!isSelecting)}
          className={`p-2 rounded-xl border shadow-lg transition-colors self-end ${isSelecting
            ? 'bg-secondary-100 dark:bg-secondary-700 text-accent border-accent'
            : 'bg-white dark:bg-secondary-800 border-secondary-200 dark:border-secondary-700 text-secondary-700 dark:text-secondary-200 hover:bg-secondary-50 dark:hover:bg-secondary-700'
            }`}
          style={isSelecting ? { color: accentColor, borderColor: accentColor } : {}}
          title="Select"
        >
          <MousePointerSquareDashed className="h-5 w-5" />
        </button>

        {/* Undo/Redo Controls */}
        <div className="flex flex-col gap-1 self-end">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-2 rounded-xl border shadow-lg transition-colors bg-white dark:bg-secondary-800 border-secondary-200 dark:border-secondary-700 text-secondary-700 dark:text-secondary-200 hover:bg-secondary-50 dark:hover:bg-secondary-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-secondary-800"
            title="Undo"
          >
            <Undo2 className="h-5 w-5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-2 rounded-xl border shadow-lg transition-colors bg-white dark:bg-secondary-800 border-secondary-200 dark:border-secondary-700 text-secondary-700 dark:text-secondary-200 hover:bg-secondary-50 dark:hover:bg-secondary-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-secondary-800"
            title="Redo"
          >
            <Redo2 className="h-5 w-5" />
          </button>
        </div>

        {/* Refresh Canvas Button */}
        <button
          onClick={onRefresh}
          className="p-2 rounded-xl border shadow-lg transition-colors bg-white dark:bg-secondary-800 border-secondary-200 dark:border-secondary-700 text-secondary-700 dark:text-secondary-200 hover:bg-secondary-50 dark:hover:bg-secondary-700 self-end"
          title="Refresh canvas"
        >
          <RotateCw className="h-5 w-5" />
        </button>
      </Panel>

      {/* Add Note Button */}
      <Panel position="bottom-center" className="!m-4">
        <button
          type="button"
          onPointerDown={onStartNoteDrag}
          className={`flex h-10 w-10 items-center justify-center rounded-lg border shadow-lg transition-colors cursor-grab active:cursor-grabbing ${isPlacingNote
            ? 'bg-secondary-100 dark:bg-secondary-700 text-accent border-accent'
            : 'bg-white dark:bg-secondary-800 border-secondary-200 dark:border-secondary-700 text-secondary-700 dark:text-secondary-200 hover:bg-secondary-50 dark:hover:bg-secondary-700'
            }`}
          style={isPlacingNote ? { color: accentColor, borderColor: accentColor } : {}}
          aria-label="Drag to add note"
          title="Drag to add note"
        >
          <FileText className="h-4 w-4" />
        </button>
      </Panel>

      {/* Recenter Button */}
      <Panel position="top-left" className="!m-4">
        <button
          onClick={handleRecenter}
          className="p-2 rounded-xl bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 shadow-lg hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors text-secondary-700 dark:text-secondary-200"
          aria-label="Recenter view"
        >
          <Crosshair className="h-5 w-5" />
        </button>
      </Panel>
    </>
  );
}

interface CanvasViewInnerProps {
  canvasId: string;
}

function CanvasViewInner({ canvasId }: CanvasViewInnerProps) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    connectNotes,
    createGroup,
    handleNoteDragEnd,
    createNote,
    updateNoteColor,
    updateEdge,
    updateGroup,
    deleteNote,
    deleteGroup,
    deleteEdge,
    fetchCanvasNotes,
  } = useNotesStore();

  // Temporal (undo/redo) state - get functions only (they're stable)
  const temporalStore = useNotesStore.temporal;
  // Initialize to false, let subscription sync actual state
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Sync all node/edge positions to database after undo/redo
  const syncToDatabase = useCallback(async () => {
    const { nodes: currentNodes } = useNotesStore.getState();
    const user = (await import('@/stores/authStore')).useAuthStore.getState().user;
    if (!user) return;

    const { supabase } = await import('@/lib/supabase');

    // Sync nodes (notes)
    for (const node of currentNodes) {
      if (node.type === 'noteNode' || node.type === 'linkNode') {
        // Calculate absolute position
        let absX = node.position.x;
        let absY = node.position.y;
        let groupId: string | null = null;
        if (node.parentNode) {
          const parent = currentNodes.find(n => n.id === node.parentNode);
          if (parent) {
            absX += parent.position.x;
            absY += parent.position.y;
            if (parent.type === 'groupNode') {
              groupId = parent.id;
            }
          }
        }
        await supabase
          .from('notes')
          .update({
            position_x: absX,
            position_y: absY,
            group_id: groupId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', node.id)
          .eq('user_id', user.id);
      }
    }

    // Sync groups
    for (const node of currentNodes) {
      if (node.type === 'groupNode') {
        await supabase
          .from('canvas_groups')
          .update({
            position_x: node.position.x,
            position_y: node.position.y,
            width: node.width ?? node.style?.width,
            height: node.height ?? node.style?.height,
            updated_at: new Date().toISOString()
          })
          .eq('id', node.id)
          .eq('user_id', user.id);
      }
    }
  }, []);

  // Safe undo/redo wrappers that also sync to database
  const handleUndo = useCallback(() => {
    const state = temporalStore.getState();
    if (state.pastStates.length > 0) {
      state.undo();
      // Sync changes to database after undo
      void syncToDatabase();
    }
  }, [temporalStore, syncToDatabase]);

  const handleRedo = useCallback(() => {
    const state = temporalStore.getState();
    if (state.futureStates.length > 0) {
      state.redo();
      // Sync changes to database after redo
      void syncToDatabase();
    }
  }, [temporalStore, syncToDatabase]);

  const pause = useCallback(() => {
    temporalStore.getState().pause();
  }, [temporalStore]);

  const resume = useCallback(() => {
    temporalStore.getState().resume();
  }, [temporalStore]);

  // Subscribe to temporal state changes
  useEffect(() => {
    // Clear any stale history and ensure we start fresh
    temporalStore.getState().clear();
    setCanUndo(false);
    setCanRedo(false);

    // Delay resuming tracking to allow ReactFlow's initial render to complete
    // This prevents spurious history entries from initial node positioning
    const resumeTimer = setTimeout(() => {
      temporalStore.getState().clear(); // Clear again in case anything was recorded
      temporalStore.getState().resume();
    }, 100);

    // Subscribe to changes
    const unsubscribe = temporalStore.subscribe((state) => {
      setCanUndo(state.pastStates.length > 0);
      setCanRedo(state.futureStates.length > 0);
    });

    return () => {
      clearTimeout(resumeTimer);
      temporalStore.getState().pause();
      unsubscribe();
    };
  }, [temporalStore]);

  const { screenToFlowPosition, fitView } = useReactFlow();
  const { zoom, x: viewportX, y: viewportY } = useViewport();

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState<BoundsRect | null>(null);
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);
  const selectionDragRef = useRef(false);
  const selectionJustFinishedRef = useRef(false);
  const selectionMoveStartRef = useRef<{ x: number; y: number } | null>(null);
  const selectionMoveDragRef = useRef(false);
  const selectionMoveRef = useRef<{
    startFlow: { x: number; y: number };
    nodePositions: Record<string, { x: number; y: number }>;
    nodeIds: string[];
    noteIds: string[];
  } | null>(null);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const noteDragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [isPlacingNote, setIsPlacingNote] = useState(false);
  const [noteDropPreview, setNoteDropPreview] = useState<{
    localX: number;
    localY: number;
  } | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);

  const handleConnect = useCallback(
    (connection: Connection) => {
      connectNotes(connection);
    },
    [connectNotes]
  );

  // Pause history tracking during node drag
  const handleNodeDragStart = useCallback(() => {
    pause();
  }, [pause]);

  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: CanvasNode) => {
      resume();
      if (node.type === 'noteNode' || node.type === 'linkNode') {
        handleNoteDragEnd(node.id);
      }
    },
    [handleNoteDragEnd, resume]
  );

  const previewWidth = NOTE_DROP_PREVIEW_SIZE.width * zoom;
  const previewHeight = NOTE_DROP_PREVIEW_SIZE.height * zoom;

  const getNodeSize = useCallback((node: CanvasNode) => {
    const width = (
      node.width ??
      node.style?.width ??
      (node.type === 'noteNode' || node.type === 'linkNode'
        ? NOTE_DROP_PREVIEW_SIZE.width
        : 0)
    ) as number;
    const height = (
      node.height ??
      node.style?.height ??
      (node.type === 'noteNode' || node.type === 'linkNode'
        ? NOTE_DROP_PREVIEW_SIZE.height
        : 0)
    ) as number;
    return { width, height };
  }, []);

  const getNodeAbsolutePosition = useCallback(
    (node: CanvasNode): { x: number; y: number } => {
      if (!node.parentNode) {
        return { x: node.position.x, y: node.position.y };
      }

      const parentNode = nodes.find((item) => item.id === node.parentNode) as CanvasNode | undefined;
      if (!parentNode) {
        return { x: node.position.x, y: node.position.y };
      }

      const parentPosition = getNodeAbsolutePosition(parentNode);
      return {
        x: node.position.x + parentPosition.x,
        y: node.position.y + parentPosition.y,
      };
    },
    [nodes]
  );

  const getNodeBounds = useCallback(
    (node: CanvasNode) => {
      const { width, height } = getNodeSize(node);
      const position = getNodeAbsolutePosition(node);
      return { x: position.x, y: position.y, width, height };
    },
    [getNodeAbsolutePosition, getNodeSize]
  );

  const selectedNodes = useMemo(
    () => (nodes.filter((node) => selectedNodeIds.includes(node.id)) as CanvasNode[]),
    [nodes, selectedNodeIds]
  );

  const selectionBounds = useMemo(() => {
    if (selectedNodes.length === 0) return null;

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    selectedNodes.forEach((node) => {
      if (node.type !== 'noteNode' && node.type !== 'linkNode' && node.type !== 'groupNode') {
        return;
      }
      const bounds = getNodeBounds(node);
      if (!bounds.width || !bounds.height) return;
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    });

    if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;

    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }, [getNodeBounds, selectedNodes]);

  const selectionScreenBounds = useMemo(() => {
    if (!selectionBounds) return null;
    return {
      left: selectionBounds.x * zoom + viewportX,
      top: selectionBounds.y * zoom + viewportY,
      width: selectionBounds.width * zoom,
      height: selectionBounds.height * zoom,
    };
  }, [selectionBounds, viewportX, viewportY, zoom]);

  const findGroupAtPosition = useCallback(
    (position: { x: number; y: number }) => {
      const matchingGroups = nodes.filter((node) => {
        if (node.type !== 'groupNode') return false;
        const width = (node.width ?? node.style?.width ?? 0) as number;
        const height = (node.height ?? node.style?.height ?? 0) as number;
        if (!width || !height) return false;

        return (
          position.x >= node.position.x &&
          position.x <= node.position.x + width &&
          position.y >= node.position.y &&
          position.y <= node.position.y + height
        );
      });

      if (matchingGroups.length === 0) return null;

      return matchingGroups.reduce((smallest, node) => {
        const nodeWidth = (node.width ?? node.style?.width ?? 0) as number;
        const nodeHeight = (node.height ?? node.style?.height ?? 0) as number;
        const smallestWidth = (smallest.width ?? smallest.style?.width ?? 0) as number;
        const smallestHeight = (smallest.height ?? smallest.style?.height ?? 0) as number;
        const nodeArea = nodeWidth * nodeHeight;
        const smallestArea = smallestWidth * smallestHeight;
        return nodeArea < smallestArea ? node : smallest;
      }).id;
    },
    [nodes]
  );

  const updateNoteDropPreview = useCallback(
    (clientX: number, clientY: number) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const isInside =
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom;

      if (!isInside) {
        setNoteDropPreview(null);
        return;
      }

      setNoteDropPreview({
        localX: clientX - rect.left,
        localY: clientY - rect.top,
      });
    },
    []
  );

  const handleStartNoteDrag = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      noteDragStartRef.current = { x: event.clientX, y: event.clientY };
      setIsPlacingNote(true);
      setNoteDropPreview(null);
    },
    []
  );

  useEffect(() => {
    if (!isPlacingNote) return;

    const handlePointerMove = (event: PointerEvent) => {
      const start = noteDragStartRef.current;
      if (!start) return;
      const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
      if (distance < NOTE_DROP_DRAG_THRESHOLD) return;
      updateNoteDropPreview(event.clientX, event.clientY);
    };

    const handlePointerEnd = (event: PointerEvent) => {
      const start = noteDragStartRef.current;
      noteDragStartRef.current = null;
      setIsPlacingNote(false);

      if (!canvasRef.current || !start) {
        setNoteDropPreview(null);
        return;
      }

      const rect = canvasRef.current.getBoundingClientRect();
      const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
      const isInside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;

      if (distance >= NOTE_DROP_DRAG_THRESHOLD && isInside) {
        const flowPosition = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        const groupId = findGroupAtPosition(flowPosition);
        createNote({
          x: flowPosition.x - NOTE_DROP_PREVIEW_SIZE.width / 2,
          y: flowPosition.y - NOTE_DROP_PREVIEW_SIZE.height / 2,
          canvasId,
          groupId,
          width: NOTE_DROP_PREVIEW_SIZE.width,
          height: NOTE_DROP_PREVIEW_SIZE.height,
        });
      }

      setNoteDropPreview(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, [
    canvasId,
    createNote,
    findGroupAtPosition,
    isPlacingNote,
    screenToFlowPosition,
    updateNoteDropPreview,
  ]);

  useEffect(() => {
    if (!isSelecting) {
      setSelectionRect(null);
      selectionStartRef.current = null;
      selectionDragRef.current = false;
    }
  }, [isSelecting]);

  // Magic Paste: Listen for paste events and create link nodes for URLs
  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      // Guard clause: Ignore if user is in an input or textarea
      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }

      const clipboardText = event.clipboardData?.getData('text')?.trim();
      if (!clipboardText) return;

      // Check if the clipboard text is a valid URL
      const isUrl = /^https?:\/\//i.test(clipboardText);
      if (!isUrl) return;

      // Prevent default paste behavior
      event.preventDefault();

      // Get viewport center position
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const centerScreen = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      const flowPosition = screenToFlowPosition(centerScreen);

      // Extract domain for title
      let title = 'Link';
      try {
        const urlObj = new URL(clipboardText);
        title = urlObj.hostname.replace('www.', '');
      } catch {
        // Use default title
      }

      // Create a link note at the center of the viewport
      await createNote({
        type: 'link',
        content: clipboardText,
        title,
        x: flowPosition.x - 140, // Half of 280 width
        y: flowPosition.y - 110, // Half of 220 height
        canvasId,
        width: 280,
        height: 220, // Taller for video embeds
      });
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [canvasId, createNote, screenToFlowPosition]);

  const edgeTypes = useMemo(() => ({
    floatingEdge: FloatingEdge,
  }), []);

  // Memoize edge options
  const defaultEdgeOptions = useMemo(
    () => ({
      style: { stroke: accentColor, strokeWidth: 3 },
      animated: true,
    }),
    [accentColor]
  );

  const clearSelection = useCallback(() => {
    setSelectedNodeIds([]);
    setSelectedEdgeIds([]);
  }, []);

  const rectContains = useCallback(
    (outer: BoundsRect, inner: BoundsRect) =>
      inner.x >= outer.x &&
      inner.y >= outer.y &&
      inner.x + inner.width <= outer.x + outer.width &&
      inner.y + inner.height <= outer.y + outer.height,
    []
  );

  const selectNodesInRect = useCallback(
    (rect: BoundsRect) => {
      const selectableNodes = (nodes as CanvasNode[])
        .filter(
          (node) =>
            node.type === 'noteNode' || node.type === 'linkNode' || node.type === 'groupNode'
        )
        .filter((node) => {
          const bounds = getNodeBounds(node);
          if (!bounds.width || !bounds.height) return false;
          return rectContains(rect, bounds);
        });

      const selectedNodeIdSet = new Set(selectableNodes.map((node) => node.id));
      const selectedEdges = edges.filter((edge) => {
        const sourceNode = (nodes as CanvasNode[]).find((node) => node.id === edge.source);
        const targetNode = (nodes as CanvasNode[]).find((node) => node.id === edge.target);
        if (!sourceNode || !targetNode) return false;

        if (!selectedNodeIdSet.has(sourceNode.id) || !selectedNodeIdSet.has(targetNode.id)) {
          return false;
        }

        const sourceBounds = getNodeBounds(sourceNode);
        const targetBounds = getNodeBounds(targetNode);
        if (!sourceBounds.width || !sourceBounds.height) return false;
        if (!targetBounds.width || !targetBounds.height) return false;
        return rectContains(rect, sourceBounds) && rectContains(rect, targetBounds);
      });

      setSelectedNodeIds(selectableNodes.map((node) => node.id));
      setSelectedEdgeIds(selectedEdges.map((edge) => edge.id));
    },
    [edges, getNodeBounds, nodes, rectContains]
  );

  const handleSelectionColor = useCallback(
    (color: string) => {
      selectedNodes.forEach((node) => {
        if (node.type === 'noteNode' || node.type === 'linkNode') {
          void updateNoteColor(node.id, color);
          return;
        }

        if (node.type === 'groupNode') {
          void updateGroup(node.id, { color });
        }
      });

      selectedEdgeIds.forEach((edgeId) => {
        void updateEdge(edgeId, { color });
      });
    },
    [selectedEdgeIds, selectedNodes, updateEdge, updateGroup, updateNoteColor]
  );

  const handleSelectionRecenter = useCallback(() => {
    if (selectedNodeIds.length === 0) return;
    fitView({
      nodes: selectedNodeIds.map((id) => ({ id })),
      padding: 0.2,
      duration: 400,
    });
  }, [fitView, selectedNodeIds]);

  const handleSelectionDelete = useCallback(async () => {
    const notesToDelete = selectedNodes.filter(
      (node) => node.type === 'noteNode' || node.type === 'linkNode'
    );
    const groupsToDelete = selectedNodes.filter((node) => node.type === 'groupNode');
    const edgesToDelete = selectedEdgeIds;

    if (notesToDelete.length > 0) {
      const message =
        notesToDelete.length === 1
          ? 'Are you sure you want to delete this note? This cannot be undone.'
          : `Are you sure you want to delete these ${notesToDelete.length} notes? This cannot be undone.`;
      if (!window.confirm(message)) return;
    }

    await Promise.all([
      ...notesToDelete.map((node) => deleteNote(node.id)),
      ...groupsToDelete.map((node) => deleteGroup(node.id)),
      ...edgesToDelete.map((edgeId) => deleteEdge(edgeId)),
    ]);
    clearSelection();
  }, [clearSelection, deleteEdge, deleteGroup, deleteNote, selectedEdgeIds, selectedNodes]);

  const handleSelectionGroup = useCallback(async () => {
    if (!selectionBounds) return;
    await createGroup(selectionBounds);
    clearSelection();
  }, [clearSelection, createGroup, selectionBounds]);

  const isSelectionTrigger = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target) return false;
    if (target.closest('.react-flow__panel')) return false;
    if (target.closest('[data-selection-toolbar]')) return false;
    if (target.closest('[data-selection-bounds]')) return false;
    return true;
  }, []);

  const getMovableSelectionNodes = useCallback(() => {
    const selectedGroupIds = new Set(
      selectedNodes.filter((node) => node.type === 'groupNode').map((node) => node.id)
    );

    return selectedNodes.filter(
      (node) => !(node.parentNode && selectedGroupIds.has(node.parentNode))
    );
  }, [selectedNodes]);

  const onSelectionBoundsPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (selectedNodeIds.length === 0) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();

      const movableNodes = getMovableSelectionNodes();
      if (movableNodes.length === 0) return;

      // Pause history tracking during selection drag
      pause();

      const startFlow = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const nodePositions = movableNodes.reduce<Record<string, { x: number; y: number }>>(
        (acc, node) => {
          acc[node.id] = { x: node.position.x, y: node.position.y };
          return acc;
        },
        {}
      );

      selectionMoveRef.current = {
        startFlow,
        nodePositions,
        nodeIds: movableNodes.map((node) => node.id),
        noteIds: movableNodes
          .filter((node) => node.type === 'noteNode' || node.type === 'linkNode')
          .map((node) => node.id),
      };
      selectionMoveStartRef.current = { x: event.clientX, y: event.clientY };
      selectionMoveDragRef.current = false;
      setIsDraggingSelection(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [getMovableSelectionNodes, pause, screenToFlowPosition, selectedNodeIds.length]
  );

  const onSelectionBoundsPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const dragState = selectionMoveRef.current;
      const startScreen = selectionMoveStartRef.current;
      if (!dragState || !startScreen) return;
      event.preventDefault();
      event.stopPropagation();

      const distance = Math.hypot(
        event.clientX - startScreen.x,
        event.clientY - startScreen.y
      );
      if (!selectionMoveDragRef.current && distance < SELECTION_DRAG_THRESHOLD) {
        return;
      }

      selectionMoveDragRef.current = true;
      const currentFlow = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const delta = {
        x: currentFlow.x - dragState.startFlow.x,
        y: currentFlow.y - dragState.startFlow.y,
      };

      const changes = dragState.nodeIds.map((id) => ({
        id,
        type: 'position' as const,
        position: {
          x: dragState.nodePositions[id].x + delta.x,
          y: dragState.nodePositions[id].y + delta.y,
        },
        dragging: true,
      }));

      onNodesChange(changes);
    },
    [onNodesChange, screenToFlowPosition]
  );

  const onSelectionBoundsPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const dragState = selectionMoveRef.current;
      const startScreen = selectionMoveStartRef.current;

      // Resume history tracking
      resume();

      if (!dragState || !startScreen) {
        setIsDraggingSelection(false);
        return;
      }
      event.preventDefault();
      event.stopPropagation();

      const distance = Math.hypot(
        event.clientX - startScreen.x,
        event.clientY - startScreen.y
      );
      const didDrag = selectionMoveDragRef.current || distance >= SELECTION_DRAG_THRESHOLD;

      if (didDrag) {
        const currentFlow = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        const delta = {
          x: currentFlow.x - dragState.startFlow.x,
          y: currentFlow.y - dragState.startFlow.y,
        };

        const changes = dragState.nodeIds.map((id) => ({
          id,
          type: 'position' as const,
          position: {
            x: dragState.nodePositions[id].x + delta.x,
            y: dragState.nodePositions[id].y + delta.y,
          },
          dragging: false,
        }));

        onNodesChange(changes);
        dragState.noteIds.forEach((noteId) => {
          void handleNoteDragEnd(noteId);
        });
      }

      selectionMoveRef.current = null;
      selectionMoveStartRef.current = null;
      selectionMoveDragRef.current = false;
      setIsDraggingSelection(false);

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [handleNoteDragEnd, onNodesChange, resume, screenToFlowPosition]
  );

  const onSelectionMouseDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isSelecting) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (!isSelectionTrigger(e)) return;
      e.preventDefault();
      e.stopPropagation();
      selectionStartRef.current = { x: e.clientX, y: e.clientY };
      selectionDragRef.current = false;
      setSelectionRect({ x: e.clientX, y: e.clientY, width: 0, height: 0 });
      clearSelection();
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [clearSelection, isSelecting, isSelectionTrigger]
  );

  const onSelectionMouseMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isSelecting || !selectionStartRef.current) return;

      const startX = selectionStartRef.current.x;
      const startY = selectionStartRef.current.y;
      const currentX = e.clientX;
      const currentY = e.clientY;
      const distance = Math.hypot(currentX - startX, currentY - startY);

      if (!selectionDragRef.current && distance < SELECTION_DRAG_THRESHOLD) {
        return;
      }

      selectionDragRef.current = true;

      setSelectionRect({
        x: Math.min(startX, currentX),
        y: Math.min(startY, currentY),
        width: Math.abs(currentX - startX),
        height: Math.abs(currentY - startY),
      });
    },
    [isSelecting]
  );

  const onSelectionMouseUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isSelecting || !selectionStartRef.current) return;

      const start = selectionStartRef.current;
      const end = { x: e.clientX, y: e.clientY };
      const distance = Math.hypot(end.x - start.x, end.y - start.y);
      const didDrag = selectionDragRef.current || distance >= SELECTION_DRAG_THRESHOLD;

      const startFlow = screenToFlowPosition(start);
      const endFlow = screenToFlowPosition(end);

      const flowBounds = {
        x: Math.min(startFlow.x, endFlow.x),
        y: Math.min(startFlow.y, endFlow.y),
        width: Math.abs(endFlow.x - startFlow.x),
        height: Math.abs(endFlow.y - startFlow.y),
      };

      if (!didDrag) {
        setSelectionRect(null);
        selectionStartRef.current = null;
        selectionDragRef.current = false;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
        return;
      }

      selectNodesInRect(flowBounds);
      setSelectionRect(null);
      selectionStartRef.current = null;
      selectionDragRef.current = false;
      selectionJustFinishedRef.current = true;
      window.setTimeout(() => {
        selectionJustFinishedRef.current = false;
      }, 0);
      setIsSelecting(false);
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    },
    [isSelecting, screenToFlowPosition, selectNodesInRect]
  );

  const handlePaneClick = useCallback(() => {
    if (selectionJustFinishedRef.current) {
      selectionJustFinishedRef.current = false;
      return;
    }
    if (selectedNodeIds.length === 0) return;
    clearSelection();
  }, [clearSelection, selectedNodeIds]);


  return (
    <div
      ref={canvasRef}
      className={`w-full h-full relative ${isSelecting ? 'canvas-selecting cursor-crosshair' : ''}`}
      onPointerDown={onSelectionMouseDown}
      onPointerMove={onSelectionMouseMove}
      onPointerUp={onSelectionMouseUp}
      onPointerCancel={onSelectionMouseUp}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        panOnDrag={!isSelecting}
        snapToGrid
        snapGrid={[16, 16]}
        deleteKeyCode={['Backspace', 'Delete']}
        className="bg-light-bg dark:bg-secondary-900"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          className="!bg-light-bg dark:!bg-secondary-900"
          color="currentColor"
        />

        {/* MiniMap - desktop only */}
        <MiniMap
          className="!bg-white dark:!bg-secondary-800 !border-secondary-200 dark:!border-secondary-700 hidden lg:block"
          nodeColor={(node) => {
            if (node.type === 'groupNode') {
              return (node.data.color || accentColor) + '40';
            }
            return accentColor;
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
          pannable
        />

        <CanvasControls
          isSelecting={isSelecting}
          setIsSelecting={setIsSelecting}
          isPlacingNote={isPlacingNote}
          onStartNoteDrag={handleStartNoteDrag}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onRefresh={() => fetchCanvasNotes(canvasId)}
        />
      </ReactFlow>

      {/* Selection Bounds + Toolbar */}
      {selectionScreenBounds && selectedNodeIds.length > 0 && (
        <>
          <div
            className={`absolute z-30 pointer-events-auto ${isDraggingSelection ? 'cursor-grabbing' : 'cursor-move'
              }`}
            data-selection-bounds
            onPointerDown={onSelectionBoundsPointerDown}
            onPointerMove={onSelectionBoundsPointerMove}
            onPointerUp={onSelectionBoundsPointerUp}
            onPointerCancel={onSelectionBoundsPointerUp}
            style={{
              left: selectionScreenBounds.left,
              top: selectionScreenBounds.top,
              width: selectionScreenBounds.width,
              height: selectionScreenBounds.height,
            }}
          >
            <div className="w-full h-full rounded-xl border-2 border-dashed border-secondary-300/70 dark:border-secondary-500/70 bg-secondary-200/10 dark:bg-secondary-700/10 pointer-events-none" />
          </div>

          <div
            className="absolute z-40 pointer-events-none"
            style={{
              left: selectionScreenBounds.left + selectionScreenBounds.width / 2,
              top: selectionScreenBounds.top,
            }}
          >
            <div
              className="-translate-x-1/2 -translate-y-full mb-2 pointer-events-auto"
              data-selection-toolbar
              onPointerDown={(event) => event.stopPropagation()}
            >
              <FloatingToolbar
                onColor={handleSelectionColor}
                onFocus={handleSelectionRecenter}
                onDelete={handleSelectionDelete}
                onGroup={handleSelectionGroup}
                color={selectedNodes[0]?.data?.color ?? undefined}
              />
            </div>
          </div>
        </>
      )}

      {/* Note Drop Preview */}
      {noteDropPreview && (
        <div
          className="absolute z-40 pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{ left: noteDropPreview.localX, top: noteDropPreview.localY }}
        >
          <div
            className="rounded-xl border border-secondary-200/60 dark:border-secondary-600/50 bg-white/40 dark:bg-secondary-700/30 shadow-sm"
            style={{ width: previewWidth, height: previewHeight }}
          />
        </div>
      )}

      {/* Selection Overlay */}
      {selectionRect && (
        <div
          className="fixed z-20 pointer-events-none border-2 border-dashed border-accent bg-accent/5 rounded-lg"
          style={{
            left: selectionRect.x,
            top: selectionRect.y,
            width: selectionRect.width,
            height: selectionRect.height,
            borderColor: accentColor,
            backgroundColor: `${accentColor}0D`,
          }}
        />
      )}
    </div>
  );
}

interface CanvasViewProps {
  canvasId: string;
}

export function CanvasView({ canvasId }: CanvasViewProps) {
  const { loading, error, fetchCanvasNotes, clearCanvasState } = useNotesStore();
  const { updateTabTitle } = useWorkspaceStore();
  const { canvases, updateLastAccessed } = useCanvases();

  // Find the canvas to get its name
  const canvas = canvases.find((c) => c.id === canvasId);

  // Fetch notes for this canvas when it mounts or canvasId changes
  useEffect(() => {
    fetchCanvasNotes(canvasId);
    updateLastAccessed(canvasId);

    return () => {
      // Clear canvas state when unmounting
      clearCanvasState();
    };
  }, [canvasId, fetchCanvasNotes, updateLastAccessed, clearCanvasState]);

  // Update tab title when canvas name changes
  useEffect(() => {
    if (canvas) {
      const tab = useWorkspaceStore.getState().findTabByEntity('canvas', canvasId);
      if (tab && tab.title !== canvas.name) {
        updateTabTitle(tab.id, canvas.name);
      }
    }
  }, [canvas, canvasId, updateTabTitle]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-light-bg dark:bg-secondary-900">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-light-bg dark:bg-secondary-900">
        <div className="text-center">
          <p className="text-red-500 mb-2">Failed to load canvas</p>
          <p className="text-secondary-500 text-sm">{error}</p>
          <button
            onClick={() => fetchCanvasNotes(canvasId)}
            className="mt-4 px-4 py-2 bg-secondary-100 dark:bg-secondary-800 rounded-lg hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <ReactFlowProvider>
        <CanvasViewInner canvasId={canvasId} />
      </ReactFlowProvider>
      {/* Note editor overlay is handled by the parent NotesPage */}
    </div>
  );
}

export default CanvasView;
