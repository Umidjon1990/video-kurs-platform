# Video Course Platform (LMS)

## Overview

This project is a comprehensive Learning Management System (LMS) platform designed for video-based courses, catering to Administrators, Instructors, and Students. It supports end-to-end course management, from creation and lesson delivery to diverse assessment types (assignments, tests), and student progress tracking. The platform includes a manual payment processing system with admin approval, a subscription-based pricing model, and certificate image uploads. It aims to provide a professional, trustworthy, and easily navigable learning experience, localized in Uzbek, with robust CMS features for managing site content and testimonials. Tests are also available as standalone products in a dedicated marketplace.

## User Preferences

Preferred communication style: Simple, everyday language (Uzbek interface).

## System Architecture

### Frontend Architecture

The frontend is built with React and TypeScript using Vite, Wouter for routing, and TanStack Query for state management. It leverages Radix UI primitives and Shadcn/ui components, styled with Tailwind CSS, following a Material Design-inspired aesthetic. Key features include distinct user role experiences, dark/light mode support, and a role-based navigation system using a collapsible Shadcn Sidebar with user profile display and active route highlighting. The public homepage features a "Kirish" (Login) button and the login page provides guidance text. Dashboards feature modern stats cards, interactive charts, enhanced course cards, progress tracking with circular charts, and `framer-motion` animations. Course thumbnail images (`h-56` with `object-contain`) are consistently applied across the platform, with a live preview in course creation/edit dialogs. Public lesson previews display descriptions for both demo and premium lessons. Demo lessons are visually distinct with an orange/amber gradient design and play icons, while premium lessons show a lock icon. Instructor course creation/edit dialogs are scrollable with `max-h-[90vh]` and dynamic titles, ensuring action buttons remain accessible.

### Backend Architecture

The backend is an Express.js application in TypeScript, providing a RESTful API with role-based route protection. It uses session-based `express-session` with a PostgreSQL store and Passport.js for authentication. Middleware enforces role-based access control and handles errors. It includes APIs for managing courses, assessments, user subscriptions, and site content, alongside a private messaging and announcement system.

### Database Architecture

The system utilizes Drizzle ORM with PostgreSQL (Neon Serverless). Key models include Users (with roles), Courses (supporting dual pricing and subscription plans), Lessons (video-based with demo flags), Assignments (multi-file submissions), Tests (various question types, now standalone products), Speaking Tests, Enrollments, Test Enrollments, Submissions, Notifications, Conversations, Messages, Site Settings, Testimonials, Subscription Plans, Course Plan Pricing, and User Subscriptions. The schema uses UUID primary keys and timestamps, with a comprehensive relational design. Tests and speaking tests are designed as standalone products with optional `courseId`, `instructorId`, pricing fields, `thumbnailUrl`, and `status`, supported by a `testEnrollments` table for independent tracking.

### System Design Choices

-   **Role-Based Access Control**: Strict access control implemented for Admin, Instructor, and Student roles.
-   **Single-Device Login Enforcement**: Users are restricted to one active session at a time, with previous sessions invalidated upon new login, applied universally across all user types and authentication methods.
-   **Assessment System**: Supports diverse question types (e.g., Multiple Choice, Essay) with auto and manual grading, question banks, and secure server-side grading.
-   **Assignment Submission System**: Allows multi-file uploads (images, audio, files) with server-side validation.
-   **Grading Workflow**: Integrated notification system for submission, grading, and result viewing.
-   **Course Structure**: Courses directly link to lessons, with demo lessons accessible to all.
-   **Payment Flow**: Initially manual with admin approval, evolving into a subscription-based model.
-   **Dual Student Registration System**: Students can self-register (pending admin approval) or be created directly by administrators (active status).
-   **Subscription System**: Flexible plan management by admins, allowing customization of features (tests, assignments, certificates, live classes), custom feature labels, and bonuses.
-   **Subscription Lifecycle Management**: Automated 30-day subscription tracking with daily expiry notifications and real-time access revocation. Admins and Instructors can extend subscriptions.
-   **Notification System**: Real-time, in-app notifications with unread counts.
-   **Video Player Support**: Compatibility with various video platforms (YouTube, Kinescope, Vimeo, Dailymotion, Wistia) and generic HTTPS video URLs.
-   **Private Messaging**: Chat system for direct communication between students and instructors, with unread indicators, real-time polling, and bell notifications.
-   **Announcement System**: Instructors can send targeted announcements to individuals, course groups, or all students.
-   **CMS & Homepage Enhancements**: Dynamic content management for "About Us", "Contact Us", Testimonials, and Certificates sections, with certificate image upload.
-   **Admin Subscription Management**: Comprehensive admin interface for CRUD operations on subscription plans, supporting four feature types (base, dynamic, custom, bonuses) with robust UI and database storage.
-   **Admin Student Creation with Course Enrollment**: Admins can create students and optionally enroll them in a course, automatically generating an approved enrollment and a 30-day active subscription.
-   **Admin User Deletion**: Comprehensive, atomic transaction-based user deletion system that removes all associated data, with multi-level safeguards and detailed deletion previews.
-   **Test Marketplace System**: Tests (standard and speaking) are standalone, purchasable products independent of courses, featuring their own pricing, thumbnails, and dedicated listing page, with purchases tracked via `testEnrollments`.

## External Dependencies

### Third-Party Services

-   **Replit Authentication**: OpenID Connect provider for user authentication.
-   **Neon Serverless PostgreSQL**: PostgreSQL database hosting.
-   **Object Storage (Replit)**: Cloud storage for multimedia files.

### Key NPM Packages

-   **Frontend**: `@tanstack/react-query`, `wouter`, `@radix-ui/*`, `react-hook-form`, `zod`, `date-fns`, `lucide-react`, `framer-motion`, `recharts`.
-   **Backend**: `express`, `drizzle-orm`, `passport`, `openid-client`, `express-session`, `connect-pg-simple`, `@google-cloud/storage`, `multer`.
-   **Development**: `typescript`, `vite`, `tailwindcss`, `drizzle-kit`, `tsx`.