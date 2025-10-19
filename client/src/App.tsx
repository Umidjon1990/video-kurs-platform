// Replit Auth integration
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import HomePage from "@/pages/HomePage";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminPayments from "@/pages/AdminPayments";
import AdminCMSPage from "@/pages/AdminCMSPage";
import AdminSubscriptionPlansPage from "@/pages/AdminSubscriptionPlansPage";
import AdminSubscriptions from "@/pages/AdminSubscriptions";
import InstructorDashboard from "@/pages/InstructorDashboard";
import InstructorSubscriptions from "@/pages/InstructorSubscriptions";
import StudentCourses from "@/pages/StudentCourses";
import StudentResults from "@/pages/StudentResults";
import LearningPage from "@/pages/LearningPage";
import Checkout from "@/pages/Checkout";
import PaymentSuccess from "@/pages/PaymentSuccess";
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

  return (
    <Switch>
      {/* Public Routes - accessible to everyone */}
      <Route path="/explore" component={HomePage} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      {!isAuthenticated ? (
        <Route path="/" component={HomePage} />
      ) : (
        <>
          {/* Admin Routes */}
          {user?.role === 'admin' && (
            <>
              <Route path="/" component={AdminDashboard} />
              <Route path="/admin" component={AdminDashboard} />
              <Route path="/admin/payments" component={AdminPayments} />
              <Route path="/admin/cms" component={AdminCMSPage} />
              <Route path="/admin/subscription-plans" component={AdminSubscriptionPlansPage} />
              <Route path="/admin/subscriptions" component={AdminSubscriptions} />
            </>
          )}
          
          {/* Instructor Routes */}
          {user?.role === 'instructor' && (
            <>
              <Route path="/" component={InstructorDashboard} />
              <Route path="/instructor/subscriptions" component={InstructorSubscriptions} />
              <Route path="/chat" component={ChatPage} />
              <Route path="/chat/:conversationId" component={ChatPage} />
            </>
          )}
          
          {/* Student Routes */}
          {user?.role === 'student' && (
            <>
              <Route path="/" component={StudentCourses} />
              <Route path="/results" component={StudentResults} />
              <Route path="/checkout/:courseId" component={Checkout} />
              <Route path="/learn/:courseId" component={LearningPage} />
              <Route path="/payment-success" component={PaymentSuccess} />
              <Route path="/chat" component={ChatPage} />
              <Route path="/chat/:conversationId" component={ChatPage} />
            </>
          )}
        </>
      )}
      <Route component={NotFound} />
    </Switch>
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
