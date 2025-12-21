import { useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  MiniMap,
  Connection,
  BackgroundVariant,
  Panel,
  ConnectionMode,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Plus, Crosshair } from 'lucide-react';
import { useNotesStore } from '@/stores/notesStore';
import { useThemeStore } from '@/stores/themeStore';
import NoteNode from './NoteNode';
import GroupNode from './GroupNode';
import FloatingEdge from './FloatingEdge';

// Custom node types
const nodeTypes = {
  noteNode: NoteNode,
  groupNode: GroupNode,
};

// Canvas controls component (must be inside ReactFlowProvider)
function CanvasControls() {
  const { fitView } = useReactFlow();
  const accentColor = useThemeStore((state) => state.accentColor);
  const { createNote } = useNotesStore();

  const handleAddNote = useCallback(() => {
    createNote({
      x: Math.random() * 400 + 100,
      y: Math.random() * 300 + 100,
    });
  }, [createNote]);

  const handleRecenter = useCallback(() => {
    fitView({ padding: 0.2, duration: 200 });
  }, [fitView]);

  return (
    <>
      {/* Add Note Button */}
      <Panel position="top-right" className="!m-4">
        <button
          onClick={handleAddNote}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 shadow-lg hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors text-secondary-700 dark:text-secondary-200"
          style={{ color: accentColor }}
        >
          <Plus className="h-5 w-5" />
          <span className="font-medium">Add Note</span>
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

function NotesCanvas() {
  const accentColor = useThemeStore((state) => state.accentColor);
  const { nodes, edges, onNodesChange, onEdgesChange, connectNotes } = useNotesStore();

  const handleConnect = useCallback(
    (connection: Connection) => {
      connectNotes(connection);
    },
    [connectNotes]
  );
  
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

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
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
        />

        <CanvasControls />
      </ReactFlow>
    </div>
  );
}

export default NotesCanvas;