export function getProgressColor(progress: number): string {
  if (progress >= 100) return 'bg-green-500';
  if (progress >= 67) return 'bg-blue-500';
  if (progress >= 34) return 'bg-yellow-500';
  return 'bg-orange-500';
}
