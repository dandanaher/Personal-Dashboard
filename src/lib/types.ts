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
  type: 'weekly' | 'monthly' | 'yearly' | 'open';
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
    Functions: {
      increment_xp: {
        Args: {
          target_user_id: string;
          target_attribute_id: string;
          xp_amount: number;
        };
        Returns: void;
      };
    };
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
export type WorkoutTemplateInsert = Database['public']['Tables']['workout_templates']['Insert'];
export type WorkoutTemplateUpdate = Database['public']['Tables']['workout_templates']['Update'];
export type WorkoutSessionInsert = Database['public']['Tables']['workout_sessions']['Insert'];
export type WorkoutSessionUpdate = Database['public']['Tables']['workout_sessions']['Update'];

// =============================================================================
// Gamification Types
// =============================================================================

/**
 * Attribute type IDs for the 4 pillars
 */
export type AttributeId = 'consistency' | 'vitality' | 'focus' | 'drive';

/**
 * Attribute definition from the attributes table.
 * Defines a Life Balance stat pillar.
 */
export interface Attribute {
  id: AttributeId;
  name: string;
  description: string | null;
  /** Hex color code for UI */
  color: string;
  /** Lucide icon name string */
  icon: string;
}

/**
 * User XP tracking for each attribute.
 */
export interface UserXP {
  user_id: string;
  attribute_id: AttributeId;
  current_xp: number;
}

/**
 * Combined attribute with user's XP data for display.
 */
export interface AttributeWithXP extends Attribute {
  current_xp: number;
  level: number;
  progress: number;
}
