import { memo, useCallback, useMemo, useState } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import type { NoteNodeData } from '@/stores/notesStore';
import { useThemeStore } from '@/stores/themeStore';
import { useNotesStore } from '@/stores/notesStore';

const NoteNode = memo(function NoteNode({ data, selected }: NodeProps<NoteNodeData>) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const { updateNoteSize } = useNotesStore();
  const { id, title, content, onDoubleClick } = data;
  const [isHovered, setIsHovered] = useState(false);

  const handleDoubleClick = useCallback(() => {
    onDoubleClick(id);
  }, [id, onDoubleClick]);

  const handleClasses = useMemo(
    () =>
      `!w-3.5 !h-3.5 !rounded-full !border-2 !bg-white dark:!bg-secondary-900 !border-secondary-200 dark:!border-secondary-700 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ${
        isHovered ? 'pointer-events-auto' : 'pointer-events-none'
      }`,
    [isHovered]
  );

  const hiddenHandleClasses = useMemo(
    () =>
      '!w-3.5 !h-3.5 !rounded-full !border-2 !bg-white dark:!bg-secondary-900 !border-secondary-200 dark:!border-secondary-700 opacity-0 pointer-events-none',
    []
  );

  return (
    <div
      className="w-full h-full relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <NodeResizer
        isVisible={isHovered || selected}
        minWidth={256}
        minHeight={100}
        onResizeEnd={(_event, params) => {
          updateNoteSize(id, params.width, params.height);
        }}
        lineStyle={{ borderColor: accentColor }}
        handleStyle={{ borderColor: accentColor }}
        lineClassName="opacity-0 group-hover:opacity-100"
        handleClassName="!w-3 !h-3 !bg-white !border !rounded-full opacity-0 group-hover:opacity-100"
      />
      <div
        className="group w-full h-full min-w-[16rem] min-h-[6rem] rounded-xl shadow-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]"
        onDoubleClick={handleDoubleClick}
        style={{ boxShadow: `0 0 0 1px ${accentColor}10, 0 10px 15px -3px rgba(0,0,0,0.1)` }}
      >
        {/* Connection handles (show on hover) */}
        <Handle
          type="source"
          position={Position.Top}
          id="top"
          isConnectableStart={isHovered}
          isConnectableEnd={isHovered}
          className={handleClasses}
          style={{ boxShadow: `0 0 0 2px ${accentColor}40` }}
        />
        <Handle
          type="target"
          position={Position.Top}
          id="top"
          isConnectable={false}
          className={hiddenHandleClasses}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          isConnectableStart={isHovered}
          isConnectableEnd={isHovered}
          className={handleClasses}
          style={{ boxShadow: `0 0 0 2px ${accentColor}40` }}
        />
        <Handle
          type="target"
          position={Position.Right}
          id="right"
          isConnectable={false}
          className={hiddenHandleClasses}
        />

        {/* Note content */}
        <div className="p-4 h-full flex flex-col overflow-hidden">
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

        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          isConnectableStart={isHovered}
          isConnectableEnd={isHovered}
          className={handleClasses}
          style={{ boxShadow: `0 0 0 2px ${accentColor}40` }}
        />
        <Handle
          type="target"
          position={Position.Bottom}
          id="bottom"
          isConnectable={false}
          className={hiddenHandleClasses}
        />
        <Handle
          type="source"
          position={Position.Left}
          id="left"
          isConnectableStart={isHovered}
          isConnectableEnd={isHovered}
          className={handleClasses}
          style={{ boxShadow: `0 0 0 2px ${accentColor}40` }}
        />
        <Handle
          type="target"
          position={Position.Left}
          id="left"
          isConnectable={false}
          className={hiddenHandleClasses}
        />
      </div>

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