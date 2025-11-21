// Replit Auth integration
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/useAuth";
import HomePage from "@/pages/HomePage";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import CourseDetail from "@/pages/CourseDetail";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminCourses from "@/pages/AdminCourses";
import AdminPayments from "@/pages/AdminPayments";
import AdminCMSPage from "@/pages/AdminCMSPage";
import AdminSubscriptionPlansPage from "@/pages/AdminSubscriptionPlansPage";
import AdminSubscriptions from "@/pages/AdminSubscriptions";
import AdminTestPayments from "@/pages/AdminTestPayments";
import InstructorDashboard from "@/pages/InstructorDashboard";
import InstructorSubscriptions from "@/pages/InstructorSubscriptions";
import SpeakingTests from "@/pages/SpeakingTests";
import SpeakingTestEdit from "@/pages/SpeakingTestEdit";
import InstructorStandaloneTests from "@/pages/InstructorStandaloneTests";
import StudentCourses from "@/pages/StudentCourses";
import StudentResults from "@/pages/StudentResults";
import StudentSpeakingTest from "@/pages/StudentSpeakingTest";
import StudentTestMarketplace from "@/pages/StudentTestMarketplace";
import LearningPage from "@/pages/LearningPage";
import Checkout from "@/pages/Checkout";
import ChatPage from "@/pages/ChatPage";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Public routes (no sidebar)
  const publicRoutes = (
    <Switch>
      <Route path="/explore" component={HomePage} />
      <Route path="/course/:id" component={CourseDetail} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      {!isAuthenticated && <Route path="/" component={HomePage} />}
    </Switch>
  );

  // Authenticated routes (with sidebar)
  const authenticatedRoutes = isAuthenticated && (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center gap-2 border-b p-4 bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex-1" />
          </header>
          <main className="flex-1 overflow-auto">
            <Switch>
              {/* Admin Routes */}
              {user?.role === 'admin' && (
                <>
                  <Route path="/" component={AdminDashboard} />
                  <Route path="/admin" component={AdminDashboard} />
                  <Route path="/admin/courses" component={AdminCourses} />
                  <Route path="/admin/payments" component={AdminPayments} />
                  <Route path="/admin/test-payments" component={AdminTestPayments} />
                  <Route path="/admin/cms" component={AdminCMSPage} />
                  <Route path="/admin/subscription-plans" component={AdminSubscriptionPlansPage} />
                  <Route path="/admin/subscriptions" component={AdminSubscriptions} />
                  <Route path="/learn/:courseId" component={LearningPage} />
                </>
              )}
              
              {/* Instructor Routes */}
              {user?.role === 'instructor' && (
                <>
                  <Route path="/" component={InstructorDashboard} />
                  <Route path="/instructor/subscriptions" component={InstructorSubscriptions} />
                  <Route path="/instructor/standalone-tests" component={InstructorStandaloneTests} />
                  <Route path="/instructor/courses/:courseId/speaking-tests" component={SpeakingTests} />
                  <Route path="/instructor/speaking-tests/:testId" component={SpeakingTestEdit} />
                  <Route path="/learn/:courseId" component={LearningPage} />
                  <Route path="/chat" component={ChatPage} />
                  <Route path="/chat/:conversationId" component={ChatPage} />
                </>
              )}
              
              {/* Student Routes */}
              {user?.role === 'student' && (
                <>
                  <Route path="/" component={StudentCourses} />
                  <Route path="/results" component={StudentResults} />
                  <Route path="/test-marketplace" component={StudentTestMarketplace} />
                  <Route path="/checkout/:courseId" component={Checkout} />
                  <Route path="/student/speaking-test/:testId" component={StudentSpeakingTest} />
                  <Route path="/learn/:courseId" component={LearningPage} />
                  <Route path="/chat" component={ChatPage} />
                  <Route path="/chat/:conversationId" component={ChatPage} />
                </>
              )}
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );

  return (
    <>
      {publicRoutes}
      {authenticatedRoutes}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
