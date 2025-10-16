import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface PendingPayment {
  enrollment: {
    id: string;
    paymentMethod: string;
    paymentProofUrl: string;
    paymentStatus: string;
    enrolledAt: string;
  };
  course: {
    id: string;
    title: string;
    price: string;
  };
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export default function AdminPayments() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: pendingPayments, isLoading } = useQuery<PendingPayment[]>({
    queryKey: ["/api/admin/pending-payments"],
    enabled: isAuthenticated,
  });

  const approveMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      await apiRequest("PATCH", `/api/admin/payments/${enrollmentId}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-payments"] });
      toast({
        title: "Tasdiqlandi",
        description: "To'lov tasdiqlandi. O'quvchi kursga kirish oladi.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Xatolik",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      await apiRequest("PATCH", `/api/admin/payments/${enrollmentId}/reject`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-payments"] });
      toast({
        title: "Rad etildi",
        description: "To'lov rad etildi",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Xatolik",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (authLoading || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="flex h-16 items-center px-4 gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/admin')}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold" data-testid="text-payments-title">
            To'lovlarni Tasdiqlash
          </h1>
          <div className="ml-auto">
            <Button
              variant="outline"
              onClick={() => window.location.href = "/api/logout"}
              data-testid="button-logout"
            >
              Chiqish
            </Button>
          </div>
        </div>
      </div>

      <div className="p-8">
        {!pendingPayments || pendingPayments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="text-xl text-muted-foreground">
                Kutilayotgan to'lovlar yo'q
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {pendingPayments.map((payment) => (
              <Card key={payment.enrollment.id} data-testid={`card-payment-${payment.enrollment.id}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="mb-2">{payment.course.title}</CardTitle>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>
                          O'quvchi: {payment.user.firstName} {payment.user.lastName} ({payment.user.email})
                        </p>
                        <p>Narx: {payment.course.price} so'm</p>
                        <p>To'lov turi: 
                          <Badge variant="outline" className="ml-2">
                            {payment.enrollment.paymentMethod === 'naqd' ? 'Naqd pul' : 'Karta'}
                          </Badge>
                        </p>
                        <p>
                          Yuborilgan vaqt: {new Date(payment.enrollment.enrolledAt).toLocaleString('uz-UZ')}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Receipt Image */}
                  <div>
                    <p className="text-sm font-medium mb-2">To'lov Cheki:</p>
                    <img
                      src={payment.enrollment.paymentProofUrl}
                      alt="Payment Receipt"
                      className="max-w-md rounded-lg border"
                      data-testid={`img-receipt-${payment.enrollment.id}`}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button
                      onClick={() => approveMutation.mutate(payment.enrollment.id)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      className="flex items-center gap-2"
                      data-testid={`button-approve-${payment.enrollment.id}`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Tasdiqlash
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => rejectMutation.mutate(payment.enrollment.id)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      className="flex items-center gap-2"
                      data-testid={`button-reject-${payment.enrollment.id}`}
                    >
                      <XCircle className="w-4 h-4" />
                      Rad etish
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
