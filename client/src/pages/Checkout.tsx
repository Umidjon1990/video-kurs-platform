// Stripe integration for course payment
import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { Course } from "@shared/schema";

const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

function CheckoutForm({ courseId }: { courseId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success?courseId=${courseId}`,
      },
    });

    if (error) {
      toast({
        title: "To'lov Xatosi",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
        <p className="font-medium mb-2">Test karta ma'lumotlari:</p>
        <p>Karta raqami: 4242 4242 4242 4242</p>
        <p>Amal qilish muddati: Istalgan kelajak sanasi</p>
        <p>CVV: Istalgan 3 raqam</p>
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={!stripe || isProcessing}
        data-testid="button-pay"
      >
        {isProcessing ? "To'lov amalga oshirilmoqda..." : "To'lash"}
      </Button>
    </form>
  );
}

export default function Checkout() {
  const { courseId } = useParams<{ courseId: string }>();
  const [, setLocation] = useLocation();
  const [clientSecret, setClientSecret] = useState("");

  const { data: course } = useQuery<Course>({
    queryKey: ["/api/courses", courseId],
    enabled: !!courseId,
  });

  useEffect(() => {
    if (!courseId) return;

    // Server will get the price from database for security
    apiRequest("POST", "/api/create-payment-intent", { 
      courseId
    })
      .then((res) => res.json())
      .then((data) => {
        setClientSecret(data.clientSecret);
      })
      .catch((error) => {
        console.error("Payment intent error:", error);
      });
  }, [courseId]);

  if (!stripePromise) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Stripe kalitlari sozlanmagan. Iltimos adminstratorga murojaat qiling.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!clientSecret || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
            onClick={() => setLocation('/')}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">To'lov</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Course Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Xarid Tafsilotlari</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {course.thumbnailUrl && (
                <img 
                  src={course.thumbnailUrl} 
                  alt={course.title}
                  className="w-full h-48 object-cover rounded-lg"
                />
              )}
              <div>
                <h3 className="font-semibold text-lg" data-testid="text-course-title">{course.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">{course.description}</p>
              </div>
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center text-lg">
                  <span>Jami:</span>
                  <span className="font-bold text-2xl text-primary" data-testid="text-total-price">
                    ${course.price}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle>To'lov Ma'lumotlari</CardTitle>
            </CardHeader>
            <CardContent>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm courseId={courseId!} />
              </Elements>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
