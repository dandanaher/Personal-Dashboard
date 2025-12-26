import { memo, useCallback, useMemo, useState, useEffect } from 'react';
import { Handle, Position, NodeProps, NodeResizer, NodeToolbar, useReactFlow } from 'reactflow';
import type { NoteNodeData } from '@/stores/notesStore';
import { useThemeStore } from '@/stores/themeStore';
import { useNotesStore } from '@/stores/notesStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useDoubleTap } from '@/hooks/useDoubleTap';
import { FloatingToolbar } from './FloatingToolbar';

const NoteNode = memo(function NoteNode({ data, selected }: NodeProps<NoteNodeData>) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const darkMode = useThemeStore((state) => state.darkMode);
  const { updateNoteSize, updateNoteColor, deleteNote } = useNotesStore();
  const { addTab } = useWorkspaceStore();
  const { fitView } = useReactFlow();
  
  const { id, title, content, color } = data;
  const [isHovered, setIsHovered] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const cardBorderColor = color || (darkMode ? '#334155' : '#e2e8f0');

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
    addTab('note', id, title || 'Untitled');
    setShowToolbar(false);
  }, [addTab, id, title]);

  const handleColor = useCallback((newColor: string) => {
    updateNoteColor(id, newColor);
  }, [updateNoteColor, id]);

  const handleFocus = useCallback(() => {
    fitView({ nodes: [{ id }], padding: 0.2, duration: 800 });
  }, [fitView, id]);

  const handleDelete = useCallback(() => {
    if (window.confirm('Are you sure you want to delete this note? This cannot be undone.')) {
      deleteNote(id);
    }
  }, [deleteNote, id]);

  const handleClasses = useMemo(
    () =>
      `!w-8 !h-8 !rounded-full !bg-white dark:!bg-secondary-900 !border !border-solid opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20 ${
        isHovered ? 'pointer-events-auto' : 'pointer-events-none'
      }`,
    [isHovered]
  );

  const hiddenHandleClasses = useMemo(
    () =>
      '!w-8 !h-8 !rounded-full !bg-white dark:!bg-secondary-900 !border !border-solid opacity-0 pointer-events-none z-10',
    []
  );

  const handleStyle = useMemo(
    () => ({
      borderColor: cardBorderColor,
      borderWidth: 3,
    }),
    [cardBorderColor]
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
      className="group w-full h-full relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <NodeToolbar
        isVisible={showToolbar}
        position={Position.Top}
        offset={10}
        align="center"
        className="z-[9999]"
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
        isVisible={isHovered || selected}
        minWidth={256}
        minHeight={100}
        onResizeEnd={(_event, params) => {
          updateNoteSize(id, params.width, params.height);
        }}
        lineStyle={{ borderColor: cardBorderColor }}
        handleStyle={{ borderColor: cardBorderColor }}
        lineClassName="opacity-0 group-hover:opacity-100"
        handleClassName="!w-6 !h-6 !bg-white !border !rounded-full opacity-0 group-hover:opacity-100"
      />
      
      <div
        className="w-full h-full min-w-[16rem] min-h-[6rem] rounded-xl shadow-lg border cursor-pointer bg-white dark:bg-secondary-800 relative"
        {...doubleTapHandlers}
        style={{
          borderColor: cardBorderColor,
          boxShadow: selected
            ? `0 0 0 2px ${accentColor}`
            : `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)`
        }}
      >
        {/* Color Overlay */}
        {color && (
            <div 
                className="absolute inset-0 pointer-events-none rounded-xl" 
                style={{ backgroundColor: color, opacity: 0.1 }} 
            />
        )}

        {/* Note content */}
        <div className="p-4 h-full flex flex-col overflow-hidden relative z-10">
          <h3 className="font-semibold text-sm truncate mb-2 text-secondary-900 dark:text-white shrink-0">
            {title || 'Untitled'}
          </h3>
          {content ? (
            <div
              className="note-content text-xs text-secondary-700 dark:text-secondary-200 overflow-hidden break-words"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <p className="text-xs italic opacity-50 text-secondary-600 dark:text-secondary-400">
              Double-click to edit...
            </p>
          )}
        </div>
      </div>

      {/* Connection handles (show on hover) */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        isConnectableStart
        isConnectableEnd
        className={handleClasses}
        style={{ ...handleStyle, ...handleOffsetStyles.top }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        isConnectable={false}
        className={hiddenHandleClasses}
        style={{ ...handleStyle, ...handleOffsetStyles.top }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        isConnectableStart
        isConnectableEnd
        className={handleClasses}
        style={{ ...handleStyle, ...handleOffsetStyles.right }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        isConnectable={false}
        className={hiddenHandleClasses}
        style={{ ...handleStyle, ...handleOffsetStyles.right }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        isConnectableStart
        isConnectableEnd
        className={handleClasses}
        style={{ ...handleStyle, ...handleOffsetStyles.bottom }}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom"
        isConnectable={false}
        className={hiddenHandleClasses}
        style={{ ...handleStyle, ...handleOffsetStyles.bottom }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        isConnectableStart
        isConnectableEnd
        className={handleClasses}
        style={{ ...handleStyle, ...handleOffsetStyles.left }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        isConnectable={false}
        className={hiddenHandleClasses}
        style={{ ...handleStyle, ...handleOffsetStyles.left }}
      />

      <style>{`
        .note-content font[size="1"] { font-size: 0.75rem; }
        .note-content font[size="2"] { font-size: 0.875rem; }
        .note-content font[size="3"] { font-size: 1rem; }
        .note-content font[size="4"] { font-size: 1.125rem; }
        .note-content font[size="5"] { font-size: 1.25rem; }
        .note-content font[size="6"] { font-size: 1.5rem; }
        .note-content font[size="7"] { font-size: 1.875rem; }
        
        .note-content ul, .note-content ol {
          list-style-position: inside;
          margin: 0.25em 0;
        }
        .note-content ul { list-style-type: disc; }
        .note-content ol { list-style-type: decimal; }
        .note-content li { display: list-item; margin: 0.1em 0; }
        .note-content p { margin: 0.25em 0; }
        .note-content strong { font-weight: 600; }
        .note-content em { font-style: italic; }
      `}</style>
    </div>
  );
});

export default NoteNode;
