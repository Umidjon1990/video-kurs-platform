import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, UserPlus, CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function CuratorRegister() {
  const [, params] = useRoute("/curator/register/:token");
  const token = params?.token || "";
  const { toast } = useToast();
  const [registered, setRegistered] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const { data: inviteData, isLoading, error } = useQuery<{ valid: boolean; groupName: string }>({
    queryKey: ["/api/curator/invite", token],
    queryFn: async () => {
      const res = await fetch(`/api/curator/invite/${token}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Xatolik");
      }
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/curator/register/${token}`, {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        password: form.password,
      });
      return res.json();
    },
    onSuccess: () => {
      setRegistered(true);
      toast({ title: "Muvaffaqiyatli ro'yxatdan o'tdingiz!" });
    },
    onError: (err: any) => {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast({ title: "Parollar mos kelmadi", variant: "destructive" });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: "Parol kamida 6 ta belgi bo'lishi kerak", variant: "destructive" });
      return;
    }
    registerMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d0521" }}>
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (error || !inviteData?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#0d0521" }}>
        <Card className="w-full max-w-md" style={{ background: "rgba(13,5,33,0.95)", border: "1px solid rgba(124,58,237,0.3)" }}>
          <CardContent className="flex flex-col items-center py-12 gap-4">
            <XCircle className="w-16 h-16 text-red-400" />
            <p className="text-white text-lg font-semibold text-center">
              {(error as any)?.message || "Havola yaroqsiz yoki muddati tugagan"}
            </p>
            <a href="/login" className="text-purple-400 hover:text-purple-300 text-sm">
              Tizimga kirish
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#0d0521" }}>
        <Card className="w-full max-w-md" style={{ background: "rgba(13,5,33,0.95)", border: "1px solid rgba(52,211,153,0.3)" }}>
          <CardContent className="flex flex-col items-center py-12 gap-4">
            <CheckCircle className="w-16 h-16 text-emerald-400" />
            <p className="text-white text-lg font-semibold text-center">
              Muvaffaqiyatli ro'yxatdan o'tdingiz!
            </p>
            <p className="text-white/60 text-sm text-center">
              Endi tizimga telefon raqamingiz va parolingiz bilan kirishingiz mumkin.
            </p>
            <a href="/login">
              <Button data-testid="button-go-login">Tizimga kirish</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#0d0521" }}>
      <Card className="w-full max-w-md" style={{ background: "rgba(13,5,33,0.95)", border: "1px solid rgba(124,58,237,0.3)" }}>
        <CardHeader className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: "linear-gradient(135deg,#7c3aed,#2563eb)", boxShadow: "0 0 20px rgba(124,58,237,0.5)" }}>
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <CardTitle className="text-white text-xl">Kurator ro'yxatdan o'tish</CardTitle>
          <p className="text-white/60 text-sm mt-1">
            <span className="text-purple-400 font-medium">"{inviteData.groupName}"</span> guruhiga kurator sifatida qo'shilish
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-white/70 text-xs">Ism *</Label>
                <Input
                  data-testid="input-first-name"
                  value={form.firstName}
                  onChange={e => setForm({ ...form, firstName: e.target.value })}
                  required
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/70 text-xs">Familiya</Label>
                <Input
                  data-testid="input-last-name"
                  value={form.lastName}
                  onChange={e => setForm({ ...form, lastName: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Telefon raqam *</Label>
              <Input
                data-testid="input-phone"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="+998901234567"
                required
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Parol *</Label>
              <Input
                data-testid="input-password"
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Parolni tasdiqlang *</Label>
              <Input
                data-testid="input-confirm-password"
                type="password"
                value={form.confirmPassword}
                onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                required
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={registerMutation.isPending}
              data-testid="button-register-curator"
            >
              {registerMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              Ro'yxatdan o'tish
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
