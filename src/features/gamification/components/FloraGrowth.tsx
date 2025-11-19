import { Sprout, Flower2, TreeDeciduous, TreePine } from 'lucide-react';

interface FloraGrowthProps {
  totalLevel: number;
}

/**
 * Get the flora icon based on total level
 */
function getFloraAsset(level: number) {
  if (level < 3) {
    return {
      icon: Sprout,
      size: 'w-16 h-16',
      color: 'text-green-400',
      label: 'Seedling',
    };
  }
  if (level < 10) {
    return {
      icon: Flower2,
      size: 'w-24 h-24',
      color: 'text-teal-500',
      label: 'Sapling',
    };
  }
  if (level < 20) {
    return {
      icon: TreeDeciduous,
      size: 'w-32 h-32',
      color: 'text-emerald-600',
      label: 'Tree',
    };
  }
  return {
    icon: TreePine,
    size: 'w-40 h-40',
    color: 'text-green-700',
    label: 'Ancient',
  };
}

export function FloraGrowth({ totalLevel }: FloraGrowthProps) {
  const flora = getFloraAsset(totalLevel);
  const FloraIcon = flora.icon;

  return (
    <div className="py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-secondary-900 dark:text-white">Your Growth</h2>
        <div className="text-right">
          <span className="text-sm text-secondary-500 dark:text-secondary-400">{flora.label}</span>
          <div className="text-lg font-bold text-secondary-900 dark:text-white">
            Level {totalLevel}
          </div>
        </div>
      </div>

      {/* Flora Display */}
      <div className="flex items-center justify-center py-8">
        <div className="animate-pulse-slow">
          <FloraIcon className={`${flora.size} ${flora.color} drop-shadow-lg`} />
        </div>
      </div>
    </div>
  );
}

export default FloraGrowth;
