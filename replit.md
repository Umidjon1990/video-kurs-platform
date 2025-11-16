# Video Course Platform (LMS)

## Overview

This project is a comprehensive Learning Management System (LMS) platform for video-based courses, supporting Administrators, Instructors, and Students. It facilitates course creation, delivery, and student progress tracking through course management, lesson creation, diverse assessment types (assignments and tests), and a manual payment processing system with admin approval. The platform aims to provide a professional, trust-building, and scannable learning experience, localized in Uzbek. Key capabilities include a subscription-based pricing system, certificate image uploads, and robust CMS features for managing site content and testimonials.

## User Preferences

Preferred communication style: Simple, everyday language (Uzbek interface).

## System Architecture

### Frontend Architecture

The frontend is built with React and TypeScript using Vite, Wouter for routing, and TanStack Query for state management. It utilizes Radix UI primitives and Shadcn/ui components, styled with Tailwind CSS, following a Material Design-inspired aesthetic with distinct user role experiences and dark/light mode support. UI/UX decisions include modern stats cards, interactive charts, enhanced course cards, progress tracking systems with circular charts, and performance optimizations for student dashboards. Animations using `framer-motion` are used for a modern feel.

### Backend Architecture

The backend is an Express.js application in TypeScript, implementing a RESTful API with role-based route protection. Authentication uses session-based `express-session` with a PostgreSQL store, integrated with Passport.js and Replit Auth (OpenID Connect). Middleware enforces role-based access control and error handling. It includes a private messaging system, an announcement system with various targeting modes, and robust APIs for managing courses, assessments, user subscriptions, and site content.

### Database Architecture

The system uses Drizzle ORM with PostgreSQL (Neon Serverless) for type-safe database operations. Key models include Users (with roles), Courses (supporting dual pricing and subscription plans), Lessons (video-based with demo flags), Assignments (multi-file submissions and grading), Tests (6 question types), Enrollments, Submissions, Notifications, Conversations, Messages, Site Settings, Testimonials, Subscription Plans, Course Plan Pricing, and User Subscriptions. The schema uses UUID primary keys and timestamp tracking, with comprehensive relational design.

### System Design Choices

