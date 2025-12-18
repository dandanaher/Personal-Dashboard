import { memo, useCallback, useMemo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import type { NoteNodeData } from '@/stores/notesStore';
import { useThemeStore } from '@/stores/themeStore';

const NoteNode = memo(function NoteNode({ data }: NodeProps<NoteNodeData>) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const { id, title, content, onDoubleClick } = data;
  const [isHovered, setIsHovered] = useState(false);

  const handleDoubleClick = useCallback(() => {
    onDoubleClick(id);
  }, [id, onDoubleClick]);

  // Strip HTML tags for preview text
  const stripHtml = (html: string): string => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // Get plain text and truncate for preview (first 100 characters)
  const plainText = stripHtml(content);
  const contentPreview = plainText.length > 100 ? plainText.slice(0, 100) + '...' : plainText;

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
      className="group w-64 rounded-xl shadow-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
      <div className="p-4">
        <h3 className="font-semibold text-sm truncate mb-2 text-secondary-900 dark:text-white">
          {title || 'Untitled'}
        </h3>
        {contentPreview && (
          <p className="text-xs opacity-75 line-clamp-3 text-secondary-700 dark:text-secondary-200">
            {contentPreview}
          </p>
        )}
        {!contentPreview && (
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
  );
});

export default NoteNode;
