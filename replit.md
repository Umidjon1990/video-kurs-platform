# Video Course Platform (LMS)

## Overview

A comprehensive Learning Management System (LMS) platform for video-based courses. The platform supports three distinct user roles: Administrators who manage users and oversee the platform, Instructors who create and publish courses with lessons and assessments, and Students who enroll in courses and track their learning progress. The system integrates payment processing through Stripe for course enrollments and uses Replit's authentication for secure user access.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- `/api/instructor/*` - Instructor routes (course management, lesson creation)
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
- **Courses**: Instructor-created courses with pricing, thumbnails, and publication status
- **Lessons**: Video-based lesson content organized within courses
- **Assignments**: Submission-based assessments with grading
- **Tests**: Multiple-choice assessments with automated scoring
- **Enrollments**: Student course registrations with payment tracking
- **Submissions**: Student assignment submissions
- **Test Results**: Student test attempt records
- **Sessions**: PostgreSQL-backed session storage

**Relational Design**
- One-to-many relationships: Users → Courses (as instructors)
- One-to-many: Courses → Lessons, Assignments, Tests
- Many-to-many: Users ↔ Courses (via Enrollments)
- Tracking relationships: Users → Submissions, TestResults

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

**Stripe Integration**
- Stripe Checkout for course payments
- Payment Intent creation and confirmation flow
- Webhook handling for payment status (implementation-ready structure)
- Post-payment enrollment automation
- Client-side payment UI with Stripe Elements

**Payment Flow**
1. Student selects course and initiates checkout
2. Server creates Stripe Payment Intent
3. Client renders Stripe payment form
4. Payment confirmation redirects to success page
5. Enrollment record created with payment reference

## External Dependencies

### Third-Party Services

**Replit Authentication**
- OpenID Connect provider for user authentication
- Environment variables: `ISSUER_URL`, `REPL_ID`, `REPLIT_DOMAINS`, `SESSION_SECRET`
- Passport.js strategy implementation for session management

**Stripe Payment Processing**
- API version: 2023-10-16
- Environment variables: `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLIC_KEY`
- React Stripe.js for client-side payment forms
- Payment Intents API for secure payment handling

**Neon Serverless PostgreSQL**
- Serverless PostgreSQL database hosting
- WebSocket connection support for edge environments
- Environment variable: `DATABASE_URL`
- Connection pooling via @neondatabase/serverless

### Key NPM Packages

**Frontend Libraries**
- @tanstack/react-query - Server state management
- wouter - Lightweight routing
- @stripe/react-stripe-js & @stripe/stripe-js - Payment processing
- @radix-ui/* - Accessible UI primitives (20+ components)
- react-hook-form & @hookform/resolvers - Form management
- zod - Runtime type validation
- date-fns - Date manipulation

**Backend Libraries**
- express - Web server framework
- drizzle-orm - Type-safe ORM
- passport - Authentication middleware
- openid-client - OIDC implementation
- express-session - Session management
- connect-pg-simple - PostgreSQL session store
- stripe - Payment processing SDK

**Development Tools**
- typescript - Type checking
- vite - Build tool and dev server
- tailwindcss - CSS framework
- drizzle-kit - Database migrations
- tsx - TypeScript execution

### Database Schema

**PostgreSQL Tables**
- sessions (Replit Auth session storage)
- users (role: admin | instructor | student)
- courses (instructorId, price, status, thumbnailUrl)
- lessons (courseId, videoUrl, duration, order)
- assignments (courseId, dueDate, maxScore)
- tests (courseId, passingScore)
- enrollments (userId, courseId, paymentIntentId, enrolledAt)
- submissions (assignmentId, userId, score, submittedAt)
- testResults (testId, userId, score, completedAt)

All tables use UUID primary keys and include timestamp tracking for created/updated records.