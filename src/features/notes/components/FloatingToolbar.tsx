import { memo, useEffect, useRef, useState } from 'react';
import { Pencil, Palette, Crosshair, Trash2 } from 'lucide-react';
import { APP_COLORS } from '@/stores/themeStore';

interface FloatingToolbarProps {
  onEdit: () => void;
  onColor: (color: string) => void;
  onFocus: () => void;
  onDelete: () => void;
  color?: string; // Current color
}

function useClickOutside(ref: React.RefObject<HTMLElement>, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

export const FloatingToolbar = memo(function FloatingToolbar({
  onEdit,
  onColor,
  onFocus,
  onDelete,
  color,
}: FloatingToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  
  useClickOutside(colorPickerRef, () => {
    if (showColorPicker) setShowColorPicker(false);
  });

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-white dark:bg-secondary-800 shadow-xl border border-secondary-200 dark:border-secondary-700 pointer-events-auto select-none">
      <button
        onClick={(e) => { e.stopPropagation(); onEdit(); }}
        className="p-1.5 rounded-md text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
        title="Edit"
      >
        <Pencil size={16} />
      </button>

      <div className="relative">
        <button
          onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker); }}
          className="p-1.5 rounded-md text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
          title="Color"
        >
          <Palette size={16} style={{ color: color }} />
        </button>
        
        {showColorPicker && (
          <div 
            ref={colorPickerRef}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-2 bg-white dark:bg-secondary-800 rounded-lg shadow-xl border border-secondary-200 dark:border-secondary-700 grid grid-cols-5 gap-1 w-[140px] z-50"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {APP_COLORS.map((c) => (
              <button
                key={c.value}
                className="w-5 h-5 rounded-full border border-black/10 hover:scale-110 transition-transform"
                style={{ backgroundColor: c.value }}
                onClick={(e) => {
                  e.stopPropagation();
                  onColor(c.value);
                  setShowColorPicker(false);
                }}
                title={c.name}
              />
            ))}
          </div>
        )}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onFocus(); }}
        className="p-1.5 rounded-md text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
        title="Focus"
      >
        <Crosshair size={16} />
      </button>

      <div className="w-px h-4 bg-secondary-200 dark:bg-secondary-700 mx-0.5" />

      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="p-1.5 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        title="Delete"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
});