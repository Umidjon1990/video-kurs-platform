# Zamonaviy-EDU - Video Course Platform (LMS)

## Overview
Zamonaviy-EDU is a comprehensive Learning Management System (LMS) platform designed for video-based courses, serving Administrators, Instructors, and Students. Its core purpose is to streamline course creation, delivery, and student progress tracking. Key capabilities include robust course management, diverse assessment types (assignments and tests), and a manual payment system with admin approval, evolving into a subscription-based model. The platform aims to provide a professional, trustworthy, and scannable learning experience, localized in Uzbek, with features such as certificate image uploads and extensive CMS capabilities for managing site content and testimonials. It supports flexible subscription plans, single-device enforcement for students (1 active session per student, with device limit error on login), and a rich set of communication tools including private messaging and announcements.

## User Preferences
Preferred communication style: Simple, everyday language (Uzbek interface).

## System Architecture

### UI/UX Decisions
The frontend, built with React, TypeScript, and Vite, utilizes Radix UI and Shadcn/ui components styled with Tailwind CSS, adhering to a Material Design-inspired aesthetic. It features distinct user role experiences, dark/light modes, and a responsive design. Navigation is handled by a role-based Shadcn Sidebar. Dashboards include modern stats cards, interactive charts, and animated elements. Visual cues differentiate demo and premium lessons, and course creation/edit dialogs are designed for accessibility. Special visual treatments are applied for discounted, new, and free courses, including gradient borders, sparkle stars, and thematic badges. CEFR language levels and resource types are integrated into filtering and display.

### Technical Implementations
The frontend uses Wouter for routing and TanStack Query for state management. Authentication relies on local phone/email and password. The backend is an Express.js application in TypeScript, offering a RESTful API with role-based protection. It employs session-based `express-session` with a PostgreSQL store and Passport.js for authentication. Drizzle ORM with PostgreSQL (Neon Serverless) is used for type-safe database operations. Automatic default subscription plan creation ensures immediate functionality in new environments. The platform integrates a sophisticated assessment system with various question types, secure server-side grading, and advanced features like question/answer shuffling, RTL support for Arabic, and text import. Video content is supported from multiple platforms, and a robust notification system provides real-time updates.

### Feature Specifications
*   **Role-Based Access Control**: Strict access for Admin, Instructor, and Student roles.
*   **Multi-Device Login**: Allows concurrent logins from multiple devices.
*   **Assessment System**: Supports six question types, auto/manual grading, question banks, and secure server-side grading, with features like question/answer shuffling, RTL Arabic support, and retake enforcement.
*   **Assignment Submission**: Multi-file upload with server-side validation.
*   **Grading Workflow**: Integrated notifications for submissions, grading, and results.
*   **Course Structure**: Simplified course-to-lesson linkage, with universally accessible demo lessons.
*   **Payment Flow**: Manual payment with student receipt upload and admin approval, evolving into a subscription model.
*   **Dual Student Registration**: Self-registration (pending admin approval) or admin-created (immediate active status).
*   **Subscription System**: Flexible, admin-managed plans linked to course pricing, with automated lifecycle management and expiration enforcement.
*   **Notification System**: Real-time, in-app notifications with unread counts.
*   **Video Player Support**: Compatible with YouTube, Kinescope, Vimeo, Dailymotion, Wistia, and direct HTTPS links.
*   **Private Messaging**: Direct student-instructor communication with real-time updates.
*   **Announcement System**: Targeted announcements by instructors.
*   **CMS & Homepage Enhancements**: Dynamic content management for "About Us," "Contact Us," Testimonials, and Certificates.
*   **Kinescope Video Integration**: Admin-configured API key enables direct video uploads to Kinescope via the backend proxy (disk-based streaming, no memory buffering).
*   **Bunny.net Stream Integration**: Admin configures Library ID + Stream API Key via Admin CMS → Sozlamalar. Instructors upload directly from browser to Bunny.net via TUS (no server proxy). Backend creates video entry, generates SHA-256 TUS signature, returns to frontend. Frontend uses tus-js-client with `uploadUrl` = `https://video.bunnycdn.com/{libraryId}/{videoId}`. Embed URL: `https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}`. Video player recognizes `mediadelivery.net` URLs.
*   **Admin Subscription Management**: Comprehensive CRUD for subscription plans.
*   **Admin Student Creation with Course Enrollment**: Admins can create students, assign them to groups, enroll them in courses, and manage subscriptions.
*   **Admin User Deletion**: Comprehensive, atomic user deletion with multi-level safeguards and cascade deletion for associated data.
*   **Course Rating System**: Students provide 1-5 star ratings and reviews.
*   **Custom Course Author Names**: Instructors can specify custom author names.
*   **Discount/Sale System**: Instructors set course discounts, displayed with badges and calculated prices.
*   **"Yangi" New Course Ribbon**: Highlights courses created within the last 7 days.
*   **Free Course Feature**: Instructors can mark courses as free, with special visual designs and enrollment buttons.
*   **CEFR Language Level Filtering**: Courses categorized by CEFR levels, managed by admins, and filterable on the homepage.
*   **Resource Type Filtering**: Courses tagged with multiple resource types (e.g., Reading, Writing), managed by admins, and filterable.
*   **Arabic Essay Assignments**: Instructors can create Arabic essay questions with AI-powered feedback via OpenAI GPT-4o.
*   **Course Module System**: Optional modular course structure to organize lessons.
*   **Lesson Sections (Multi-Video Support)**: Lessons can contain multiple video sections from various platforms.
*   **Live Video Conferencing**: Integration with Jitsi Meet and Zoom for live classes, with platform selection and access control.
*   **Course Group Chat**: Real-time group messaging within courses for instructors and students, with presence tracking.
*   **Free Lesson Access**: Students can access any lesson in any order, with enrollment/subscription managing access to non-demo lessons.
*   **Student Group Management**: Admins can create and manage student groups for organizational purposes and bulk assignments.
*   **Demo Lesson Test Taking**: Public (no auth) test-taking on demo lessons. Visitors can take tests on free demo lessons and see results immediately — serves as marketing to demonstrate the platform's assessment capabilities. Public API endpoints: `GET /api/public/lessons/:id/tests`, `GET /api/public/tests/:id/questions`, `POST /api/public/tests/:id/submit`. Results are graded server-side but not saved to DB.
*   **Bulk Test Creation**: Instructors can create tests for multiple lessons at once via "Ommaviy Test Qo'shish" dialog with shared settings (passing score, shuffle options). Backend: `POST /api/instructor/courses/:id/tests/bulk`.

## External Dependencies

### Third-Party Services
*   **Replit Authentication**: OpenID Connect provider.
*   **Neon Serverless PostgreSQL**: Database hosting.
*   **Object Storage (Replit)**: Cloud storage for multimedia.
*   **Jitsi Meet**: Free video conferencing.
*   **Zoom**: Premium video conferencing with Server-to-Server OAuth.
*   **OpenAI GPT-4o**: For AI-powered feedback on Arabic essay assignments.

### Key NPM Packages
*   **Frontend**: `@tanstack/react-query`, `wouter`, `@radix-ui/*`, `react-hook-form`, `zod`, `date-fns`, `lucide-react`, `framer-motion`, `recharts`.
*   **Backend**: `express`, `drizzle-orm`, `passport`, `openid-client`, `express-session`, `connect-pg-simple`, `@google-cloud/storage`, `multer`, `axios`.