-   **Role-Based Access Control**: Strict access control for Admin, Instructor, and Student roles.
-   **Single-Device Login Enforcement**: Security feature that prevents credential sharing by allowing users to be logged in from only one device at a time. When a user logs in from a new device, all previous sessions are automatically destroyed. Implemented for both local authentication (phone/email + password) and OIDC authentication (Replit Auth). Uses PostgreSQL session store to track and manage active sessions. Applies universally to all user types (students, instructors, admins) regardless of account creation method (admin-created or self-registered).
-   **Assessment System**: Supports diverse question types (Multiple Choice, True/False, Fill in Blanks, Matching, Short Answer, Essay) with auto and manual grading, question banks, and secure server-side grading.
-   **Assignment Submission System**: Multi-file upload (images, audio, files) with server-side validation.
-   **Grading Workflow**: Integrated notification system from student submission to instructor grading and student result viewing.
-   **Course Structure**: Simplified to Courses directly linking to Lessons, with demo lessons accessible to all.
-   **Payment Flow**: Manual payment system requiring student receipt upload and admin approval, evolving into a subscription-based model.
-   **Dual Student Registration System**: Students can either (1) self-register with phone/email + password (status='pending', requires admin approval before login), or (2) be created directly by administrators with auto-generated credentials (status='active', immediate access). Admin panel provides pending student list with approve/reject actions. Authentication middleware blocks login attempts from pending/rejected users.
-   **Subscription System**: Flexible subscription plan management with admin-controlled creation, editing, and deletion. Each plan supports customizable features (tests, assignments, certificates, live classes), custom feature labels, additional custom features, and bonuses. Plans are linked to course pricing.
-   **Subscription Lifecycle Management**: Automated 30-day subscription lifecycle with real-time expiration enforcement. Upon enrollment approval, a 30-day subscription is auto-created with startDate and endDate tracking. Daily scheduler (runs at 2 AM) checks for expiring subscriptions and sends notifications at 7, 3, and 1 day before expiry. Real-time access control checks both subscription status AND endDate to immediately block access when subscription expires, preventing any delay window. Both frontend (LearningPage) and backend (getUserSubscriptions) perform on-demand expiration checking to ensure immediate access revocation. Admin and Instructor dashboards display expiring subscriptions (7-day warning) and allow extending subscription durations with custom day values. Expired subscriptions are visually highlighted with red background (`bg-destructive/10`) and display a one-click "Qayta faollashtirish" (Reactivate) button that extends the subscription by 30 days and sets status to active.
-   **Notification System**: Real-time, in-app notifications with unread counts and polling.
-   **Video Player Support**: Enhanced compatibility with various video platforms (YouTube, Kinescope, Vimeo, Dailymotion, Wistia) and generic HTTPS video URLs.
-   **Private Messaging**: A chat system enabling direct communication between students and instructors with unread indicators and real-time polling. Supports direct navigation via `/chat?userId=${userId}` parameter that automatically creates or finds existing conversations based on user roles (Admin/Instructor uses studentId, Student uses instructorId). Integrated notification system automatically creates bell notifications when messages are sent, showing sender name and message preview (max 50 chars). Clicking chat_message notifications navigates directly to the conversation.
-   **Announcement System**: Instructors can send announcements targeting individual students, course groups, or all students, with notification integration.
-   **CMS & Homepage Enhancements**: Dynamic "About Us", "Contact Us", Testimonials, and Certificates sections managed via Admin CMS, with certificate image upload to Replit Object Storage.
-   **Admin Subscription Management**: Comprehensive admin interface (/admin/subscription-plans) for subscription plan CRUD operations. Supports four feature types: (1) Base features with customizable labels (Tests, Assignments, Certificate, Live Classes/week), (2) Dynamic Features - admin-created switch features stored in JSONB array, (3) Custom Features - text-based features array, (4) Bonuses - special offers array. UI design: read-only plan cards with green CheckCircle icons for all features and yellow Star icons for bonuses; all editing exclusively via dialog to prevent data loss. Database stores features in JSONB column with full type safety via Drizzle schema.
-   **Admin Student Creation with Course Enrollment**: Admins can create students with optional course selection. When a course is selected during student creation, the system automatically: (1) creates an enrollment with paymentStatus='approved' using the first available subscription plan, (2) creates a 30-day active subscription, and (3) allows the student immediate access to the course upon first login. All operations wrapped in database transaction for data consistency.
-   **Admin User Deletion**: Comprehensive user deletion system allowing admins to permanently remove users and all associated data from the platform. Features atomic transaction-based deletion that removes: user profile, course enrollments, assignment/test submissions, subscriptions, notifications, messages, password reset requests, and for instructors, all created courses. Includes multi-level safeguards: (1) admins cannot delete themselves, (2) confirmation dialog displays full impact of deletion, (3) irreversible action warning, (4) atomic database transaction ensures data consistency. Frontend provides detailed deletion preview showing all data types that will be removed, with special warnings for instructor deletions affecting their courses.

## External Dependencies

### Third-Party Services

-   **Replit Authentication**: OpenID Connect provider for user authentication.
-   **Neon Serverless PostgreSQL**: PostgreSQL database hosting.
-   **Object Storage (Replit)**: Cloud storage for multimedia files (e.g., certificates).

### Key NPM Packages

-   **Frontend**: `@tanstack/react-query`, `wouter`, `@radix-ui/*`, `react-hook-form`, `zod`, `date-fns`, `lucide-react`, `framer-motion`, `recharts`.
-   **Backend**: `express`, `drizzle-orm`, `passport`, `openid-client`, `express-session`, `connect-pg-simple`, `@google-cloud/storage`, `multer`.
-   **Development**: `typescript`, `vite`, `tailwindcss`, `drizzle-kit`, `tsx`.