import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/StatsCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, CreditCard, DollarSign, UserCheck, TrendingUp, Settings, UserPlus, Check, X, Copy, CheckCircle, Key, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import type { User } from "@shared/schema";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AdminDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [isCreateStudentOpen, setIsCreateStudentOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({
    phone: "",
    email: "",
    firstName: "",
    lastName: "",
    courseId: "",
    subscriptionDays: "30",
  });
  const [createdCredentials, setCreatedCredentials] = useState<{
    login: string;
    password: string;
  } | null>(null);
  const [userResetPasswordDialog, setUserResetPasswordDialog] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
  } | null>(null);
  const [userNewPassword, setUserNewPassword] = useState("");
  const [userResetPasswordResult, setUserResetPasswordResult] = useState<string | null>(null);

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

  const { data: stats } = useQuery<{
    instructorCount: number;
    courseCount: number;
    studentCount: number;
    totalRevenue: number;
    totalEnrollments: number;
    enrollmentGrowth: number;
    recentEnrollments: number;
  }>({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated,
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated,
  });

  const { data: pendingStudents } = useQuery<User[]>({
    queryKey: ["/api/admin/pending-students"],
    enabled: isAuthenticated,
  });

  const { data: courses } = useQuery<Array<{ id: string; title: string; }>>({
    queryKey: ["/api/courses"],
    enabled: isAuthenticated,
  });

  const { data: trends, isLoading: trendsLoading } = useQuery<Array<{
    date: string;
    enrollments: number;
    revenue: number;
  }>>({
    queryKey: ["/api/admin/trends"],
    enabled: isAuthenticated,
  });

  const { data: passwordResetRequests } = useQuery<Array<{
    id: string;
    contactInfo: string;
    status: string;
    createdAt: string;
    userId: string | null;
    user: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
      phone: string | null;
      role: string;
    } | null;
  }>>({
    queryKey: ["/api/admin/password-reset-requests"],
    enabled: isAuthenticated,
  });

  const [resetPasswordDialog, setResetPasswordDialog] = useState<{
    isOpen: boolean;
    requestId: string | null;
    contactInfo: string;
  }>({
    isOpen: false,
    requestId: null,
    contactInfo: "",
  });
  const [newPassword, setNewPassword] = useState("");
  
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    userId: string | null;
    userName: string;
  }>({
    isOpen: false,
    userId: null,
    userName: "",
  });

  const createStudentMutation = useMutation({
    mutationFn: async (data: typeof newStudent) => {
      const response = await apiRequest("POST", "/api/admin/create-student", data);
      return await response.json();
    },
    onSuccess: (data: any) => {
      console.log("Create student response:", data);
      console.log("Credentials:", data.credentials);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setCreatedCredentials(data.credentials);
      setNewStudent({ phone: "", email: "", firstName: "", lastName: "", courseId: "", subscriptionDays: "30" });
      toast({
        title: "Muvaffaqiyatli",
        description: "O'quvchi yaratildi",
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

  const approveStudentMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/admin/students/${id}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Muvaffaqiyatli",
        description: "O'quvchi tasdiqlandi",
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

  const rejectStudentMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/admin/students/${id}/reject`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Muvaffaqiyatli",
        description: "O'quvchi rad etildi",
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

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Muvaffaqiyatli",
        description: "Rol yangilandi",
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

  const resetUserPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      return await apiRequest("PATCH", `/api/admin/users/${userId}/reset-password`, { newPassword });
    },
    onSuccess: () => {
      setUserResetPasswordResult(userNewPassword);
      toast({
        title: "Muvaffaqiyatli",
        description: "Parol yangilandi",
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

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/admin/users/${userId}`, {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setDeleteDialog({ isOpen: false, userId: null, userName: "" });
      toast({
        title: "Muvaffaqiyatli",
        description: data.message || "Foydalanuvchi o'chirildi",
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

  const approvePasswordResetMutation = useMutation({
    mutationFn: async ({ requestId, newPassword }: { requestId: string; newPassword: string }) => {
      await apiRequest("PUT", `/api/admin/password-reset-requests/${requestId}`, { newPassword });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/password-reset-requests"] });
      setResetPasswordDialog({ isOpen: false, requestId: null, contactInfo: "" });
      setNewPassword("");
      toast({
        title: "Muvaffaqiyatli",
        description: "Parol muvaffaqiyatli o'rnatildi",
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

  const rejectPasswordResetMutation = useMutation({
    mutationFn: async (requestId: string) => {
      await apiRequest("DELETE", `/api/admin/password-reset-requests/${requestId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/password-reset-requests"] });
      toast({
        title: "Muvaffaqiyatli",
        description: "So'rov rad etildi",
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

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold" data-testid="text-admin-title">
          Admin Dashboard
        </h1>
        <Button
          onClick={() => {
            setCreatedCredentials(null);
            setIsCreateStudentOpen(true);
          }}
          data-testid="button-create-student"
          className="flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Yangi O'quvchi
        </Button>
      </div>

      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Jami Daromad"
            value={`${(stats?.totalRevenue || 0).toLocaleString('uz-UZ')} so'm`}
            icon={DollarSign}
            testId="stats-revenue"
            description="Tasdiqlangan to'lovlar"
          />
          <StatsCard
            title="Ro'yxatdan O'tganlar"
            value={stats?.totalEnrollments || 0}
            icon={UserCheck}
            testId="stats-enrollments"
            trend={{
              value: stats?.enrollmentGrowth || 0,
              isPositive: (stats?.enrollmentGrowth || 0) > 0
            }}
            description={`Oxirgi 7 kun: ${stats?.recentEnrollments || 0}`}
          />
          <StatsCard
            title="Jami Kurslar"
            value={stats?.courseCount || 0}
            icon={BookOpen}
            testId="stats-courses"
            description="Faol kurslar"
          />
          <StatsCard
            title="Jami Foydalanuvchilar"
            value={(stats?.instructorCount || 0) + (stats?.studentCount || 0)}
            icon={Users}
            testId="stats-users"
            description={`${stats?.instructorCount || 0} o'qituvchi, ${stats?.studentCount || 0} o'quvchi`}
          />
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Enrollment Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Ro'yxatdan O'tishlar Trendi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trendsLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : !trends || trends.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Ma'lumot topilmadi
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getDate()}/${date.getMonth() + 1}`;
                    }}
                  />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('uz-UZ');
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="enrollments"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                    name="Ro'yxatdan o'tganlar"
                  />
                </LineChart>
              </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Revenue Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Daromad Trendi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trendsLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : !trends || trends.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Ma'lumot topilmadi
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getDate()}/${date.getMonth() + 1}`;
                    }}
                  />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('uz-UZ');
                    }}
                    formatter={(value: number) => [`${value.toLocaleString('uz-UZ')} so'm`, 'Daromad']}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="hsl(var(--primary))"
                    radius={[8, 8, 0, 0]}
                    name="Daromad"
                  />
                </BarChart>
              </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pending Students */}
        {pendingStudents && pendingStudents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                Kutilayotgan O'quvchilar
                <Badge variant="default">{pendingStudents.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ism</TableHead>
                    <TableHead>Telefon/Email</TableHead>
                    <TableHead>Ro'yxatdan O'tgan Sana</TableHead>
                    <TableHead>Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        {student.firstName} {student.lastName}
                      </TableCell>
                      <TableCell>{student.phone || student.email}</TableCell>
                      <TableCell>
                        {student.createdAt ? new Date(student.createdAt).toLocaleDateString('uz-UZ') : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => approveStudentMutation.mutate(student.id)}
                            disabled={approveStudentMutation.isPending}
                            data-testid={`button-approve-${student.id}`}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Tasdiqlash
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => rejectStudentMutation.mutate(student.id)}
                            disabled={rejectStudentMutation.isPending}
                            data-testid={`button-reject-${student.id}`}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Rad etish
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Password Reset Requests */}
        {passwordResetRequests && passwordResetRequests.filter(r => r.status === 'pending').length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Parolni Tiklash So'rovlari
                <Badge variant="default">
                  {passwordResetRequests.filter(r => r.status === 'pending').length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Foydalanuvchi</TableHead>
                    <TableHead>Aloqa Ma'lumoti</TableHead>
                    <TableHead>So'rov Sanasi</TableHead>
                    <TableHead>Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {passwordResetRequests
                    .filter(r => r.status === 'pending')
                    .map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          {request.user ? (
                            <>
                              {request.user.firstName} {request.user.lastName}
                              <br />
                              <span className="text-sm text-muted-foreground">
                                {request.user.role === 'student' ? 'O\'quvchi' : 
                                 request.user.role === 'instructor' ? 'O\'qituvchi' : 'Admin'}
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">Foydalanuvchi topilmadi</span>
                          )}
                        </TableCell>
                        <TableCell>{request.contactInfo}</TableCell>
                        <TableCell>
                          {new Date(request.createdAt).toLocaleDateString('uz-UZ')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => {
                                setResetPasswordDialog({
                                  isOpen: true,
                                  requestId: request.id,
                                  contactInfo: request.contactInfo,
                                });
                                setNewPassword("");
                              }}
                              disabled={approvePasswordResetMutation.isPending || !request.user}
                              data-testid={`button-reset-password-${request.id}`}
                            >
                              <Key className="w-4 h-4 mr-1" />
                              Parol O'rnatish
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => rejectPasswordResetMutation.mutate(request.id)}
                              disabled={rejectPasswordResetMutation.isPending}
                              data-testid={`button-reject-reset-${request.id}`}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Rad Etish
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Users Management */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2">
              <CardTitle>Foydalanuvchilar Boshqaruvi</CardTitle>
              <p className="text-sm text-muted-foreground">
                Foydalanuvchilar Replit Auth orqali avtomatik yaratiladi. 
                Siz faqat mavjud foydalanuvchilarning rolini o'zgartira olasiz.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Ism</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Qo'shilgan Sana</TableHead>
                  <TableHead>Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                    <TableCell data-testid={`text-user-email-${user.id}`}>{user.email}</TableCell>
                    <TableCell>
                      {user.firstName} {user.lastName}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role || 'student'}
                        onValueChange={(value) =>
                          updateRoleMutation.mutate({ userId: user.id, role: value })
                        }
                      >
                        <SelectTrigger className="w-32" data-testid={`select-role-${user.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">O'quvchi</SelectItem>
                          <SelectItem value="instructor">O'qituvchi</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setUserResetPasswordDialog({
                              isOpen: true,
                              userId: user.id,
                              userName: `${user.firstName} ${user.lastName}`,
                            });
                            setUserNewPassword("");
                            setUserResetPasswordResult(null);
                          }}
                          data-testid={`button-reset-password-${user.id}`}
                        >
                          <Key className="w-4 h-4 mr-1" />
                          Parolni tiklash
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setDeleteDialog({
                              isOpen: true,
                              userId: user.id,
                              userName: `${user.firstName} ${user.lastName}`,
                            });
                          }}
                          disabled={deleteUserMutation.isPending}
                          data-testid={`button-delete-user-${user.id}`}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          O'chirish
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Create Student Dialog */}
      <Dialog 
        open={isCreateStudentOpen} 
        onOpenChange={(open) => {
          setIsCreateStudentOpen(open);
          if (!open) {
            setCreatedCredentials(null);
            setNewStudent({ phone: "", email: "", firstName: "", lastName: "", courseId: "", subscriptionDays: "30" });
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Yangi O'quvchi Yaratish</DialogTitle>
            <DialogDescription>
              O'quvchi ma'lumotlarini kiriting. Login va parol avtomatik yaratiladi.
            </DialogDescription>
          </DialogHeader>

          {createdCredentials ? (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-center py-3">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <p className="font-semibold">O'quvchi muvaffaqiyatli yaratildi!</p>
                </div>
              </div>
              <div className="p-4 bg-muted rounded-md space-y-4">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Login (Telefon)</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-background px-3 py-2 rounded text-sm font-mono border">
                        {createdCredentials.login}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(createdCredentials.login);
                          toast({ 
                            title: "Nusxalandi!", 
                            description: "Login nusxalandi" 
                          });
                        }}
                        data-testid="button-copy-login"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Parol</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-background px-3 py-2 rounded text-sm font-mono border">
                        {createdCredentials.password}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(createdCredentials.password);
                          toast({ 
                            title: "Nusxalandi!", 
                            description: "Parol nusxalandi" 
                          });
                        }}
                        data-testid="button-copy-password"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    ⚠️ Bu ma'lumotlarni o'quvchiga xavfsiz usulda yuboring. Ular login sahifasida foydalanishlari mumkin.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Ism *</Label>
                <Input
                  id="firstName"
                  placeholder="Ism"
                  value={newStudent.firstName}
                  onChange={(e) => setNewStudent({ ...newStudent, firstName: e.target.value })}
                  data-testid="input-firstname"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Familiya *</Label>
                <Input
                  id="lastName"
                  placeholder="Familiya"
                  value={newStudent.lastName}
                  onChange={(e) => setNewStudent({ ...newStudent, lastName: e.target.value })}
                  data-testid="input-lastname"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon Raqami *</Label>
                <Input
                  id="phone"
                  placeholder="+998901234567"
                  value={newStudent.phone}
                  onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                  data-testid="input-phone"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Bu raqam login uchun ishlatiladi
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (ixtiyoriy)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course">Kursni tanlang (ixtiyoriy)</Label>
                <Select
                  value={newStudent.courseId}
                  onValueChange={(value) => setNewStudent({ ...newStudent, courseId: value })}
                >
                  <SelectTrigger id="course" data-testid="select-course">
                    <SelectValue placeholder="Kursni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses?.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Agar kurs tanlasangiz, o'quvchi avtomatik ravishda shu kursga yoziladi.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subscriptionDays">Obuna muddati (kunlar) *</Label>
                <Input
                  id="subscriptionDays"
                  type="number"
                  min="1"
                  placeholder="30"
                  value={newStudent.subscriptionDays}
                  onChange={(e) => setNewStudent({ ...newStudent, subscriptionDays: e.target.value })}
                  data-testid="input-subscription-days"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Kurs tanlangan bo'lsa, shu muddat uchun obuna yaratiladi
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            {createdCredentials ? (
              <Button
                onClick={() => {
                  setCreatedCredentials(null);
                  setIsCreateStudentOpen(false);
                }}
                data-testid="button-close-dialog"
              >
                Yopish
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateStudentOpen(false)}
                  data-testid="button-cancel"
                >
                  Bekor qilish
                </Button>
                <Button
                  onClick={() => createStudentMutation.mutate(newStudent)}
                  disabled={createStudentMutation.isPending}
                  data-testid="button-submit"
                >
                  {createStudentMutation.isPending ? "Yuklanmoqda..." : "Yaratish"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog 
        open={resetPasswordDialog.isOpen} 
        onOpenChange={(open) => {
          setResetPasswordDialog({ isOpen: open, requestId: null, contactInfo: "" });
          setNewPassword("");
        }}
      >
        <DialogContent data-testid="dialog-reset-password">
          <DialogHeader>
            <DialogTitle>Yangi Parol O'rnatish</DialogTitle>
            <DialogDescription>
              {resetPasswordDialog.contactInfo} uchun yangi parol o'rnating.
              Foydalanuvchiga bildirishnoma yuboriladi.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Yangi Parol</Label>
              <Input
                id="new-password"
                type="text"
                placeholder="Kamida 6 belgidan iborat parol"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                data-testid="input-new-password"
              />
              <p className="text-sm text-muted-foreground">
                Parol talablari:
                <br />
                • Kamida 6 belgi
                <br />
                • Kamida bitta raqam
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResetPasswordDialog({ isOpen: false, requestId: null, contactInfo: "" });
                setNewPassword("");
              }}
              data-testid="button-cancel-reset-password"
            >
              Bekor qilish
            </Button>
            <Button
              onClick={() => {
                if (resetPasswordDialog.requestId && newPassword.trim().length >= 6) {
                  approvePasswordResetMutation.mutate({
                    requestId: resetPasswordDialog.requestId,
                    newPassword: newPassword.trim(),
                  });
                }
              }}
              disabled={approvePasswordResetMutation.isPending || newPassword.trim().length < 6}
              data-testid="button-confirm-reset-password"
            >
              {approvePasswordResetMutation.isPending ? "O'rnatilmoqda..." : "Parolni O'rnatish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Reset Password Dialog */}
      <Dialog 
        open={userResetPasswordDialog?.isOpen || false} 
        onOpenChange={(open) => {
          if (!open) {
            setUserResetPasswordDialog(null);
            setUserNewPassword("");
            setUserResetPasswordResult(null);
          }
        }}
      >
        <DialogContent data-testid="dialog-reset-password">
          <DialogHeader>
            <DialogTitle>Parolni Tiklash</DialogTitle>
            <DialogDescription>
              {userResetPasswordDialog?.userName} uchun yangi parol o'rnating
            </DialogDescription>
          </DialogHeader>

          {userResetPasswordResult ? (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-center py-3">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <p className="font-semibold">Parol muvaffaqiyatli tiklandi!</p>
                </div>
              </div>
              <div className="p-4 bg-muted rounded-md space-y-4">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Yangi Parol</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-background px-3 py-2 rounded text-sm font-mono border">
                        {userResetPasswordResult}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(userResetPasswordResult);
                          toast({ 
                            title: "Nusxalandi!", 
                            description: "Parol nusxalandi" 
                          });
                        }}
                        data-testid="button-copy-new-password"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    ⚠️ Bu parolni o'quvchiga xavfsiz usulda yuboring (Telegram/SMS orqali).
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    setUserResetPasswordDialog(null);
                    setUserNewPassword("");
                    setUserResetPasswordResult(null);
                  }}
                  data-testid="button-close-reset-password"
                >
                  Yopish
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Yangi Parol *</Label>
                <Input
                  id="newPassword"
                  type="text"
                  placeholder="Kamida 6 ta belgi"
                  value={userNewPassword}
                  onChange={(e) => setUserNewPassword(e.target.value)}
                  data-testid="input-new-password"
                />
                <p className="text-xs text-muted-foreground">
                  Oson eslab qolinadigan parol kiriting (masalan: student123)
                </p>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setUserResetPasswordDialog(null);
                    setUserNewPassword("");
                  }}
                  data-testid="button-cancel-reset-password"
                >
                  Bekor qilish
                </Button>
                <Button
                  onClick={() => {
                    if (userResetPasswordDialog && userNewPassword.trim().length >= 6) {
                      resetUserPasswordMutation.mutate({
                        userId: userResetPasswordDialog.userId,
                        newPassword: userNewPassword.trim(),
                      });
                    }
                  }}
                  disabled={resetUserPasswordMutation.isPending || userNewPassword.trim().length < 6}
                  data-testid="button-confirm-reset-password"
                >
                  {resetUserPasswordMutation.isPending ? "Tiklanmoqda..." : "Parolni O'rnatish"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog 
        open={deleteDialog.isOpen} 
        onOpenChange={(open) => {
          setDeleteDialog({ isOpen: open, userId: null, userName: "" });
        }}
      >
        <DialogContent data-testid="dialog-delete-user">
          <DialogHeader>
            <DialogTitle>Foydalanuvchini O'chirish</DialogTitle>
            <DialogDescription>
              Haqiqatan ham <strong>{deleteDialog.userName}</strong> foydalanuvchisini o'chirmoqchimisiz?
              <br /><br />
              <span className="text-destructive font-semibold">Diqqat:</span> Ushbu amal qaytarib bo'lmaydi va quyidagi barcha ma'lumotlar o'chiriladi:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Foydalanuvchi profili</li>
                <li>Kurs yozilmalari</li>
                <li>Topshiriqlar va test javoblari</li>
                <li>Xabarlar va bildirishnomalar</li>
                <li>Obuna ma'lumotlari</li>
                {deleteDialog.userName && deleteDialog.userName.includes("O'qituvchi") && (
                  <li className="text-destructive">O'qituvchi yaratgan barcha kurslar</li>
                )}
              </ul>
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialog({ isOpen: false, userId: null, userName: "" });
              }}
              data-testid="button-cancel-delete"
            >
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteDialog.userId) {
                  deleteUserMutation.mutate(deleteDialog.userId);
                }
              }}
              disabled={deleteUserMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteUserMutation.isPending ? "O'chirilmoqda..." : "Ha, O'chirish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
