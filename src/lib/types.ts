// Database types for Supabase

// =============================================================================
// Workout Exercise Types
// =============================================================================

/**
 * Exercise type categories.
 * - strength: Traditional weight training (sets, reps, weight)
 * - cardio: Distance/time based exercises (running, cycling)
 * - timed: Duration based exercises (planks, carries)
 */
export type ExerciseType = 'strength' | 'cardio' | 'timed';

/**
 * Distance unit for cardio exercises.
 */
export type DistanceUnit = 'km' | 'm' | 'mi';

/**
 * Exercise definition for workout templates.
 * Defines the target parameters for an exercise.
 */
export interface Exercise {
  /** Optional unique identifier for React keys */
  id?: string;
  name: string;
  /** Exercise type - defaults to 'strength' for backward compatibility */
  type?: ExerciseType;
  sets: number;

  // Strength fields (optional for other types)
  /** Reps per set - used for strength exercises */
  reps_per_set?: number;
  /** Weight in kg - used for strength and optional for timed */
  weight?: number;

  // Cardio fields
  /** Target distance - used for cardio exercises */
  distance?: number;
  /** Distance unit - defaults to 'km' */
  distance_unit?: DistanceUnit;

  // Timed/Cardio fields
  /** Target time in seconds - used for cardio and timed exercises */
  target_time?: number;

  /** Rest time between sets in seconds */
  rest_time: number;
  /** Whether to perform a final set to failure (strength only) */
  to_failure: boolean;
  notes?: string;
}

/**
 * A single completed set during a workout session.
 * Fields are optional to support different exercise types.
 */
export interface CompletedSet {
  // Strength fields
  /** Reps completed - used for strength exercises */
  reps?: number;
  /** Weight used - used for strength and timed exercises */
  weight?: number;

  // Cardio fields
  /** Distance covered - used for cardio exercises */
  distance?: number;

  // Timed/Cardio fields
  /** Actual time taken in seconds */
  time?: number;

  /** ISO timestamp when this set was completed */
  completed_at: string;
}

/**
 * A completed exercise within a workout session.
 * Contains the target parameters and actual completed sets.
 */
export interface CompletedExercise {
  name: string;
  /** Exercise type for display and calculation purposes */
  type?: ExerciseType;
  target_sets: number;
  /** User notes added after completing an exercise */
  completion_notes?: string;

  // Strength targets
  /** Target reps per set - used for strength exercises */
  target_reps?: number;
  /** Target weight - used for strength and timed exercises */
  weight?: number;

  // Cardio targets
  /** Target distance - used for cardio exercises */
  target_distance?: number;
  /** Distance unit */
  distance_unit?: DistanceUnit;

  // Timed/Cardio targets
  /** Target time in seconds */
  target_time?: number;

  /** Array of completed main sets */
  main_sets: CompletedSet[];
  /** Optional failure set performed after main sets (strength only) */
  failure_set?: CompletedSet;
}

/**
 * JSONB data structure stored in workout_sessions.data
 */
export interface WorkoutSessionData {
  exercises: CompletedExercise[];
}

// =============================================================================
// Database Table Types
// =============================================================================

/**
 * Task table row.
 * Uses 'date' field for task scheduling (date only, no time).
 * Null date indicates a general/dateless task.
 */
export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  /** Whether the task is completed */
  completed: boolean;
  /** Date for the task in ISO format (YYYY-MM-DD), null for dateless tasks */
  date: string | null;
  /** Order index for sorting tasks within a day */
  order_index: number;
  /** User-defined task type/tag for categorization */
  task_type: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Goal table row.
 * Supports different goal timeframes (weekly, monthly, yearly) and open-ended goals.
 */
export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  /** Goal timeframe type */
  type: 'weekly' | 'monthly' | 'yearly' | 'custom' | 'open';
  /** Target completion date in ISO format (YYYY-MM-DD) */
  target_date: string | null;
  /** Whether the goal is completed */
  completed: boolean;
  /** Progress percentage (0-100) */
  progress: number;
  /** Optional linked habit ID for automatic progress tracking */
  linked_habit_id: string | null;
  /** Target number of habit completions to reach 100% */
  target_completions: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Habit table row.
 * Defines a habit to track with target frequency per week.
 */
export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  /** Hex color code for display */
  color: string;
  /** Icon identifier */
  icon: string;
  /** Target number of times to complete per week */
  target_frequency: number;
  /** User-defined habit type/tag for categorization */
  habit_type: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Habit log table row.
 * Tracks daily completion status for habits.
 * Has UNIQUE constraint on (habit_id, date).
 */
