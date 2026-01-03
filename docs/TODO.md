# Project Roadmap & TODO

## Known Issues

### High Priority

- [ ] **Real-time sync** - Changes made in multiple browser tabs don't sync automatically. Consider implementing Supabase real-time subscriptions.

- [ ] **Offline support** - PWA service worker caches assets but doesn't handle offline data operations. IndexedDB could be used for offline-first data.

- [ ] **Notes canvas performance** - Large canvases with many nodes may experience lag. Consider virtualization or limiting visible nodes.

### Medium Priority

- [ ] **Mobile notes canvas** - Canvas interaction on mobile could be improved with better touch gestures and zoom controls.

- [ ] **Workout session recovery** - If the app crashes during a workout, the session state may be lost. Consider persisting to localStorage.

- [ ] **Goal milestones** - Goals currently track single progress percentage. Adding sub-milestones would improve tracking.

### Low Priority

- [ ] **Habit streak notifications** - No reminders when about to break a streak.

- [ ] **Export data** - No way to export user data (tasks, habits, etc.) for backup.

- [ ] **Keyboard shortcuts** - Limited keyboard navigation in the notes canvas.

## Planned Features

### Near Term

- [ ] **Task recurrence** - Recurring tasks (daily, weekly, monthly)
- [ ] **Goal dependencies** - Link goals together with prerequisites
- [ ] **Habit archives** - Archive inactive habits instead of deleting
- [ ] **Workout rest timer customization** - Per-exercise rest times

### Medium Term

- [ ] **Calendar view** - Unified calendar showing tasks, habits, and workouts
- [ ] **Statistics dashboard** - Comprehensive analytics across all features
- [ ] **Social features** - Share goals or habits with accountability partners
- [ ] **Supabase real-time** - Live sync across devices

### Long Term

- [ ] **Native mobile app** - React Native or Capacitor wrapper
- [ ] **AI suggestions** - Workout recommendations, habit insights
- [ ] **Integrations** - Calendar sync, fitness tracker imports
- [ ] **Team/family features** - Shared goals and habits

## Technical Debt

### Code Quality

- [ ] **Add comprehensive tests** - Unit tests for utilities, integration tests for features
- [ ] **Improve TypeScript coverage** - Some `any` types remain in complex areas
- [ ] **Error boundary per feature** - Currently only root-level error boundary
- [ ] **Consistent loading states** - Some features have inconsistent loading UX

### Performance

- [ ] **Bundle analysis** - Identify and optimize large dependencies
- [ ] **Image optimization** - Implement responsive images and lazy loading
- [ ] **Reduce re-renders** - Profile and optimize component updates
- [ ] **Database indexes** - Review Supabase indexes for query performance

### Architecture

- [ ] **Standardize feature structure** - Some features have inconsistent organization
- [ ] **Extract common patterns** - Create shared hooks for CRUD operations
- [ ] **API abstraction layer** - Decouple components from Supabase directly
- [ ] **State normalization** - Consider normalizing nested data in stores

## Improvement Suggestions

### User Experience

1. **Onboarding flow** - Guide new users through features
2. **Empty states** - Better messaging when no data exists
3. **Bulk actions** - Select multiple items for batch operations
4. **Search** - Global search across all features
5. **Filters persistence** - Remember filter preferences

### Developer Experience

1. **Storybook** - Component documentation and visual testing
2. **API documentation** - Document Supabase schema and RLS policies
3. **Contributing guide** - Guidelines for external contributors
4. **CI/CD pipeline** - Automated testing and deployment

### Accessibility

1. **ARIA improvements** - Audit and fix ARIA attributes
2. **Keyboard navigation** - Full keyboard support for all features
3. **Screen reader testing** - Test with actual screen readers
4. **Color contrast** - Verify contrast ratios meet WCAG standards

## Completed Recently

- [x] **Decoupled theme and style systems** - Theme (light/dark) controls colors only, style (modern/retro) controls visual appearance only
- [x] **Instant theme switching** - Added `switching-theme` CSS class to disable transitions during theme toggle
- [x] **Dynamic logo improvements** - Pre-loads both light/dark GIF frames for seamless mid-animation theme switching
- [x] **Unified color palette** - Single light (#FAF9F4) and dark (#202021) background colors for both styles
- [x] Animated sidebar logo with theme-aware variants
- [x] Mobile canvas bug fixes (background gap, edit button)
- [x] Tasks QOL improvements
- [x] Goals QOL improvements
- [x] Optimized task real-time handling
- [x] Memoized derived task lists
- [x] Centralized goal progress calculations
- [x] Limited Supabase logging to dev builds
- [x] Desktop view updates to homepage, tasks, goals, habits and workouts pages

## Notes for Maintainers

### Before Major Changes

1. Check that all linting passes: `npm run lint`
2. Format code: `npm run format`
3. Test build: `npm run build`
4. Test on mobile viewport

### Database Migrations

When updating Supabase schema:
1. Document SQL changes in SETUP.md
2. Test RLS policies with different user scenarios
3. Consider backwards compatibility

### Dependency Updates

1. Check changelog for breaking changes
2. Test affected features after updating
3. Update DEPENDENCIES.md if versions change significantly

---

*Last updated: 2026-01-03*
