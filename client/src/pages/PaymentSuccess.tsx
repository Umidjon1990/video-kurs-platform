import { useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get('courseId');
  const paymentIntent = urlParams.get('payment_intent');

  const enrollMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/student/enroll", {
        courseId,
        paymentIntentId: paymentIntent,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/enrolled-courses"] });
    },
  });

  useEffect(() => {
    if (courseId && paymentIntent) {
      enrollMutation.mutate();
    }
  }, [courseId, paymentIntent]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2" data-testid="text-success-title">
              To'lov Muvaffaqiyatli!
            </h2>
            <p className="text-muted-foreground">
              Kursga muvaffaqiyatli yozildingiz. Endi darslarni boshlashingiz mumkin.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button 
              onClick={() => setLocation(`/learn/${courseId}`)}
              data-testid="button-start-learning"
            >
              Darsni Boshlash
            </Button>
            <Button 
              variant="outline"
              onClick={() => setLocation('/')}
              data-testid="button-back-home"
            >
              Bosh Sahifaga
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