export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  /** Date of the log entry in ISO format (YYYY-MM-DD) */
  date: string;
  /** Whether the habit was completed on this date */
  completed: boolean;
  notes: string | null;
  created_at: string;
}

/**
 * Mood log table row.
 * Tracks daily mood with optional notes.
 * Has UNIQUE constraint on (user_id, date).
 */
export interface MoodLog {
  id: string;
  user_id: string;
  /** Date of the log entry in ISO format (YYYY-MM-DD) */
  date: string;
  /** Mood level from 1-5 (1=Bad, 2=Poor, 3=Okay, 4=Good, 5=Great) */
  mood_level: 1 | 2 | 3 | 4 | 5;
  /** Optional note about the mood */
  note: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Workout template table row.
 * Stores reusable workout routines with exercise definitions.
 */
export interface WorkoutTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  /** Array of exercise definitions */
  exercises: Exercise[];
  /** Optional linked habit ID for automatic habit completion on workout finish */
  linked_habit_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Workout session table row.
 * Records a completed or in-progress workout with actual performance data.
 */
export interface WorkoutSession {
  id: string;
  user_id: string;
  /** Reference to the template used (nullable if template deleted) */
  template_id: string | null;
  /** Stored template name in case original template is deleted */
  template_name: string;
  /** ISO timestamp when workout started */
  started_at: string;
  /** ISO timestamp when workout completed (null if still in progress) */
  completed_at: string | null;
  /** Total duration in seconds */
  duration: number | null;
  /** JSONB data containing completed exercises */
  data: WorkoutSessionData;
  notes: string | null;
  created_at: string;
}

// =============================================================================
// Database Schema Type (for Supabase client)
// =============================================================================

export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: Task;
        Insert: Omit<Task, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Task, 'id' | 'created_at'>>;
        Relationships: [];
      };
      goals: {
        Row: Goal;
        Insert: Omit<Goal, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Goal, 'id' | 'created_at'>>;
        Relationships: [];
      };
      habits: {
        Row: Habit;
        Insert: Omit<Habit, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Habit, 'id' | 'created_at'>>;
        Relationships: [];
      };
      habit_logs: {
        Row: HabitLog;
        Insert: Omit<HabitLog, 'id' | 'created_at'>;
        Update: Partial<Omit<HabitLog, 'id' | 'created_at'>>;
        Relationships: [];
      };
      mood_logs: {
        Row: MoodLog;
        Insert: Omit<MoodLog, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<MoodLog, 'id' | 'created_at' | 'user_id'>>;
        Relationships: [];
      };
      workout_templates: {
        Row: WorkoutTemplate;
        Insert: Omit<WorkoutTemplate, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<WorkoutTemplate, 'id' | 'created_at'>>;
        Relationships: [];
      };
      workout_sessions: {
        Row: WorkoutSession;
        Insert: Omit<WorkoutSession, 'id' | 'created_at'>;
        Update: Partial<Omit<WorkoutSession, 'id' | 'created_at'>>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

// =============================================================================
// Auth Types
// =============================================================================

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Public profile from the profiles table.
 * Stores username and avatar accessible via foreign keys.
 */
export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
}

// =============================================================================
// Utility Types
// =============================================================================

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface ApiError {
  message: string;
  code?: string;
  details?: string;
}

// Type aliases for common operations
export type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type TaskUpdate = Database['public']['Tables']['tasks']['Update'];
export type GoalInsert = Database['public']['Tables']['goals']['Insert'];
export type GoalUpdate = Database['public']['Tables']['goals']['Update'];
export type HabitInsert = Database['public']['Tables']['habits']['Insert'];
export type HabitUpdate = Database['public']['Tables']['habits']['Update'];
export type HabitLogInsert = Database['public']['Tables']['habit_logs']['Insert'];
export type HabitLogUpdate = Database['public']['Tables']['habit_logs']['Update'];
export type MoodLogInsert = Database['public']['Tables']['mood_logs']['Insert'];
export type MoodLogUpdate = Database['public']['Tables']['mood_logs']['Update'];
export type WorkoutTemplateInsert = Database['public']['Tables']['workout_templates']['Insert'];
export type WorkoutTemplateUpdate = Database['public']['Tables']['workout_templates']['Update'];
export type WorkoutSessionInsert = Database['public']['Tables']['workout_sessions']['Insert'];
export type WorkoutSessionUpdate = Database['public']['Tables']['workout_sessions']['Update'];

