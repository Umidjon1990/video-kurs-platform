# Video Course Platform (LMS)

## Overview

A comprehensive Learning Management System (LMS) platform for video-based courses. The platform supports three distinct user roles: Administrators who manage users and oversee the platform, Instructors who create and publish courses with lessons and assessments, and Students who enroll in courses and track their learning progress. The system uses manual payment processing with receipt upload and admin approval. All interface text is in Uzbek language.

## Recent Changes (October 16, 2025)

### Latest Updates
- ✅ **Modules System Removed** (Oct 16, 2025)
  - ✅ Removed modules table from database schema
  - ✅ Removed moduleId field from lessons table
  - ✅ Removed all module-related backend operations (storage, routes)
  - ✅ Removed "Modullar" tab from instructor dashboard
  - ✅ Simplified course structure: Courses → Lessons (direct relationship)
  - ✅ Successful database migration with npm run db:push
- ✅ **Unified Course Preview & Learning Experience** (Oct 16, 2025)
  - ✅ "Sinov darsi ko'rish" button redirects directly to course learning page
  - ✅ Course learning page (LearningPage) displays ALL lessons in sidebar
  - ✅ Demo lessons marked with green "Demo" badge - accessible to everyone
  - ✅ Non-enrolled students see locked lessons with Lock icon
  - ✅ Enrolled students (payment confirmed) see all lessons with PlayCircle icon
  - ✅ Removed demo lessons dialog - simplified UX flow
  - ✅ Students can preview course structure before purchase
  - ✅ Seamless transition: "Sinov darsi" → Full course page → Demo/Locked visibility
- ✅ **Navigation Improvements** (Oct 16, 2025)
  - ✅ Student panel back button routes to home page ("/")
  - ✅ Home icon button added to LearningPage header
- ✅ **Enhanced Video Player Support** (Oct 16, 2025)
  - ✅ YouTube URL support (all formats: watch?v=, youtu.be/, embed/)
  - ✅ Kinescope, Vimeo, Dailymotion, Wistia support
  - ✅ Embed code support (iframe/embed tags)
  - ✅ Generic HTTPS URL support for other video platforms
  - ✅ Improved video ID extraction from YouTube URLs
  - ✅ Fallback display for unrecognized video formats

### Previously Completed Features
- ✅ Assignment and Test linkage to specific lessons via optional lessonId field
- ✅ Instructor dashboard: lesson selection dropdowns for assignments/tests
- ✅ Student submission workflow: dialog-based assignment submission form
- ✅ Fixed SelectItem value prop error (empty string → "none")
- ✅ Backend handling of "none" lessonId conversion to null
- ✅ **Advanced Test System - COMPLETE**
  - ✅ **Instructor Side:**
    - ✅ 6 question types: Multiple Choice, True/False, Fill in Blanks, Matching, Short Answer, Essay
    - ✅ Question builder UI with type-specific inputs
    - ✅ Question bank with CRUD operations
    - ✅ Collapsible test expansion with questions list
    - ✅ Backend API: questions, question options, matching config
  - ✅ **Student Side:**
    - ✅ Test-taking dialog UI for all 6 question types
    - ✅ Answer submission with auto-grading (MC, T/F, Fill, Matching, Short Answer)
    - ✅ Essay questions marked for manual grading (score=0 initially)
    - ✅ Test results display with pass/fail status
    - ✅ "Natijalar" tab showing test history with scores and dates
  - ✅ **Security:**
    - ✅ Sanitized student endpoints (correctAnswer, isCorrect, correctPairs removed)
    - ✅ Server-side grading with full instructor data
    - ✅ Cache invalidation for real-time results updates
- ✅ **Dual Pricing System with Discount Display - COMPLETE**
  - ✅ Added originalPrice and discountedPrice fields to courses schema
  - ✅ Instructor course creation UI: modern 2-column grid for price inputs
  - ✅ Real-time discount percentage calculation and display
  - ✅ Student UI: prominent discounted price with green discount badge
  - ✅ Original price shown with strikethrough styling
  - ✅ Backward compatible with courses having only regular price

## User Preferences

Preferred communication style: Simple, everyday language (Uzbek interface).

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React with TypeScript for type-safe component development
- Vite as the build tool and development server for fast hot module replacement
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and caching

**UI Component System**
- Radix UI primitives for accessible, unstyled components
- Shadcn/ui component library built on Radix UI
- Tailwind CSS for utility-first styling
- Custom design system based on Material Design principles with role-based visual hierarchy
- Dark/light mode support with CSS custom properties

**Design Philosophy**
- Material Design-inspired approach prioritizing clarity and scannable information
- Distinct visual experiences for Admin/Instructor/Student roles
- Progress visibility as a core UX principle
- Professional, trust-building interface

### Backend Architecture

**Server Framework**
- Express.js with TypeScript for API endpoints
- RESTful API design with role-based route protection
- Session-based authentication using express-session with PostgreSQL store

**API Structure**
- `/api/auth/*` - Authentication endpoints (login, user profile)
- `/api/admin/*` - Admin-only routes (user management, platform statistics)
- `/api/instructor/*` - Instructor routes (course management, lesson creation, test builder)
- `/api/student/*` - Student routes (course enrollment, learning progress)
- `/api/courses/*` - Public course browsing

**Middleware & Security**
- Passport.js with OpenID Connect strategy for Replit Auth
- Role-based access control (isAuthenticated, isAdmin, isInstructor middleware)
- Request logging and error handling middleware

### Database Architecture

**ORM & Schema Management**
- Drizzle ORM for type-safe database operations
- PostgreSQL as the relational database (via Neon serverless)
- Schema-driven development with Zod validation

