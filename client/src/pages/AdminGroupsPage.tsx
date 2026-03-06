import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  UsersRound,
  Plus,
  Pencil,
  Trash2,
  UserPlus,
  UserMinus,
  Search,
  Users,
  FileDown,
  BookOpen,
  Settings2,
  Calendar,
  Lock,
  Unlock,
  Clock,
  GraduationCap,
  ChevronRight,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { User } from "@shared/schema";

interface StudentGroup {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  memberCount: number;
}

interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  addedAt: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
}

interface GroupCourseItem {
  id: string;
  title: string;
  thumbnail: string | null;
  enrolledCount: number;
  settings: {
    testGateEnabled: boolean;
    minPassScore: number;
    unlockType: string;
    unlockIntervalDays: number;
    unlockWeekDays: string[];
    unlockStartDate: string | null;
  } | null;
}

const WEEK_DAYS = [
  { key: "monday", label: "Du" },
  { key: "tuesday", label: "Se" },
  { key: "wednesday", label: "Cho" },
  { key: "thursday", label: "Pa" },
  { key: "friday", label: "Ju" },
  { key: "saturday", label: "Sha" },
  { key: "sunday", label: "Ya" },
];

const defaultSettingsForm = {
  courseId: "",
  testGateEnabled: false,
  minPassScore: 70,
  unlockType: "free",
  unlockIntervalDays: 1,
  unlockWeekDays: [] as string[],
  unlockStartDate: "",
};

function UnlockTypeBadge({ settings }: { settings: GroupCourseItem["settings"] }) {
  if (!settings || settings.unlockType === "free") {
    return (
      <Badge variant="secondary" className="text-[10px] gap-1">
        <Unlock className="w-3 h-3" /> Erkin
      </Badge>
    );
  }
  if (settings.unlockType === "daily") {
    return (
      <Badge variant="outline" className="text-[10px] gap-1 border-blue-400 text-blue-600 dark:text-blue-400">
        <Clock className="w-3 h-3" /> Har {settings.unlockIntervalDays} kunda
      </Badge>
    );
  }
  if (settings.unlockType === "weekly") {
    const days = (settings.unlockWeekDays || [])
      .map(d => WEEK_DAYS.find(w => w.key === d)?.label || d)
      .join(", ");
    return (
      <Badge variant="outline" className="text-[10px] gap-1 border-purple-400 text-purple-600 dark:text-purple-400">
        <Calendar className="w-3 h-3" /> Haftalik ({days || "—"})
      </Badge>
    );
  }
  return null;
}

