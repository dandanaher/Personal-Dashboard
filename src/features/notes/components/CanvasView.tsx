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
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Crosshair, Square, FileText } from 'lucide-react';
import { useNotesStore } from '@/stores/notesStore';
import { useThemeStore } from '@/stores/themeStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useCanvases } from '../hooks/useCanvases';
import { LoadingSpinner } from '@/components/ui';
import NoteNode from './NoteNode';
import GroupNode from './GroupNode';
import FloatingEdge from './FloatingEdge';

// Custom node types
const nodeTypes = {
  noteNode: NoteNode,
  groupNode: GroupNode,
};

const NOTE_DROP_PREVIEW_SIZE = { width: 256, height: 96 };
const NOTE_DROP_DRAG_THRESHOLD = 6;

interface CanvasControlsProps {
  isGrouping: boolean;
  setIsGrouping: (isGrouping: boolean) => void;
  isPlacingNote: boolean;
  onStartNoteDrag: (event: React.PointerEvent<HTMLButtonElement>) => void;
}

// Canvas controls component (must be inside ReactFlowProvider)
function CanvasControls({
  isGrouping,
  setIsGrouping,
  isPlacingNote,
  onStartNoteDrag,
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
         {/* Grouping Toggle */}
        <button 
           onClick={() => setIsGrouping(!isGrouping)}
           className={`p-2 rounded-xl border shadow-lg transition-colors self-end ${
               isGrouping 
               ? 'bg-secondary-100 dark:bg-secondary-700 text-accent border-accent' 
               : 'bg-white dark:bg-secondary-800 border-secondary-200 dark:border-secondary-700 text-secondary-700 dark:text-secondary-200 hover:bg-secondary-50 dark:hover:bg-secondary-700'
           }`}
           style={isGrouping ? { color: accentColor, borderColor: accentColor } : {}}
           title="Create Group (Drag to select)"
        >
            <Square className="h-5 w-5" />
        </button>
      </Panel>

      {/* Add Note Button */}
      <Panel position="bottom-center" className="!m-4">
        <button
          type="button"
          onPointerDown={onStartNoteDrag}
          className={`flex h-10 w-10 items-center justify-center rounded-lg border shadow-lg transition-colors cursor-grab active:cursor-grabbing ${
            isPlacingNote
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
  } = useNotesStore();
  const { screenToFlowPosition } = useReactFlow();
  const { zoom } = useViewport();

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [isGrouping, setIsGrouping] = useState(false);
  const [selectionRect, setSelectionRect] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  const startPosRef = useRef<{x: number, y: number} | null>(null);
  const noteDragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [isPlacingNote, setIsPlacingNote] = useState(false);
  const [noteDropPreview, setNoteDropPreview] = useState<{
    localX: number;
    localY: number;
  } | null>(null);

  const handleConnect = useCallback(
    (connection: Connection) => {
      connectNotes(connection);
    },
    [connectNotes]
  );
  
  const handleNodeDragStop = useCallback(
      (_event: React.MouseEvent, node: any) => {
          if (node.type === 'noteNode') {
              handleNoteDragEnd(node.id);
          }
      },
      [handleNoteDragEnd]
  );

  const previewWidth = NOTE_DROP_PREVIEW_SIZE.width * zoom;
  const previewHeight = NOTE_DROP_PREVIEW_SIZE.height * zoom;

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

  // Grouping handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
      if (!isGrouping) return;
      startPosRef.current = { x: e.clientX, y: e.clientY };
      setSelectionRect({ x: e.clientX, y: e.clientY, width: 0, height: 0 });
  }, [isGrouping]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
      if (!isGrouping || !startPosRef.current) return;
      
      const startX = startPosRef.current.x;
      const startY = startPosRef.current.y;
      const currentX = e.clientX;
      const currentY = e.clientY;
      
      setSelectionRect({
          x: Math.min(startX, currentX),
          y: Math.min(startY, currentY),
          width: Math.abs(currentX - startX),
          height: Math.abs(currentY - startY)
      });
  }, [isGrouping]);

  const onMouseUp = useCallback(async (e: React.MouseEvent) => {
      if (!isGrouping || !startPosRef.current) return;
      
      const start = startPosRef.current;
      const end = { x: e.clientX, y: e.clientY };
      
      // Calculate Flow bounds
      // We must check if screenToFlowPosition is available (it should be if initialized)
      // If the rect is tiny, ignore
      if (Math.abs(end.x - start.x) < 10 && Math.abs(end.y - start.y) < 10) {
           setSelectionRect(null);
           startPosRef.current = null;
           return;
      }

      const startFlow = screenToFlowPosition(start);
      const endFlow = screenToFlowPosition(end);
      
      const flowBounds = {
          x: Math.min(startFlow.x, endFlow.x),
          y: Math.min(startFlow.y, endFlow.y),
          width: Math.abs(endFlow.x - startFlow.x),
          height: Math.abs(endFlow.y - startFlow.y)
      };
      
      if (flowBounds.width > 50 && flowBounds.height > 50) {
          await createGroup(flowBounds);
          setIsGrouping(false);
      }
      
      setSelectionRect(null);
      startPosRef.current = null;
  }, [isGrouping, screenToFlowPosition, createGroup]);


  return (
    <div
      ref={canvasRef}
      className={`w-full h-full relative ${isGrouping ? 'cursor-crosshair' : ''}`}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeDragStop={handleNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
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
          isGrouping={isGrouping}
          setIsGrouping={setIsGrouping}
          isPlacingNote={isPlacingNote}
          onStartNoteDrag={handleStartNoteDrag}
        />
      </ReactFlow>

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

      {/* Grouping Overlay */}
      {isGrouping && (
          <div 
             className="absolute inset-0 z-50"
             onMouseDown={onMouseDown}
             onMouseMove={onMouseMove}
             onMouseUp={onMouseUp}
          >
              {selectionRect && (
                  <div 
                      className="fixed border-2 border-accent bg-accent/10 pointer-events-none"
                      style={{
                          left: selectionRect.x,
                          top: selectionRect.y,
                          width: selectionRect.width,
                          height: selectionRect.height,
                          borderColor: accentColor,
                          backgroundColor: `${accentColor}1A`
                      }}
                  />
              )}
          </div>
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
