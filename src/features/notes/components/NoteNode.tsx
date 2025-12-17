import { memo, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import type { NoteNodeData } from '@/stores/notesStore';

const NoteNode = memo(function NoteNode({ data }: NodeProps<NoteNodeData>) {
  const { id, title, content, color, onDoubleClick } = data;

  const handleDoubleClick = useCallback(() => {
    onDoubleClick(id);
  }, [id, onDoubleClick]);

  // Truncate content for preview (first 100 characters)
  const contentPreview = content.length > 100 ? content.slice(0, 100) + '...' : content;

  // Determine if the color is dark to adjust text color
  const isDarkColor = (hex: string): boolean => {
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  };

  const textColor = isDarkColor(color) ? 'text-white' : 'text-secondary-900';
  const borderColor = isDarkColor(color) ? 'border-white/20' : 'border-secondary-200';

  return (
    <div
      className={`w-64 rounded-xl shadow-lg border ${borderColor} cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]`}
      style={{ backgroundColor: color }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Target handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-secondary-400 !border-2 !border-white"
      />

      {/* Note content */}
      <div className="p-4">
        <h3 className={`font-semibold text-sm truncate mb-2 ${textColor}`}>{title || 'Untitled'}</h3>
        {contentPreview && (
          <p className={`text-xs opacity-75 line-clamp-3 ${textColor}`}>{contentPreview}</p>
        )}
        {!contentPreview && (
          <p className={`text-xs italic opacity-50 ${textColor}`}>Double-click to edit...</p>
        )}
      </div>

      {/* Source handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-secondary-400 !border-2 !border-white"
      />
    </div>
  );
});

export default NoteNode;
