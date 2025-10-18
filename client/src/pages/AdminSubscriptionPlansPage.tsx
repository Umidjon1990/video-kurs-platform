import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save } from "lucide-react";
import { useLocation } from "wouter";

export default function AdminSubscriptionPlansPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [plans, setPlans] = useState<any[]>([]);

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

  const { data: subscriptionPlans, isLoading } = useQuery<any[]>({
    queryKey: ["/api/subscription-plans"],
    enabled: isAuthenticated,
  });

  // Initialize plans state when data loads
  useEffect(() => {
    if (subscriptionPlans) {
      setPlans(subscriptionPlans);
    }
  }, [subscriptionPlans]);

  const updatePlanMutation = useMutation({
    mutationFn: async (plan: any) => {
      await apiRequest("PUT", `/api/admin/subscription-plans/${plan.id}`, {
        features: plan.features,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      toast({
        title: "Saqlandi",
        description: "Tarif xususiyatlari yangilandi",
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

  const handleFeatureChange = (planId: string, feature: string, value: boolean | number) => {
    setPlans(
      plans.map((p) =>
        p.id === planId
          ? { ...p, features: { ...p.features, [feature]: value } }
          : p
      )
    );
  };

  const handleSave = (plan: any) => {
    updatePlanMutation.mutate(plan);
  };

  if (authLoading || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const getPlanDisplayName = (name: string) => {
    const names: Record<string, string> = {
      oddiy: "Oddiy",
      standard: "Standard",
      premium: "Premium",
    };
    return names[name] || name;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="flex h-16 items-center px-4 gap-4">
          <Button
            variant="ghost"
            onClick={() => setLocation('/admin')}
            data-testid="button-back-to-admin"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Orqaga
          </Button>
          <h1 className="text-2xl font-bold" data-testid="text-subscription-plans-title">
            Tariflarni Boshqarish
          </h1>
        </div>
      </div>

      <div className="container mx-auto p-6 space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} data-testid={`card-plan-${plan.name}`}>
              <CardHeader>
                <CardTitle>{getPlanDisplayName(plan.name)}</CardTitle>
                <CardDescription>
                  Tarif xususiyatlarini sozlang
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`${plan.id}-tests`} className="text-sm">
                    Testlar
                  </Label>
                  <Switch
                    id={`${plan.id}-tests`}
                    checked={plan.features.hasTests}
                    onCheckedChange={(checked) =>
                      handleFeatureChange(plan.id, "hasTests", checked)
                    }
                    data-testid={`switch-${plan.name}-tests`}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor={`${plan.id}-assignments`} className="text-sm">
                    Vazifalar
                  </Label>
                  <Switch
                    id={`${plan.id}-assignments`}
                    checked={plan.features.hasAssignments}
                    onCheckedChange={(checked) =>
                      handleFeatureChange(plan.id, "hasAssignments", checked)
                    }
                    data-testid={`switch-${plan.name}-assignments`}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor={`${plan.id}-certificate`} className="text-sm">
                    Sertifikat
                  </Label>
                  <Switch
                    id={`${plan.id}-certificate`}
                    checked={plan.features.hasCertificate}
                    onCheckedChange={(checked) =>
                      handleFeatureChange(plan.id, "hasCertificate", checked)
                    }
                    data-testid={`switch-${plan.name}-certificate`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${plan.id}-live-classes`} className="text-sm">
                    Haftada jonli darslar
                  </Label>
                  <Input
                    id={`${plan.id}-live-classes`}
                    type="number"
                    min="0"
                    max="7"
                    value={plan.features.liveClassesPerWeek}
                    onChange={(e) =>
                      handleFeatureChange(
                        plan.id,
                        "liveClassesPerWeek",
                        parseInt(e.target.value) || 0
                      )
                    }
                    data-testid={`input-${plan.name}-live-classes`}
                  />
                </div>

                <Button
                  onClick={() => handleSave(plan)}
                  disabled={updatePlanMutation.isPending}
                  className="w-full"
                  data-testid={`button-save-${plan.name}`}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updatePlanMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tarif Xususiyatlari Tavsifi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• <strong>Testlar</strong>: O'quvchilar testlar yecha oladi</p>
            <p>• <strong>Vazifalar</strong>: O'quvchilar vazifalar topshira oladi va o'qituvchi baholaydi</p>
            <p>• <strong>Sertifikat</strong>: Kurs tugagach sertifikat beriladi</p>
            <p>• <strong>Jonli darslar</strong>: Telegram orqali o'qituvchi bilan jonli dars</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
