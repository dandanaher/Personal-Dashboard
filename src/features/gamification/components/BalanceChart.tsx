import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';
import type { AttributeWithXP } from '@/lib/types';

interface BalanceChartProps {
  attributes: AttributeWithXP[];
}

export function BalanceChart({ attributes }: BalanceChartProps) {
  // Transform data for radar chart
  const chartData = attributes.map(attr => ({
    name: attr.name,
    level: attr.level,
    fullMark: Math.max(10, ...attributes.map(a => a.level + 2)), // Dynamic max
    color: attr.color,
  }));

  // Calculate overall balance score (standard deviation of levels)
  const avgLevel = attributes.reduce((sum, a) => sum + a.level, 0) / attributes.length;
  const variance = attributes.reduce((sum, a) => sum + Math.pow(a.level - avgLevel, 2), 0) / attributes.length;
  const balanceScore = Math.max(0, 100 - (Math.sqrt(variance) * 10));

  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-secondary-900 dark:text-white">Life Balance</h2>
        <div className="text-right">
          <span className="text-sm text-secondary-500 dark:text-secondary-400">Balance</span>
          <div className="text-lg font-bold text-secondary-900 dark:text-white">
            {Math.round(balanceScore)}%
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
            <PolarGrid
              stroke="currentColor"
              className="text-secondary-200 dark:text-secondary-700"
            />
            <PolarAngleAxis
              dataKey="name"
              tick={{
                fill: 'currentColor',
                fontSize: 12,
                className: 'text-secondary-600 dark:text-secondary-400'
              }}
            />
            <Radar
              name="Level"
              dataKey="level"
              stroke="var(--accent-color)"
              fill="var(--accent-color)"
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend with colors */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        {attributes.map(attr => (
          <div key={attr.id} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: attr.color }}
            />
            <span className="text-xs text-secondary-600 dark:text-secondary-400">
              {attr.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BalanceChart;