**Data Models**
- **Users**: Replit-authenticated users with role assignment (admin/instructor/student)
- **Courses**: Instructor-created courses with dual pricing (originalPrice, discountedPrice), thumbnails, and publication status
- **Modules**: Course organization units with title, order, and description
- **Lessons**: Video-based lesson content organized within modules, with isDemo flag for access control
- **Assignments**: Submission-based assessments with grading and optional lesson linkage
- **Tests**: Enhanced assessment system with multiple question types
- **Questions**: Individual test questions with type-specific configuration (multiple choice, true/false, fill blanks, matching, short answer, essay)
- **Question Options**: Answer choices for multiple-choice and matching questions
- **Test Attempts**: Student test submissions with answers and auto-grading results
- **Enrollments**: Student course registrations with payment tracking
- **Submissions**: Student assignment submissions
- **Sessions**: PostgreSQL-backed session storage

**Relational Design**
- One-to-many relationships: Users → Courses (as instructors)
- One-to-many: Courses → Modules → Lessons
- One-to-many: Courses → Assignments, Tests
- One-to-many: Tests → Questions → Question Options
- Many-to-many: Users ↔ Courses (via Enrollments)
- Tracking relationships: Users → Submissions, TestAttempts

### Test System Features

**Question Types**
1. **Multiple Choice**: Single or multiple correct answers with configurable options
2. **True/False**: Binary choice questions for quick assessment
3. **Fill in the Blanks**: Text input with exact or partial match validation
4. **Matching**: Pair items from two columns (word-definition, image-text, date-event)
5. **Short Answer**: Free-text response with keyword matching
6. **Essay/Writing Task**: Long-form answers requiring manual instructor grading

**Assessment Features**
- Auto-grading for objective question types (MC, T/F, Fill blanks, Matching, Short answer)
- Manual grading workflow for essay questions
- Percentage and point-based scoring
- Random question order option
- Multimedia support (images, audio, video in questions)
- Draft mode for test creation
- Duplicate test functionality
- Import/Export via CSV/Excel templates

### Authentication & Authorization

**Replit Auth Integration**
- OpenID Connect (OIDC) protocol for authentication
- Automatic user provisioning on first login
- Profile data synchronization (email, name, profile image)
- Session management with HTTP-only secure cookies
- 7-day session TTL with PostgreSQL persistence

**Role-Based Access Control**
- Default role: student (assigned on user creation)
- Role elevation: admin can promote users to instructor role
- Protected routes with middleware guards
- Client-side role checks for conditional UI rendering

### Payment Processing

**Manual Payment System**
- Student uploads payment receipt/screenshot
- Admin reviews and approves/rejects payments
- Automatic enrollment upon payment approval
- Payment tracking with status (pending/confirmed/rejected)

## External Dependencies

### Third-Party Services

**Replit Authentication**
- OpenID Connect provider for user authentication
- Environment variables: `ISSUER_URL`, `REPL_ID`, `REPLIT_DOMAINS`, `SESSION_SECRET`
- Passport.js strategy implementation for session management

**Neon Serverless PostgreSQL**
- Serverless PostgreSQL database hosting
- WebSocket connection support for edge environments
- Environment variable: `DATABASE_URL`
- Connection pooling via @neondatabase/serverless

**Object Storage (Replit)**
- Cloud storage for multimedia files (images, audio, video)
- Environment variables: `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR`
- Used for test question media assets and student submissions

### Key NPM Packages

**Frontend Libraries**
- @tanstack/react-query - Server state management
- wouter - Lightweight routing
- @radix-ui/* - Accessible UI primitives (20+ components)
- react-hook-form & @hookform/resolvers - Form management
- zod - Runtime type validation
- date-fns - Date manipulation
- lucide-react - Icon library

**Backend Libraries**
- express - Web server framework
- drizzle-orm - Type-safe ORM
- passport - Authentication middleware
- openid-client - OIDC implementation
- express-session - Session management
- connect-pg-simple - PostgreSQL session store
- @google-cloud/storage - Object storage integration

**Development Tools**
- typescript - Type checking
- vite - Build tool and dev server
- tailwindcss - CSS framework
- drizzle-kit - Database migrations
- tsx - TypeScript execution

### Database Schema

**PostgreSQL Tables**
- sessions (Replit Auth session storage)
- users (role: admin | instructor | student, replitId, email, name)
- courses (instructorId, title, description, price, originalPrice, discountedPrice, status, thumbnailUrl)
- lessons (courseId, title, videoUrl, duration, order, isDemo)
- assignments (courseId, lessonId [optional], title, description, dueDate, maxScore)
- tests (courseId, lessonId [optional], title, description, passingScore, isDraft, randomOrder)
- questions (testId, type, questionText, points, order, mediaUrl, correctAnswer, config)
- question_options (questionId, optionText, isCorrect, order)
- test_attempts (testId, userId, answers, score, totalPoints, isPassed, completedAt, gradedAt)
- enrollments (userId, courseId, paymentStatus, enrolledAt)
- submissions (assignmentId, userId, content, fileUrl, score, submittedAt)

**Question Type Configuration (JSONB field)**
- Multiple Choice: `{ allowMultiple: boolean, shuffleOptions: boolean }`
- Fill in Blanks: `{ caseSensitive: boolean, acceptPartialMatch: boolean }`
- Matching: `{ leftColumn: string[], rightColumn: string[], correctPairs: [number, number][] }`
- Short Answer: `{ keywords: string[], minLength: number, maxLength: number }`
- Essay: `{ minWords: number, maxWords: number, rubric: string }`

All tables use UUID primary keys and include timestamp tracking for created/updated records.
