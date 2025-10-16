// Replit Auth integration
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/Landing";
import AdminDashboard from "@/pages/AdminDashboard";
import InstructorDashboard from "@/pages/InstructorDashboard";
import StudentCourses from "@/pages/StudentCourses";
import LearningPage from "@/pages/LearningPage";
import Checkout from "@/pages/Checkout";
import PaymentSuccess from "@/pages/PaymentSuccess";
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
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          {/* Admin Routes */}
          {user?.role === 'admin' && (
            <Route path="/" component={AdminDashboard} />
          )}
          
          {/* Instructor Routes */}
          {user?.role === 'instructor' && (
            <Route path="/" component={InstructorDashboard} />
          )}
          
          {/* Student Routes */}
          {user?.role === 'student' && (
            <>
              <Route path="/" component={StudentCourses} />
              <Route path="/checkout/:courseId" component={Checkout} />
              <Route path="/learn/:courseId" component={LearningPage} />
              <Route path="/payment-success" component={PaymentSuccess} />
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
