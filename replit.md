# Video Course Platform (LMS)

## Overview

This project is a comprehensive Learning Management System (LMS) platform designed for video-based courses, supporting Administrators, Instructors, and Students. Its purpose is to facilitate course creation, delivery, and student progress tracking through course management, lesson creation, diverse assessment types (assignments and tests), and a manual payment processing system with admin approval. The platform aims to provide a professional, trust-building, and scannable learning experience, localized in Uzbek language.

## Recent Changes (October 18, 2025)

### Latest Updates
- 🚧 **Subscription-Based Pricing System - IN PROGRESS** (Oct 18, 2025)
  - ✅ **Database Schema**:
    - ✅ subscription_plans table: 3 plans (Oddiy, Standard, Premium) with features JSON
    - ✅ course_plan_pricing table: Links courses to 3 different prices per plan
    - ✅ user_subscriptions table: Tracks 30-day subscriptions per user
    - ✅ Users table: Added phone, passwordHash (dual-auth), telegramUsername
    - ✅ Enrollments table: Added planId field
  - ✅ **Seed Data**: 3 subscription plans created (Oddiy, Standard, Premium)
  - ✅ **Backend API**:
    - ✅ POST /api/instructor/courses - Accepts 3 prices, creates coursePlanPricing records
    - ✅ Storage funksiyalar: getSubscriptionPlans, createCoursePlanPricing, getCoursePlanPricing
  - ✅ **Instructor Dashboard**:
    - ✅ Course creation form: 3 tarif narxlari input (Oddiy, Standard, Premium)
    - ✅ Category selector added
    - ✅ Grid layout for pricing inputs with plan descriptions
  - ⏸️ **Pending**: Student enrollment flow, subscription lifecycle, payment methods (Karta/Payme)
- ✅ **Certificate Image Upload System - COMPLETE** (Oct 18, 2025)
  - ✅ **Backend API:**
    - ✅ POST /api/admin/upload-certificate - Upload certificate images to Replit Object Storage
    - Server-side validation: file type (JPG/PNG/WEBP), max 5MB size
    - UUID-based secure filenames, stored in 'certificates' folder
    - Returns full URL for immediate use
  - ✅ **Admin CMS Enhancement:**
    - ✅ File upload button with hidden input (data-testid="button-upload-certificate")
    - ✅ Real-time image preview grid (2 cols mobile, 4 cols desktop)
    - ✅ Hover-delete functionality with X button (opacity transition)
    - ✅ Toast notifications with reminder to save ("Saqlash tugmasini bosing!")
    - ✅ Aspect ratio 4:5 for certificate cards
    - ✅ Manual URL input still supported (textarea fallback)
  - ✅ **Mobile Reliability:**
    - ✅ Switched from external hosting (Google Drive/Dropbox) to Replit Object Storage
    - ✅ Eliminates CORS and authentication issues
    - ✅ All certificates now load reliably on mobile devices
    - ✅ Image error handling with placeholder fallbacks
- ✅ **Admin CMS & Public HomePage Enhancement - COMPLETE** (Oct 18, 2025)
  - ✅ **Database Schema:**
    - ✅ Site Settings table: Key-value storage for About Us, Contact info, Telegram, Certificate URLs
    - ✅ Testimonials table: Student reviews with name, role, content, rating, order, publish status
  - ✅ **Backend API:**
    - ✅ GET /api/site-settings (public) - Fetch all site settings
    - ✅ PUT /api/admin/site-settings (admin) - Upsert site setting
    - ✅ GET /api/testimonials (public) - Fetch published testimonials
    - ✅ GET /api/admin/testimonials (admin) - All testimonials (including unpublished)
    - ✅ POST /api/admin/testimonials (admin) - Create testimonial
    - ✅ PUT /api/admin/testimonials/:id (admin) - Update testimonial
    - ✅ DELETE /api/admin/testimonials/:id (admin) - Delete testimonial
  - ✅ **Admin CMS Page (/admin/cms):**
    - ✅ Two-tab interface: Site Settings & Testimonials
    - ✅ Site Settings: About Us (textarea), Contact (email, phone, address, Telegram), Certificates with image upload
    - ✅ Testimonials CRUD: Name, role, content, rating (1-5), order, publish toggle
    - ✅ Navigation from AdminDashboard via "Sayt Boshqaruvi" button (with ArrowLeft icon)
  - ✅ **Public HomePage Enhancements:**
    - ✅ Testimonials section: Student reviews with avatars, ratings, cards (max 6 displayed)
    - ✅ **Contact section with clickable links**:
      - Email: mailto: link (click to open email client)
      - Phone: tel: link (click to call)
      - Telegram: external link with target="_blank" and rel="noopener noreferrer"
      - Address: static display (no link)
      - Responsive grid: md:grid-cols-2 lg:grid-cols-4
      - Cards have hover-elevate effect
    - ✅ **Certificates Carousel** (auto horizontal scroll):
      - CSS-based infinite loop animation (30s duration)
      - Triple content duplication for seamless loop (translateX calc(-100% / 3))
      - 256px × 320px cards with shadow, rounded corners
      - Image fallback to placeholder on error
    - ✅ **Animations** (framer-motion):
      - Hero section: fade-in + slide-up (duration: 0.6s)
      - Hero title: fade + slide-up (delay: 0.2s)
      - Hero subtitle: fade-in (delay: 0.4s)
    - ✅ About Us section: Dynamic content from site settings
    - ✅ Footer: Copyright notice
    - ✅ Modern design with alternating backgrounds (muted/30 for sections)
