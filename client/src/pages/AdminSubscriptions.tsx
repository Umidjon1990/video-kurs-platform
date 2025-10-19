import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, AlertCircle, ArrowLeft, MessageCircle, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { format, differenceInDays } from "date-fns";
import { uz } from "date-fns/locale";

export default function AdminSubscriptions() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);
  const [additionalDays, setAdditionalDays] = useState("");

  const { data: allSubscriptions, isLoading: allLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/subscriptions"],
  });

  const { data: expiringSubscriptions, isLoading: expiringLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/subscriptions/expiring"],
  });

  const extendMutation = useMutation({
    mutationFn: async ({ id, days }: { id: string; days: number }) => {
      await apiRequest("PUT", `/api/admin/subscriptions/${id}/extend`, {
        additionalDays: days,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscriptions/expiring"] });
      toast({
        title: "Muvaffaqiyatli",
        description: "Obuna muddati uzaytirildi",
      });
      setExtendDialogOpen(false);
      setAdditionalDays("");
      setSelectedSubscription(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Xatolik",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/subscriptions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscriptions/expiring"] });
      toast({
        title: "Muvaffaqiyatli",
        description: "Obuna bekor qilindi",
      });
      setDeleteDialogOpen(false);
      setSelectedSubscription(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Xatolik",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleExtendClick = (subscription: any) => {
    setSelectedSubscription(subscription);
    setExtendDialogOpen(true);
  };

  const handleDeleteClick = (subscription: any) => {
    setSelectedSubscription(subscription);
    setDeleteDialogOpen(true);
  };

  const handleMessageClick = (userId: string) => {
    setLocation(`/chat?userId=${userId}`);
  };

  const handleExtendSubmit = () => {
    const days = parseInt(additionalDays);
    if (!days || days < 1) {
      toast({
        title: "Xatolik",
        description: "Iltimos, 1 dan katta kun kiriting",
        variant: "destructive",
      });
      return;
    }

    extendMutation.mutate({
      id: selectedSubscription.subscription.id,
      days,
    });
  };

  const handleDeleteConfirm = () => {
    if (selectedSubscription) {
      deleteMutation.mutate(selectedSubscription.subscription.id);
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    return differenceInDays(end, now);
  };

  const isExpired = (endDate: string) => {
    return new Date(endDate) < new Date();
  };

  const handleReactivate = (subscription: any) => {
    // 30 kun (1 oy) qo'shamiz
    extendMutation.mutate({
      id: subscription.subscription.id,
      days: 30,
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      active: { label: "Faol", variant: "default" },
      expired: { label: "Muddati tugagan", variant: "destructive" },
      cancelled: { label: "Bekor qilingan", variant: "outline" },
    };

    const config = statusMap[status] || { label: status, variant: "secondary" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (allLoading || expiringLoading) {
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
            onClick={() => setLocation("/admin")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold" data-testid="text-subscriptions-title">
            Obunalar Boshqaruvi
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

      <div className="p-8 space-y-8">
        {/* Muddati tugayotganlar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              Muddati Tugayotgan Obunalar (7 kun ichida)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!expiringSubscriptions || expiringSubscriptions.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Muddati tugayotgan obunalar yo'q
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Talaba</TableHead>
                    <TableHead>Kurs</TableHead>
                    <TableHead>Tarif</TableHead>
                    <TableHead>Tugash sanasi</TableHead>
                    <TableHead>Qolgan kunlar</TableHead>
                    <TableHead>Holat</TableHead>
                    <TableHead>Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expiringSubscriptions.map((item: any) => {
                    const daysRemaining = getDaysRemaining(item.subscription.endDate);
                    return (
                      <TableRow key={item.subscription.id} data-testid={`row-expiring-${item.subscription.id}`}>
                        <TableCell>
                          {item.user.firstName} {item.user.lastName}
                          <div className="text-sm text-muted-foreground">{item.user.email}</div>
                        </TableCell>
                        <TableCell>{item.course.title}</TableCell>
                        <TableCell>{item.plan.displayName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {format(new Date(item.subscription.endDate), "dd MMM yyyy", { locale: uz })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={daysRemaining <= 3 ? "destructive" : "secondary"}>
                            {daysRemaining} kun
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(item.subscription.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMessageClick(item.user.id)}
                              data-testid={`button-message-${item.subscription.id}`}
                            >
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleExtendClick(item)}
                              data-testid={`button-extend-${item.subscription.id}`}
                            >
                              <Clock className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteClick(item)}
                              data-testid={`button-delete-${item.subscription.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Barcha faol obunalar */}
        <Card>
          <CardHeader>
            <CardTitle>Barcha Faol Obunalar</CardTitle>
          </CardHeader>
          <CardContent>
            {!allSubscriptions || allSubscriptions.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Faol obunalar yo'q
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Talaba</TableHead>
                    <TableHead>Kurs</TableHead>
                    <TableHead>Tarif</TableHead>
                    <TableHead>Boshlanish sanasi</TableHead>
                    <TableHead>Tugash sanasi</TableHead>
                    <TableHead>Holat</TableHead>
                    <TableHead>Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allSubscriptions.map((item: any) => {
                    const expired = isExpired(item.subscription.endDate);
                    return (
                      <TableRow 
                        key={item.subscription.id} 
                        data-testid={`row-subscription-${item.subscription.id}`}
                        className={expired ? "bg-destructive/10" : ""}
                      >
                        <TableCell>
                          {item.user.firstName} {item.user.lastName}
                          <div className="text-sm text-muted-foreground">{item.user.email}</div>
                        </TableCell>
                        <TableCell>{item.course.title}</TableCell>
                        <TableCell>{item.plan.displayName}</TableCell>
                        <TableCell>
                          {format(new Date(item.subscription.startDate), "dd MMM yyyy", { locale: uz })}
                        </TableCell>
                        <TableCell>
                          <span className={expired ? "text-destructive font-medium" : ""}>
                            {format(new Date(item.subscription.endDate), "dd MMM yyyy", { locale: uz })}
                          </span>
                        </TableCell>
                        <TableCell>{getStatusBadge(item.subscription.status)}</TableCell>
                        <TableCell>
                          {expired ? (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleReactivate(item)}
                              data-testid={`button-reactivate-all-${item.subscription.id}`}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              Qayta faollashtirish (1 oy)
                            </Button>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMessageClick(item.user.id)}
                                data-testid={`button-message-all-${item.subscription.id}`}
                              >
                                <MessageCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleExtendClick(item)}
                                data-testid={`button-extend-all-${item.subscription.id}`}
                              >
                                <Clock className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteClick(item)}
                                data-testid={`button-delete-all-${item.subscription.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Extend Dialog */}
      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Obuna Muddatini Uzaytirish</DialogTitle>
            <DialogDescription>
              {selectedSubscription && (
                <>
                  <div className="mt-4 space-y-2">
                    <p>
                      <strong>Talaba:</strong> {selectedSubscription.user.firstName}{" "}
                      {selectedSubscription.user.lastName}
                    </p>
                    <p>
                      <strong>Kurs:</strong> {selectedSubscription.course.title}
                    </p>
                    <p>
                      <strong>Tarif:</strong> {selectedSubscription.plan.displayName}
                    </p>
                    <p>
                      <strong>Hozirgi tugash sanasi:</strong>{" "}
                      {format(new Date(selectedSubscription.subscription.endDate), "dd MMM yyyy, HH:mm", { locale: uz })}
                    </p>
                  </div>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="additional-days">Qo'shimcha kunlar soni</Label>
              <Input
                id="additional-days"
                type="number"
                min="1"
                value={additionalDays}
                onChange={(e) => setAdditionalDays(e.target.value)}
                placeholder="Masalan: 30"
                data-testid="input-additional-days"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Obuna muddati ko'rsatilgan kun soniga uzaytiriladi
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setExtendDialogOpen(false);
                setAdditionalDays("");
                setSelectedSubscription(null);
              }}
              data-testid="button-cancel-extend"
            >
              Bekor qilish
            </Button>
            <Button
              onClick={handleExtendSubmit}
              disabled={extendMutation.isPending}
              data-testid="button-confirm-extend"
            >
              {extendMutation.isPending ? "Saqlanmoqda..." : "Uzaytirish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Obunani bekor qilishni tasdiqlang</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedSubscription && (
                <div className="mt-4 space-y-2">
                  <p>
                    Siz <strong>{selectedSubscription.user.firstName} {selectedSubscription.user.lastName}</strong> 
                    ning <strong>{selectedSubscription.course.title}</strong> kursidagi obunasini bekor qilmoqchisiz.
                  </p>
                  <p className="text-destructive font-medium mt-4">
                    Bu amalni ortga qaytarib bo'lmaydi. Talaba kursga kirishni yo'qotadi.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Bekor qilish
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "O'chirilmoqda..." : "Ha, o'chirish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
