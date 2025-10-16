# Design Guidelines - Video Course Platform (LMS)

## Design Approach: Material Design System with Modern LMS Patterns
**Justification**: Educational platforms require clarity, consistency, and information hierarchy. Drawing inspiration from Teachable, Udemy, and Material Design principles to create a professional, utility-focused learning environment.

**Key Design Principles**:
- Clarity over decoration - information must be easily scannable
- Role-based visual hierarchy - distinct experiences for Admin/Instructor/Student
- Progress visibility - always show learning/teaching progress
- Trust through professionalism - clean, reliable interface

## Color Palette

**Light Mode:**
- Primary: 220 90% 56% (Professional blue for actions, navigation)
- Secondary: 220 15% 25% (Dark gray for text, headers)
- Success: 142 76% 36% (Course completion, successful actions)
- Warning: 38 92% 50% (Pending reviews, incomplete tasks)
- Background: 0 0% 98% (Main canvas)
- Surface: 0 0% 100% (Cards, modals)
- Border: 220 13% 91% (Dividers, card borders)

**Dark Mode:**
- Primary: 220 90% 60% (Slightly brighter for contrast)
- Secondary: 220 15% 85% (Light gray for text)
- Success: 142 70% 45% (Adjusted for dark bg)
- Warning: 38 90% 55% (Adjusted for dark bg)
- Background: 220 15% 9% (Deep dark blue-gray)
- Surface: 220 15% 12% (Slightly lighter cards)
- Border: 220 10% 20% (Subtle dividers)

## Typography

**Font Families**:
- Primary: 'Inter' (UI, forms, buttons) - Clean, highly legible
- Content: 'Georgia' or 'Merriweather' (Course descriptions, lesson text) - Comfortable reading

**Hierarchy**:
- H1: text-4xl font-bold (Dashboard titles, page headers)
- H2: text-2xl font-semibold (Section headers, course titles)
- H3: text-xl font-medium (Card titles, lesson names)
- Body: text-base (Course descriptions, general content)
- Small: text-sm (Metadata, helper text, timestamps)
- Tiny: text-xs (Labels, badges, status indicators)

## Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, 12, 16
- Tight spacing: p-2, gap-2 (Compact lists, inline elements)
- Standard spacing: p-4, gap-4 (Cards, form fields)
- Section spacing: p-6, p-8 (Content areas, panels)
- Page spacing: p-12, p-16 (Main containers on desktop)

**Grid Patterns**:
- Admin Dashboard: 3-column stats grid (grid-cols-1 md:grid-cols-3)
- Course Catalog: 3-4 column course cards (grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4)
- Instructor Panel: 2-column layout (sidebar + content area)
- Student Learning: Single column focus (max-w-4xl mx-auto)

## Component Library

**Navigation**:
- Top navbar with role indicator (Admin/Instructor/Student badge)
- Sidebar navigation for dashboard panels (collapsible on mobile)
- Breadcrumbs for course hierarchy (Course > Module > Lesson)
- Tab navigation for course sections (Overview, Curriculum, Reviews)

**Core UI Elements**:
- Buttons: Solid primary for main actions, outline for secondary, text for tertiary
- Input fields: Consistent height (h-10), proper labels, inline validation
- Cards: Elevated surface with subtle shadow, hover lift effect on interactive cards
- Badges: Pill-shaped status indicators (Enrolled, Completed, Pending, Published)
- Progress bars: Horizontal bars showing course/lesson completion percentage

**Data Display**:
- Tables: Zebra striping for admin data, sortable headers, pagination
- Course cards: Thumbnail, title, instructor, price, rating, enroll button
- Stats widgets: Large numbers with labels and trend indicators
- Activity feed: Timeline-style for student progress and admin monitoring

**Forms**:
- Course creation: Multi-step wizard with clear progress indicator
- Rich text editor: For course descriptions and lesson content
- File upload: Drag-drop area for thumbnails and materials
- Test/Quiz builder: Add/remove questions dynamically with radio/checkbox options

**Video Player**:
- Custom controls or embedded player (YouTube/Vimeo) with branded frame
- Lesson playlist sidebar showing module structure
- Progress tracking: Mark complete button, auto-save position
- Notes section: Collapsible panel for student notes during video

**Student Learning Interface**:
- Clean video focus: Full-width player with minimal distractions
- Course outline: Left sidebar with module/lesson tree
- Assignment submission: File upload with deadline countdown
- Quiz interface: Question-by-question with progress indicator

**Admin Panel**:
- User management table: Search, filter by role, action buttons
- Analytics dashboard: Charts for enrollments, revenue, course popularity
- Instructor approval workflow: Review pending instructors with approve/reject actions
- System logs: Filterable activity feed

## Images

**Where to Use**:
- Course thumbnails: 16:9 aspect ratio images for all courses (placeholder educational graphics)
- Instructor avatars: Circular profile photos in cards and headers
- Dashboard hero: Optional subtle background pattern or abstract educational illustration (not full hero)
- Empty states: Simple illustrations for "No courses yet", "No students enrolled"
- Category icons: Small iconography for course categories (business, tech, creative, etc.)

**Image Treatment**:
- Rounded corners: rounded-lg for course thumbnails, rounded-full for avatars
- Overlay: Dark gradient overlay on course cards for text readability
- Placeholder: Use gradient or pattern backgrounds when no image provided

## Accessibility & Interaction

- Focus states: 2px ring with primary color on all interactive elements
- Loading states: Skeleton screens for course cards, spinner for actions
- Error handling: Inline validation with clear error messages
- Responsive: Mobile-first approach, collapsible sidebar, stacked cards
- Dark mode toggle: Persistent user preference, smooth transition

**Key Screens Layout**:
1. **Admin Dashboard**: 3-column stats at top, data table below, sidebar navigation
2. **Instructor Course Builder**: Left sidebar (course outline), main area (content editor), right panel (settings/preview)
3. **Student Catalog**: Grid of course cards with filters sidebar
4. **Learning View**: Video player top, lesson sidebar left, content/assignments below