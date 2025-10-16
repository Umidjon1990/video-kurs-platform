# Video Course Platform (LMS)

## Overview

This project is a comprehensive Learning Management System (LMS) platform designed for video-based courses. It caters to three distinct user roles: Administrators, Instructors, and Students. The platform's primary purpose is to facilitate course creation, delivery, and student progress tracking. Key capabilities include course management, lesson creation, various assessment types (assignments and tests), and a manual payment processing system with admin approval. The entire user interface is localized in Uzbek language. The platform aims to provide a professional, trust-building, and scannable learning experience for all users.

## Recent Changes (October 16, 2025)

### Latest Updates
- ✅ **Student Notification System - COMPLETE** (Oct 16, 2025)
  - ✅ **LearningPage notification integration:**
    - ✅ NotificationBell added to LearningPage header
    - ✅ Students receive grading notifications while studying
    - ✅ Real-time updates (30s polling) on all student pages
  - ✅ **Grading notification flow:**
    - ✅ Instructor grades → Student notification created
    - ✅ Notification types: 'assignment_graded', 'revision_requested'
    - ✅ Shows feedback message and grading status
- ✅ **Image Viewing & Download Enhancement** (Oct 16, 2025)
  - ✅ **Instructor grading interface:**
    - ✅ Larger image thumbnails (h-48) in submission view
    - ✅ Click-to-zoom: Full-screen image viewer dialog
    - ✅ Hover controls: View (Eye icon) and Download buttons
    - ✅ Download functionality for individual images
    - ✅ Better image display with object-cover and hover effects
  - ✅ **Cache control fix:**
    - ✅ Submissions endpoint now includes no-cache headers
    - ✅ Ensures fresh data display in instructor panel
- ✅ **Course Edit/Delete & Assignment Fixes** (Oct 16, 2025)
  - ✅ **Instructor course management:**
    - ✅ Edit dialog: update title, description, pricing, thumbnail
    - ✅ Delete confirmation dialog with course title verification
    - ✅ Security: Only editable fields allowed (no instructorId/status changes)
    - ✅ PUT/DELETE endpoints with ownership verification
  - ✅ **Assignment creation fixes:**
    - ✅ Fixed dueDate validation: converts string to Date on backend
    - ✅ Works with both POST and PATCH endpoints
  - ✅ **Notification improvements:**
    - ✅ Student submission → Instructor notification
    - ✅ Shows student name and assignment title
    - ✅ Type: 'assignment_submission'
- ✅ **Assignment Grading & Results System - COMPLETE** (Oct 16, 2025)
  - ✅ **O'qituvchi paneli:**
    - ✅ "Vazifalar" tab: student submissions ro'yxati with grading dialog
    - ✅ Grading dialog: score (0-100), feedback, status (graded/needs_revision)
    - ✅ Multi-file upload support: images, audio, files (5MB total limit)
    - ✅ File download endpoints with authentication
    - ✅ "O'quvchilar" tab: enrollments list with payment status
    - ✅ Test results tab: student attempts with scores and pass/fail
  - ✅ **O'quvchi paneli:**
    - ✅ StudentResults page (`/results`): separate tabs for assignments & tests
    - ✅ Assignment submission: text + multi-file upload (images/audio/files)
    - ✅ File preview UI with remove capability
    - ✅ 5MB total limit enforcement with visual feedback
    - ✅ Resubmission support for NEEDS_REVISION assignments
    - ✅ Results display: score, feedback, status badges
    - ✅ "Natijalarim" navigation button in header
  - ✅ **Notification System:**
    - ✅ NotificationBell component with unread count badge
    - ✅ Real-time notifications (30s polling)
    - ✅ "Mark all as read" functionality
    - ✅ Integrated in Student, Instructor, Results pages

### Previously Completed Features
- ✅ **Modules System Removed** (Oct 16, 2025)
  - ✅ Removed modules table from database schema
  - ✅ Removed moduleId field from lessons table
  - ✅ Simplified course structure: Courses → Lessons (direct relationship)
- ✅ **Unified Course Preview & Learning Experience** (Oct 16, 2025)
  - ✅ Course learning page displays ALL lessons in sidebar
  - ✅ Demo lessons marked with green "Demo" badge
  - ✅ Non-enrolled students see locked lessons with Lock icon
- ✅ **Enhanced Video Player Support** (Oct 16, 2025)
  - ✅ YouTube, Kinescope, Vimeo, Dailymotion, Wistia support
  - ✅ Embed code support and generic HTTPS URLs
- ✅ **Payment Status & Enrollment Improvements** (Oct 16, 2025)
  - ✅ Fixed payment status logic: accepts both 'confirmed' and 'approved'
- ✅ **Advanced Test System - COMPLETE**
  - ✅ 6 question types: Multiple Choice, True/False, Fill in Blanks, Matching, Short Answer, Essay
  - ✅ Auto-grading for objective types, manual grading for essays
  - ✅ Server-side grading with security
