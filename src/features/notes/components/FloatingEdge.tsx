import { useState, useRef, useEffect } from 'react';
import { EdgeProps, getSmoothStepPath, EdgeLabelRenderer, BaseEdge, useReactFlow, useViewport } from 'reactflow';
import { useNotesStore } from '@/stores/notesStore';
import { FloatingToolbar } from './FloatingToolbar';

export default function FloatingEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) {
  const { updateEdge, deleteEdge } = useNotesStore();
  const { zoom } = useViewport();
  
  const [showToolbar, setShowToolbar] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Close toolbar when clicking outside
  useEffect(() => {
    if (!showToolbar) return;

    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is inside the toolbar
      if (toolbarRef.current && toolbarRef.current.contains(event.target as Node)) {
        return;
      }
      setShowToolbar(false);
    };

    // Use capture phase to ensure we catch the click before propagation stops
    window.addEventListener('mousedown', handleClickOutside, { capture: true });
    return () => {
      window.removeEventListener('mousedown', handleClickOutside, { capture: true });
    };
  }, [showToolbar]);

  const onEdgeDoubleClick = (evt: React.MouseEvent) => {
    evt.stopPropagation();
    setShowToolbar((prev) => !prev);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setShowToolbar(false);
  };

  const handleColor = (newColor: string) => {
    updateEdge(id, { color: newColor });
  };
  
  // Custom focus implementation for edge
  const { setCenter } = useReactFlow();
  const handleFocusEdge = () => {
      const centerX = (sourceX + targetX) / 2;
      const centerY = (sourceY + targetY) / 2;
      setCenter(centerX, centerY, { zoom: 1.5, duration: 800 });
  };

  const handleDelete = () => {
    deleteEdge(id);
  };

  const handleLabelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (labelInputRef.current) {
        updateEdge(id, { label: labelInputRef.current.value });
    }
    setIsEditing(false);
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      {/* Invisible interaction path */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={20}
        className="react-flow__edge-interaction"
        onDoubleClick={onEdgeDoubleClick}
        style={{ cursor: 'pointer' }}
      />
      
      <EdgeLabelRenderer>
        <div
            style={{
                position: 'absolute',
                // Counter-scale to maintain fixed screen size for edges as requested
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px) scale(${1 / zoom})`,
                pointerEvents: 'all',
                zIndex: 1000, 
            }}
            className="nodrag nopan"
        >
            {/* Toolbar */}
            {showToolbar && (
                <div 
                    ref={toolbarRef}
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-[9999]"
                >
                    <FloatingToolbar 
                        onEdit={handleEdit}
                        onColor={handleColor}
                        onFocus={handleFocusEdge}
                        onDelete={handleDelete}
                        color={data?.color}
                    />
                </div>
            )}

            {/* Label Display */}
            {data?.label && !isEditing && (
                <div 
                    className="px-2 py-1 bg-white dark:bg-secondary-800 rounded shadow-md border border-secondary-200 dark:border-secondary-700 text-sm font-semibold text-secondary-700 dark:text-secondary-200 whitespace-nowrap"
                    onDoubleClick={onEdgeDoubleClick}
                    style={data?.color ? { borderColor: data.color, color: data.color } : {}}
                >
                    {data.label}
                </div>
            )}

            {/* Label Editor */}
            {isEditing && (
                <form onSubmit={handleLabelSubmit}>
                    <input
                        ref={labelInputRef}
                        autoFocus
                        defaultValue={data?.label || ''}
                        className="px-2 py-1 rounded bg-white dark:bg-secondary-800 border border-accent shadow-lg text-sm font-semibold outline-none min-w-[100px]"
                        onBlur={() => {
                             if (labelInputRef.current) updateEdge(id, { label: labelInputRef.current.value });
                             setIsEditing(false);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') setIsEditing(false);
                        }}
                    />
                </form>
            )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}