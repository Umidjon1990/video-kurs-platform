import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const registerSchema = z.object({
  phone: z.string().optional(),
  email: z.string().email("Email noto'g'ri formatda").optional().or(z.literal("")),
  password: z.string().min(6, "Parol kamida 6 belgidan iborat bo'lishi kerak"),
  confirmPassword: z.string().min(1, "Parolni tasdiqlang"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
}).refine(
  (data) => data.phone || data.email,
  { 
    message: "Telefon yoki email kiritish shart",
    path: ["phone"]
  }
).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Parollar mos kelmadi",
    path: ["confirmPassword"]
  }
);

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
    },
  });

  const handleRegister = async (data: RegisterFormData) => {
    try {
      await apiRequest("POST", "/api/auth/register", {
        phone: data.phone || null,
        email: data.email || null,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      });

      toast({
        title: "Muvaffaqiyatli!",
        description: "Ro'yxatdan o'tish amalga oshdi. Endi kirish mumkin.",
      });

      setLocation("/login");
    } catch (error: any) {
      toast({
        title: "Xato",
        description: error.message || "Ro'yxatdan o'tishda xatolik",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md" data-testid="card-register">
        <CardHeader>
          <CardTitle className="text-2xl">Ro'yxatdan O'tish</CardTitle>
          <CardDescription>
            Video kurslar platformasiga xush kelibsiz
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleRegister)}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ism</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Ism"
                          data-testid="input-firstname"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Familiya</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Familiya"
                          data-testid="input-lastname"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon Raqam</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="+998901234567"
                        data-testid="input-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (ixtiyoriy)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="example@email.com"
                        data-testid="input-email"
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
                    <FormLabel>Parol</FormLabel>
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
              
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parolni Tasdiqlang</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="••••••"
                        data-testid="input-confirm-password"
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
                data-testid="button-register"
              >
                {form.formState.isSubmitting ? "Yuklanmoqda..." : "Ro'yxatdan O'tish"}
              </Button>
              
              <div className="text-sm text-center text-muted-foreground">
                Allaqachon hisobingiz bormi?{" "}
                <button
                  type="button"
                  onClick={() => setLocation("/login")}
                  className="text-primary hover:underline"
                  data-testid="link-login"
                >
                  Kirish
                </button>
              </div>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