- ✅ **UI/UX Modernization - COMPLETE** (Oct 17, 2025)
  - ✅ **Admin Dashboard Enhancement** (Task 1-2):
    - Modern stats cards with trend indicators (revenue, enrollments, growth with arrows)
    - Interactive charts (Line chart for enrollment trends, Bar chart for revenue trends)
    - Loading/empty states with optimized backend (single grouped query)
  - ✅ **Instructor Dashboard Enhancement** (Task 3-4):
    - Enhanced course cards with enrollmentsCount, lessonsCount, discount display
    - Modern badges (dark mode compatible)
    - **Course Analytics Panel** (Task 4 - COMPLETE):
      - Collapsible analytics section for each course
      - Stats cards: Total students, Active students (last 7 days)
      - Completion rate progress bar
      - Average test and assignment scores
      - Enrollment trend line chart (last 14 days, Recharts)
      - Backend: GET /api/instructor/courses/:courseId/analytics
      - Shared type: CourseAnalytics (enrollmentTrend, completionRate, avgScores)
  - ✅ **Student Dashboard Enhancement** (Task 5 - COMPLETE):
    - **Progress Tracking System**:
      - Circular progress charts for each enrolled course (Recharts)
      - Stats cards: Total/completed lessons, tests, assignments
      - Average scores display (tests and assignments)
      - "Continue Learning" button with next lesson navigation
      - Backend: GET /api/student/progress (StudentCourseProgress[])
      - Shared type: StudentCourseProgress with course metrics
    - **Performance Optimization (Critical)**:
      - Fixed N+1 query problem in getStudentProgress()
      - Before: O(n * 6-8) queries per request (~600ms per course)
      - After: O(6) batched queries total (~279ms for all courses)
      - 50%+ response time improvement, scalable to 10+ courses
      - Uses inArray() for type-safe UUID array queries
      - In-memory data aggregation for efficiency
    - **UI/UX Polish**:
      - Dark mode support for all progress components
      - Fallback logic: ProgressCard with CourseCard backup
      - Ensures all enrolled courses always display
      - SVG styling fixes for proper contrast
- ✅ **Private Messaging (Chat) System - COMPLETE** (Oct 17, 2025)
  - ✅ **Database Schema:**
    - ✅ Conversations table: Links studentId and instructorId
    - ✅ Messages table: Individual messages with read/unread status
  - ✅ **Backend Implementation:**
    - ✅ POST /api/chat/conversations - Create or get conversation
    - ✅ GET /api/chat/conversations - List user's conversations
    - ✅ GET /api/chat/conversations/:id/messages - Get messages
    - ✅ POST /api/chat/conversations/:id/messages - Send message
    - ✅ PATCH /api/chat/conversations/:id/read - Mark messages as read
    - ✅ GET /api/chat/unread-count - Get unread message count
  - ✅ **Frontend UI:**
    - ✅ ChatPage component with conversation list and message thread
    - ✅ Real-time polling (5s messages, 10s conversations)
    - ✅ Unread message badges and indicators
    - ✅ Chat button in Student and Instructor dashboards (MessageCircle icon)
    - ✅ Student: Click to chat with course instructor
    - ✅ Instructor: See all student conversations
