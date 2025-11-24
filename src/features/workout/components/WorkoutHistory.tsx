import { useState } from 'react';
import { History, AlertCircle } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import type { WorkoutSession } from '@/lib/types';
import SessionCard from './SessionCard';
import { SessionDetail } from './ExerciseHistory';

interface WorkoutHistoryProps {
  sessions: WorkoutSession[];
  loading: boolean;
  error: string | null;
  onDelete: (session: WorkoutSession) => void;
  onRetry: () => void;
}

// Loading skeleton
function SessionSkeleton() {
  return (
    <Card className="p-4 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="h-5 w-32 bg-secondary-200 dark:bg-secondary-700 rounded" />
          <div className="h-4 w-48 bg-secondary-200 dark:bg-secondary-700 rounded mt-2" />
          <div className="flex gap-4 mt-2">
            <div className="h-3 w-16 bg-secondary-200 dark:bg-secondary-700 rounded" />
            <div className="h-3 w-20 bg-secondary-200 dark:bg-secondary-700 rounded" />
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function WorkoutHistory({
  sessions,
  loading,
  error,
  onDelete,
  onRetry,
}: WorkoutHistoryProps) {
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);

  if (loading) {
    return (
      <div className="space-y-3">
        <SessionSkeleton />
        <SessionSkeleton />
        <SessionSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <Card variant="outlined" className="p-8 text-center">
        <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-2">
          Failed to Load History
        </h3>
        <p className="text-secondary-600 dark:text-secondary-400 mb-4">{error}</p>
        <Button onClick={onRetry}>Try Again</Button>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card variant="outlined" className="p-8 text-center">
        <History className="h-12 w-12 mx-auto text-secondary-400 dark:text-secondary-600 mb-4" />
        <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-2">
          No Workout History
        </h3>
        <p className="text-secondary-600 dark:text-secondary-400">
          Complete your first workout to see it here
        </p>
      </Card>
    );
  }

  // Group sessions by date
  const groupedSessions = sessions.reduce(
    (groups, session) => {
      const date = new Date(session.started_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(session);
      return groups;
    },
    {} as Record<string, WorkoutSession[]>
  );

  return (
    <div className="space-y-6">
      {Object.entries(groupedSessions).map(([date, dateSessions]) => (
        <div key={date}>
          <h3 className="text-sm font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wide mb-3">
            {date}
          </h3>
          <div className="space-y-3">
            {dateSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onView={setSelectedSession}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Session detail modal */}
      {selectedSession && (
        <SessionDetail
          templateName={selectedSession.template_name}
          startedAt={selectedSession.started_at}
          duration={selectedSession.duration}
          exercises={selectedSession.data.exercises}
          notes={selectedSession.notes}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
}