- ✅ **Dual Pricing System with Discount Display - COMPLETE**
  - ✅ Real-time discount percentage calculation
  - ✅ Prominent discounted price display

## User Preferences

Preferred communication style: Simple, everyday language (Uzbek interface).

## System Architecture

### Frontend Architecture

The frontend is built with React and TypeScript, using Vite for development and bundling. Wouter handles client-side routing, and TanStack Query manages server state. The UI leverages Radix UI primitives and Shadcn/ui components, styled with Tailwind CSS, following a Material Design-inspired aesthetic with distinct visual experiences for each user role. Dark/light mode support is included.

### Backend Architecture

The backend is an Express.js application written in TypeScript, implementing a RESTful API design with role-based route protection. Authentication is handled via session-based `express-session` with a PostgreSQL store, integrated with Passport.js and Replit Auth (OpenID Connect). Middleware ensures role-based access control and robust error handling.

### Database Architecture

The system utilizes Drizzle ORM with PostgreSQL (hosted on Neon Serverless) for type-safe database operations. Key data models include Users (with roles), Courses (supporting dual pricing), Lessons (video-based with demo flags), Assignments (with multi-file submissions and grading), Tests (supporting 6 question types and auto/manual grading), Enrollments, and Notifications. The schema includes comprehensive relationships and uses UUID primary keys with timestamp tracking.

**Data Models:**
- **Users**: Replit-authenticated users with role assignment (admin/instructor/student)
- **Courses**: Instructor-created courses with dual pricing (originalPrice, discountedPrice), thumbnails, and publication status
- **Lessons**: Video-based lesson content with isDemo flag for access control (direct relationship with courses)
- **Assignments**: Submission-based assessments with grading and optional lesson linkage
- **Tests**: Enhanced assessment system with multiple question types
- **Questions**: Individual test questions with type-specific configuration
- **Test Attempts**: Student test submissions with answers and auto-grading results
- **Enrollments**: Student course registrations with payment tracking
- **Submissions**: Student assignment submissions with multi-file support (imageUrls, audioUrls, fileUrls), status (pending/graded/needs_revision), score, feedback
- **Notifications**: In-app notifications with type, title, message, isRead status

**Relational Design:**
- One-to-many: Users → Courses (as instructors)
- One-to-many: Courses → Lessons (direct relationship)
- One-to-many: Courses → Assignments, Tests
- One-to-many: Tests → Questions → Question Options
- One-to-many: Assignments → Submissions
- Many-to-many: Users ↔ Courses (via Enrollments)
- Tracking relationships: Users → Submissions, TestAttempts, Notifications

### System Design Choices

- **Role-Based Access Control**: Strict access control for Admin, Instructor, and Student roles across all features.
- **Assessment System**: Supports diverse question types (Multiple Choice, True/False, Fill in Blanks, Matching, Short Answer, Essay) with both auto and manual grading. Features include question banks, optional lesson linkage, and secure server-side grading.
- **Assignment Submission System**: Multi-file upload (images, audio, files) with 5MB total limit, server-side validation, authenticated file downloads.
- **Grading Workflow**: Student submits → Notification to instructor → Instructor grades → Notification to student → Student views results.
- **Course Structure**: Simplified to Courses directly linking to Lessons, with demo lessons accessible to all and locked lessons for non-enrolled students.
- **Payment Flow**: Manual payment system requiring student receipt upload and admin approval for enrollment confirmation.
- **Notification System**: Real-time, in-app notifications with unread counts and 30-second polling.
- **Video Player Support**: Enhanced compatibility with YouTube, Kinescope, Vimeo, Dailymotion, Wistia, and generic HTTPS video URLs.
- **Dual Pricing**: Courses can have an original price and a discounted price, with real-time discount calculation displayed to users.

## External Dependencies

### Third-Party Services

- **Replit Authentication**: Used as the OpenID Connect provider for user authentication, managing `ISSUER_URL`, `REPL_ID`, `REPLIT_DOMAINS`, and `SESSION_SECRET`.
- **Neon Serverless PostgreSQL**: Provides the PostgreSQL database, configured via `DATABASE_URL` and utilizing `@neondatabase/serverless` for connection pooling.
- **Object Storage (Replit)**: Cloud storage for multimedia files (images, audio, video) used in questions and student submissions, configured with `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PUBLIC_OBJECT_SEARCH_PATHS`, and `PRIVATE_OBJECT_DIR`.

### Key NPM Packages

- **Frontend**: `@tanstack/react-query`, `wouter`, `@radix-ui/*`, `react-hook-form`, `zod`, `date-fns`, `lucide-react`.
- **Backend**: `express`, `drizzle-orm`, `passport`, `openid-client`, `express-session`, `connect-pg-simple`, `@google-cloud/storage`, `multer`.
- **Development**: `typescript`, `vite`, `tailwindcss`, `drizzle-kit`, `tsx`.
