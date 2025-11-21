import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, FileText, Download, Eye, Loader2 } from 'lucide-react';

interface TestEnrollment {
  id: string;
  userId: string;
  testId?: string;
  speakingTestId?: string;
  testType: 'standard' | 'speaking';
  paymentMethod: string;
  paymentProofUrl?: string;
  paymentStatus: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  testTitle?: string;
  userName?: string;
}

export default function AdminTestPayments() {
  const { toast } = useToast();
  const [selectedEnrollment, setSelectedEnrollment] = useState<TestEnrollment | null>(null);
  const [isProofDialogOpen, setIsProofDialogOpen] = useState(false);
  const [approveOrReject, setApproveOrReject] = useState<'approve' | 'reject' | null>(null);

  const { data: payments = [], isLoading } = useQuery<TestEnrollment[]>({
    queryKey: ['/api/admin/test-payments/pending'],
  });

  const approvalMutation = useMutation({
    mutationFn: async ({ enrollmentId, status }: { enrollmentId: string; status: string }) => {
      return await apiRequest(`/api/admin/test-enrollments/${enrollmentId}/status`, 'PATCH', { status });
    },
    onSuccess: (_, { status }) => {
      toast({
        title: 'Muvaffaqiyatli!',
        description: status === 'approved' ? 'Test tasdiqlandi' : 'Test rad etildi',
      });
      setSelectedEnrollment(null);
      setApproveOrReject(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/test-payments/pending'] });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Xatolik',
        description: error.message,
      });
    },
  });

  const handleApprove = (enrollment: TestEnrollment) => {
    setSelectedEnrollment(enrollment);
    setApproveOrReject('approve');
  };

  const handleReject = (enrollment: TestEnrollment) => {
    setSelectedEnrollment(enrollment);
    setApproveOrReject('reject');
  };

  const confirmAction = () => {
    if (!selectedEnrollment || !approveOrReject) return;
    
    approvalMutation.mutate({
      enrollmentId: selectedEnrollment.id,
      status: approveOrReject,
    });
  };

  const pendingPayments = payments.filter(p => p.paymentStatus === 'pending');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-muted-foreground">Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="heading-test-payments">Test To'lovlari</h1>
        <p className="text-muted-foreground mt-2">
          Talabalarning test sotib olish so'rovlarini tekshiring va tasdiqlang
        </p>
      </div>

      {pendingPayments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Kutilayotgan so'rov yo'q</h3>
            <p className="text-muted-foreground text-center">
              Barcha test sotib olish so'rovlari ko'rib chiqqildi
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingPayments.map((payment) => (
            <Card key={payment.id} className="hover-elevate" data-testid={`card-payment-${payment.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{payment.testTitle || 'Test'}</CardTitle>
                    <CardDescription className="mt-1">
                      Talaba: <span className="font-medium">{payment.userName || payment.userId}</span>
                    </CardDescription>
                  </div>
                  <Badge variant="outline" data-testid={`badge-status-${payment.id}`}>
                    Kutilmoqda
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Test turi:</span>
                    <p className="font-medium">
                      {payment.testType === 'standard' ? 'Standart' : 'Speaking'}
                    </p>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">To'lov usuli:</span>
                    <p className="font-medium capitalize">{payment.paymentMethod}</p>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Sana:</span>
                    <p className="font-medium">{new Date(payment.createdAt).toLocaleDateString('uz-UZ')}</p>
                  </div>
                </div>

                {payment.paymentProofUrl && (
                  <div className="pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedEnrollment(payment);
                        setIsProofDialogOpen(true);
                      }}
                      data-testid={`button-view-proof-${payment.id}`}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Chekni ko'rish
                    </Button>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleReject(payment)}
                  disabled={approvalMutation.isPending}
                  data-testid={`button-reject-${payment.id}`}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Rad etish
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleApprove(payment)}
                  disabled={approvalMutation.isPending}
                  data-testid={`button-approve-${payment.id}`}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Tasdiqlash
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Proof Dialog */}
      <Dialog open={isProofDialogOpen} onOpenChange={setIsProofDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-view-proof">
          <DialogHeader>
            <DialogTitle>To'lov cheki</DialogTitle>
          </DialogHeader>

          {selectedEnrollment?.paymentProofUrl && (
            <div className="space-y-4">
              <img
                src={selectedEnrollment.paymentProofUrl}
                alt="To'lov cheki"
                className="w-full max-h-96 object-contain rounded-md border"
              />
              <div className="flex gap-2">
                <a
                  href={selectedEnrollment.paymentProofUrl}
                  download
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Yuklab olish
                  </Button>
                </a>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsProofDialogOpen(false)}>Yopish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={!!approveOrReject} onOpenChange={() => setApproveOrReject(null)}>
        <DialogContent data-testid="dialog-confirm-action">
          <DialogHeader>
            <DialogTitle>
              {approveOrReject === 'approve' ? 'Tasdiqlashni tasdiqlang' : 'Rad etishni tasdiqlang'}
            </DialogTitle>
            <DialogDescription>
              Bu amalni qaytarib bo'lmaydi. Davom etish kerakmi?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveOrReject(null)}
              data-testid="button-cancel-action"
            >
              Bekor qilish
            </Button>
            <Button
              onClick={confirmAction}
              disabled={approvalMutation.isPending}
              variant={approveOrReject === 'reject' ? 'destructive' : 'default'}
              data-testid="button-confirm-action"
            >
              {approvalMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Yuklanmoqda...
                </>
              ) : approveOrReject === 'approve' ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Tasdiqlash
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Rad etish
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
