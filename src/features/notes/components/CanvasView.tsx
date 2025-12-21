import { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import ReactFlow, {
  Background,
  MiniMap,
  Connection,
  BackgroundVariant,
  Panel,
  ConnectionMode,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Plus, Crosshair, Square } from 'lucide-react';
import { useNotesStore } from '@/stores/notesStore';
import { useThemeStore } from '@/stores/themeStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useCanvases } from '../hooks/useCanvases';
import { LoadingSpinner } from '@/components/ui';
import NoteNode from './NoteNode';
import GroupNode from './GroupNode';

// Custom node types
const nodeTypes = {
  noteNode: NoteNode,
  groupNode: GroupNode,
};

interface CanvasControlsProps {
  canvasId: string;
  isGrouping: boolean;
  setIsGrouping: (isGrouping: boolean) => void;
}

// Canvas controls component (must be inside ReactFlowProvider)
function CanvasControls({ canvasId, isGrouping, setIsGrouping }: CanvasControlsProps) {
  const { fitView } = useReactFlow();
  const accentColor = useThemeStore((state) => state.accentColor);
  const { createNote } = useNotesStore();

  const handleAddNote = useCallback(() => {
    createNote({
      x: Math.random() * 400 + 100,
      y: Math.random() * 300 + 100,
      canvasId,
    });
  }, [createNote, canvasId]);

  const handleRecenter = useCallback(() => {
    fitView({ padding: 0.2, duration: 200 });
  }, [fitView]);

  return (
    <>
      {/* Top Right Controls */}
      <Panel position="top-right" className="!m-4 flex flex-col gap-2">
        <button
          onClick={handleAddNote}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 shadow-lg hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors text-secondary-700 dark:text-secondary-200"
          style={{ color: accentColor }}
        >
          <Plus className="h-5 w-5" />
          <span className="font-medium">Add Note</span>
        </button>

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
  const { nodes, edges, onNodesChange, onEdgesChange, connectNotes, createGroup, handleNoteDragEnd } = useNotesStore();
  const { addTab } = useWorkspaceStore();
  const { screenToFlowPosition } = useReactFlow();

  const [isGrouping, setIsGrouping] = useState(false);
  const [selectionRect, setSelectionRect] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  const startPosRef = useRef<{x: number, y: number} | null>(null);

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

  // Handle double clicking a note node
  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: any) => {
      if (node.type === 'noteNode') {
        addTab('note', node.id, node.data.title || 'Untitled');
      }
    },
    [addTab]
  );

  // Memoize edge options
  const defaultEdgeOptions = useMemo(
    () => ({
      style: { stroke: accentColor, strokeWidth: 2 },
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
    <div className={`w-full h-full relative ${isGrouping ? 'cursor-crosshair' : ''}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeDragStop={handleNodeDragStop}
        onNodeDoubleClick={handleNodeDoubleClick}
        nodeTypes={nodeTypes}
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

        <CanvasControls canvasId={canvasId} isGrouping={isGrouping} setIsGrouping={setIsGrouping} />
      </ReactFlow>

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