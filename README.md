# MyDash - Personal Dashboard

A mobile-first personal dashboard web app built with React, TypeScript, and Supabase.

## Features

- **Tasks** - Manage your daily tasks with priorities and due dates
- **Goals** - Set and track long-term goals with progress milestones
- **Habits** - Build better habits with daily tracking and streaks
- **Workout** - Log workouts and track your fitness progress

## Tech Stack

- **Frontend**: Vite + React 18 + TypeScript (strict mode)
- **Styling**: TailwindCSS with mobile-first breakpoints
- **Routing**: React Router v6
- **State Management**: Zustand
- **Backend**: Supabase (authentication & database)
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **PWA**: vite-plugin-pwa

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (for backend)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd personal-dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

4. Configure your Supabase credentials in `.env`:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Project Structure

```
src/
├── features/           # Feature-based modules
│   ├── todos/         # Tasks feature
│   ├── goals/         # Goals feature
│   ├── habits/        # Habits feature
│   └── workout/       # Workout feature
├── lib/               # Core utilities
│   ├── supabase.ts    # Supabase client
│   └── types.ts       # TypeScript types
├── components/        # Shared components
│   ├── ui/            # UI primitives
│   └── layout/        # Layout components
├── hooks/             # Custom React hooks
├── stores/            # Zustand stores
├── pages/             # Page components
└── App.tsx            # Main app component
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Supabase Setup

### Database Schema

Create the following tables in your Supabase project:

```sql
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

-- Enable Row Level Security
alter table tasks enable row level security;
alter table goals enable row level security;
alter table habits enable row level security;
alter table habit_logs enable row level security;
alter table workout_templates enable row level security;
alter table workout_sessions enable row level security;

-- Create policies (users can only access their own data)
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
```

### Authentication

Enable Email/Password authentication in your Supabase project:

1. Go to Authentication > Providers
2. Enable Email provider
3. Configure email templates as needed

## Mobile-First Design

This app is built with a mobile-first approach:

- Touch targets are minimum 44x44px for accessibility
- Safe area insets for iOS notches and Android navigation
- Bottom navigation optimized for thumb reach
- Responsive breakpoints: xs (375px), sm (640px), md (768px), lg (1024px)

## Dark Mode

Dark mode is supported and respects system preferences. Toggle between light and dark themes by adding/removing the `dark` class on the document element.

## PWA Support

The app includes PWA configuration for installable web app experience:

- Service worker for offline support
- App manifest for installation
- Theme color and icons configured

## Maintenance Updates

- Optimized task real-time handling to avoid full refetches on every change.
- Memoized derived task lists and day overview counts to reduce repeated filtering.
- Centralized goal display progress calculations to remove duplicate logic.
- Limited Supabase initialization logging to development builds.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
