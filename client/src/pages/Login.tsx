import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { ArrowLeft, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const loginSchema = z.object({
  username: z.string().min(1, "Telefon yoki email kiriting"),
  password: z.string().min(1, "Parol kiriting"),
});

const forgotPasswordSchema = z.object({
  contactInfo: z.string().min(1, "Telefon yoki email kiriting"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      contactInfo: "",
    },
  });

  const handleLogin = async (data: LoginFormData) => {
    try {
      const response: any = await apiRequest("POST", "/api/auth/login", {
        username: data.username,
        password: data.password,
      });

      // Set user data in query cache
      queryClient.setQueryData(["/api/auth/user"], response.user);

      toast({
        title: "Xush kelibsiz!",
        description: "Tizimga muvaffaqiyatli kirdingiz",
      });

      // Redirect to home - router will handle role-based routing
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Xato",
        description: error.message || "Login qilishda xatolik",
        variant: "destructive",
      });
    }
  };

  const handleReplitAuth = () => {
    window.location.href = "/api/login"; // Replit Auth
  };

  const handleForgotPassword = async (data: ForgotPasswordFormData) => {
    try {
      await apiRequest("POST", "/api/auth/forgot-password", {
        contactInfo: data.contactInfo,
      });

      toast({
        title: "So'rov yuborildi",
        description: "Agar bu ma'lumot tizimda mavjud bo'lsa, administrator sizga tez orada aloqaga chiqadi.",
      });

      setIsForgotPasswordOpen(false);
      forgotPasswordForm.reset();
    } catch (error: any) {
      toast({
        title: "Xato",
        description: error.message || "Xatolik yuz berdi",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Back to Home Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation("/")}
          className="flex items-center gap-2"
          data-testid="button-back-home"
        >
          <ArrowLeft className="w-4 h-4" />
          Asosiy sahifaga qaytish
        </Button>

        <Card className="w-full" data-testid="card-login">
          <CardHeader>
            <CardTitle className="text-2xl">Kirish</CardTitle>
            <CardDescription>
              Video kurslar platformasiga kirish
            </CardDescription>
          </CardHeader>
          
          {/* Info Alert */}
          <div className="px-6 pb-4">
            <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
                Administrator tomonidan berilgan login va parolingizni kiriting va shaxsiy kabinetingizga kiring.
              </AlertDescription>
            </Alert>
          </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleLogin)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon yoki Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="+998901234567 yoki email@example.com"
                        data-testid="input-username"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Parol</FormLabel>
                      <button
                        type="button"
                        onClick={() => setIsForgotPasswordOpen(true)}
                        className="text-sm text-primary hover:underline"
                        data-testid="link-forgot-password"
                      >
                        Parolni unutdim?
                      </button>
                    </div>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="••••••"
                        data-testid="input-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting}
                data-testid="button-login"
              >
                {form.formState.isSubmitting ? "Yuklanmoqda..." : "Kirish"}
              </Button>
              
              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    yoki
                  </span>
                </div>
              </div>
              
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleReplitAuth}
                data-testid="button-replit-auth"
              >
                Replit orqali kirish
              </Button>
              
              <div className="text-sm text-center text-muted-foreground">
                Hisobingiz yo'qmi?{" "}
                <button
                  type="button"
                  onClick={() => setLocation("/register")}
                  className="text-primary hover:underline"
                  data-testid="link-register"
                >
                  Ro'yxatdan o'tish
                </button>
              </div>
            </CardFooter>
          </form>
        </Form>
        </Card>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
        <DialogContent data-testid="dialog-forgot-password">
          <DialogHeader>
            <DialogTitle>Parolni tiklash</DialogTitle>
            <DialogDescription>
              Telefon yoki email kiriting. Administrator sizga tez orada aloqaga chiqadi va yangi parol o'rnatadi.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...forgotPasswordForm}>
            <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPassword)} className="space-y-4">
              <FormField
                control={forgotPasswordForm.control}
                name="contactInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon yoki Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="+998901234567 yoki email@example.com"
                        data-testid="input-forgot-password-contact"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsForgotPasswordOpen(false);
                    forgotPasswordForm.reset();
                  }}
                  data-testid="button-cancel-forgot-password"
                >
                  Bekor qilish
                </Button>
                <Button
                  type="submit"
                  disabled={forgotPasswordForm.formState.isSubmitting}
                  data-testid="button-submit-forgot-password"
                >
                  {forgotPasswordForm.formState.isSubmitting ? "Yuborilmoqda..." : "Yuborish"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
