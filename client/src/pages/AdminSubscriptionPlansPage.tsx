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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Save, Plus, Edit, Trash2, X } from "lucide-react";
import { useLocation } from "wouter";

export default function AdminSubscriptionPlansPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [plans, setPlans] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [planForm, setPlanForm] = useState({
    name: "",
    displayName: "",
    description: "",
    hasTests: true,
    hasAssignments: false,
    hasCertificate: false,
    liveClassesPerWeek: 0,
    bonuses: [] as string[], // Array of bonus descriptions
  });
  const [newBonus, setNewBonus] = useState("");

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

  const createPlanMutation = useMutation({
    mutationFn: async () => {
      if (editingPlan) {
        // Update existing plan
        await apiRequest("PUT", `/api/admin/subscription-plans/${editingPlan.id}`, {
          name: planForm.name,
          displayName: planForm.displayName,
          description: planForm.description,
          features: {
            hasTests: planForm.hasTests,
            hasAssignments: planForm.hasAssignments,
            hasCertificate: planForm.hasCertificate,
            liveClassesPerWeek: planForm.liveClassesPerWeek,
            bonuses: planForm.bonuses,
          },
        });
      } else {
        // Create new plan
        await apiRequest("POST", "/api/admin/subscription-plans", {
          name: planForm.name,
          displayName: planForm.displayName,
          description: planForm.description,
          features: {
            hasTests: planForm.hasTests,
            hasAssignments: planForm.hasAssignments,
            hasCertificate: planForm.hasCertificate,
            liveClassesPerWeek: planForm.liveClassesPerWeek,
            bonuses: planForm.bonuses,
          },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      setIsDialogOpen(false);
      setPlanForm({
        name: "",
        displayName: "",
        description: "",
        hasTests: true,
        hasAssignments: false,
        hasCertificate: false,
        liveClassesPerWeek: 0,
        bonuses: [],
      });
      setNewBonus("");
      const wasEditing = editingPlan !== null;
      setEditingPlan(null);
      toast({
        title: "Muvaffaqiyatli",
        description: wasEditing ? "Tarif yangilandi" : "Yangi tarif yaratildi",
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

  const deletePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      await apiRequest("DELETE", `/api/admin/subscription-plans/${planId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-plans"] });
      toast({
        title: "O'chirildi",
        description: "Tarif o'chirildi",
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
          <div className="ml-auto">
            <Button
              onClick={() => setIsDialogOpen(true)}
              data-testid="button-add-plan"
            >
              <Plus className="w-4 h-4 mr-2" />
              Yangi Tarif
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6 space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} data-testid={`card-plan-${plan.name}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{getPlanDisplayName(plan.name)}</CardTitle>
                    <CardDescription>
                      Tarif xususiyatlarini sozlang
                    </CardDescription>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setEditingPlan(plan);
                      setPlanForm({
                        name: plan.name,
                        displayName: plan.displayName,
                        description: plan.description || "",
                        hasTests: plan.features.hasTests,
                        hasAssignments: plan.features.hasAssignments,
                        hasCertificate: plan.features.hasCertificate,
                        liveClassesPerWeek: plan.features.liveClassesPerWeek,
                        bonuses: plan.features.bonuses || [],
                      });
                      setIsDialogOpen(true);
                    }}
                    data-testid={`button-edit-${plan.name}`}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
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

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleSave(plan)}
                    disabled={updatePlanMutation.isPending}
                    className="flex-1"
                    data-testid={`button-save-${plan.name}`}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updatePlanMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (confirm("Bu tarifni o'chirishni xohlaysizmi?")) {
                        deletePlanMutation.mutate(plan.id);
                      }
                    }}
                    disabled={deletePlanMutation.isPending}
                    data-testid={`button-delete-${plan.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
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

      {/* Add/Edit Plan Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent data-testid="dialog-plan">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? "Tarifni Tahrirlash" : "Yangi Tarif Yaratish"}
            </DialogTitle>
            <DialogDescription>
              Tarif ma'lumotlari va xususiyatlarini kiriting
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plan-name">Tarif Nomi (Inglizcha)</Label>
              <Input
                id="plan-name"
                value={planForm.name}
                onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                placeholder="oddiy, standard, premium"
                data-testid="input-plan-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-display-name">Ko'rsatiladigan Nom (O'zbekcha)</Label>
              <Input
                id="plan-display-name"
                value={planForm.displayName}
                onChange={(e) => setPlanForm({ ...planForm, displayName: e.target.value })}
                placeholder="Oddiy, Standard, Premium"
                data-testid="input-plan-display-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-description">Tavsif</Label>
              <Input
                id="plan-description"
                value={planForm.description}
                onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                placeholder="Tarif tavsifi"
                data-testid="input-plan-description"
              />
            </div>

            <div className="space-y-3 border p-4 rounded-md">
              <h4 className="font-semibold text-sm">Xususiyatlar</h4>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="form-tests">Testlar</Label>
                <Switch
                  id="form-tests"
                  checked={planForm.hasTests}
                  onCheckedChange={(checked) => setPlanForm({ ...planForm, hasTests: checked })}
                  data-testid="switch-form-tests"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="form-assignments">Vazifalar</Label>
                <Switch
                  id="form-assignments"
                  checked={planForm.hasAssignments}
                  onCheckedChange={(checked) => setPlanForm({ ...planForm, hasAssignments: checked })}
                  data-testid="switch-form-assignments"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="form-certificate">Sertifikat</Label>
                <Switch
                  id="form-certificate"
                  checked={planForm.hasCertificate}
                  onCheckedChange={(checked) => setPlanForm({ ...planForm, hasCertificate: checked })}
                  data-testid="switch-form-certificate"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="form-live-classes">Haftada jonli darslar</Label>
                <Input
                  id="form-live-classes"
                  type="number"
                  min="0"
                  max="7"
                  value={planForm.liveClassesPerWeek}
                  onChange={(e) => setPlanForm({ ...planForm, liveClassesPerWeek: parseInt(e.target.value) || 0 })}
                  data-testid="input-form-live-classes"
                />
              </div>
            </div>

            <div className="space-y-3 border p-4 rounded-md">
              <h4 className="font-semibold text-sm">Bonuslar</h4>
              
              <div className="space-y-2">
                {planForm.bonuses.map((bonus, index) => (
                  <div key={index} className="flex items-center gap-2" data-testid={`bonus-item-${index}`}>
                    <div className="flex-1 text-sm bg-muted p-2 rounded-md">
                      {bonus}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        const newBonuses = planForm.bonuses.filter((_, i) => i !== index);
                        setPlanForm({ ...planForm, bonuses: newBonuses });
                      }}
                      data-testid={`button-remove-bonus-${index}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  value={newBonus}
                  onChange={(e) => setNewBonus(e.target.value)}
                  placeholder="Yangi bonus kiriting"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newBonus.trim()) {
                      setPlanForm({ ...planForm, bonuses: [...planForm.bonuses, newBonus.trim()] });
                      setNewBonus("");
                    }
                  }}
                  data-testid="input-new-bonus"
                />
                <Button
                  onClick={() => {
                    if (newBonus.trim()) {
                      setPlanForm({ ...planForm, bonuses: [...planForm.bonuses, newBonus.trim()] });
                      setNewBonus("");
                    }
                  }}
                  disabled={!newBonus.trim()}
                  data-testid="button-add-bonus"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setEditingPlan(null);
                setPlanForm({
                  name: "",
                  displayName: "",
                  description: "",
                  hasTests: true,
                  hasAssignments: false,
                  hasCertificate: false,
                  liveClassesPerWeek: 0,
                  bonuses: [],
                });
                setNewBonus("");
              }}
              data-testid="button-cancel-plan"
            >
              Bekor qilish
            </Button>
            <Button
              onClick={() => createPlanMutation.mutate()}
              disabled={!planForm.name || !planForm.displayName || createPlanMutation.isPending}
              data-testid="button-save-plan"
            >
              {createPlanMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
