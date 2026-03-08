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
  curatorId?: string | null;
  curatorName?: string | null;
}

interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  addedAt: string;
  personalStartDate: string | null;
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
    useIndividualStartDate: boolean;
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
  useIndividualStartDate: false,
};

function UnlockTypeBadge({ settings }: { settings: GroupCourseItem["settings"] }) {
  if (!settings || settings.unlockType === "free") {
    return (
      <Badge variant="secondary" className="text-[10px] gap-1">
        <Unlock className="w-3 h-3" /> Erkin
      </Badge>
    );
  }
  const individualLabel = settings.useIndividualStartDate ? " (individual)" : "";
  if (settings.unlockType === "daily") {
    return (
      <Badge variant="outline" className="text-[10px] gap-1 border-blue-400 text-blue-600 dark:text-blue-400">
        <Clock className="w-3 h-3" /> Har {settings.unlockIntervalDays} kunda{individualLabel}
      </Badge>
    );
  }
  if (settings.unlockType === "weekly") {
    const days = (settings.unlockWeekDays || [])
      .map(d => WEEK_DAYS.find(w => w.key === d)?.label || d)
      .join(", ");
    return (
      <Badge variant="outline" className="text-[10px] gap-1 border-purple-400 text-purple-600 dark:text-purple-400">
        <Calendar className="w-3 h-3" /> Haftalik ({days || "—"}){individualLabel}
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
  const [isCuratorCreateOpen, setIsCuratorCreateOpen] = useState(false);
  const [isCuratorAssignOpen, setIsCuratorAssignOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [curatorForm, setCuratorForm] = useState({ firstName: "", lastName: "", phone: "", password: "" });

  const [selectedGroup, setSelectedGroup] = useState<StudentGroup | null>(null);
  const [groupForm, setGroupForm] = useState({ name: "", description: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [memberAddStartDate, setMemberAddStartDate] = useState("");
  const [editingMemberDate, setEditingMemberDate] = useState<{ userId: string; date: string } | null>(null);
  const [assignCourseData, setAssignCourseData] = useState({
    courseId: "",
    subscriptionDays: "30",
    unlockType: "free",
    unlockStartDate: "",
    unlockIntervalDays: "1",
    unlockWeekDays: [] as string[],
  });
  const [settingsForm, setSettingsForm] = useState(defaultSettingsForm);

  // ─── Queries ─────────────────────────────────────────────────────────────
  const { data: groups = [], isLoading: groupsLoading } = useQuery<StudentGroup[]>({
    queryKey: ["/api/admin/student-groups"],
  });

  const { data: students = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: allCourses = [] } = useQuery<{ id: string; title: string; thumbnail?: string; status?: string; isFree?: boolean }[]>({
    queryKey: ["/api/admin/all-courses"],
  });

  const { data: curators = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/curators"],
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
    mutationFn: async ({ groupId, userIds, personalStartDate }: { groupId: string; userIds: string[]; personalStartDate?: string }) => {
      const res = await apiRequest("POST", `/api/admin/student-groups/${groupId}/members/bulk`, {
        userIds,
        personalStartDate: personalStartDate || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/student-groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/student-groups", selectedGroup?.id, "members"] });
      setIsAddMembersOpen(false);
      setSelectedStudentIds([]);
      setSearchTerm("");
      setMemberAddStartDate("");
      toast({ title: "O'quvchilar guruhga qo'shildi" });
    },
    onError: (error: any) => toast({ title: "Xatolik", description: error.message, variant: "destructive" }),
  });

  const updateMemberStartDateMutation = useMutation({
    mutationFn: async ({ groupId, userId, personalStartDate }: { groupId: string; userId: string; personalStartDate: string | null }) => {
      const res = await apiRequest("PATCH", `/api/admin/student-groups/${groupId}/members/${userId}/start-date`, { personalStartDate });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/student-groups", selectedGroup?.id, "members"] });
      setEditingMemberDate(null);
      toast({ title: "Boshlanish sanasi yangilandi" });
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
    mutationFn: async ({ groupId, courseId, subscriptionDays, unlockType, unlockStartDate, unlockIntervalDays, unlockWeekDays }: {
      groupId: string; courseId: string; subscriptionDays: string;
      unlockType: string; unlockStartDate: string; unlockIntervalDays: string; unlockWeekDays: string[];
    }) => {
      const res = await apiRequest("POST", `/api/admin/student-groups/${groupId}/assign-course`, { courseId, subscriptionDays });
      const data = await res.json();
      const effectiveStartDate = unlockStartDate || (unlockType !== "free" ? new Date().toISOString() : null);
      await apiRequest("POST", "/api/group-course-settings", {
        groupId,
        courseId,
        unlockType,
        unlockStartDate: effectiveStartDate,
        unlockIntervalDays: parseInt(unlockIntervalDays) || 1,
        unlockWeekDays,
        testGateEnabled: false,
        minPassScore: 70,
      });
      return data;
    },
    onSuccess: (data: any) => {
      setIsAssignCourseOpen(false);
      setAssignCourseData({ courseId: "", subscriptionDays: "30", unlockType: "free", unlockStartDate: "", unlockIntervalDays: "1", unlockWeekDays: [] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/student-groups", selectedGroup?.id, "courses"] });
      setTimeout(() => refetchGroupCourses(), 300);
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
        unlockStartDate: data.unlockStartDate || (data.unlockType !== "free" ? new Date().toISOString() : null),
        useIndividualStartDate: data.useIndividualStartDate,
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

  const createCuratorMutation = useMutation({
    mutationFn: async (data: typeof curatorForm) => {
      const res = await apiRequest("POST", "/api/admin/curators", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/curators"] });
      setIsCuratorCreateOpen(false);
      setCuratorForm({ firstName: "", lastName: "", phone: "", password: "" });
      toast({ title: "Kurator yaratildi" });
    },
    onError: (error: any) => toast({ title: "Xatolik", description: error.message, variant: "destructive" }),
  });

  const assignCuratorMutation = useMutation({
    mutationFn: async ({ groupId, curatorId }: { groupId: string; curatorId: string }) => {
      const res = await apiRequest("POST", `/api/admin/groups/${groupId}/assign-curator`, { curatorId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/student-groups"] });
      setIsCuratorAssignOpen(false);
      toast({ title: "Kurator biriktirildi" });
    },
    onError: (error: any) => toast({ title: "Xatolik", description: error.message, variant: "destructive" }),
  });

  const generateInviteMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const res = await apiRequest("POST", `/api/admin/groups/${groupId}/invite-link`);
      return res.json();
    },
    onSuccess: (data: any) => {
      setInviteLink(data.link);
      toast({ title: "Havola yaratildi" });
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
      useIndividualStartDate: s?.useIndividualStartDate ?? false,
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
              useIndividualStartDate: data.useIndividualStartDate ?? false,
            });
          }
        }
      } catch {}
    }
  };

  const toggleWeekDay = (day: string) => {
    setSettingsForm(prev => {
      const current = prev.unlockWeekDays ?? [];
      return {
        ...prev,
        unlockWeekDays: current.includes(day)
          ? current.filter(d => d !== day)
          : [...current, day],
      };
    });
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
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => { setCuratorForm({ firstName: "", lastName: "", phone: "", password: "" }); setIsCuratorCreateOpen(true); }} data-testid="button-create-curator">
            <GraduationCap className="w-4 h-4 mr-2" /> Kurator Yaratish
          </Button>
          <Button onClick={() => { setGroupForm({ name: "", description: "" }); setIsCreateOpen(true); }} data-testid="button-create-group">
            <Plus className="w-4 h-4 mr-2" /> Yangi Guruh
          </Button>
        </div>
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
                {group.curatorId ? (
                  <div className="flex items-center gap-2 text-xs" data-testid={`curator-info-${group.id}`}>
                    <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-white/60">Kurator:</span>
                    <span className="text-purple-300 font-medium">{group.curatorName || "Tayinlangan"}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-white/30">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Kurator tayinlanmagan</span>
                  </div>
                )}
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
                  <Button size="sm" variant="outline"
                    onClick={() => { setSelectedGroup(group); setIsCuratorAssignOpen(true); }}
                    data-testid={`button-assign-curator-${group.id}`}
                  >
                    <GraduationCap className="w-4 h-4 mr-1" /> Kurator
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
                      <TableHead>Dars boshlanishi</TableHead>
                      <TableHead>Amal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupMembers.map((member, index) => (
                      <TableRow key={member.id} data-testid={`row-member-${member.userId}`}>
                        <TableCell className="text-muted-foreground text-sm font-mono">{index + 1}</TableCell>
                        <TableCell>{member.firstName} {member.lastName}</TableCell>
                        <TableCell>{member.phone || member.email || "-"}</TableCell>
                        <TableCell className="text-sm">{member.addedAt ? new Date(member.addedAt).toLocaleDateString("uz-UZ") : "-"}</TableCell>
                        <TableCell>
                          {editingMemberDate?.userId === member.userId ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="datetime-local"
                                value={editingMemberDate.date}
                                onChange={e => setEditingMemberDate({ userId: member.userId, date: e.target.value })}
                                className="h-8 text-xs w-44"
                                data-testid={`input-member-date-${member.userId}`}
                              />
                              <Button size="icon" variant="ghost" className="h-8 w-8"
                                onClick={() => selectedGroup && updateMemberStartDateMutation.mutate({
                                  groupId: selectedGroup.id,
                                  userId: member.userId,
                                  personalStartDate: editingMemberDate.date || null,
                                })}
                                data-testid={`button-save-date-${member.userId}`}
                              >
                                <ChevronRight className="w-4 h-4 text-green-600" />
                              </Button>
                            </div>
                          ) : (
                            <button
                              className="text-sm hover:underline cursor-pointer text-left"
                              onClick={() => setEditingMemberDate({
                                userId: member.userId,
                                date: member.personalStartDate
                                  ? new Date(member.personalStartDate).toISOString().slice(0, 16)
                                  : "",
                              })}
                              data-testid={`button-edit-date-${member.userId}`}
                            >
                              {member.personalStartDate ? (
                                <span className="text-blue-600 dark:text-blue-400">
                                  {new Date(member.personalStartDate).toLocaleDateString("uz-UZ")}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">Umumiy</span>
                              )}
                            </button>
                          )}
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
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Dars boshlanish sanasi (ixtiyoriy)
              </Label>
              <Input
                type="datetime-local"
                value={memberAddStartDate}
                onChange={e => setMemberAddStartDate(e.target.value)}
                data-testid="input-member-start-date"
              />
              <p className="text-xs text-muted-foreground">
                Bo'sh qoldirilsa, darslar bugundan boshlab guruh jadvali bo'yicha ochiladi. Boshqa sana belgilasangiz, o'sha kundan boshlanadi.
              </p>
            </div>
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
              onClick={() => selectedGroup && addMembersMutation.mutate({
                groupId: selectedGroup.id,
                userIds: selectedStudentIds,
                personalStartDate: memberAddStartDate || undefined,
              })}
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
      <Dialog open={isAssignCourseOpen} onOpenChange={open => { setIsAssignCourseOpen(open); if (!open) setAssignCourseData({ courseId: "", subscriptionDays: "30", unlockType: "free", unlockStartDate: "", unlockIntervalDays: "1", unlockWeekDays: [] }); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Guruhga Kurs Biriktirish</DialogTitle>
            <DialogDescription>
              <span className="font-semibold">{selectedGroup?.name}</span> guruhiga kurs va dars jadvalini sozlang
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh]">
            <div className="space-y-4 py-2 pr-2">
              {/* Course select */}
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

              {/* Subscription days */}
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

              {/* Schedule section */}
              <div className="rounded-md border-2 border-primary/30 bg-primary/5 p-4 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-primary/20">
                  <div className="w-7 h-7 rounded-md bg-primary/20 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <p className="font-semibold text-sm">Dars Ochilish Jadvali</p>
                </div>

                {/* Unlock type */}
                <div className="space-y-2">
                  <Label>Tartib turi</Label>
                  <Select value={assignCourseData.unlockType} onValueChange={v => setAssignCourseData({ ...assignCourseData, unlockType: v })}>
                    <SelectTrigger data-testid="select-assign-unlock-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">
                        <span className="flex items-center gap-2"><Unlock className="w-3.5 h-3.5" /> Erkin — barcha darslar ochiq</span>
                      </SelectItem>
                      <SelectItem value="daily">
                        <span className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Kunlik — har N kunda bitta dars</span>
                      </SelectItem>
                      <SelectItem value="weekly">
                        <span className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Haftalik — tanlangan kunlarda</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Start date */}
                {(assignCourseData.unlockType === "daily" || assignCourseData.unlockType === "weekly") && (
                  <div className="space-y-2">
                    <Label>Birinchi dars boshlanish sanasi</Label>
                    <Input
                      type="datetime-local"
                      value={assignCourseData.unlockStartDate}
                      onChange={e => setAssignCourseData({ ...assignCourseData, unlockStartDate: e.target.value })}
                      data-testid="input-assign-unlock-start"
                    />
                    <p className="text-xs text-muted-foreground">1-dars shu sanadan boshlab ochiladi</p>
                  </div>
                )}

                {/* Daily interval */}
                {assignCourseData.unlockType === "daily" && (
                  <div className="space-y-2">
                    <Label>Har necha kunda bir dars ochiladi?</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number" min="1" max="30" className="w-24"
                        value={assignCourseData.unlockIntervalDays}
                        onChange={e => setAssignCourseData({ ...assignCourseData, unlockIntervalDays: e.target.value })}
                        data-testid="input-assign-unlock-interval"
                      />
                      <span className="text-sm text-muted-foreground">kun</span>
                    </div>
                    <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                      <p>Misol: <strong>{assignCourseData.unlockIntervalDays || 1}</strong> kun intervalida: 1-dars → {assignCourseData.unlockIntervalDays || 1} kun → 2-dars → {parseInt(assignCourseData.unlockIntervalDays||"1")*2} kun → 3-dars...</p>
                    </div>
                  </div>
                )}

                {/* Weekly days */}
                {assignCourseData.unlockType === "weekly" && (
                  <div className="space-y-2">
                    <Label>Qaysi hafta kunlari dars ochiladi?</Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { key: "monday", label: "Du" },
                        { key: "tuesday", label: "Se" },
                        { key: "wednesday", label: "Cho" },
                        { key: "thursday", label: "Pa" },
                        { key: "friday", label: "Ju" },
                        { key: "saturday", label: "Sha" },
                        { key: "sunday", label: "Ya" },
                      ].map(day => (
                        <button
                          key={day.key}
                          type="button"
                          onClick={() => {
                            const cur = assignCourseData.unlockWeekDays ?? [];
                            const days = cur.includes(day.key)
                              ? cur.filter(d => d !== day.key)
                              : [...cur, day.key];
                            setAssignCourseData({ ...assignCourseData, unlockWeekDays: days });
                          }}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                            (assignCourseData.unlockWeekDays ?? []).includes(day.key)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                          }`}
                          data-testid={`button-assign-weekday-${day.key}`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">Tanlangan kunlarda ketma-ket darslar ochiladi</p>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignCourseOpen(false)}>Bekor qilish</Button>
            <Button
              onClick={() => selectedGroup && assignCourseMutation.mutate({
                groupId: selectedGroup.id,
                courseId: assignCourseData.courseId,
                subscriptionDays: assignCourseData.subscriptionDays,
                unlockType: assignCourseData.unlockType,
                unlockStartDate: assignCourseData.unlockStartDate,
                unlockIntervalDays: assignCourseData.unlockIntervalDays,
                unlockWeekDays: assignCourseData.unlockWeekDays,
              })}
              disabled={!assignCourseData.courseId || assignCourseMutation.isPending}
              data-testid="button-confirm-assign-course-group"
            >
              {assignCourseMutation.isPending ? "Saqlanmoqda..." : "Kurs Biriktirish"}
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

                  {/* Individual vs Group-wide start date */}
                  {(settingsForm.unlockType === "daily" || settingsForm.unlockType === "weekly") && (
                    <div className="rounded-md border-2 border-blue-400/30 bg-blue-500/5 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-blue-500" /> Har bir o'quvchi uchun alohida jadval
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            O'quvchi guruhga qo'shilgan kunidan boshlab darslar ochiladi
                          </p>
                        </div>
                        <Switch
                          checked={settingsForm.useIndividualStartDate}
                          onCheckedChange={v => setSettingsForm(prev => ({ ...prev, useIndividualStartDate: v }))}
                          data-testid="switch-individual-start-date"
                        />
                      </div>
                      {settingsForm.useIndividualStartDate ? (
                        <div className="pt-2 border-t border-blue-400/20 text-xs space-y-2">
                          <div className="rounded-md bg-blue-500/10 p-3 space-y-1.5">
                            <p className="font-medium text-blue-700 dark:text-blue-300">Qanday ishlaydi:</p>
                            <p className="text-muted-foreground">1. O'quvchi guruhga qo'shiladi</p>
                            <p className="text-muted-foreground">2. Shu kuni 1-dars (demo) avtomatik ochiq bo'ladi</p>
                            <p className="text-muted-foreground">3. Keyingi darslar belgilangan jadval bo'yicha ochiladi</p>
                            {settingsForm.unlockType === "daily" && (
                              <p className="text-muted-foreground mt-1">
                                Masalan: o'quvchi bugun qo'shilsa, {settingsForm.unlockIntervalDays || 1} kundan keyin 2-dars, {(settingsForm.unlockIntervalDays || 1) * 2} kundan keyin 3-dars ochiladi
                              </p>
                            )}
                            {settingsForm.unlockType === "weekly" && (settingsForm.unlockWeekDays?.length ?? 0) > 0 && (
                              <p className="text-muted-foreground mt-1">
                                Masalan: o'quvchi bugun qo'shilsa, keyingi {(settingsForm.unlockWeekDays ?? []).map(d => WEEK_DAYS.find(w => w.key === d)?.label).filter(Boolean).join(", ")} kunlarida navbatdagi darslar ochiladi
                              </p>
                            )}
                          </div>
                          <p className="text-muted-foreground">Ixtiyoriy: "A'zolar" bo'limida alohida o'quvchiga boshqa sana belgilash mumkin.</p>
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-blue-400/20 space-y-2">
                          <div className="space-y-2">
                            <Label className="text-sm">Barcha o'quvchilar uchun boshlanish sanasi</Label>
                            <Input type="datetime-local" value={settingsForm.unlockStartDate} onChange={e => setSettingsForm(prev => ({ ...prev, unlockStartDate: e.target.value }))} data-testid="input-unlock-start-date" />
                            <p className="text-xs text-muted-foreground">Barcha o'quvchilar uchun 1-dars shu sanadan boshlab ochiladi (qachon qo'shilganidan qat'i nazar)</p>
                          </div>
                        </div>
                      )}
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
                              (settingsForm.unlockWeekDays ?? []).includes(day.key)
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

      {/* ── Create Curator Dialog ── */}
      <Dialog open={isCuratorCreateOpen} onOpenChange={setIsCuratorCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yangi Kurator Yaratish</DialogTitle>
            <DialogDescription>Kurator uchun hisob yarating</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Ism *</Label>
                <Input data-testid="input-curator-first-name" value={curatorForm.firstName} onChange={e => setCuratorForm({ ...curatorForm, firstName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Familiya</Label>
                <Input data-testid="input-curator-last-name" value={curatorForm.lastName} onChange={e => setCuratorForm({ ...curatorForm, lastName: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Telefon *</Label>
              <Input data-testid="input-curator-phone" value={curatorForm.phone} onChange={e => setCuratorForm({ ...curatorForm, phone: e.target.value })} placeholder="+998901234567" />
            </div>
            <div className="space-y-1.5">
              <Label>Parol *</Label>
              <Input data-testid="input-curator-password" type="password" value={curatorForm.password} onChange={e => setCuratorForm({ ...curatorForm, password: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCuratorCreateOpen(false)}>Bekor qilish</Button>
            <Button
              onClick={() => createCuratorMutation.mutate(curatorForm)}
              disabled={!curatorForm.firstName || !curatorForm.phone || !curatorForm.password || createCuratorMutation.isPending}
              data-testid="button-submit-curator"
            >
              {createCuratorMutation.isPending ? "Yaratilmoqda..." : "Yaratish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign Curator / Invite Link Dialog ── */}
      <Dialog open={isCuratorAssignOpen} onOpenChange={v => { setIsCuratorAssignOpen(v); if (!v) setInviteLink(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kurator Biriktirish — {selectedGroup?.name}</DialogTitle>
            <DialogDescription>Mavjud kuratorni tanlang yoki taklifnoma havolasi yarating</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Mavjud Kuratorlar</Label>
              {curators.length === 0 ? (
                <p className="text-sm text-muted-foreground">Hali kurator yaratilmagan</p>
              ) : (
                <Select
                  value=""
                  onValueChange={val => {
                    if (selectedGroup) assignCuratorMutation.mutate({ groupId: selectedGroup.id, curatorId: val });
                  }}
                >
                  <SelectTrigger data-testid="select-curator">
                    <SelectValue placeholder="Kurator tanlang..." />
                  </SelectTrigger>
                  <SelectContent>
                    {curators.map(c => (
                      <SelectItem key={c.id} value={c.id} data-testid={`option-curator-${c.id}`}>
                        {c.firstName} {c.lastName || ""} ({c.phone})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="border-t pt-3 space-y-2">
              <Label>Taklifnoma Havolasi</Label>
              <p className="text-xs text-muted-foreground">
                Bu havola orqali yangi kurator ro'yxatdan o'tib, avtomatik guruhga biriktiriladi
              </p>
              <Button
                variant="outline"
                onClick={() => selectedGroup && generateInviteMutation.mutate(selectedGroup.id)}
                disabled={generateInviteMutation.isPending}
                data-testid="button-generate-invite"
              >
                {generateInviteMutation.isPending ? "Yaratilmoqda..." : "Havola Yaratish"}
              </Button>
              {inviteLink && (
                <div className="mt-2 p-2 rounded-lg bg-muted">
                  <p className="text-xs font-mono break-all" data-testid="text-invite-link">{inviteLink}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-1"
                    onClick={() => { navigator.clipboard.writeText(inviteLink); toast({ title: "Nusxa olindi!" }); }}
                    data-testid="button-copy-invite"
                  >
                    Nusxa olish
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
