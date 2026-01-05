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
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key
```

Note: The VAPID key is optional but required for push notifications. Generate VAPID keys using the web-push library or an online generator.

### 4. Set Up Supabase

#### Create Tables

Run the following SQL in your Supabase SQL editor:

```sql
-- Profiles table (user display info)
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Tasks table
create table tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  completed boolean default false,
  date date,
  order_index integer default 0,
  task_type text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Goals table
create table goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  type text check (type in ('weekly', 'monthly', 'yearly', 'custom', 'open')) default 'open',
  target_date date,
  progress integer default 0 check (progress >= 0 and progress <= 100),
  completed boolean default false,
  linked_habit_id uuid references habits(id) on delete set null,
  target_completions integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Habits table
create table habits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  color text not null,
  icon text not null,
  target_frequency integer default 1,
  habit_type text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Habit logs table
create table habit_logs (
  id uuid default gen_random_uuid() primary key,
  habit_id uuid references habits(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  completed boolean default true,
  notes text,
  created_at timestamptz default now(),
  unique(habit_id, date)
);

-- Mood logs table
create table mood_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  mood_level integer check (mood_level >= 1 and mood_level <= 5) not null,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);

-- Workout templates table
create table workout_templates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  exercises jsonb default '[]'::jsonb,
  linked_habit_id uuid references habits(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Workout sessions table
create table workout_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  template_id uuid references workout_templates(id) on delete set null,
  template_name text not null,
  started_at timestamptz default now(),
  completed_at timestamptz,
  duration integer,
  data jsonb default '{"exercises": []}'::jsonb,
  notes text,
  created_at timestamptz default now()
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

-- Push subscriptions table (for notifications)
create table push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  endpoint text not null,
  p256dh_key text not null,
  auth_key text not null,
  device_name text,
  user_agent text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_used_at timestamptz,
  unique(user_id, endpoint)
);

-- Notification preferences table
create table notification_preferences (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade unique not null,
  habit_reminders_enabled boolean default false not null,
  reminder_time time default '20:00:00' not null,
  timezone text default 'UTC' not null,
  weekly_summary_enabled boolean default false,
  streak_milestone_enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Notification log table (for debugging and analytics)
create table notification_log (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  subscription_id uuid references push_subscriptions(id) on delete set null,
  notification_type text not null,
  title text not null,
  body text,
  status text default 'pending' not null,
  error_message text,
  created_at timestamptz default now(),
  sent_at timestamptz,
  clicked_at timestamptz
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
alter table mood_logs enable row level security;
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

create policy "Users can manage their own mood logs" on mood_logs
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

-- Push notifications RLS
alter table push_subscriptions enable row level security;
alter table notification_preferences enable row level security;
alter table notification_log enable row level security;

create policy "Users can manage their own push subscriptions" on push_subscriptions
  for all using (auth.uid() = user_id);

create policy "Users can manage their own notification preferences" on notification_preferences
  for all using (auth.uid() = user_id);

create policy "Users can view their own notification log" on notification_log
  for select using (auth.uid() = user_id);
```

#### Set Up Storage (for images)

1. Go to Storage in Supabase dashboard
2. Create a new bucket called `canvas-assets`
3. Set it to public (or configure RLS policies for authenticated access)

#### Enable Authentication

1. Go to Authentication > Providers in Supabase
2. Enable Email provider
3. Configure email templates as needed

#### Set Up Push Notifications (Optional)

1. Generate VAPID keys:
   ```bash
   npx web-push generate-vapid-keys
   ```

2. Add keys to environment:
   - `VITE_VAPID_PUBLIC_KEY` - Add to `.env` for the frontend
   - `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` - Add to Supabase Edge Function secrets

3. Deploy the habit reminders edge function:
   ```bash
   supabase functions deploy send-habit-reminders
   ```

4. Set up a cron job to invoke the function every 15 minutes (via Supabase Dashboard or external scheduler)

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

The app is configured to deploy to GitHub Pages with a base path of `/MyDash/`. To deploy elsewhere:

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

*Last updated: 2026-01-05*