export default function AdminGroupsPage() {
  const { toast } = useToast();

  // Dialog open states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false);
  const [isAssignCourseOpen, setIsAssignCourseOpen] = useState(false);
  const [isGroupCoursesOpen, setIsGroupCoursesOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [selectedGroup, setSelectedGroup] = useState<StudentGroup | null>(null);
  const [groupForm, setGroupForm] = useState({ name: "", description: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [assignCourseData, setAssignCourseData] = useState({ courseId: "", subscriptionDays: "30" });
  const [settingsForm, setSettingsForm] = useState(defaultSettingsForm);

  // ─── Queries ─────────────────────────────────────────────────────────────
  const { data: groups = [], isLoading: groupsLoading } = useQuery<StudentGroup[]>({
    queryKey: ["/api/admin/student-groups"],
  });

  const { data: students = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: allCourses = [] } = useQuery<{ id: string; title: string }[]>({
    queryKey: ["/api/courses"],
  });

  const { data: groupMembers = [], isLoading: membersLoading } = useQuery<GroupMember[]>({
    queryKey: ["/api/admin/student-groups", selectedGroup?.id, "members"],
    enabled: !!selectedGroup?.id && isMembersOpen,
  });

  const { data: sessionCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ["/api/admin/user-sessions"],
    enabled: isMembersOpen,
    refetchInterval: 30000,
  });

  // Group's enrolled courses
  const { data: groupCourses = [], isLoading: groupCoursesLoading, refetch: refetchGroupCourses } = useQuery<GroupCourseItem[]>({
    queryKey: ["/api/admin/student-groups", selectedGroup?.id, "courses"],
    enabled: !!selectedGroup?.id && isGroupCoursesOpen,
  });

  // ─── Mutations ────────────────────────────────────────────────────────────
  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const res = await apiRequest("POST", "/api/admin/student-groups", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/student-groups"] });
      setIsCreateOpen(false);
      setGroupForm({ name: "", description: "" });
      toast({ title: "Guruh yaratildi" });
    },
    onError: (error: any) => toast({ title: "Xatolik", description: error.message, variant: "destructive" }),
  });

  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; description: string } }) => {
      const res = await apiRequest("PATCH", `/api/admin/student-groups/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/student-groups"] });
      setIsEditOpen(false);
      setSelectedGroup(null);
      toast({ title: "Guruh yangilandi" });
    },
    onError: (error: any) => toast({ title: "Xatolik", description: error.message, variant: "destructive" }),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/student-groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/student-groups"] });
      toast({ title: "Guruh o'chirildi" });
    },
    onError: (error: any) => toast({ title: "Xatolik", description: error.message, variant: "destructive" }),
  });

  const addMembersMutation = useMutation({
    mutationFn: async ({ groupId, userIds }: { groupId: string; userIds: string[] }) => {
      const res = await apiRequest("POST", `/api/admin/student-groups/${groupId}/members/bulk`, { userIds });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/student-groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/student-groups", selectedGroup?.id, "members"] });
      setIsAddMembersOpen(false);
      setSelectedStudentIds([]);
      setSearchTerm("");
      toast({ title: "O'quvchilar guruhga qo'shildi" });
    },
    onError: (error: any) => toast({ title: "Xatolik", description: error.message, variant: "destructive" }),
  });

  const removeMemberMutation = useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      await apiRequest("DELETE", `/api/admin/student-groups/${groupId}/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/student-groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/student-groups", selectedGroup?.id, "members"] });
      toast({ title: "O'quvchi guruhdan chiqarildi" });
    },
    onError: (error: any) => toast({ title: "Xatolik", description: error.message, variant: "destructive" }),
  });

  const assignCourseMutation = useMutation({
    mutationFn: async ({ groupId, courseId, subscriptionDays }: { groupId: string; courseId: string; subscriptionDays: string }) => {
      const res = await apiRequest("POST", `/api/admin/student-groups/${groupId}/assign-course`, { courseId, subscriptionDays });
      return res.json();
    },
    onSuccess: (data: any) => {
      setIsAssignCourseOpen(false);
      setAssignCourseData({ courseId: "", subscriptionDays: "30" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/student-groups", selectedGroup?.id, "courses"] });
      refetchGroupCourses();
      toast({ title: "Muvaffaqiyatli", description: data.message });
    },
    onError: (error: any) => toast({ title: "Xatolik", description: error.message, variant: "destructive" }),
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: typeof settingsForm & { groupId: string }) => {
      const res = await apiRequest("POST", "/api/group-course-settings", {
        groupId: data.groupId,
        courseId: data.courseId,
        testGateEnabled: data.testGateEnabled,
        minPassScore: data.minPassScore,
        unlockType: data.unlockType,
        unlockIntervalDays: data.unlockIntervalDays,
        unlockWeekDays: data.unlockWeekDays,
        unlockStartDate: data.unlockStartDate || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/group-course-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/student-groups", selectedGroup?.id, "courses"] });
      refetchGroupCourses();
      setIsSettingsOpen(false);
      toast({ title: "Jadval sozlamalari saqlandi" });
    },
    onError: (error: any) => toast({ title: "Xatolik", description: error.message, variant: "destructive" }),
  });

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const downloadPdf = () => {
    const groupName = selectedGroup?.name || "Guruh";
    const date = new Date().toLocaleDateString("uz-UZ");
    const rows = groupMembers.map((m, i) => {
      const login = m.phone || m.email || "-";
      return `<tr><td>${i + 1}</td><td>${m.firstName} ${m.lastName}</td><td>${login}</td><td>${login}</td></tr>`;
    }).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${groupName}</title><style>
      @media print{@page{margin:15mm;}}body{font-family:Arial,sans-serif;font-size:11px;color:#111;margin:0;padding:20px;}
      h2{font-size:18px;margin:0 0 6px;}.meta{font-size:11px;color:#555;margin-bottom:14px;}
      table{width:100%;border-collapse:collapse;}thead tr{background:#2980b9;color:#fff;}
      th{padding:7px 8px;text-align:left;font-size:11px;}td{padding:6px 8px;border-bottom:1px solid #e0e0e0;font-size:11px;}
      tr:nth-child(even) td{background:#f5f8fc;}.note{margin-top:12px;font-size:9px;color:#888;}
    </style></head><body>
      <h2>${groupName}</h2><div class="meta">Jami: ${groupMembers.length} ta o'quvchi | Sana: ${date}</div>
      <table><thead><tr><th>#</th><th>Ism Familiya</th><th>Login</th><th>Parol</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="note">* Standart parol = login (telefon raqam)</div>
      <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};}</script>
    </body></html>`;
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); }
  };

  const openSettingsForCourse = async (course: GroupCourseItem) => {
    const s = course.settings;
    setSettingsForm({
      courseId: course.id,
      testGateEnabled: s?.testGateEnabled ?? false,
      minPassScore: s?.minPassScore ?? 70,
      unlockType: s?.unlockType ?? "free",
      unlockIntervalDays: s?.unlockIntervalDays ?? 1,
      unlockWeekDays: s?.unlockWeekDays ?? [],
      unlockStartDate: s?.unlockStartDate
        ? new Date(s.unlockStartDate).toISOString().slice(0, 16)
        : "",
    });
    setIsSettingsOpen(true);
  };

  const handleSettingsCourseChange = async (courseId: string) => {
    setSettingsForm(prev => ({ ...prev, courseId }));
    if (selectedGroup && courseId) {
      try {
        const res = await fetch(`/api/group-course-settings/${selectedGroup.id}/${courseId}`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setSettingsForm({
              courseId: data.courseId,
              testGateEnabled: data.testGateEnabled ?? false,
              minPassScore: data.minPassScore ?? 70,
              unlockType: data.unlockType ?? "free",
              unlockIntervalDays: data.unlockIntervalDays ?? 1,
              unlockWeekDays: data.unlockWeekDays ?? [],
              unlockStartDate: data.unlockStartDate
                ? new Date(data.unlockStartDate).toISOString().slice(0, 16)
                : "",
            });
          }
        }
      } catch {}
    }
  };

  const toggleWeekDay = (day: string) => {
    setSettingsForm(prev => ({
      ...prev,
      unlockWeekDays: prev.unlockWeekDays.includes(day)
        ? prev.unlockWeekDays.filter(d => d !== day)
        : [...prev.unlockWeekDays, day],
    }));
  };

  const memberUserIds = groupMembers.map(m => m.userId);
  const availableStudents = students.filter(s => !memberUserIds.includes(s.id) && s.role === "student");
  const filteredStudents = availableStudents.filter(s => {
    const term = searchTerm.toLowerCase();
    return (
      (s.firstName?.toLowerCase() || "").includes(term) ||
      (s.lastName?.toLowerCase() || "").includes(term) ||
      (s.phone?.toLowerCase() || "").includes(term) ||
      (s.email?.toLowerCase() || "").includes(term)
    );
  });

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">O'quvchi Guruhlari</h1>
          <p className="text-muted-foreground text-sm">Guruhlarni boshqaring va o'quvchilarni guruhlarga biriktiring</p>
        </div>
        <Button onClick={() => { setGroupForm({ name: "", description: "" }); setIsCreateOpen(true); }} data-testid="button-create-group">
          <Plus className="w-4 h-4 mr-2" /> Yangi Guruh
        </Button>
      </div>

      {/* Groups grid */}
      {groupsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <UsersRound className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground">Hali guruh yaratilmagan</p>
            <Button onClick={() => { setGroupForm({ name: "", description: "" }); setIsCreateOpen(true); }} data-testid="button-create-group-empty">
              <Plus className="w-4 h-4 mr-2" /> Birinchi Guruhni Yarating
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map(group => (
            <Card key={group.id} data-testid={`card-group-${group.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
                <div className="min-w-0">
                  <CardTitle className="text-lg truncate" data-testid={`text-group-name-${group.id}`}>{group.name}</CardTitle>
                  {group.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{group.description}</p>
                  )}
                </div>
                <Badge variant="secondary" data-testid={`badge-member-count-${group.id}`}>
                  <Users className="w-3 h-3 mr-1" /> {group.memberCount}
                </Badge>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {/* Primary actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => { setSelectedGroup(group); setIsMembersOpen(true); }} data-testid={`button-view-members-${group.id}`}>
                    <UsersRound className="w-4 h-4 mr-1" /> A'zolar
                  </Button>
                  <Button size="sm" variant="default"
                    onClick={() => { setSelectedGroup(group); setIsGroupCoursesOpen(true); }}
                    data-testid={`button-group-courses-${group.id}`}
                  >
                    <BookOpen className="w-4 h-4 mr-1" /> Kurslar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setSelectedGroup(group); setGroupForm({ name: group.name, description: group.description || "" }); setIsEditOpen(true); }} data-testid={`button-edit-group-${group.id}`}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost"
                    onClick={() => { if (confirm(`"${group.name}" guruhini o'chirishni xohlaysizmi?`)) deleteGroupMutation.mutate(group.id); }}
                    data-testid={`button-delete-group-${group.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Create Group Dialog ── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yangi Guruh Yaratish</DialogTitle>
            <DialogDescription>Guruh nomi va tavsifini kiriting</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Guruh Nomi *</Label>
              <Input value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} placeholder="masalan: 1-guruh" data-testid="input-group-name" />
            </div>
            <div>
              <Label>Tavsif</Label>
              <Textarea value={groupForm.description} onChange={e => setGroupForm({ ...groupForm, description: e.target.value })} placeholder="Guruh haqida qisqacha ma'lumot" data-testid="input-group-description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Bekor qilish</Button>
            <Button onClick={() => createGroupMutation.mutate(groupForm)} disabled={!groupForm.name || createGroupMutation.isPending} data-testid="button-save-group">
              {createGroupMutation.isPending ? "Yaratilmoqda..." : "Yaratish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Group Dialog ── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guruhni Tahrirlash</DialogTitle>
            <DialogDescription>Guruh ma'lumotlarini o'zgartiring</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Guruh Nomi *</Label>
              <Input value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} data-testid="input-edit-group-name" />
            </div>
            <div>
              <Label>Tavsif</Label>
              <Textarea value={groupForm.description} onChange={e => setGroupForm({ ...groupForm, description: e.target.value })} data-testid="input-edit-group-description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Bekor qilish</Button>
            <Button onClick={() => selectedGroup && updateGroupMutation.mutate({ id: selectedGroup.id, data: groupForm })} disabled={!groupForm.name || updateGroupMutation.isPending} data-testid="button-update-group">
              {updateGroupMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Group Members Dialog ── */}
      <Dialog open={isMembersOpen} onOpenChange={open => { setIsMembersOpen(open); if (!open) setSelectedGroup(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedGroup?.name} - A'zolari ({groupMembers.length})</DialogTitle>
            <DialogDescription>Guruh a'zolarini ko'ring va boshqaring</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={() => { setSelectedStudentIds([]); setSearchTerm(""); setIsAddMembersOpen(true); }} data-testid="button-add-members">
                <UserPlus className="w-4 h-4 mr-2" /> O'quvchi Qo'shish
              </Button>
              {groupMembers.length > 0 && (
                <Button variant="outline" onClick={downloadPdf} data-testid="button-download-pdf">
                  <FileDown className="w-4 h-4 mr-2" /> PDF Yuklab olish
                </Button>
              )}
            </div>
            {membersLoading ? (
              <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" /></div>
            ) : groupMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Bu guruhda hali a'zo yo'q</div>
            ) : (
              <div className="overflow-y-auto max-h-[55vh] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Ism</TableHead>
                      <TableHead>Telefon/Email</TableHead>
                      <TableHead>Qo'shilgan</TableHead>
                      <TableHead>Qurilma</TableHead>
                      <TableHead>Amal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupMembers.map((member, index) => (
                      <TableRow key={member.id} data-testid={`row-member-${member.userId}`}>
                        <TableCell className="text-muted-foreground text-sm font-mono">{index + 1}</TableCell>
                        <TableCell>{member.firstName} {member.lastName}</TableCell>
                        <TableCell>{member.phone || member.email || "-"}</TableCell>
                        <TableCell>{member.addedAt ? new Date(member.addedAt).toLocaleDateString("uz-UZ") : "-"}</TableCell>
                        <TableCell>
                          {(sessionCounts[member.userId] ?? 0) > 0
                            ? <Badge variant="secondary">{sessionCounts[member.userId]} ta</Badge>
                            : <span className="text-muted-foreground text-sm">-</span>}
                        </TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost"
                            onClick={() => selectedGroup && removeMemberMutation.mutate({ groupId: selectedGroup.id, userId: member.userId })}
                            data-testid={`button-remove-member-${member.userId}`}
                          >
                            <UserMinus className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Members Dialog ── */}
      <Dialog open={isAddMembersOpen} onOpenChange={setIsAddMembersOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>O'quvchilarni Guruhga Qo'shish</DialogTitle>
            <DialogDescription>{selectedGroup?.name} guruhiga qo'shiladigan o'quvchilarni tanlang</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Ism, telefon yoki email bo'yicha qidiring..." className="pl-9" data-testid="input-search-students" />
            </div>
            {selectedStudentIds.length > 0 && (
              <Badge variant="secondary">{selectedStudentIds.length} ta o'quvchi tanlandi</Badge>
            )}
            <ScrollArea className="max-h-[300px] border rounded-md">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">{searchTerm ? "Natija topilmadi" : "Qo'shish uchun o'quvchi yo'q"}</div>
              ) : (
                <div className="divide-y">
                  {filteredStudents.map(student => (
                    <label key={student.id} className="flex items-center gap-3 p-3 hover-elevate cursor-pointer" data-testid={`label-student-${student.id}`}>
                      <Checkbox checked={selectedStudentIds.includes(student.id)} onCheckedChange={() => toggleStudentSelection(student.id)} data-testid={`checkbox-student-${student.id}`} />
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{student.firstName} {student.lastName}</p>
                        <p className="text-xs text-muted-foreground">{student.phone || student.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMembersOpen(false)}>Bekor qilish</Button>
            <Button
              onClick={() => selectedGroup && addMembersMutation.mutate({ groupId: selectedGroup.id, userIds: selectedStudentIds })}
              disabled={selectedStudentIds.length === 0 || addMembersMutation.isPending}
              data-testid="button-confirm-add-members"
            >
              {addMembersMutation.isPending ? "Qo'shilmoqda..." : `${selectedStudentIds.length} ta Qo'shish`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Group Courses Dialog (main hub) ── */}
      <Dialog open={isGroupCoursesOpen} onOpenChange={open => { setIsGroupCoursesOpen(open); if (!open) setSelectedGroup(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              {selectedGroup?.name} — Kurslar
            </DialogTitle>
            <DialogDescription>
              Guruhga biriktirilgan kurslar va ularning dars jadvali
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {/* Add course button */}
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => { setAssignCourseData({ courseId: "", subscriptionDays: "30" }); setIsAssignCourseOpen(true); }}
                data-testid="button-add-course-to-group"
              >
                <Plus className="w-4 h-4 mr-1" /> Kurs qo'shish
              </Button>
            </div>

            {/* Course list */}
            {groupCoursesLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : groupCourses.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-3 text-muted-foreground">
                <BookOpen className="w-10 h-10" />
                <p className="text-sm">Hali kurs biriktirilmagan</p>
                <Button size="sm" onClick={() => { setAssignCourseData({ courseId: "", subscriptionDays: "30" }); setIsAssignCourseOpen(true); }}>
                  <Plus className="w-4 h-4 mr-1" /> Kurs qo'shish
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                {groupCourses.map(course => (
                  <div
                    key={course.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                    data-testid={`card-group-course-${course.id}`}
                  >
                    {/* Thumbnail */}
                    <div className="w-14 h-14 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      {course.thumbnail ? (
                        <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" data-testid={`text-course-title-${course.id}`}>
                        {course.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <Users className="w-3 h-3" /> {course.enrolledCount} o'quvchi
                        </Badge>
                        <UnlockTypeBadge settings={course.settings} />
                        {course.settings?.testGateEnabled && (
                          <Badge variant="outline" className="text-[10px] gap-1 border-amber-400 text-amber-600 dark:text-amber-400">
                            <Lock className="w-3 h-3" /> Test qo'shinligi
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Jadval sozla button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openSettingsForCourse(course)}
                      data-testid={`button-settings-course-${course.id}`}
                    >
                      <Settings2 className="w-3.5 h-3.5 mr-1" /> Jadval
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Assign Course Dialog ── */}
      <Dialog open={isAssignCourseOpen} onOpenChange={open => { setIsAssignCourseOpen(open); if (!open) setAssignCourseData({ courseId: "", subscriptionDays: "30" }); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Guruhga Kurs Biriktirish</DialogTitle>
            <DialogDescription>
              <span className="font-semibold">{selectedGroup?.name}</span> guruhidagi barcha o'quvchilarga kurs biriktiriladi
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Kurs *</Label>
              <Select value={assignCourseData.courseId} onValueChange={v => setAssignCourseData({ ...assignCourseData, courseId: v })}>
                <SelectTrigger data-testid="select-course-for-group">
                  <SelectValue placeholder="Kursni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {allCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Obuna muddati (kunlarda)</Label>
              <Input
                type="number" min="1" placeholder="30"
                value={assignCourseData.subscriptionDays}
                onChange={e => setAssignCourseData({ ...assignCourseData, subscriptionDays: e.target.value })}
                data-testid="input-group-subscription-days"
              />
              <p className="text-xs text-muted-foreground">Allaqachon yozilgan o'quvchilar o'tkazib yuboriladi</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignCourseOpen(false)}>Bekor qilish</Button>
            <Button
              onClick={() => selectedGroup && assignCourseMutation.mutate({ groupId: selectedGroup.id, courseId: assignCourseData.courseId, subscriptionDays: assignCourseData.subscriptionDays })}
              disabled={!assignCourseData.courseId || assignCourseMutation.isPending}
              data-testid="button-confirm-assign-course-group"
            >
              {assignCourseMutation.isPending ? "Biriktirilmoqda..." : "Kurs Biriktirish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Schedule Settings Dialog ── */}
      <Dialog open={isSettingsOpen} onOpenChange={open => { setIsSettingsOpen(open); if (!open) setSettingsForm(defaultSettingsForm); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Dars Ochilish Jadvali
            </DialogTitle>
            <DialogDescription>
              <span className="font-semibold">{selectedGroup?.name}</span> guruhi —{" "}
              <span className="font-semibold">
                {allCourses.find(c => c.id === settingsForm.courseId)?.title || "kurs"}
              </span>
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[65vh]">
            <div className="space-y-5 pr-1">

              {/* If opened from Kurslar list, show course name only (no selector needed) */}
              {!settingsForm.courseId && (
                <div className="space-y-2">
                  <Label>Kurs *</Label>
                  <Select value={settingsForm.courseId} onValueChange={handleSettingsCourseChange}>
                    <SelectTrigger data-testid="select-settings-course"><SelectValue placeholder="Kursni tanlang" /></SelectTrigger>
                    <SelectContent>{allCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}

              {(settingsForm.courseId) && (
                <>
                  {/* Unlock type */}
                  <div className="space-y-2">
                    <Label>Dars ochilish tartibi</Label>
                    <Select value={settingsForm.unlockType} onValueChange={v => setSettingsForm(prev => ({ ...prev, unlockType: v }))}>
                      <SelectTrigger data-testid="select-unlock-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">
                          <span className="flex items-center gap-2"><Unlock className="w-3.5 h-3.5" /> Erkin (jadval yo'q)</span>
                        </SelectItem>
                        <SelectItem value="daily">
                          <span className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Har N kunda</span>
                        </SelectItem>
                        <SelectItem value="weekly">
                          <span className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Haftalik (kunlar bo'yicha)</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Start date */}
                  {(settingsForm.unlockType === "daily" || settingsForm.unlockType === "weekly") && (
                    <div className="space-y-2">
                      <Label>Boshlanish sanasi va vaqti</Label>
                      <Input type="datetime-local" value={settingsForm.unlockStartDate} onChange={e => setSettingsForm(prev => ({ ...prev, unlockStartDate: e.target.value }))} data-testid="input-unlock-start-date" />
                      <p className="text-xs text-muted-foreground">1-dars shu sanadan boshlab ochiladi</p>
                    </div>
                  )}

                  {/* Daily interval */}
                  {settingsForm.unlockType === "daily" && (
                    <div className="space-y-2">
                      <Label>Har necha kunda bitta dars ochiladi</Label>
                      <Input type="number" min="1" max="30" value={settingsForm.unlockIntervalDays}
                        onChange={e => setSettingsForm(prev => ({ ...prev, unlockIntervalDays: parseInt(e.target.value) || 1 }))}
                        data-testid="input-unlock-interval"
                      />
                    </div>
                  )}

                  {/* Weekly days */}
                  {settingsForm.unlockType === "weekly" && (
                    <div className="space-y-2">
                      <Label>Qaysi hafta kunlari dars ochiladi</Label>
                      <div className="flex flex-wrap gap-2">
                        {WEEK_DAYS.map(day => (
                          <button
                            key={day.key}
                            type="button"
                            onClick={() => toggleWeekDay(day.key)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                              settingsForm.unlockWeekDays.includes(day.key)
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                            }`}
                            data-testid={`button-weekday-${day.key}`}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">Tanlangan kunlarda ketma-ket darslar ochiladi</p>
                    </div>
                  )}

                  {/* Test gate */}
                  <div className="rounded-md border p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm flex items-center gap-1.5">
                          <Lock className="w-4 h-4 text-amber-500" /> Test qo'shinligi
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Keyingi darsga o'tish uchun avvalgi dars testini topshirish shart
                        </p>
                      </div>
                      <Switch checked={settingsForm.testGateEnabled} onCheckedChange={v => setSettingsForm(prev => ({ ...prev, testGateEnabled: v }))} data-testid="switch-test-gate" />
                    </div>
                    {settingsForm.testGateEnabled && (
                      <div className="space-y-1.5 pt-1 border-t">
                        <Label className="text-xs">Minimal o'tish bali (%)</Label>
                        <Input type="number" min="1" max="100" value={settingsForm.minPassScore}
                          onChange={e => setSettingsForm(prev => ({ ...prev, minPassScore: parseInt(e.target.value) || 70 }))}
                          className="h-8"
                          data-testid="input-min-pass-score"
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>Bekor qilish</Button>
            <Button
              onClick={() => selectedGroup && saveSettingsMutation.mutate({ ...settingsForm, groupId: selectedGroup.id })}
              disabled={!settingsForm.courseId || saveSettingsMutation.isPending}
              data-testid="button-save-settings"
            >
              {saveSettingsMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
