import { memo } from 'react';
import { EditableCardGrid } from '@/features/homepage/components/EditableCardGrid';

interface DayOverviewProps {
  className?: string;
}

export const DayOverview = memo(function DayOverview({ className = '' }: DayOverviewProps) {
  return (
    <div className={className}>
      <h2 className="text-base font-bold text-secondary-900 dark:text-white mb-3">Day Overview</h2>
      <EditableCardGrid />
    </div>
  );
});

export default DayOverview;
