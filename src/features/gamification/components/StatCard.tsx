import { Repeat, Heart, Zap, Target, LucideIcon } from 'lucide-react';
import type { AttributeWithXP } from '@/lib/types';

interface StatCardProps {
  attribute: AttributeWithXP;
}

// Map icon names to Lucide components
const iconMap: Record<string, LucideIcon> = {
  Repeat,
  Heart,
  Zap,
  Target,
};

export function StatCard({ attribute }: StatCardProps) {
  const Icon = iconMap[attribute.icon] || Target;

  return (
    <div className="bg-white dark:bg-secondary-800 rounded-3xl border border-secondary-200 dark:border-secondary-700 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${attribute.color}20` }}
        >
          <Icon
            className="h-5 w-5"
            style={{ color: attribute.color }}
          />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-secondary-900 dark:text-white">
            {attribute.name}
          </h3>
          <p className="text-xs text-secondary-500 dark:text-secondary-400">
            {attribute.description}
          </p>
        </div>
        <div className="text-right">
          <div
            className="text-2xl font-bold"
            style={{ color: attribute.color }}
          >
            {attribute.level}
          </div>
          <div className="text-xs text-secondary-500 dark:text-secondary-400">
            Level
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative">
        <div className="h-2 bg-secondary-100 dark:bg-secondary-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${attribute.progress}%`,
              backgroundColor: attribute.color,
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-secondary-500 dark:text-secondary-400">
            {attribute.current_xp} XP
          </span>
          <span className="text-xs text-secondary-500 dark:text-secondary-400">
            {Math.round(attribute.progress)}%
          </span>
        </div>
      </div>
    </div>
  );
}

export default StatCard;
