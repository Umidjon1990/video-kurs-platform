# Video Course Platform (LMS)

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
*   **Admin Student Creation with Course Enrollment**: Admins can create students and automatically enroll them in courses, initiating a 30-day active subscription upon selection.
*   **Admin User Deletion**: Comprehensive, atomic user deletion system for all associated data, with multi-level safeguards and detailed preview of affected data.
*   **Course Rating System**: Enrolled students can submit 1-5 star ratings and optional reviews, with unique per-student-per-course rating enforcement and atomic upsert operations.
*   **Custom Course Author Names**: Instructors can specify custom author names for courses, overriding default instructor names on public listings.
*   **Course Like System ("Qiziqtirdi")**: Public like feature allowing authenticated users to like/unlike courses with heart icon, unique constraint preventing duplicates, graceful degradation if feature fails (courses still display).

### System Design Choices
The backend is an Express.js application in TypeScript, providing a RESTful API with role-based route protection. It uses session-based `express-session` with a PostgreSQL store for authentication, integrated with Passport.js. The database uses Drizzle ORM with PostgreSQL (Neon Serverless) for type-safe operations, including models for Users, Courses, Lessons, Assignments, Tests, Enrollments, Submissions, Notifications, Conversations, Messages, Site Settings, Testimonials, Subscription Plans, Course Plan Pricing, and User Subscriptions. The schema utilizes UUID primary keys and timestamp tracking for a comprehensive relational design.

## External Dependencies

### Third-Party Services
*   **Replit Authentication**: OpenID Connect provider (for OIDC authentication).
*   **Neon Serverless PostgreSQL**: PostgreSQL database hosting.
*   **Object Storage (Replit)**: Cloud storage for multimedia files.

### Key NPM Packages
*   **Frontend**: `@tanstack/react-query`, `wouter`, `@radix-ui/*`, `react-hook-form`, `zod`, `date-fns`, `lucide-react`, `framer-motion`, `recharts`.
*   **Backend**: `express`, `drizzle-orm`, `passport`, `openid-client`, `express-session`, `connect-pg-simple`, `@google-cloud/storage`, `multer`.
*   **Development**: `typescript`, `vite`, `tailwindcss`, `drizzle-kit`, `tsx`.