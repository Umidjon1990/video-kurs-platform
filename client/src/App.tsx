// Replit Auth integration
import { lazy, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/useAuth";
import PublicHomePage from "@/pages/PublicHomePage";
import PublicCoursePage from "@/pages/PublicCoursePage";
import PublicLegalPage from "@/pages/PublicLegalPage";
import NotFound from "@/pages/not-found";
import { UrgentBanner } from "@/components/UrgentBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { VideoPlaybackProvider } from "@/hooks/useVideoPlayback";

const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminCourses = lazy(() => import("@/pages/AdminCourses"));
const AdminPayments = lazy(() => import("@/pages/AdminPayments"));
const AdminCMSPage = lazy(() => import("@/pages/AdminCMSPage"));
const AdminSubscriptionPlansPage = lazy(() => import("@/pages/AdminSubscriptionPlansPage"));
const AdminSubscriptions = lazy(() => import("@/pages/AdminSubscriptions"));
const AdminGroupsPage = lazy(() => import("@/pages/AdminGroupsPage"));
const InstructorDashboard = lazy(() => import("@/pages/InstructorDashboard"));
const InstructorSubscriptions = lazy(() => import("@/pages/InstructorSubscriptions"));
const SpeakingTests = lazy(() => import("@/pages/SpeakingTests"));
const SpeakingTestEdit = lazy(() => import("@/pages/SpeakingTestEdit"));
const StudentCourses = lazy(() => import("@/pages/StudentCourses"));
const StudentResults = lazy(() => import("@/pages/StudentResults"));
const StudentSpeakingTest = lazy(() => import("@/pages/StudentSpeakingTest"));
const LearningPage = lazy(() => import("@/pages/LearningPage"));
const Checkout = lazy(() => import("@/pages/Checkout"));
const ChatPage = lazy(() => import("@/pages/ChatPage"));
const LiveRoom = lazy(() => import("@/pages/LiveRoom"));
const GroupChat = lazy(() => import("@/pages/GroupChat"));
const CuratorDashboard = lazy(() => import("@/pages/CuratorDashboard"));
const CuratorRegister = lazy(() => import("@/pages/CuratorRegister"));
const AnnouncementsPage = lazy(() => import("@/pages/AnnouncementsPage"));

const PUBLIC_PATHS = ["/explore", "/kurs", "/privacy", "/terms", "/login", "/register", "/checkout", "/curator/register"];

function RouteLoader() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#080a10]" role="status" aria-label="Sahifa yuklanmoqda">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-[#c8f55a]" />
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  const { isAuthenticated, isLoading, user } = useAuth();

  // Check if current path is public
  const isPublicPath = PUBLIC_PATHS.some(path => 
    location === path || location.startsWith(path + "/")
  );

  // Always render public routes immediately without waiting for auth
  if (isPublicPath) {
    return (
      <Switch>
        <Route path="/explore" component={PublicHomePage} />
        <Route path="/kurs/:courseId" component={PublicCoursePage} />
        <Route path="/privacy" component={PublicLegalPage} />
        <Route path="/terms" component={PublicLegalPage} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/checkout/:courseId" component={Checkout} />
        <Route path="/curator/register/:token" component={CuratorRegister} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // For root path ("/"), show the public catalogue if not authenticated or still loading
  if (location === "/" && (!isAuthenticated || isLoading)) {
    return <PublicHomePage />;
  }

  // Show loading spinner for authenticated routes while checking auth
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // If not authenticated and trying to access a protected route, show the public catalogue
  if (!isAuthenticated) {
    return <PublicHomePage />;
  }

  // Full-screen routes (no sidebar/header)
  const isFullScreen = location.startsWith('/learn/') || location.startsWith('/live/');
  if (isFullScreen) {
    return (
      <ErrorBoundary key={location} fallbackMessage="Sahifani yuklashda xatolik yuz berdi">
        <div className="h-full w-full flex flex-col overflow-hidden">
          <Switch>
            <Route path="/learn/:courseId" component={LearningPage} />
            <Route path="/live/:roomId" component={LiveRoom} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </ErrorBoundary>
    );
  }

  // Authenticated routes (with sidebar)
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-full w-full overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <header className="shrink-0 flex items-center gap-2 border-b px-4 py-3"
            style={{
              background: "linear-gradient(90deg,#0d0521 0%,#0a0328 100%)",
              borderColor: "rgba(124,58,237,0.18)",
            }}>
            <SidebarTrigger
              data-testid="button-sidebar-toggle"
              className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg h-10 w-10 [&>svg]:w-5 [&>svg]:h-5"
            />
            <div className="flex-1" />
          </header>
          <UrgentBanner />
          <main className="flex-1 overflow-auto overscroll-none">
            <Switch>
              {/* Admin Routes */}
              {user?.role === 'admin' && (
                <>
                  <Route path="/" component={AdminDashboard} />
                  <Route path="/admin" component={AdminDashboard} />
                  <Route path="/admin/courses" component={AdminCourses} />
                  <Route path="/admin/payments" component={AdminPayments} />
                  <Route path="/admin/cms" component={AdminCMSPage} />
                  <Route path="/admin/subscription-plans" component={AdminSubscriptionPlansPage} />
                  <Route path="/admin/subscriptions" component={AdminSubscriptions} />
                  <Route path="/admin/groups" component={AdminGroupsPage} />
                  <Route path="/admin/announcements" component={AnnouncementsPage} />
                </>
              )}

              {/* Instructor Routes */}
              {user?.role === 'instructor' && (
                <>
                  <Route path="/" component={InstructorDashboard} />
                  <Route path="/instructor/subscriptions" component={InstructorSubscriptions} />
                  <Route path="/instructor/courses/:courseId/speaking-tests" component={SpeakingTests} />
                  <Route path="/instructor/speaking-tests/:testId" component={SpeakingTestEdit} />
                  <Route path="/chat" component={ChatPage} />
                  <Route path="/chat/:conversationId" component={ChatPage} />
                  <Route path="/announcements" component={AnnouncementsPage} />
                </>
              )}

              {/* Curator Routes */}
              {user?.role === 'curator' && (
                <>
                  <Route path="/" component={CuratorDashboard} />
                  <Route path="/group-chat/:groupId" component={GroupChat} />
                  <Route path="/chat" component={ChatPage} />
                  <Route path="/chat/:conversationId" component={ChatPage} />
                  <Route path="/announcements" component={AnnouncementsPage} />
                </>
              )}

              {/* Student Routes */}
              {user?.role === 'student' && (
                <>
                  <Route path="/" component={StudentCourses} />
                  <Route path="/results" component={StudentResults} />
                  <Route path="/checkout/:courseId" component={Checkout} />
                  <Route path="/student/speaking-test/:testId" component={StudentSpeakingTest} />
                  <Route path="/chat" component={ChatPage} />
                  <Route path="/chat/:conversationId" component={ChatPage} />
                  <Route path="/group-chat/:groupId" component={GroupChat} />
                  <Route path="/announcements" component={AnnouncementsPage} />
                </>
              )}
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <VideoPlaybackProvider>
          <Toaster />
          <Suspense fallback={<RouteLoader />}>
            <Router />
          </Suspense>
        </VideoPlaybackProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
