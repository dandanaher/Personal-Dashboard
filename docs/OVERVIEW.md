# Project Overview

## What is MyDash?

MyDash is a mobile-first personal dashboard web application designed to help users manage their daily productivity and self-improvement. It combines task management, goal tracking, habit building, workout logging, mood tracking, and note-taking into a unified platform with a customizable homepage layout.

## Key Features

### Customizable Homepage
- Drag-and-drop card arrangement using @dnd-kit
- Add/remove cards to personalize your dashboard
- Resizable cards (single or double width)
- Persistent layout saved to localStorage
- Edit mode toggle for easy customization

### Tasks
- Create and manage daily tasks with custom task types
- Organize tasks by date with order-based sorting
- Mark tasks as complete
- Filter and organize tasks

### Goals
- Set long-term goals with target dates
- Multiple timeframe types: weekly, monthly, yearly, custom, or open-ended
- Track progress with percentage-based milestones
- Link goals to habits for automatic progress tracking
- Kanban board view for goal management

### Habits
- Track habits with customizable weekly frequency targets
- Customizable colors and icons for each habit
- Streak tracking and contribution graphs (GitHub-style)
- Detailed statistics and calendar views
- Custom habit types for categorization
- Push notification reminders for habits with active streaks

### Mood Tracking
- Log daily mood on a 1-5 scale (Bad, Poor, Okay, Good, Great)
- Optional notes for each mood entry
- Yearly review visualization (GitHub-style contribution graph)
- Statistics: average mood, positive days, streak tracking
- Real-time sync across devices

### Workouts
- Create workout templates with multiple exercise types (strength, cardio, timed)
- Log workout sessions with sets, reps, weights, distance, and time
- Track exercise history and progress
- Rest timer between sets
- Progressive overload suggestions
- Link workouts to habits for automatic habit completion

### Notes (Canvas)
- Visual canvas-based note-taking using ReactFlow
- Create notes, link nodes, and image nodes
- Group notes into collections
- Folder organization
- Desktop: tabbed interface with library sidebar
- Mobile: dedicated views for notes and canvases

## Target Users

- Individuals seeking a unified productivity system
- Users who prefer mobile-first applications
- Self-improvement enthusiasts tracking multiple life areas
- People who want a customizable dashboard experience

## Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | TailwindCSS |
| Routing | React Router v6 |
| State Management | Zustand |
| Backend/Auth | Supabase |
| Canvas/Notes | ReactFlow |
| Charts | Recharts |
| Icons | Lucide React |
| PWA | vite-plugin-pwa |

## Design Philosophy

### Mobile-First
- Primary focus on mobile experience
- Touch targets minimum 44x44px
- Safe area insets for modern devices
- Bottom navigation for thumb accessibility
- Responsive breakpoints: xs (375px), sm (640px), md (768px), lg (1024px)

### Theming System
- **Theme** (light/dark mode): Controls background colors only
  - Light mode: `#FAF9F4`
  - Dark mode: `#202021`
- **Style** (modern/retro): Controls visual style only
  - Modern: Rounded corners, system fonts
  - Retro: Sharp corners, monospace fonts
- **Accent Color**: User-selectable from 20 color options
- Respects system dark mode preference
- Class-based theme switching with instant transitions
- Theme and style are fully decoupled

### Progressive Web App
- Installable on mobile devices
- Offline support via service worker
- Native-like experience
- Push notifications for habit reminders (requires iOS 16.4+ for iOS)

---

*Last updated: 2026-01-05*
