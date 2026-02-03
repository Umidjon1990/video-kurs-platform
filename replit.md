# Zamonaviy-EDU - Video Course Platform (LMS)

## Overview
This project is a comprehensive Learning Management System (LMS) platform designed for video-based courses, catering to Administrators, Instructors, and Students. Its primary purpose is to facilitate course creation, delivery, and student progress tracking through robust course management, diverse assessment types (assignments and tests), and a manual payment system with admin approval. The platform emphasizes a professional, trustworthy, and scannable learning experience, localized in Uzbek, with key features including a subscription-based pricing model, certificate image uploads, and extensive CMS capabilities for managing site content and testimonials.

## User Preferences
Preferred communication style: Simple, everyday language (Uzbek interface).

## System Architecture

### UI/UX Decisions
The frontend, built with React, TypeScript, and Vite, uses Radix UI and Shadcn/ui components styled with Tailwind CSS, following a Material Design-inspired aesthetic. It supports distinct user role experiences, dark/light modes, and a responsive design. The navigation system features a role-based Shadcn Sidebar with collapsible options, user profile display, and active route highlighting. Public routes like login and registration exclude the sidebar. Dashboard enhancements include modern stats cards, interactive charts, and animated elements using `framer-motion`. Course thumbnail display is standardized with `h-56` and `object-contain`. Demo lessons are visually distinct with orange gradient cards, while premium lessons are muted with a lock icon. Course creation/edit dialogs are scrollable with fixed footers for accessibility.

### Technical Implementations
The frontend utilizes Wouter for routing and TanStack Query for state management. Authentication uses local phone/email + password, with Replit Auth removed from the login page. Public lesson previews display descriptions for both demo and premium lessons. Backend updates properly handle course categories, dual pricing (price and originalPrice), and plan-specific pricing.

