# Project Overview

## What is MyDash?

MyDash is a mobile-first personal dashboard web application designed to help users manage their daily productivity and self-improvement. It combines task management, goal tracking, habit building, workout logging, and note-taking into a unified platform with gamification elements.

## Key Features

### Tasks
- Create and manage daily tasks with priorities (low, medium, high)
- Set due dates and descriptions
- Mark tasks as complete
- Filter and organize tasks

### Goals
- Set long-term goals with target dates
- Track progress with percentage-based milestones
- Organize goals by category
- Kanban board view for goal management

### Habits
- Track daily, weekly, or monthly habits
- Customizable colors and icons for each habit
- Streak tracking and contribution graphs (GitHub-style)
- Detailed statistics and calendar views

### Workouts
- Create workout templates with exercises
- Log workout sessions with sets, reps, and weights
- Track exercise history and progress
- Rest timer between sets
- Progressive overload suggestions

### Notes (Canvas)
- Visual canvas-based note-taking using ReactFlow
- Create notes, link nodes, and image nodes
- Group notes into collections
- Folder organization
- Desktop: tabbed interface with library sidebar
- Mobile: dedicated views for notes and canvases

### Gamification System
- XP rewards for completing tasks, habits, goals, and workouts
- Material-based rank system (Wood through Palladium)
- Daily XP tax at higher ranks (prevents stagnation)
- Four attributes: Consistency, Vitality, Focus, Drive
- Level progression with visual rank badges

## Target Users

- Individuals seeking a unified productivity system
- People who enjoy gamification as motivation
- Users who prefer mobile-first applications
- Self-improvement enthusiasts tracking multiple life areas

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

### Dark Mode
- Full dark mode support
- Respects system preferences
- Class-based theme switching

### Progressive Web App
- Installable on mobile devices
- Offline support via service worker
- Native-like experience

---

*Last updated: 2025-12-30*
