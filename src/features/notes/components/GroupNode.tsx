import { memo, useState, useMemo, useCallback, useEffect } from 'react';
import { NodeProps, NodeResizer, Handle, Position, NodeToolbar, useReactFlow } from 'reactflow';
import { useNotesStore } from '@/stores/notesStore';
import { useDoubleTap } from '@/hooks/useDoubleTap';
import { FloatingToolbar } from './FloatingToolbar';

interface GroupNodeData {
  label?: string | null;
  color?: string;
}

const GroupNode = memo(({ data, selected, id }: NodeProps<GroupNodeData>) => {
  const { updateGroup, deleteGroup } = useNotesStore();
  const { fitView } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  
  // Use the stored color or default
  const color = data.color || '#3b82f6';
  
  // Generate background with low opacity
  const backgroundColor = `${color}1A`; // 10% opacity (approx hex)

  // Hide toolbar when deselected
  useEffect(() => {
    if (!selected) {
      setShowToolbar(false);
    }
  }, [selected]);

  const handleDoubleTap = useCallback(() => {
    setShowToolbar((prev) => !prev);
  }, []);

  const doubleTapHandlers = useDoubleTap(handleDoubleTap);

  const handleEdit = useCallback(() => {
    setIsEditingLabel(true);
    setShowToolbar(false);
  }, []);

  const handleColor = useCallback(
    (newColor: string) => {
      void updateGroup(id, { color: newColor });
    },
    [updateGroup, id]
  );

  const handleFocus = useCallback(() => {
    fitView({ nodes: [{ id }], padding: 0.1, duration: 800 });
  }, [fitView, id]);

  const handleDelete = useCallback(() => {
    void deleteGroup(id);
  }, [deleteGroup, id]);

  const handleClasses = useMemo(
    () =>
      `!w-8 !h-8 !rounded-full !bg-white dark:!bg-secondary-900 !border !border-solid opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20 ${
        isHovered ? 'pointer-events-auto' : 'pointer-events-none'
      }`,
    [isHovered]
  );

  const handleStyle = useMemo(
    () => ({
      borderColor: color,
      borderWidth: 3,
    }),
    [color]
  );
  const handleOffsetStyles = useMemo(
    () => ({
      top: { transform: 'translate(-50%, -50%)' },
      right: { transform: 'translate(50%, -50%)' },
      bottom: { transform: 'translate(-50%, 50%)' },
      left: { transform: 'translate(-50%, -50%)' },
    }),
    []
  );

  return (
    <div
      className="group w-full h-full relative rounded-2xl border-2 transition-all duration-200"
      style={{
        borderColor: color,
        backgroundColor: backgroundColor,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...doubleTapHandlers}
    >
      <NodeToolbar
        isVisible={showToolbar}
        position={Position.Top}
        offset={10}
        align="center"
      >
        <FloatingToolbar
          onEdit={handleEdit}
          onColor={handleColor}
          onFocus={handleFocus}
          onDelete={handleDelete}
          color={color}
        />
      </NodeToolbar>

      <NodeResizer 
        isVisible={selected || isHovered} 
        minWidth={100} 
        minHeight={100}
        color={color}
        handleStyle={{ width: 16, height: 16, borderRadius: 8 }}
      />
      
      {/* Connection Handles */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className={handleClasses}
        style={{ ...handleStyle, ...handleOffsetStyles.top }}
        isConnectableStart
        isConnectableEnd
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={handleClasses}
        style={{ ...handleStyle, ...handleOffsetStyles.right }}
        isConnectableStart
        isConnectableEnd
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={handleClasses}
        style={{ ...handleStyle, ...handleOffsetStyles.bottom }}
        isConnectableStart
        isConnectableEnd
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className={handleClasses}
        style={{ ...handleStyle, ...handleOffsetStyles.left }}
        isConnectableStart
        isConnectableEnd
      />

      {/* Header / Controls */}
      <div className="absolute -top-10 left-0 flex items-center gap-2">
        {isEditingLabel ? (
          <input
            autoFocus
            className="px-2 py-1 rounded bg-white dark:bg-secondary-800 border shadow-sm text-sm outline-none"
            defaultValue={data.label ?? ''}
            onBlur={(e) => {
              void updateGroup(id, { label: e.target.value });
              setIsEditingLabel(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                void updateGroup(id, { label: (e.target as HTMLInputElement).value });
                setIsEditingLabel(false);
              }
            }}
          />
        ) : (
          <span 
            className="font-bold text-lg px-1 cursor-pointer select-none"
            style={{ color }}
            onDoubleClick={(e) => { e.stopPropagation(); setIsEditingLabel(true); }}
          >
            {data.label || 'Group'}
          </span>
        )}
      </div>
    </div>
  );
});

export default GroupNode;
