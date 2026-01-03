import { memo } from 'react';
import { LayoutGrid, Check } from 'lucide-react';
import { useHomepageStore } from '@/stores/homepageStore';
import { useThemeStore } from '@/stores/themeStore';

interface EditModeButtonProps {
  className?: string;
}

export const EditModeButton = memo(function EditModeButton({ className = '' }: EditModeButtonProps) {
  const { isEditMode, setEditMode } = useHomepageStore();
  const accentColor = useThemeStore((state) => state.accentColor);

  const handleClick = () => {
    setEditMode(!isEditMode);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={isEditMode ? 'Finish editing' : 'Edit layout'}
      className={`
        flex items-center justify-center w-9 h-9 rounded-lg
        transition-all duration-200
        ${isEditMode
          ? 'text-white'
          : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800'
        }
        ${className}
      `}
      style={isEditMode ? { backgroundColor: accentColor } : undefined}
    >
      {isEditMode ? (
        <Check size={18} />
      ) : (
        <LayoutGrid size={18} />
      )}
    </button>
  );
});