- ✅ **Announcement System - COMPLETE** (Oct 17, 2025)
  - ✅ **Backend Implementation:**
    - ✅ Announcements table with priority levels (normal/urgent)
    - ✅ Three targeting modes: individual student, course group, all students
    - ✅ POST /api/instructor/announcements - Send announcement with auto-notification
    - ✅ GET /api/instructor/announcements - List instructor's announcements
    - ✅ DELETE /api/instructor/announcements/:id - Delete announcement
  - ✅ **Notification Integration:**
    - ✅ Individual → Single notification to student
    - ✅ Course → Notifications to all enrolled students
    - ✅ All → Notifications to all students in system
    - ✅ Returns recipient count for confirmation
  - ✅ **Frontend UI:**
    - ✅ E'lon yuborish dialog in InstructorDashboard
    - ✅ Target type selector (Yakka/Guruh/Barcha)
    - ✅ Course selector for group targeting
    - ✅ Priority level (Normal/Muhim)
    - ✅ E'lonlar ro'yxati with delete functionality

## User Preferences

Preferred communication style: Simple, everyday language (Uzbek interface).

## System Architecture

### Frontend Architecture

The frontend is built with React and TypeScript using Vite, Wouter for routing, and TanStack Query for state management. It uses Radix UI primitives and Shadcn/ui components, styled with Tailwind CSS, following a Material Design-inspired aesthetic with distinct user role experiences and dark/light mode support.

### Backend Architecture

The backend is an Express.js application in TypeScript, implementing a RESTful API with role-based route protection. Authentication uses session-based `express-session` with a PostgreSQL store, integrated with Passport.js and Replit Auth (OpenID Connect). Middleware enforces role-based access control and error handling.

### Database Architecture

The system uses Drizzle ORM with PostgreSQL (Neon Serverless) for type-safe database operations. Key models include Users (with roles), Courses (supporting dual pricing), Lessons (video-based with demo flags), Assignments (multi-file submissions and grading), Tests (6 question types), Enrollments, Submissions, and Notifications. The schema uses UUID primary keys and timestamp tracking, with comprehensive relational design.

**Data Models:**
- **Users**: Replit-authenticated, role-assigned (admin/instructor/student).
- **Courses**: Instructor-created, with dual pricing, thumbnails, publication status.
- **Lessons**: Video content with `isDemo` flag, directly linked to courses.
- **Assignments**: Submission-based assessments, optional lesson linkage.
- **Tests**: Enhanced assessment system with multiple question types.
- **Questions**: Individual test questions with type-specific configuration.
- **Test Attempts**: Student test submissions, answers, auto-grading.
- **Enrollments**: Student course registrations, payment tracking.
- **Submissions**: Student assignment submissions with multi-file support (imageUrls, audioUrls, fileUrls), status, score, feedback.
- **Notifications**: In-app notifications with type, title, message, `isRead` status.
- **Conversations**: Private chat containers linking studentId and instructorId.
- **Messages**: Individual chat messages with senderId, content, `isRead` status, timestamps.

### System Design Choices

- **Role-Based Access Control**: Strict access control for Admin, Instructor, and Student roles.
- **Assessment System**: Supports diverse question types (Multiple Choice, True/False, Fill in Blanks, Matching, Short Answer, Essay) with auto and manual grading, question banks, and secure server-side grading.
- **Assignment Submission System**: Multi-file upload (images, audio, files) with 5MB total limit, server-side validation, authenticated file downloads.
- **Grading Workflow**: Integrated notification system from student submission to instructor grading and student result viewing.
- **Course Structure**: Simplified to Courses directly linking to Lessons, with demo lessons accessible to all and locked lessons for non-enrolled students.
- **Payment Flow**: Manual payment system requiring student receipt upload and admin approval.
- **Notification System**: Real-time, in-app notifications with unread counts and 30-second polling, and archive functionality.
- **Video Player Support**: Enhanced compatibility with YouTube, Kinescope, Vimeo, Dailymotion, Wistia, and generic HTTPS video URLs.
- **Dual Pricing**: Courses can have an original and discounted price, with real-time discount calculation.
- **Private Messaging**: A chat system enabling direct communication between students and instructors.
- **Announcement System**: Instructors can send announcements targeting individual students, course groups, or all students, with notification integration.

## External Dependencies

### Third-Party Services

- **Replit Authentication**: OpenID Connect provider for user authentication.
- **Neon Serverless PostgreSQL**: PostgreSQL database hosting.
- **Object Storage (Replit)**: Cloud storage for multimedia files.

### Key NPM Packages

- **Frontend**: `@tanstack/react-query`, `wouter`, `@radix-ui/*`, `react-hook-form`, `zod`, `date-fns`, `lucide-react`.
- **Backend**: `express`, `drizzle-orm`, `passport`, `openid-client`, `express-session`, `connect-pg-simple`, `@google-cloud/storage`, `multer`.
- **Development**: `typescript`, `vite`, `tailwindcss`, `drizzle-kit`, `tsx`.