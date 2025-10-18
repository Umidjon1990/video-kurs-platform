import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1, "Telefon yoki email kiriting"),
  password: z.string().min(1, "Parol kiriting"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md" data-testid="card-login">
        <CardHeader>
          <CardTitle className="text-2xl">Kirish</CardTitle>
          <CardDescription>
            Video kurslar platformasiga kirish
          </CardDescription>
        </CardHeader>
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
  );
}