// =============================================================================
// Notes Canvas Types
// =============================================================================

/**
 * Canvas table row.
 * Represents a workspace canvas that can contain multiple notes.
 */
export interface Canvas {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  last_accessed_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Folder table row.
 * Represents a folder for organizing notes hierarchically.
 */
export interface Folder {
  id: string;
  user_id: string;
  name: string;
  /** Parent folder ID for nesting, null for root folders */
  parent_id: string | null;
  created_at: string;
}

/**
 * Canvas Group table row.
 * Represents a group of notes on the canvas.
 */
export interface CanvasGroup {
  id: string;
  user_id: string;
  canvas_id: string | null;
  label: string | null;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  color: string;
  created_at: string;
  updated_at: string;
}

/**
 * Note table row.
 * Represents a markdown note on the infinite canvas.
 */
export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  /** Type of note - 'text' for regular notes, 'link' for web link embeds, 'image' for images */
  type?: 'text' | 'link' | 'image';
  /** X position on canvas */
  position_x: number;
  /** Y position on canvas */
  position_y: number;
  /** Width of the note card */
  width?: number | null;
  /** Height of the note card */
  height?: number | null;
  /** @deprecated Per-note color is no longer used (styling is theme-driven). */
  color?: string;
  /** Optional folder ID for organization */
  folder_id: string | null;
  /** Optional canvas ID - notes on a canvas */
  canvas_id: string | null;
  /** Optional group ID - notes belonging to a group */
  group_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Note edge table row.
 * Represents a connection between two notes on the canvas.
 */
export interface NoteEdge {
  id: string;
  user_id: string;
  source_note_id: string | null;
  target_note_id: string | null;
  source_group_id?: string | null;
  target_group_id?: string | null;
  source_handle?: string | null;
  target_handle?: string | null;
  label?: string | null;
  color?: string | null;
  created_at: string;
}

// Type aliases for Note operations
export type NoteInsert = Omit<Note, 'id' | 'created_at' | 'updated_at'>;
export type NoteUpdate = Partial<Omit<Note, 'id' | 'created_at' | 'user_id'>>;
export type NoteEdgeInsert = Omit<NoteEdge, 'id' | 'created_at'>;
export type NoteEdgeUpdate = Partial<Omit<NoteEdge, 'id' | 'created_at' | 'user_id'>>;

// Type aliases for Canvas operations
export type CanvasInsert = Omit<Canvas, 'id' | 'created_at' | 'updated_at' | 'last_accessed_at'>;
export type CanvasUpdate = Partial<Omit<Canvas, 'id' | 'created_at' | 'user_id'>>;

// Type aliases for Folder operations
export type FolderInsert = Omit<Folder, 'id' | 'created_at'>;
export type FolderUpdate = Partial<Omit<Folder, 'id' | 'created_at' | 'user_id'>>;

// =============================================================================
// Push Notification Types
// =============================================================================

/**
 * Push subscription stored in database.
 * Contains Web Push API subscription details for a user's device.
 */
export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  device_name: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
}

/**
 * User notification preferences.
 * Controls when and how notifications are sent.
 */
export interface NotificationPreferences {
  id: string;
  user_id: string;
  habit_reminders_enabled: boolean;
  /** Time in HH:MM:SS format */
  reminder_time: string;
  /** IANA timezone (e.g., 'America/New_York') */
  timezone: string;
  weekly_summary_enabled: boolean;
  streak_milestone_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Notification log entry for debugging and analytics.
 */
export interface NotificationLogEntry {
  id: string;
  user_id: string;
  subscription_id: string | null;
  notification_type: 'habit_reminder' | 'streak_milestone' | 'weekly_summary';
  title: string;
  body: string | null;
  status: 'pending' | 'sent' | 'failed' | 'clicked';
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
  clicked_at: string | null;
}

// Type aliases for Push Subscription operations
export type PushSubscriptionInsert = Omit<
  PushSubscription,
  'id' | 'created_at' | 'updated_at' | 'last_used_at'
>;
export type PushSubscriptionUpdate = Partial<
  Omit<PushSubscription, 'id' | 'created_at' | 'user_id'>
>;

// Type aliases for Notification Preferences operations
export type NotificationPreferencesInsert = Omit<
  NotificationPreferences,
  'id' | 'created_at' | 'updated_at'
>;
export type NotificationPreferencesUpdate = Partial<
  Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at'>
>;
