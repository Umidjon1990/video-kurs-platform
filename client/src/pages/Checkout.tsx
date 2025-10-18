import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Upload, CheckCircle } from "lucide-react";
import type { Course } from "@shared/schema";

export default function Checkout() {
  const { courseId } = useParams<{ courseId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [paymentMethod, setPaymentMethod] = useState<"karta" | "payme">("karta");
  const randomCardNumber = "8600 1234 5678 9012"; // Random karta raqam
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState<string>("");
  const [enrollmentSuccess, setEnrollmentSuccess] = useState(false);

  const { data: course } = useQuery<Course>({
    queryKey: ["/api/courses", courseId],
    enabled: !!courseId,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!receiptFile) {
        throw new Error("Iltimos to'lov cheki rasmini yuklang");
      }

      setIsUploading(true);

      // Upload receipt to object storage
      const formData = new FormData();
      formData.append("file", receiptFile);
      
      const uploadRes = await fetch("/api/upload-receipt", {
        method: "POST",
        body: formData,
        credentials: "include", // Include session cookie
      });

      if (!uploadRes.ok) {
        throw new Error("Rasm yuklashda xatolik");
      }

      const { url } = await uploadRes.json();

      // Create enrollment with pending status
      await apiRequest("POST", "/api/student/enroll", {
        courseId,
        paymentMethod,
        paymentProofUrl: url,
      });

      setIsUploading(false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/enrolled-courses"] });
      setEnrollmentSuccess(true);
      toast({
        title: "Muvaffaqiyatli!",
        description: "To'lovingiz admin tomonidan ko'rib chiqiladi",
      });
    },
    onError: (error: Error) => {
      setIsUploading(false);
      toast({
        title: "Xatolik",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (enrollmentSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold">To'lov Yuborildi!</h2>
            <p className="text-muted-foreground">
              To'lovingiz admin tomonidan tekshiriladi. Tasdiqlangandan so'ng kursga kirish huquqingiz ochiladi.
            </p>
            <Button onClick={() => setLocation("/")} className="w-full">
              Bosh Sahifaga Qaytish
            </Button>
          </CardContent>
        </Card>
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
                    {course.price} so'm
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
            <CardContent className="space-y-6">
              {/* Payment Method Selection */}
              <div className="space-y-3">
                <Label>To'lov Turi</Label>
                <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="karta" id="karta" data-testid="radio-karta" />
                    <Label htmlFor="karta" className="cursor-pointer">Karta orqali</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="payme" id="payme" data-testid="radio-payme" />
                    <Label htmlFor="payme" className="cursor-pointer">Payme</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Payment Details */}
              {paymentMethod === "karta" && (
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Karta Raqami</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={randomCardNumber}
                        readOnly
                        className="font-mono text-lg"
                        data-testid="input-card-number"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(randomCardNumber.replace(/\s/g, ''));
                          toast({
                            title: "Nusxalandi!",
                            description: "Karta raqam nusxalandi",
                          });
                        }}
                        data-testid="button-copy-card"
                      >
                        Nusxalash
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ushbu karta raqamiga to'lovni amalga oshiring va chek rasmini yuklang
                    </p>
                  </div>
                </div>
              )}

              {paymentMethod === "payme" && (
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Payme Orqali To'lash</Label>
                      <p className="text-sm text-muted-foreground">
                        Payme orqali to'lov qilish uchun quyidagi havola orqali ro'yxatdan o'ting yoki hisobingizga kiring:
                      </p>
                      <a
                        href="https://merchant.payme.uz/auth/sign-up"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                        data-testid="link-payme"
                      >
                        merchant.payme.uz/auth/sign-up
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payme-amount" className="text-sm font-medium">
                        To'lov Summasi
                      </Label>
                      <Input
                        id="payme-amount"
                        value={`${course.price} so'm`}
                        readOnly
                        className="font-semibold"
                        data-testid="input-payme-amount"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      To'lovni amalga oshirgandan so'ng chek rasmini yuklang
                    </p>
                  </div>
                </div>
              )}

              {/* Receipt Upload */}
              <div className="space-y-3">
                <Label htmlFor="receipt">To'lov Cheki (Rasm)</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover-elevate active-elevate-2 cursor-pointer"
                     onClick={() => document.getElementById('receipt')?.click()}>
                  {receiptPreview ? (
                    <img src={receiptPreview} alt="Receipt" className="max-h-48 mx-auto rounded" />
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        To'lov cheki rasmini yuklash uchun bosing
                      </p>
                    </div>
                  )}
                </div>
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                  data-testid="input-receipt"
                />
                {receiptFile && (
                  <p className="text-sm text-muted-foreground">
                    Tanlangan: {receiptFile.name}
                  </p>
                )}
              </div>

              {/* Instructions */}
              <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
                <p className="font-medium mb-2">Yo'riqnoma:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>To'lovni amalga oshiring</li>
                  <li>To'lov cheki rasmini yuklang</li>
                  <li>"Yuborish" tugmasini bosing</li>
                  <li>Admin to'lovni tasdiqlagandan keyin kursga kirish ochiladi</li>
                </ol>
              </div>

              <Button
                onClick={() => enrollMutation.mutate()}
                className="w-full"
                disabled={!receiptFile || enrollMutation.isPending || isUploading}
                data-testid="button-submit-payment"
              >
                {isUploading ? "Yuklanmoqda..." : enrollMutation.isPending ? "Yuborilmoqda..." : "Yuborish"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
