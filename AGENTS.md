# AGENTS.md - Personal Dashboard Codebase Guide

**Last Updated:** 2026-01-04

This document provides a comprehensive guide to the Personal Dashboard codebase for AI assistants and developers. It covers architecture, conventions, and best practices.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture & Patterns](#architecture--patterns)
4. [Directory Structure](#directory-structure)
5. [Key Conventions](#key-conventions)
6. [Database Schema](#database-schema)
7. [State Management](#state-management)
8. [Feature Development](#feature-development)
9. [Development Workflow](#development-workflow)
10. [Common Tasks](#common-tasks)
11. [Important Files](#important-files)
12. [AI Assistant Guidelines](#ai-assistant-guidelines)

---

## Project Overview

**MyDash** is a mobile-first personal dashboard web application for managing tasks, goals, habits, mood, and workouts. It features:

- **Customizable Homepage**: Drag-and-drop card layout with @dnd-kit
- **Tasks**: Daily task management with date-based organization
- **Goals**: Weekly, monthly, yearly, and open-ended goal tracking
- **Habits**: Habit tracking with streaks, types/tags, and contribution graphs
- **Mood**: Daily mood logging with yearly review visualization
- **Workout**: Exercise templates and session logging with progressive overload
- **Notes**: Infinite canvas with markdown notes, folders, groups, and connections (ReactFlow)

The app is built with React + TypeScript + Vite, uses Supabase for backend, and follows a feature-based architecture.

---

## Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript (strict mode enabled)
- **Build Tool**: Vite 5
- **Styling**: TailwindCSS 3 (mobile-first, dark mode support)
- **Routing**: React Router v6
- **State Management**: Zustand (with persist middleware)
- **UI Icons**: Lucide React
- **Date Handling**: date-fns
- **Charts**: Recharts
- **Canvas**: ReactFlow (node-based infinite canvas)
- **State Time-Travel**: Zundo (undo/redo for canvas)

### Backend
- **BaaS**: Supabase (PostgreSQL + Auth + Realtime)
- **Authentication**: Supabase Auth with email/password

### Development Tools
- **Linter**: ESLint with TypeScript rules
- **Formatter**: Prettier
- **Type Checking**: TypeScript 5.3+ (strict mode)
- **PWA**: vite-plugin-pwa

### Deployment
- **Hosting**: GitHub Pages (static site)
- **CI/CD**: GitHub Actions (`.github/workflows/deploy.yml`)

---

## Architecture & Patterns

### 1. Feature-Based Structure

The codebase follows a **feature-based architecture** where each major feature is self-contained:

```
src/features/<feature-name>/
├── <FeatureName>Page.tsx    # Main page component
├── components/               # Feature-specific components
│   ├── ComponentA.tsx
│   ├── ComponentB.tsx
│   └── index.ts             # Barrel export
├── hooks/                   # Feature-specific hooks
│   ├── useFeatureData.ts
│   └── index.ts             # Barrel export
└── lib/                     # Feature-specific utilities (optional)
    └── helpers.ts
```

**Benefits:**
- Clear separation of concerns
- Easy to locate feature-specific code
- Promotes feature independence
- Simplifies refactoring and testing

### 2. Component Patterns

**Page Components** (`src/pages/` and `src/features/*/`):
- Top-level route components
- Handle layout and composition
- Manage page-level state
- Example: `TasksPage.tsx`, `GoalsPage.tsx`

**Feature Components** (`src/features/*/components/`):
- Feature-specific UI components
- Reusable within the feature
- May include local state
- Example: `TaskItem.tsx`, `GoalCard.tsx`

**Shared Components** (`src/components/`):
- **UI Components** (`src/components/ui/`): Reusable primitives (Button, Input, Card, LoadingSpinner)
- **Layout Components** (`src/components/layout/`): App structure (AppShell, BottomNav)
- Used across multiple features

### 3. Custom Hooks Pattern

All data fetching and business logic is encapsulated in custom hooks:

```typescript
// Pattern: useFeatureData.ts
export function useFeatureData(params): UseFeatureDataReturn {
  const [data, setData] = useState<DataType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  // Fetch function
  const fetchData = useCallback(async () => { ... }, [user, params]);

  // CRUD operations with optimistic updates
  const addItem = useCallback(async (item) => { ... }, [user, data]);
  const updateItem = useCallback(async (id, updates) => { ... }, [user, data]);
  const deleteItem = useCallback(async (id) => { ... }, [user, data]);

  // Initial fetch
  useEffect(() => { fetchData(); }, [fetchData]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase.channel(...)
      .on('postgres_changes', ...)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchData]);

  return { data, loading, error, addItem, updateItem, deleteItem, refetch: fetchData };
}
```

**Key principles:**
- All mutations use **optimistic updates** (update UI immediately, rollback on error)
- All queries support **real-time subscriptions** via Supabase channels
- Expose `refetch` function for manual refresh
- Return consistent interface: `{ data, loading, error, ...operations }`

### 4. Type Safety

**Strict TypeScript** is enforced:
- All function parameters and return types are explicitly typed
- No `any` types allowed (enforced by ESLint)
- Database types defined in `src/lib/types.ts`
- Type inference used where appropriate

### 5. State Management

**Zustand stores** for global state:
- `authStore`: User authentication and session
- `themeStore`: Theme preferences (dark mode, accent color)
- `profileStore`: User profile (username, avatar)
- `homepageStore`: Homepage card layout configuration

**Local state** for component-specific data:
- Use `useState` for UI state (modals, forms, filters)
- Use custom hooks for data fetching

---

## Directory Structure

```
/
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Pages deployment
├── .claude/
│   └── settings.local.json         # Claude Code settings
├── public/
│   ├── manifest.json               # PWA manifest
│   └── [icons]                     # App icons
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx        # Main app layout with bottom nav
│   │   │   ├── BottomNav.tsx       # Bottom navigation bar
│   │   │   └── index.ts
│   │   ├── ui/
│   │   │   ├── Button.tsx          # Reusable button with variants
│   │   │   ├── Card.tsx            # Card container
│   │   │   ├── Input.tsx           # Form input
│   │   │   ├── LoadingSpinner.tsx  # Loading indicator
│   │   │   └── index.ts
│   │   └── ErrorBoundary.tsx       # React error boundary
│   ├── features/
│   │   ├── homepage/              # Homepage customization
│   │   │   ├── cards/             # Dashboard card components
│   │   │   ├── components/        # EditableCardGrid, CardWrapper
│   │   │   └── cardRegistry.ts    # Card definitions
│   │   ├── mood/                  # Mood tracking
│   │   │   ├── components/        # MoodTrackerCard, MoodYearlyReviewCard
│   │   │   └── hooks/             # useMoodLogs, useTodayMood
│   │   ├── goals/                  # Goal tracking
│   │   │   ├── GoalsPage.tsx
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   │   └── useGoals.ts     # CRUD + realtime
│   │   │   └── index.ts
│   │   ├── habits/                 # Habit tracking
│   │   │   ├── HabitsPage.tsx
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   │   ├── useHabits.ts    # Habit CRUD
│   │   │   │   └── useHabitLogs.ts # Log tracking
│   │   │   └── index.ts
│   │   ├── todos/                  # Task management
│   │   │   ├── TasksPage.tsx
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   │   ├── useTasks.ts     # Date-based tasks
│   │   │   │   └── useAllTasks.ts  # All tasks query
│   │   │   └── index.ts
│   │   └── workout/                # Workout tracking
│   │       ├── WorkoutPage.tsx
│   │       ├── components/
│   │       ├── hooks/
│   │       │   ├── useWorkoutTemplates.ts
│   │       │   ├── useWorkoutSession.ts
│   │       │   └── useWorkoutSessions.ts
│   │       └── lib/
│   │           ├── workoutEngine.ts        # Session management
│   │           └── progressiveOverload.ts  # Auto-suggestions
│   │   └── notes/                  # Notes and canvas feature
│   │       ├── NotesPage.tsx       # Desktop/mobile notes page
│   │       ├── components/
│   │       │   ├── CanvasView.tsx          # ReactFlow canvas container
│   │       │   ├── NoteNode.tsx            # Note node component
│   │       │   ├── GroupNode.tsx           # Group node component
│   │       │   ├── ImageNode.tsx           # Image node component
│   │       │   ├── LinkNode.tsx            # Link embed node
│   │       │   ├── FloatingEdge.tsx        # Custom edge component
│   │       │   ├── FloatingToolbar.tsx     # Canvas toolbar
│   │       │   ├── NotesLibrarySidebar.tsx # Notes/folders sidebar
│   │       │   ├── TabStrip.tsx            # Tab bar for open notes
│   │       │   ├── StandaloneNoteEditor.tsx # Full note editor
│   │       │   ├── MobileNotesView.tsx     # Mobile notes list
│   │       │   ├── MobileNoteEditor.tsx    # Mobile note editor
│   │       │   └── MobileCanvasView.tsx    # Mobile canvas view
│   │       └── hooks/
│   │           ├── useCanvases.ts          # Canvas CRUD
│   │           ├── useFolders.ts           # Folder management
│   │           ├── useCanvasGroups.ts      # Group management
│   │           └── useNotesLibraryData.ts  # Aggregated notes data
│   ├── hooks/
│   │   ├── useAuth.ts              # Authentication utilities
│   │   └── useScrollLock.ts        # Modal scroll lock
│   ├── lib/
│   │   ├── supabase.ts             # Supabase client config
│   │   └── types.ts                # TypeScript type definitions
│   ├── pages/
│   │   ├── HomePage.tsx            # Dashboard with stats
│   │   ├── LoginPage.tsx           # Auth page
│   │   └── NotFoundPage.tsx        # 404 page
│   ├── stores/
│   │   ├── authStore.ts            # Auth state (Zustand)
│   │   ├── homepageStore.ts        # Homepage card layout
│   │   ├── themeStore.ts           # Theme state
│   │   ├── profileStore.ts         # User profile (username, avatar)
│   │   ├── notesStore.ts           # Notes canvas state (ReactFlow)
│   │   ├── workspaceStore.ts       # Tab management for notes
│   │   ├── sidebarStore.ts         # Sidebar collapse state
│   │   └── workoutSessionStore.ts  # Active workout session
│   ├── App.tsx                     # Root component with routing
│   ├── main.tsx                    # Entry point
│   ├── index.css                   # Global styles + Tailwind
│   └── vite-env.d.ts               # Vite type declarations
├── .eslintrc.cjs                   # ESLint config
├── .prettierrc                     # Prettier config
├── .gitignore                      # Git ignore rules
├── index.html                      # HTML entry point
├── package.json                    # Dependencies and scripts
├── postcss.config.js               # PostCSS config
├── tailwind.config.js              # Tailwind config
├── tsconfig.json                   # TypeScript config
├── tsconfig.node.json              # TypeScript config for Node
├── vite.config.ts                  # Vite config
├── README.md                       # User-facing documentation
└── AGENTS.md                       # This file (AI assistant guide)
```

---

## Key Conventions

### 1. Naming Conventions

**Files:**
- **Components**: PascalCase with `.tsx` extension (e.g., `TaskItem.tsx`, `AddGoalModal.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useTasks.ts`, `useAuth.ts`)
- **Utilities**: camelCase with `.ts` extension (e.g., `utils.ts`, `workoutEngine.ts`)
- **Types**: PascalCase for interfaces/types, defined in `types.ts`
- **Stores**: camelCase with `Store` suffix (e.g., `authStore.ts`)
- **Pages**: PascalCase with `Page` suffix (e.g., `TasksPage.tsx`)

**Variables and Functions:**
- **camelCase** for variables, functions, hooks
- **PascalCase** for component names, type names
- **UPPER_SNAKE_CASE** for constants (e.g., `DEFAULT_CARDS`)

**Boolean Props:**
- Use `is` prefix: `isLoading`, `isCompleted`, `isActive`

### 2. Code Style

**Formatting (Prettier):**
- Semicolons: Yes
- Single quotes: Yes
- Print width: 100 characters
- Tab width: 2 spaces
- Trailing commas: ES5

**Linting (ESLint):**
- Strict TypeScript rules
- No unused variables (except with `_` prefix)
- No `any` types
- React Hooks rules enforced

### 3. Import Organization

Standard import order:
```typescript
// 1. React and third-party libraries
import { useState, useEffect } from 'react';
import { format } from 'date-fns';

// 2. Internal modules (using @ alias)
import { useAuthStore } from '@/stores/authStore';
import supabase from '@/lib/supabase';
import type { Task, TaskInsert } from '@/lib/types';

// 3. Relative imports (same feature)
import { TaskItem } from './components/TaskItem';
import { useTasks } from './hooks/useTasks';
```

### 4. Component Structure

Standard component template:
```typescript
import { useState } from 'react';
import type { ComponentProps } from 'react';

interface MyComponentProps {
  // Props interface
  title: string;
  onSubmit: (value: string) => void;
  isLoading?: boolean;
}

export function MyComponent({ title, onSubmit, isLoading = false }: MyComponentProps) {
  // Hooks (auth, stores, state)
  const [value, setValue] = useState('');
  const { user } = useAuthStore();

  // Event handlers
  const handleSubmit = () => {
    onSubmit(value);
  };

  // Effects
  useEffect(() => {
    // Side effects
  }, []);

  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}

export default MyComponent;
```

### 5. Database Queries

**Always include:**
- Error handling
- Loading states
- User ID filtering (for security)
- Proper typing from `types.ts`

**Example:**
```typescript
const { data, error } = await supabase
  .from('tasks')
  .select('*')
  .eq('user_id', user.id)
  .eq('date', dateString)
  .order('order_index', { ascending: true });

if (error) throw error;
```

### 6. Real-time Subscriptions

Standard pattern:
```typescript
useEffect(() => {
  if (!user) return;

  const channel = supabase
    .channel(`table-${identifier}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'table_name',
        filter: `user_id=eq.${user.id}`,
      },
      (payload) => {
        console.log('Real-time update:', payload);
        refetchData();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user, refetchData]);
```

---

## Database Schema

### Tables

#### `tasks`
```typescript
interface Task {
  id: string;                    // UUID primary key
  user_id: string;               // Foreign key to auth.users
  title: string;                 // Task title
  description: string | null;    // Optional description
  completed: boolean;            // Completion status
  date: string | null;           // Date in YYYY-MM-DD format (null = dateless)
  order_index: number;           // Sorting order within a day
  created_at: string;            // ISO timestamp
  updated_at: string;            // ISO timestamp
}
```

#### `goals`
```typescript
interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  type: 'weekly' | 'monthly' | 'yearly' | 'open';  // Goal timeframe
  target_date: string | null;    // YYYY-MM-DD (null for open goals)
  completed: boolean;
  progress: number;              // 0-100
  linked_habit_id: string | null;        // Optional habit link
  target_completions: number | null;     // Target habit completions
  created_at: string;
  updated_at: string;
}
```

#### `habits`
```typescript
interface Habit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;                 // Hex color code
  icon: string;                  // Lucide icon name
  target_frequency: number;      // Times per week
  habit_type: string | null;     // User-defined tag/category
  created_at: string;
  updated_at: string;
}
```

#### `habit_logs`
```typescript
interface HabitLog {
  id: string;
  habit_id: string;              // Foreign key to habits
  user_id: string;
  date: string;                  // YYYY-MM-DD (UNIQUE with habit_id)
  completed: boolean;            // Completion status for the day
  notes: string | null;
  created_at: string;
}
```

#### `workout_templates`
```typescript
interface WorkoutTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  exercises: Exercise[];         // JSONB array
  linked_habit_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Exercise {
  id?: string;                   // Optional for React keys
  name: string;
  type?: 'strength' | 'cardio' | 'timed';  // Defaults to 'strength'
  sets: number;
  reps_per_set?: number;         // For strength
  weight?: number;               // For strength/timed
  distance?: number;             // For cardio
  distance_unit?: 'km' | 'm' | 'mi';
  target_time?: number;          // For cardio/timed (seconds)
  rest_time: number;             // Seconds
  to_failure: boolean;           // Final set to failure
  notes?: string;
}
```

#### `workout_sessions`
```typescript
interface WorkoutSession {
  id: string;
  user_id: string;
  template_id: string | null;    // Nullable if template deleted
  template_name: string;         // Stored name
  started_at: string;            // ISO timestamp
  completed_at: string | null;   // Null if in progress
  duration: number | null;       // Seconds
  data: WorkoutSessionData;      // JSONB with completed exercises
  notes: string | null;
  created_at: string;
}

interface WorkoutSessionData {
  exercises: CompletedExercise[];
}
```

#### `canvases`
```typescript
interface Canvas {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  last_accessed_at: string;      // ISO timestamp
  created_at: string;
  updated_at: string;
}
```

#### `folders`
```typescript
interface Folder {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;      // Null for root folders
  created_at: string;
}
```

#### `notes`
```typescript
interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;               // Markdown content
  type?: 'text' | 'link' | 'image';  // Note type
  position_x: number;            // X position on canvas
  position_y: number;            // Y position on canvas
  width?: number | null;         // Note card width
  height?: number | null;        // Note card height
  folder_id: string | null;      // Optional folder
  canvas_id: string | null;      // Optional canvas
  group_id: string | null;       // Optional group
  created_at: string;
  updated_at: string;
}
```

#### `canvas_groups`
```typescript
interface CanvasGroup {
  id: string;
  user_id: string;
  canvas_id: string | null;
  label: string | null;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  color: string;                 // Hex color
  created_at: string;
  updated_at: string;
}
```

#### `note_edges`
```typescript
interface NoteEdge {
  id: string;
  user_id: string;
  source_note_id: string | null;
  target_note_id: string | null;
  source_group_id?: string | null;
  target_group_id?: string | null;
  source_handle?: string | null;  // ReactFlow handle ID
  target_handle?: string | null;  // ReactFlow handle ID
  label?: string | null;          // Edge label
  color?: string | null;          // Edge color
  created_at: string;
}
```

### Row Level Security (RLS)

All tables have RLS enabled with policies:
```sql
create policy "Users can manage their own data" on table_name
  for all using (auth.uid() = user_id);
```

**Important**: Always filter queries by `user_id` to match RLS policies.

---

## State Management

### Zustand Stores

#### `authStore` (`src/stores/authStore.ts`)

**Purpose**: Manages authentication state and session.

**State:**
```typescript
{
  user: User | null;              // Supabase User object
  session: Session | null;        // Supabase Session
  loading: boolean;               // Auth initialization status
  error: string | null;           // Error message
  initialized: boolean;           // Initialization complete flag
}
```

**Actions:**
- `initialize()`: Load session on app start
- `signIn(email, password)`: Sign in user
- `signUp(email, password, username?)`: Register new user
- `signOut()`: Sign out current user
- `setUser(user)`, `setSession(session)`: Update state
- `setLoading(loading)`, `setError(error)`: Update status
- `clearError()`: Clear error message

**Persistence**: User and session are persisted to localStorage.

#### `themeStore` (`src/stores/themeStore.ts`)

**Purpose**: Manages UI theme preferences.

**State:**
```typescript
{
  accentColor: string;            // Hex color (default: '#3b82f6')
  // Additional theme preferences
}
```

**Actions:**
- `setAccentColor(color)`: Update accent color

**Usage**: The accent color is applied via CSS variable `--accent-color`.

#### `profileStore` (`src/stores/profileStore.ts`)

**Purpose**: Manages user profile data (username and avatar).

**State:**
```typescript
{
  profile: Profile | null;        // User profile from profiles table
  loading: boolean;
  error: string | null;
}
```

**Actions:**
- `fetchProfile(userId)`: Load user profile
- `updateProfile(userId, updates)`: Update profile data
- `clearProfile()`: Clear profile on logout

#### `homepageStore` (`src/stores/homepageStore.ts`)

**Purpose**: Manages homepage card layout with localStorage persistence.

**State:**
```typescript
{
  cards: CardConfig[];           // Array of card configurations
  isEditMode: boolean;           // Edit mode toggle
}
```

**Actions:**
- `setEditMode(enabled)`: Toggle edit mode
- `addCard(cardId, size?)`: Add a card to the homepage
- `removeCard(cardId)`: Remove a card
- `reorderCards(cards)`: Update card order after drag-and-drop
- `setCardSize(cardId, size)`: Change card size (1 or 2 columns)
- `resetToDefault()`: Reset to default layout

#### `notesStore` (`src/stores/notesStore.ts`)

**Purpose**: Manages notes canvas state with ReactFlow integration and undo/redo via Zundo.

**State:**
```typescript
{
  nodes: Node[];                // ReactFlow nodes (notes, images, links)
  edges: Edge[];                // ReactFlow edges (connections)
  groups: CanvasGroup[];        // Canvas groups
  selectedNoteId: string | null;
  loading: boolean;
  error: string | null;
  currentCanvasId: string | null;
  libraryNotes: Note[];         // Notes not on canvas
}
```

**Actions:**
- `fetchCanvasNotes(canvasId)`: Load notes for a canvas
- `createNote(options)`: Create note (text/link/image)
- `updateNoteContent(noteId, title, content)`: Update note
- `deleteNote(noteId)`: Delete note
- `connectNotes(connection)`: Create edge between notes
- `createGroup(bounds)`: Create canvas group
- `uploadImage(file)`: Upload image to Supabase storage

**Features:**
- Uses `temporal` middleware from Zundo for undo/redo
- Debounced position/size updates to database
- Automatic group membership calculation

#### `workspaceStore` (`src/stores/workspaceStore.ts`)

**Purpose**: Manages tab system for notes and canvases.

**State:**
```typescript
{
  tabs: WorkspaceTab[];         // Open tabs
  activeTabId: string;          // Currently active tab
}
```

**Actions:**
- `addTab(type, entityId, title)`: Open new tab
- `closeTab(tabId)`: Close tab
- `setActiveTab(tabId)`: Switch to tab
- `updateTabTitle(tabId, newTitle)`: Rename tab

#### `sidebarStore` (`src/stores/sidebarStore.ts`)

**Purpose**: Manages sidebar collapse state.

**State:**
```typescript
{
  isCollapsed: boolean;         // Sidebar collapsed state
}
```

**Actions:**
- `toggleSidebar()`: Toggle sidebar
- `setSidebarCollapsed(collapsed)`: Set collapse state

---

## Feature Development

### Adding a New Feature

Follow these steps to add a new feature (e.g., "Notes"):

#### 1. Create Feature Directory

```bash
mkdir -p src/features/notes/components
mkdir -p src/features/notes/hooks
```

#### 2. Define Database Types

Add to `src/lib/types.ts`:
```typescript
export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export type NoteInsert = Database['public']['Tables']['notes']['Insert'];
export type NoteUpdate = Database['public']['Tables']['notes']['Update'];
```

#### 3. Create Custom Hook

`src/features/notes/hooks/useNotes.ts`:
```typescript
import { useState, useEffect, useCallback } from 'react';
import supabase from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Note, NoteInsert, NoteUpdate } from '@/lib/types';

interface UseNotesReturn {
  notes: Note[];
  loading: boolean;
  error: string | null;
  addNote: (note: NoteInsert) => Promise<boolean>;
  updateNote: (id: string, updates: NoteUpdate) => Promise<boolean>;
  deleteNote: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useNotes(): UseNotesReturn {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const fetchNotes = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setNotes(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notes');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Implement CRUD operations with optimistic updates...

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Real-time subscription...

  return { notes, loading, error, addNote, updateNote, deleteNote, refetch: fetchNotes };
}
```

#### 4. Create Components

`src/features/notes/components/NoteCard.tsx`, etc.

#### 5. Create Page Component

`src/features/notes/NotesPage.tsx`:
```typescript
import { useNotes } from './hooks/useNotes';
import { NoteCard } from './components/NoteCard';

export function NotesPage() {
  const { notes, loading, addNote } = useNotes();

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-4">
      <h1>Notes</h1>
      {notes.map(note => (
        <NoteCard key={note.id} note={note} />
      ))}
    </div>
  );
}

export default NotesPage;
```

#### 6. Add Route

Update `src/App.tsx`:
```typescript
import NotesPage from '@/features/notes/NotesPage';

// In Routes:
<Route path="/notes" element={<NotesPage />} />
```

#### 7. Add Navigation

Update `src/components/layout/BottomNav.tsx` to include new route.

#### 8. Create Database Table

Add SQL to Supabase:
```sql
create table notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table notes enable row level security;

create policy "Users can manage their own notes" on notes
  for all using (auth.uid() = user_id);
```

---

## Development Workflow

### Available Scripts

```bash
# Development server (http://localhost:5173)
npm run dev

# Type check + production build
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Format code with Prettier
npm run format
```

### Before Committing

1. **Run linter**: `npm run lint`
2. **Format code**: `npm run format`
3. **Type check**: `npm run build` (runs `tsc`)
4. **Test manually**: Verify changes in browser

### Git Workflow

Standard feature branch workflow:
```bash
git checkout -b feature/new-feature
# Make changes
git add .
git commit -m "Add new feature"
git push origin feature/new-feature
# Create pull request
```

### Deployment

**Automatic deployment** via GitHub Actions:
- Push to `main` branch triggers deployment
- Builds project with `npm run build`
- Deploys to GitHub Pages
- Live at: `https://dandanaher.github.io/Personal-Dashboard/`

Configuration in `.github/workflows/deploy.yml` and `vite.config.ts` (`base: '/Personal-Dashboard/'`).

---

## Common Tasks

### Adding a New UI Component

Create in `src/components/ui/`:
```typescript
// src/components/ui/Badge.tsx
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning';
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  // Implementation
}

export default Badge;
```

Export from `src/components/ui/index.ts`:
```typescript
export { default as Badge } from './Badge';
```

### Modifying Database Schema

1. Update types in `src/lib/types.ts`
2. Run SQL migration in Supabase dashboard
3. Update relevant hooks to use new fields
4. Update components to display/edit new data

### Adding a New Store

1. Create in `src/stores/`:
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MyState {
  value: string;
}

interface MyActions {
  setValue: (value: string) => void;
}

export const useMyStore = create<MyState & MyActions>()(
  persist(
    (set) => ({
      value: '',
      setValue: (value) => set({ value }),
    }),
    { name: 'my-storage' }
  )
);
```

2. Use in components:
```typescript
const { value, setValue } = useMyStore();
```

---

## Important Files

### Core Files

- **`src/App.tsx`**: Root component, routing, protected routes
- **`src/main.tsx`**: Entry point, renders App
- **`src/lib/types.ts`**: All TypeScript type definitions
- **`src/lib/supabase.ts`**: Supabase client configuration
- **`vite.config.ts`**: Vite build config, base path, PWA
- **`tailwind.config.js`**: Tailwind theme, colors, breakpoints
- **`tsconfig.json`**: TypeScript strict mode config

### Configuration Files

- **`.eslintrc.cjs`**: Linting rules
- **`.prettierrc`**: Code formatting rules
- **`.gitignore`**: Git ignore patterns
- **`package.json`**: Dependencies and scripts

### Environment Variables

Create `.env` in project root:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Note**: These are required for the app to connect to Supabase.

---

## AI Assistant Guidelines

### Best Practices for AI Assistants

When working on this codebase, follow these guidelines:

#### 1. Understanding Context

- **Always read** `src/lib/types.ts` first to understand data structures
- **Check existing patterns** before creating new ones (e.g., look at `useTasks.ts` before creating a new hook)
- **Review related components** to maintain consistency

#### 2. Code Modifications

- **Prefer editing** existing files over creating new ones
- **Follow the feature-based structure** when adding new functionality
- **Maintain type safety**: Never use `any`, always define proper types
- **Use optimistic updates** for all mutations (see `useTasks.ts` for examples)
- **Include real-time subscriptions** for data that can change (see hook patterns)

#### 3. Type Safety

- **Read existing types** from `types.ts` before creating new ones
- **Use type inference** where appropriate (e.g., `const [value, setValue] = useState(0)`)
- **Define explicit return types** for hooks and utility functions
- **Use discriminated unions** for variants (e.g., `type: 'weekly' | 'monthly'`)

#### 4. Styling

- **Use Tailwind classes** exclusively (no inline styles except for dynamic colors)
- **Follow mobile-first** approach (base styles for mobile, `md:` for desktop)
- **Use semantic color classes**: `primary`, `secondary`, `accent` palettes
- **Respect touch targets**: minimum `min-h-touch` (44px) for interactive elements
- **Support dark mode**: always include `dark:` variants

#### 5. Performance

- **Memoize callbacks** with `useCallback` when passed as props or used in dependencies
- **Optimize re-renders**: avoid unnecessary state updates
- **Use proper dependencies** in `useEffect` and `useCallback`
- **Lazy load routes** if adding many new pages

#### 6. Error Handling

- **Always handle errors** in async operations
- **Rollback optimistic updates** on failure
- **Display user-friendly error messages**
- **Log errors** to console for debugging

#### 7. Testing Changes

When making changes:
1. **Run TypeScript**: `npm run build` to check for type errors
2. **Run linter**: `npm run lint` to check for code issues
3. **Format code**: `npm run format` to ensure consistent style
4. **Test in browser**: Verify functionality works as expected

#### 8. Lint Error Prevention

- Wrap async handlers for void props: `onClick={() => void handleSave()}`, `onSubmit={(e) => void handleSubmit(e)}`.
- Mark fire-and-forget promises with `void` in effects/handlers; otherwise `await` and handle errors.
- Type Supabase responses (`SupabaseResult<T>`) and guard `data` for null to avoid `any` and unsafe assignments.
- Avoid non-null assertions (`!`); use guard clauses or fallback values.
- Keep hook dependencies complete; wrap helper predicates in `useCallback`/`useMemo` when referenced.
- Move non-component exports (helpers/constants) into separate files to satisfy `react-refresh/only-export-components`.
- Avoid redundant unions like `'all' | string`; use `string` or a strict union.
- Remove `async` from functions without `await` to satisfy `require-await`.

#### 9. Common Pitfalls to Avoid

- **Don't bypass RLS**: Always filter by `user_id` in queries
- **Don't forget optimistic updates**: Users expect instant feedback
- **Don't skip real-time subscriptions**: Data should update across tabs
- **Don't use `any` types**: Maintain strict type safety
- **Don't create unused abstractions**: Keep it simple until complexity is needed
- **Don't ignore mobile**: Test UI at mobile widths (375px+)

#### 10. File Location Decision Tree

When creating a new file:
- **Component used by one feature?** → `src/features/<feature>/components/`
- **Component used by multiple features?** → `src/components/ui/` or `src/components/layout/`
- **Hook for one feature?** → `src/features/<feature>/hooks/`
- **Hook used globally?** → `src/hooks/`
- **Utility for one feature?** → `src/features/<feature>/lib/`
- **Types?** → `src/lib/types.ts` (single file)
- **Page component?** → `src/features/<feature>/<Feature>Page.tsx` or `src/pages/`

#### 11. When Adding New Dependencies

- **Check if already available**: Review `package.json` first
- **Prefer lighter alternatives**: Smaller bundle = faster load
- **Consider tree-shaking**: Ensure library supports it
- **Update `package.json`**: Use `npm install <package>`

---

## Additional Resources

### Official Documentation

- **React**: https://react.dev/
- **TypeScript**: https://www.typescriptlang.org/docs/
- **Vite**: https://vitejs.dev/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Supabase**: https://supabase.com/docs
- **Zustand**: https://docs.pmnd.rs/zustand/
- **React Router**: https://reactrouter.com/
- **ReactFlow**: https://reactflow.dev/

### Project Documentation

- **README.md**: User-facing setup and usage instructions
- **Database Schema**: See README.md for SQL setup
- **GitHub Repo**: https://github.com/dandanaher/Personal-Dashboard

---

**Last Updated**: 2026-01-04
**Version**: 2.0.0
**Maintained by**: Dan Danaher

For questions or updates to this guide, create an issue or pull request on GitHub.
