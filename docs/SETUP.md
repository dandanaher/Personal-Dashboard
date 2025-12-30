# Setup & Installation

## Prerequisites

- **Node.js 18+** - Required for running Vite and the build process
- **npm** or **yarn** - Package manager
- **Supabase account** - For backend services (authentication and database)

## Installation Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd personal-dashboard
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Add your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Set Up Supabase

#### Create Tables

Run the following SQL in your Supabase SQL editor:

```sql
-- Profiles table (for gamification)
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text,
  total_xp integer default 0,
  consistency_xp integer default 0,
  vitality_xp integer default 0,
  focus_xp integer default 0,
  drive_xp integer default 0,
  last_decay_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tasks table
create table tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  is_completed boolean default false,
  priority text check (priority in ('low', 'medium', 'high')) default 'medium',
  due_date timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Goals table
create table goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  target_date timestamptz,
  progress integer default 0 check (progress >= 0 and progress <= 100),
  is_completed boolean default false,
  category text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Habits table
create table habits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  frequency text check (frequency in ('daily', 'weekly', 'monthly')) default 'daily',
  target_count integer default 1,
  color text,
  icon text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Habit logs table
create table habit_logs (
  id uuid default gen_random_uuid() primary key,
  habit_id uuid references habits(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  completed_at timestamptz default now(),
  notes text,
  created_at timestamptz default now()
);

-- Workout templates table
create table workout_templates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  exercises jsonb default '[]'::jsonb,
  estimated_duration integer,
  category text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Workout sessions table
create table workout_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  template_id uuid references workout_templates(id) on delete set null,
  name text not null,
  exercises jsonb default '[]'::jsonb,
  started_at timestamptz default now(),
  completed_at timestamptz,
  duration integer,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Notes table
create table notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'New Note',
  content text default '',
  type text check (type in ('text', 'link', 'image')) default 'text',
  color text,
  position_x integer default 100,
  position_y integer default 100,
  width integer,
  height integer,
  canvas_id uuid,
  folder_id uuid,
  group_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Canvases table
create table canvases (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default 'Untitled Canvas',
  folder_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Folders table
create table folders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default 'New Folder',
  parent_id uuid references folders(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Canvas groups table
create table canvas_groups (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  canvas_id uuid references canvases(id) on delete cascade not null,
  label text default 'New Group',
  color text,
  position_x integer default 0,
  position_y integer default 0,
  width integer default 400,
  height integer default 300,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Note edges table (for canvas connections)
create table note_edges (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  source_note_id uuid references notes(id) on delete cascade,
  target_note_id uuid references notes(id) on delete cascade,
  source_group_id uuid references canvas_groups(id) on delete cascade,
  target_group_id uuid references canvas_groups(id) on delete cascade,
  source_handle text,
  target_handle text,
  label text,
  color text,
  created_at timestamptz default now()
);
```

#### Enable Row Level Security

```sql
-- Enable RLS on all tables
alter table profiles enable row level security;
alter table tasks enable row level security;
alter table goals enable row level security;
alter table habits enable row level security;
alter table habit_logs enable row level security;
alter table workout_templates enable row level security;
alter table workout_sessions enable row level security;
alter table notes enable row level security;
alter table canvases enable row level security;
alter table folders enable row level security;
alter table canvas_groups enable row level security;
alter table note_edges enable row level security;

-- Create policies (users can only access their own data)
create policy "Users can manage their own profile" on profiles
  for all using (auth.uid() = id);

create policy "Users can manage their own tasks" on tasks
  for all using (auth.uid() = user_id);

create policy "Users can manage their own goals" on goals
  for all using (auth.uid() = user_id);

create policy "Users can manage their own habits" on habits
  for all using (auth.uid() = user_id);

create policy "Users can manage their own habit logs" on habit_logs
  for all using (auth.uid() = user_id);

create policy "Users can manage their own workout templates" on workout_templates
  for all using (auth.uid() = user_id);

create policy "Users can manage their own workout sessions" on workout_sessions
  for all using (auth.uid() = user_id);

create policy "Users can manage their own notes" on notes
  for all using (auth.uid() = user_id);

create policy "Users can manage their own canvases" on canvases
  for all using (auth.uid() = user_id);

create policy "Users can manage their own folders" on folders
  for all using (auth.uid() = user_id);

create policy "Users can manage their own canvas groups" on canvas_groups
  for all using (auth.uid() = user_id);

create policy "Users can manage their own note edges" on note_edges
  for all using (auth.uid() = user_id);
```

#### Set Up Storage (for images)

1. Go to Storage in Supabase dashboard
2. Create a new bucket called `canvas-assets`
3. Set it to public (or configure RLS policies for authenticated access)

#### Enable Authentication

1. Go to Authentication > Providers in Supabase
2. Enable Email provider
3. Configure email templates as needed

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint for code quality |
| `npm run format` | Format code with Prettier |

## Build for Production

```bash
npm run build
```

This will:
1. Run TypeScript type checking
2. Bundle the application with Vite
3. Generate PWA assets
4. Output to `dist/` folder

## Deployment

The app is configured to deploy to GitHub Pages with a base path of `/Personal-Dashboard/`. To deploy elsewhere:

1. Update `base` in `vite.config.ts`
2. Update `start_url` and `scope` in the PWA manifest

### GitHub Pages

The repository is set up for GitHub Pages deployment. Push to `main` branch to trigger deployment.

### Other Platforms

For Vercel, Netlify, or similar:
1. Set the base path to `/` in `vite.config.ts`
2. Configure the build command: `npm run build`
3. Set the output directory: `dist`

## Troubleshooting

### Supabase Connection Issues

1. Verify `.env` file exists and contains correct values
2. Check that Supabase project is active
3. Verify RLS policies are configured correctly

### Build Errors

1. Run `npm install` to ensure all dependencies are installed
2. Clear node_modules and reinstall: `rm -rf node_modules && npm install`
3. Check for TypeScript errors: `npx tsc --noEmit`

### PWA Not Working

1. PWA features only work on HTTPS (except localhost)
2. Clear service worker cache in browser dev tools
3. Check that all PWA assets exist in `public/`

---

*Last updated: 2025-12-30*
