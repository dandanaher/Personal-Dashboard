import { memo, useState } from 'react';
import { NodeProps, NodeResizer } from 'reactflow';
import { useNotesStore } from '@/stores/notesStore';
import { APP_COLORS } from '@/stores/themeStore';
import { Palette, Trash2, Type } from 'lucide-react';

const GroupNode = memo(({ data, selected, id }: NodeProps) => {
  const { updateGroup, deleteGroup } = useNotesStore();
  const [isHovered, setIsHovered] = useState(false);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  
  // Use the stored color or default
  const color = data.color || '#3b82f6';
  
  // Generate background with low opacity
  const backgroundColor = `${color}1A`; // 10% opacity (approx hex)

  const handleColorChange = (newColor: string) => {
    updateGroup(id, { color: newColor });
  };

  return (
    <div 
      className="group w-full h-full relative rounded-2xl border-2 transition-all duration-200"
      style={{ 
        borderColor: color,
        backgroundColor: backgroundColor,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <NodeResizer 
        isVisible={selected || isHovered} 
        minWidth={100} 
        minHeight={100}
        color={color}
        handleStyle={{ width: 8, height: 8, borderRadius: 4 }}
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
            onDoubleClick={() => setIsEditingLabel(true)}
          >
            {data.label || 'Group'}
          </span>
        )}
      </div>

      {/* Toolbar (visible on hover/select) */}
      <div className={`absolute -top-10 right-0 flex gap-1 bg-white dark:bg-secondary-800 p-1 rounded-lg shadow border border-secondary-200 dark:border-secondary-700 transition-opacity ${selected || isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Color Picker */}
        <div className="group/color relative">
          <button className="p-1.5 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-md">
            <Palette size={14} className="text-secondary-600 dark:text-secondary-300" />
          </button>
          <div className="absolute left-0 top-full mt-1 hidden group-hover/color:flex flex-wrap gap-1 p-2 bg-white dark:bg-secondary-800 rounded-lg shadow-xl border border-secondary-200 w-32 z-50">
            {APP_COLORS.map((c) => (
              <button
                key={c.value}
                className="w-4 h-4 rounded-full border border-black/10"
                style={{ backgroundColor: c.value }}
                onClick={() => handleColorChange(c.value)}
                title={c.name}
              />
            ))}
          </div>
        </div>
        
        <button 
          onClick={() => setIsEditingLabel(true)}
          className="p-1.5 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-md"
        >
          <Type size={14} className="text-secondary-600 dark:text-secondary-300" />
        </button>
        
        <button 
          onClick={() => deleteGroup(id)}
          className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md"
        >
          <Trash2 size={14} className="text-red-500" />
        </button>
      </div>
    </div>
  );
});

export default GroupNode;
