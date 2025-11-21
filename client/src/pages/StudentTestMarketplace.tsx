import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mic, BookOpen, Lock, ShoppingCart, Upload, Loader2 } from 'lucide-react';

interface Test {
  id: string;
  title: string;
  description?: string;
  price: number;
  duration: number;
  totalScore: number;
  thumbnailUrl?: string;
}

interface SpeakingTest extends Test {
  passScore: number;
}

export default function StudentTestMarketplace() {
  const { toast } = useToast();
  const [selectedTest, setSelectedTest] = useState<{ id: string; type: 'standard' | 'speaking' } | null>(null);
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);

  const { data: standardTests = [], isLoading: standardLoading } = useQuery<Test[]>({
    queryKey: ['/api/public/tests'],
  });

  const { data: speakingTests = [], isLoading: speakingLoading } = useQuery<SpeakingTest[]>({
    queryKey: ['/api/public/speaking-tests'],
  });

  const purchaseMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await fetch('/api/student/test-purchase', {
        method: 'POST',
        body: data,
        credentials: 'include',
      }).then(r => r.json());
    },
    onSuccess: () => {
      toast({
        title: 'Muvaffaqiyatli!',
        description: 'Test sotib olish so\'rov yuborildi. Admin tasdiqlashini kuting.',
      });
      setIsPurchaseDialogOpen(false);
      setSelectedTest(null);
      setPaymentMethod('');
      setProofFile(null);
      queryClient.invalidateQueries({ queryKey: ['/api/student/test-enrollments'] });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Xatolik',
        description: error.message || 'Testni sotib olishda xatolik yuz berdi',
      });
    },
  });

  const handlePurchaseClick = (testId: string, testType: 'standard' | 'speaking') => {
    setSelectedTest({ id: testId, type: testType });
    setIsPurchaseDialogOpen(true);
  };

  const handlePurchaseSubmit = async () => {
    if (!selectedTest || !paymentMethod || !proofFile) {
      toast({
        variant: 'destructive',
        title: 'Xatolik',
        description: 'Barcha maydonlarni to\'ldiring',
      });
      return;
    }

    const formData = new FormData();
    formData.append(selectedTest.type === 'standard' ? 'testId' : 'speakingTestId', selectedTest.id);
    formData.append('testType', selectedTest.type);
    formData.append('paymentMethod', paymentMethod);
    formData.append('paymentProofUrl', proofFile);

    purchaseMutation.mutate(formData);
  };

  const isLoading = standardLoading || speakingLoading;
  const allTests = [...standardTests, ...speakingTests];
  const hasTests = allTests.length > 0;

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold" data-testid="heading-test-marketplace">Test Bozori</h1>
        <p className="text-muted-foreground mt-2">Sinash testlarini sotib oling va o'zingizni tekshiring</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-lg text-muted-foreground">Yuklanmoqda...</div>
        </div>
      ) : !hasTests ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Test topilmadi</h3>
            <p className="text-muted-foreground text-center">
              Hozircha sotib oladigan test yo'q. Keyinroq qayta tekshiring.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Standard Tests */}
          {standardTests.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-semibold">Standart Testlar</h2>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {standardTests.map((test) => (
                  <Card key={test.id} className="hover-elevate flex flex-col" data-testid={`card-standard-test-${test.id}`}>
                    {test.thumbnailUrl && (
                      <div className="w-full h-40 bg-gradient-to-br from-blue-500 to-blue-600 overflow-hidden">
                        <img
                          src={test.thumbnailUrl}
                          alt={test.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader className="flex-1">
                      <CardTitle className="text-lg">{test.title}</CardTitle>
                      {test.description && (
                        <CardDescription className="line-clamp-2">{test.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Vaqt:</span>
                        <span className="text-sm font-medium">{test.duration} min</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Ball:</span>
                        <span className="text-sm font-medium">{test.totalScore}</span>
                      </div>
                      <div className="pt-2 border-t">
                        <span className="text-2xl font-bold text-primary">{test.price.toLocaleString()} so'm</span>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        className="w-full"
                        onClick={() => handlePurchaseClick(test.id, 'standard')}
                        data-testid={`button-buy-standard-${test.id}`}
                      >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Sotib olish
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Speaking Tests */}
          {speakingTests.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Mic className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-semibold">Speaking Testlar</h2>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {speakingTests.map((test) => (
                  <Card key={test.id} className="hover-elevate flex flex-col" data-testid={`card-speaking-test-${test.id}`}>
                    {test.thumbnailUrl && (
                      <div className="w-full h-40 bg-gradient-to-br from-purple-500 to-pink-600 overflow-hidden">
                        <img
                          src={test.thumbnailUrl}
                          alt={test.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader className="flex-1">
                      <CardTitle className="text-lg">{test.title}</CardTitle>
                      {test.description && (
                        <CardDescription className="line-clamp-2">{test.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Vaqt:</span>
                        <span className="text-sm font-medium">{test.duration} min</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">O'tish bali:</span>
                        <span className="text-sm font-medium">{test.passScore}/{test.totalScore}</span>
                      </div>
                      <div className="pt-2 border-t">
                        <span className="text-2xl font-bold text-primary">{test.price.toLocaleString()} so'm</span>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        className="w-full"
                        onClick={() => handlePurchaseClick(test.id, 'speaking')}
                        data-testid={`button-buy-speaking-${test.id}`}
                      >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Sotib olish
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Purchase Dialog */}
      <Dialog open={isPurchaseDialogOpen} onOpenChange={setIsPurchaseDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-purchase-test">
          <DialogHeader>
            <DialogTitle>Test sotib olish</DialogTitle>
            <DialogDescription>
              To'lov usulini tanlang va chekni yuboqing
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="payment-method">To'lov usuli</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="payment-method" data-testid="select-payment-method">
                  <SelectValue placeholder="To'lov usulini tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="click">Click (O'zbekiston)</SelectItem>
                  <SelectItem value="payme">Payme (O'zbekiston)</SelectItem>
                  <SelectItem value="bank_transfer">Bank o'tkazmasi</SelectItem>
                  <SelectItem value="cash">Naqd pul</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="proof">To'lov cheki (rasm yoki PDF)</Label>
              <Input
                id="proof"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                data-testid="input-proof-file"
              />
              {proofFile && (
                <p className="text-sm text-muted-foreground mt-2">{proofFile.name}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPurchaseDialogOpen(false)}
              data-testid="button-cancel-purchase"
            >
              Bekor qilish
            </Button>
            <Button
              onClick={handlePurchaseSubmit}
              disabled={purchaseMutation.isPending}
              data-testid="button-submit-purchase"
            >
              {purchaseMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Yuklanmoqda...
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Sotib olish
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