### Feature Specifications
*   **Role-Based Access Control**: Strict access control for Admin, Instructor, and Student roles.
*   **Single-Device Login Enforcement**: Prevents credential sharing by invalidating previous sessions upon new device login, applicable to all user types and authentication methods.
*   **Assessment System**: Supports six question types with auto and manual grading, question banks, and secure server-side grading.
*   **Assignment Submission**: Multi-file upload with server-side validation.
*   **Grading Workflow**: Integrated notifications from submission to grading and result viewing.
*   **Course Structure**: Simplified course-to-lesson linkage, with demo lessons universally accessible.
*   **Payment Flow**: Manual payment system with student receipt upload and admin approval, evolving into a subscription model.
*   **Dual Student Registration**: Students can self-register (pending admin approval) or be created by admins (immediate active status).
*   **Subscription System**: Flexible, admin-managed plans with customizable features, linked to course pricing.
*   **Subscription Lifecycle Management**: Automated 30-day lifecycle with real-time expiration enforcement, daily notifications, and immediate access revocation upon expiry. Admin/Instructor dashboards facilitate extension.
*   **Notification System**: Real-time, in-app notifications with unread counts and polling.
*   **Video Player Support**: Compatible with YouTube, Kinescope, Vimeo, Dailymotion, Wistia, and generic HTTPS video URLs.
*   **Private Messaging**: Direct communication between students and instructors with unread indicators and real-time polling, including notification integration.
*   **Announcement System**: Instructors can send targeted announcements to individuals, groups, or all students.
*   **CMS & Homepage Enhancements**: Dynamic "About Us," "Contact Us," Testimonials, and Certificates sections managed via Admin CMS, with certificate image upload to Replit Object Storage.
*   **Admin Subscription Management**: Comprehensive CRUD for subscription plans, supporting base, dynamic, custom, and bonus features.
*   **Admin Student Creation with Course Enrollment**: Admins can create students and automatically enroll them in courses. Subscription duration is optional and defaults to 30 days if not specified. Admin-created enrollments have immediate `paymentStatus: 'approved'` status, bypassing the manual payment approval workflow.
*   **Admin User Deletion**: Comprehensive, atomic user deletion system for all associated data, with multi-level safeguards and detailed preview of affected data.
*   **Course Rating System**: Enrolled students can submit 1-5 star ratings and optional reviews, with unique per-student-per-course rating enforcement and atomic upsert operations. All star ratings display in golden (amber) color by default for visual consistency.
*   **Custom Course Author Names**: Instructors can specify custom author names for courses, overriding default instructor names on public listings.
*   **Discount/Sale System**: Instructors can set course discounts (0-90%) via `discountPercentage` field. HomePage displays modern gradient-bordered course cards with sale badges ("-X% CHEGIRMA") when discounts are active. Discounted prices are calculated as `price * (1 - discountPercentage/100)` with original price shown as strikethrough. Gradient borders use a deterministic 6-color palette cycling by course index.
*   **"Yangi" New Course Ribbon**: Courses created within the last 7 days display a green diagonal ribbon badge in the top-left corner showing "YANGI" with days elapsed (e.g., "YANGI (3 kun)", "YANGI (Bugun)"). This helps users identify newly added content.
*   **Free Course Feature**: Instructors can mark courses as free using the `isFree` boolean field. Free courses display with a special visual design on the HomePage including: animated sparkle stars (⭐✨) around the card, a large "BEPUL" (FREE) badge with gradient styling, amber/yellow themed borders and backgrounds, floating animation effect, and a prominent "BEPUL" price display with gift emoji. Free courses use a green gradient "Bepul Yozilish" (Free Enrollment) button.
*   **CEFR Language Level Filtering**: Courses can be categorized by CEFR language levels (A0, A1, A2, B1, B2, C1, C2). Admins manage language levels via CMS "Filtrlar" tab. Instructors select a level when creating/editing courses. Public HomePage includes a level dropdown filter. Database uses `languageLevels` table with `code`, `name`, `description`, `order`, and `isActive` fields.
*   **Resource Type Filtering**: Courses can be tagged with multiple resource types (Reading/O'qish, Writing/Yozuv, Listening/Tinglash, Speaking/Gapirish, Grammar/Grammatika, Vocabulary/Lug'at). Many-to-many relationship via `courseResourceTypes` junction table. Admins manage resource types via CMS. Instructors select types as badges in course form. HomePage displays resource type badges for filtering. Filtering uses Drizzle's `inArray` helper with a two-step query approach for secure parameterized queries.
*   **Arabic Essay Assignments**: Instructors can add essay questions in Arabic to lessons with configurable word count limits (min/max). Students submit essays through an RTL-enabled textarea with live word counter. Each submission can be checked once by OpenAI GPT-4o, which provides detailed feedback on grammar, spelling, style, and content in Uzbek language. Database uses `lessonEssayQuestions` table (linked to lessons) and `essaySubmissions` table (linked to students) with one-time AI check enforcement via `aiChecked` boolean flag.
*   **Course Module System**: Optional modular course structure allowing instructors to organize lessons into modules (Bo'limlar). Database uses `courseModules` table with `courseId`, `title`, `description`, and `order` fields. Lessons can optionally be assigned to modules via nullable `moduleId` field. Instructor Dashboard provides dedicated "Modullar" tab with full CRUD operations and module selector in lesson form. Student LearningPage displays lessons grouped by module with progress indicators (completed/total) for each module. Fallback rendering ensures lessons display correctly when modules are unavailable.
*   **Lesson Sections (Multi-Video Support)**: Lessons can contain multiple video sections via `lessonSections` table with `lessonId`, `title`, `order`, `videoUrl`, and `videoPlatform` fields. Supports multiple video platforms (youtube, kinescope, vimeo, dailymotion, wistia, direct_link) for flexible content delivery.
*   **Live Video Conferencing (Jitsi Meet + Zoom)**: Instructors can start live video classes with platform selection between Jitsi Meet (free, unlimited) or Zoom (premium). Database uses `liveRooms` table with `platform` field ('jitsi' or 'zoom'), `jitsiRoomName` for Jitsi rooms, and `zoomMeetingId`, `zoomJoinUrl`, `zoomStartUrl`, `zoomPassword` for Zoom meetings. Zoom integration uses Server-to-Server OAuth with `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, and `ZOOM_CLIENT_SECRET` environment variables. Students see active live rooms on their dashboard with platform-specific join buttons. Access control ensures students can only join rooms for courses they're enrolled in.
*   **Course Group Chat**: Real-time group messaging within courses for communication between instructors and enrolled students. Database uses `course_group_chats` table for messages and `user_presence` table for online/offline status tracking. Features include: message history with sender info, online user indicators (5-minute activity window), automatic presence heartbeat updates, and role-based access control. Available in LearningPage "Guruh Suhbati" tab and InstructorDashboard "Suhbat" tab.

### System Design Choices
The backend is an Express.js application in TypeScript, providing a RESTful API with role-based route protection. It uses session-based `express-session` with a PostgreSQL store for authentication, integrated with Passport.js. The database uses Drizzle ORM with PostgreSQL (Neon Serverless) for type-safe operations, including models for Users, Courses, Lessons, Assignments, Tests, Enrollments, Submissions, Notifications, Conversations, Messages, Site Settings, Testimonials, Subscription Plans, Course Plan Pricing, and User Subscriptions. The schema utilizes UUID primary keys and timestamp tracking for a comprehensive relational design.

**Database Initialization**: On server startup, the system automatically checks for subscription plans and creates a default "Asosiy Tarif" plan if none exists. This ensures course enrollment functionality works immediately in fresh production environments without manual database seeding.

## External Dependencies

### Third-Party Services
*   **Replit Authentication**: OpenID Connect provider (for OIDC authentication).
*   **Neon Serverless PostgreSQL**: PostgreSQL database hosting.
*   **Object Storage (Replit)**: Cloud storage for multimedia files.
*   **Jitsi Meet**: Free video conferencing (no API key required).
*   **Zoom**: Premium video conferencing with Server-to-Server OAuth integration.

### Key NPM Packages
*   **Frontend**: `@tanstack/react-query`, `wouter`, `@radix-ui/*`, `react-hook-form`, `zod`, `date-fns`, `lucide-react`, `framer-motion`, `recharts`.
*   **Backend**: `express`, `drizzle-orm`, `passport`, `openid-client`, `express-session`, `connect-pg-simple`, `@google-cloud/storage`, `multer`, `axios`.
*   **Development**: `typescript`, `vite`, `tailwindcss`, `drizzle-kit`, `tsx`.