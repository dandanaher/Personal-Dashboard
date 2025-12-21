import { memo, useState, useMemo, useCallback, useEffect } from 'react';
import { NodeProps, NodeResizer, Handle, Position, NodeToolbar, useReactFlow } from 'reactflow';
import { useNotesStore } from '@/stores/notesStore';
import { FloatingToolbar } from './FloatingToolbar';

const GroupNode = memo(({ data, selected, id }: NodeProps) => {
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

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowToolbar((prev) => !prev);
  }, []);

  const handleEdit = useCallback(() => {
    setIsEditingLabel(true);
    setShowToolbar(false);
  }, []);

  const handleColor = useCallback((newColor: string) => {
    updateGroup(id, { color: newColor });
  }, [updateGroup, id]);

  const handleFocus = useCallback(() => {
    fitView({ nodes: [{ id }], padding: 0.1, duration: 800 });
  }, [fitView, id]);

  const handleDelete = useCallback(() => {
    deleteGroup(id);
  }, [deleteGroup, id]);

  const handleClasses = useMemo(
    () =>
      `!w-3.5 !h-3.5 !rounded-full !border-2 !bg-white dark:!bg-secondary-900 !border-secondary-200 dark:!border-secondary-700 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ${
        isHovered ? 'pointer-events-auto' : 'pointer-events-none'
      }`,
    [isHovered]
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
      onDoubleClick={handleDoubleClick}
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
        handleStyle={{ width: 8, height: 8, borderRadius: 4 }}
      />
      
      {/* Connection Handles */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className={handleClasses}
        style={{ borderColor: color }}
        isConnectableStart={isHovered}
        isConnectableEnd={isHovered}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={handleClasses}
        style={{ borderColor: color }}
        isConnectableStart={isHovered}
        isConnectableEnd={isHovered}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={handleClasses}
        style={{ borderColor: color }}
        isConnectableStart={isHovered}
        isConnectableEnd={isHovered}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className={handleClasses}
        style={{ borderColor: color }}
        isConnectableStart={isHovered}
        isConnectableEnd={isHovered}
      />

      {/* Header / Controls */}
      <div className="absolute -top-10 left-0 flex items-center gap-2">
        {isEditingLabel ? (
          <input
            autoFocus
            className="px-2 py-1 rounded bg-white dark:bg-secondary-800 border shadow-sm text-sm outline-none"
            defaultValue={data.label}
            onBlur={(e) => {
              updateGroup(id, { label: e.target.value });
              setIsEditingLabel(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateGroup(id, { label: (e.target as HTMLInputElement).value });
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